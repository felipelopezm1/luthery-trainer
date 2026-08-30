/* ScoreFollow — MusicXML/MIDI load, OSMD cursor, metronome-synced target */
const ScoreFollow = (() => {
  let notes = [];
  let osmd = null;
  let host = null;
  let playing = false;
  let paused = false;
  let t0 = 0;
  let pauseAccum = 0;
  let raf = null;
  let cursorIdx = 0;
  let currentTarget = null;
  let onTarget = null;
  let onEnd = null;
  let onCursor = null;
  let lastBpm = 72;
  let lastXml = null;

  function OSMD() {
    return window.opensheetmusicdisplay || window.OpenSheetMusicDisplay;
  }

  function midiFromXmlPitch(step, alter, octave) {
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step] ?? 0;
    return (parseInt(octave, 10) + 1) * 12 + base + (parseInt(alter || '0', 10) || 0);
  }

  function parseMusicXmlText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const divisions = parseFloat(doc.querySelector('attributes divisions')?.textContent || '1') || 1;
    const bpmEl = doc.querySelector('sound[tempo], metronome per-minute');
    const bpm = parseFloat(bpmEl?.getAttribute?.('tempo') || bpmEl?.textContent || '72') || 72;
    const beat = 60 / bpm;
    const out = [];
    let t = 0;
    doc.querySelectorAll('measure').forEach(measure => {
      measure.querySelectorAll('note').forEach(note => {
        const durDiv = parseFloat(note.querySelector('duration')?.textContent || '0') || 0;
        const sec = (durDiv / divisions) * beat;
        if (note.querySelector('rest')) { t += sec; return; }
        const pitch = note.querySelector('pitch');
        if (!pitch) { t += sec; return; }
        const midi = midiFromXmlPitch(
          pitch.querySelector('step')?.textContent || 'C',
          pitch.querySelector('alter')?.textContent,
          pitch.querySelector('octave')?.textContent || '3'
        );
        out.push({ midi, startSec: t, durSec: Math.max(0.12, sec) });
        if (!note.querySelector('chord')) t += sec;
      });
    });
    return out;
  }

  function readVarLen(view, i) {
    let v = 0, b;
    do { b = view.getUint8(i.n++); v = (v << 7) | (b & 0x7f); } while (b & 0x80);
    return v;
  }

  function parseMidi(buf) {
    const view = new DataView(buf);
    if (view.getUint32(0) !== 0x4d546864) throw new Error('parse failed');
    const ntrks = view.getUint16(10);
    let off = 14;
    let tempo = 500000;
    const ppq = view.getUint16(12) || 480;
    const events = [];
    for (let tr = 0; tr < ntrks; tr++) {
      if (off + 8 > view.byteLength) break;
      if (view.getUint32(off) !== 0x4d54726b) break;
      const len = view.getUint32(off + 4);
      off += 8;
      const end = off + len;
      let tick = 0, running = 0;
      const i = { n: off };
      while (i.n < end) {
        tick += readVarLen(view, i);
        let st = view.getUint8(i.n);
        if (st < 0x80) { st = running; } else { i.n++; running = st; }
        const cmd = st & 0xf0;
        if (cmd === 0x90 || cmd === 0x80) {
          const n = view.getUint8(i.n++), v = view.getUint8(i.n++);
          events.push({ tick, midi: n, on: cmd === 0x90 && v > 0 });
        } else if (cmd === 0xb0 || cmd === 0xa0 || cmd === 0xe0) i.n += 2;
        else if (cmd === 0xc0 || cmd === 0xd0) i.n += 1;
        else if (st === 0xff) {
          const type = view.getUint8(i.n++);
          const l = readVarLen(view, i);
          if (type === 0x51 && l === 3) {
            tempo = (view.getUint8(i.n) << 16) | (view.getUint8(i.n + 1) << 8) | view.getUint8(i.n + 2);
          }
          i.n += l;
        } else if (st === 0xf0 || st === 0xf7) {
          const l = readVarLen(view, i); i.n += l;
        } else i.n++;
      }
      off = end;
    }
    const secPerTick = (tempo / 1e6) / ppq;
    const starts = new Map();
    const out = [];
    events.sort((a, b) => a.tick - b.tick);
    events.forEach(ev => {
      const t = ev.tick * secPerTick;
      if (ev.on) starts.set(ev.midi, t);
      else if (starts.has(ev.midi)) {
        const s = starts.get(ev.midi);
        out.push({ midi: ev.midi, startSec: s, durSec: Math.max(0.12, t - s) });
        starts.delete(ev.midi);
      }
    });
    return out.sort((a, b) => a.startSec - b.startSec);
  }

  function extractOsmdNotes() {
    if (!osmd?.cursor) return notes;
    try {
      const iter = osmd.cursor.Iterator;
      osmd.cursor.reset();
      const out = [];
      const bpm = lastBpm || 72;
      while (!osmd.cursor.Iterator.endReached) {
        const voices = osmd.cursor.Iterator.CurrentVoiceEntries || [];
        const stamp = osmd.cursor.Iterator.currentTimeStamp?.realValue ?? 0;
        voices.forEach(v => {
          (v.Notes || v.notes || []).forEach(note => {
            if (!note || note.isRest?.()) return;
            const ht = note.halfTone ?? note.halftone;
            if (ht == null) return;
            out.push({
              midi: ht + 12,
              startSec: stamp * 4 * (60 / bpm),
              durSec: 0.4,
            });
          });
        });
        osmd.cursor.next();
      }
      osmd.cursor.reset();
      if (out.length) notes = out;
    } catch (e) {
      console.warn('[ScoreFollow] OSMD extract', e);
    }
    return notes;
  }

  async function loadFile(file) {
    const name = (file.name || '').toLowerCase();
    notes = [];
    lastXml = null;
    osmd = null;
    if (name.endsWith('.mid') || name.endsWith('.midi')) {
      const buf = await file.arrayBuffer();
      notes = parseMidi(buf);
      if (!notes.length) throw new Error('parse failed');
      return notes;
    }
    let xml = '';
    if (name.endsWith('.mxl') && window.JSZip) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entry = Object.keys(zip.files).find(k => /\.xml$/i.test(k) && !k.startsWith('META-INF'));
      if (!entry) throw new Error('parse failed');
      xml = await zip.files[entry].async('string');
    } else {
      xml = await file.text();
    }
    return loadXml(xml);
  }

  function loadXml(xml) {
    lastXml = xml;
    osmd = null;
    notes = parseMusicXmlText(xml);
    if (!notes.length) throw new Error('parse failed');
    return notes;
  }

  async function renderOsmd(el) {
    const ns = OSMD();
    if (!ns || !lastXml) return false;
    const Ctor = ns.OpenSheetMusicDisplay || ns;
    el.innerHTML = '';
    osmd = new Ctor(el, { autoResize: true, drawTitle: true, followCursor: true });
    await osmd.load(lastXml);
    await osmd.render();
    extractOsmdNotes();
    return true;
  }

  async function render(el) {
    host = el;
    if (!el) return;
    if (lastXml) {
      try {
        if (await renderOsmd(el)) return;
      } catch (e) {
        console.warn('[ScoreFollow] OSMD load', e);
        osmd = null;
      }
    }
    if (typeof Renderer === 'undefined' || !notes.length) {
      el.innerHTML = `<p class="cello-empty">${notes.length} notes</p>`;
      return;
    }
    el.innerHTML = '';
    const w = Math.min(el.clientWidth || 560, 720);
    const r = new Renderer(el, Renderer.Backends.SVG);
    r.resize(w, 120);
    const ctx = r.getContext();
    const stave = new Stave(8, 10, w - 16).addClef('bass').addTimeSignature('4/4');
    stave.setContext(ctx).draw();
    const slice = notes.slice(0, 16);
    const Acc = typeof Accidental !== 'undefined' ? Accidental : (Vex?.Flow?.Accidental);
    const vexNotes = slice.map(n => {
      const oct = Math.floor(n.midi / 12) - 1;
      const chrom = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
      const step = chrom[((n.midi % 12) + 12) % 12];
      const vn = new StaveNote({ clef: 'bass', keys: [`${step}/${oct}`], duration: '8' });
      if (step.includes('#') && Acc) vn.addModifier(new Acc(step.slice(1)));
      return vn;
    });
    const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
    voice.addTickables(vexNotes);
    try { new Formatter().joinVoices([voice]).format([voice], w - 70); voice.draw(ctx, stave); } catch {}
  }

  function elapsed() {
    if (!playing) return 0;
    if (paused) return pauseAccum;
    return pauseAccum + (performance.now() - t0) / 1000;
  }

  function loop() {
    if (!playing || paused) return;
    const now = elapsed();
    while (cursorIdx < notes.length && notes[cursorIdx].startSec <= now) {
      const n = notes[cursorIdx];
      currentTarget = n.midi;
      if (onTarget) onTarget(n.midi);
      if (window.PitchDetect) window.PitchDetect.setTarget(n.midi);
      window.CelloEngine?.play(n.midi, Math.min(n.durSec, 0.9), 0, 0.45);
      try { if (cursorIdx > 0) osmd?.cursor?.next?.(); } catch {}
      if (onCursor) onCursor(cursorIdx, n);
      cursorIdx++;
    }
    if (cursorIdx >= notes.length) {
      playing = false;
      if (onEnd) onEnd();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function play(opts = {}) {
    if (!notes.length) return;
    lastBpm = opts.bpm || 72;
    onTarget = opts.onTarget || null;
    onEnd = opts.onEnd || null;
    onCursor = opts.onCursor || null;
    if (paused && playing) {
      paused = false;
      t0 = performance.now();
      loop();
      return;
    }
    stop();
    playing = true;
    paused = false;
    pauseAccum = 0;
    t0 = performance.now();
    cursorIdx = 0;
    currentTarget = null;
    try { osmd?.cursor?.reset?.(); osmd?.cursor?.show?.(); } catch {}
    if (window.TrainerAudio?.setMetroBpm) window.TrainerAudio.setMetroBpm(lastBpm);
    loop();
  }

  function pause() {
    if (!playing || paused) return;
    pauseAccum = elapsed();
    paused = true;
    if (raf) cancelAnimationFrame(raf);
  }

  function stop() {
    playing = false;
    paused = false;
    pauseAccum = 0;
    cursorIdx = 0;
    currentTarget = null;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    try { osmd?.cursor?.reset?.(); osmd?.cursor?.hide?.(); } catch {}
    window.PitchDetect?.setTarget(null);
  }

  function destroy() {
    stop();
    if (host) host.innerHTML = '';
    osmd = null;
    host = null;
    notes = [];
    lastXml = null;
  }

  return {
    loadFile, loadXml, render, play, pause, stop, destroy,
    getNotes: () => notes,
    getCurrentTarget: () => currentTarget,
  };
})();

window.ScoreFollow = ScoreFollow;
