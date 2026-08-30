/* ScoreFollow — MusicXML/MIDI load, OSMD cursor, score-tempo playback */
const ScoreFollow = (() => {
  let notes = [];
  let playNotes = [];
  let meta = defaultMeta();
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
  let ensembleOn = false;
  let hlLayer = null;
  const LOOKAHEAD = 8;

  const DYN_NAME = { ppp: 0.16, pp: 0.22, p: 0.32, mp: 0.4, mf: 0.5, f: 0.62, ff: 0.75, fff: 0.88 };

  function defaultMeta() {
    return { bpm: 72, beats: 4, beatType: 4, title: '', tempoMap: [{ q: 0, bpm: 72 }] };
  }

  function OSMD() {
    return window.opensheetmusicdisplay || window.OpenSheetMusicDisplay;
  }

  function midiFromXmlPitch(step, alter, octave) {
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step] ?? 0;
    return (parseInt(octave, 10) + 1) * 12 + base + (parseInt(alter || '0', 10) || 0);
  }

  function tag(el) {
    return (el.localName || el.tagName || '').replace(/^.*:/, '').toLowerCase();
  }

  function text(el, sel) {
    return el.querySelector(sel)?.textContent?.trim() || '';
  }

  function num(el, sel, fallback = 0) {
    const n = parseFloat(text(el, sel));
    return Number.isFinite(n) ? n : fallback;
  }

  function dynGainFromName(name) {
    return DYN_NAME[name] ?? null;
  }

  function dynGainFromSound(n) {
    if (!Number.isFinite(n)) return null;
    return Math.max(0.12, Math.min(0.9, (n / 100) * 0.8));
  }

  function readTempo(el) {
    if (!el) return null;
    const sounds = tag(el) === 'sound' ? [el] : [...el.querySelectorAll('sound')];
    for (const s of sounds) {
      const v = parseFloat(s.getAttribute('tempo'));
      if (Number.isFinite(v) && v > 0) return v;
    }
    const pm = el.querySelector('metronome per-minute, per-minute');
    const v = parseFloat(pm?.textContent);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function readDynamics(el) {
    if (!el) return null;
    const sounds = tag(el) === 'sound' ? [el] : [...el.querySelectorAll('sound')];
    for (const s of sounds) {
      const g = dynGainFromSound(parseFloat(s.getAttribute('dynamics')));
      if (g != null) return g;
    }
    const dyn = el.querySelector('dynamics');
    if (!dyn) return null;
    for (const child of dyn.children) {
      const g = dynGainFromName(tag(child));
      if (g != null) return g;
    }
    return null;
  }

  function pushTempo(map, q, bpm) {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    const last = map[map.length - 1];
    if (last && Math.abs(last.q - q) < 1e-6) last.bpm = bpm;
    else if (!last || last.bpm !== bpm) map.push({ q, bpm });
  }

  function expandRepeats(measures) {
    const out = [];
    let start = 0;
    const seen = new Map();
    let i = 0;
    while (i < measures.length) {
      out.push(measures[i]);
      if (measures[i].repeatForward) start = i;
      if (measures[i].repeatBackward) {
        const times = measures[i].repeatTimes || 2;
        const n = (seen.get(i) || 0) + 1;
        seen.set(i, n);
        if (n < times) {
          i = start;
          continue;
        }
      }
      i++;
    }
    return out;
  }

  function parseMeasureMeta(measure) {
    const info = { repeatForward: false, repeatBackward: false, repeatTimes: 2 };
    measure.querySelectorAll('repeat').forEach(r => {
      const dir = (r.getAttribute('direction') || '').toLowerCase();
      if (dir === 'forward') info.repeatForward = true;
      if (dir === 'backward') {
        info.repeatBackward = true;
        const times = parseInt(r.getAttribute('times'), 10);
        if (times > 1) info.repeatTimes = times;
      }
    });
    return info;
  }

  function parseMusicXmlText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const part = doc.querySelector('part') || doc.documentElement;
    const measureEls = [...part.querySelectorAll(':scope > measure')];
    const raw = (measureEls.length ? measureEls : [...doc.querySelectorAll('measure')]).map(el => ({
      el,
      ...parseMeasureMeta(el),
    }));
    const measures = expandRepeats(raw);

    let divisions = 1;
    let beats = 4;
    let beatType = 4;
    let bpm = 72;
    let gain = 0.45;
    let q = 0;
    const tempoMap = [];
    const out = [];
    const openTies = new Map();
    let firstBpm = 0;

    const title = text(doc, 'work-title') || text(doc, 'movement-title') || text(doc, 'credit-words') || '';

    measures.forEach((wrap, mi) => {
      const measure = wrap.el;
      const bar = parseInt(measure.getAttribute('number'), 10) || (mi + 1);
      let cursor = q;
      let lastNote = null;

      for (const el of measure.children) {
        const name = tag(el);
        if (name === 'attributes') {
          const d = num(el, 'divisions');
          if (d > 0) divisions = d;
          const b = parseInt(text(el, 'time beats'), 10);
          const bt = parseInt(text(el, 'time beat-type'), 10);
          if (b > 0) beats = b;
          if (bt > 0) beatType = bt;
        }
        if (name === 'direction' || name === 'sound') {
          const tempo = readTempo(el);
          if (tempo) {
            if (!firstBpm) firstBpm = tempo;
            bpm = tempo;
            pushTempo(tempoMap, cursor, tempo);
          }
          const dyn = readDynamics(el);
          if (dyn != null) gain = dyn;
        }
        if (name === 'backup') {
          cursor -= num(el, 'duration') / divisions;
          continue;
        }
        if (name === 'forward') {
          cursor += num(el, 'duration') / divisions;
          continue;
        }
        if (name !== 'note') continue;

        const isChord = !!el.querySelector('chord');
        const isGrace = !!el.querySelector('grace');
        const isRest = !!el.querySelector('rest');
        const durQ = isGrace ? 0 : (num(el, 'duration') / divisions);
        const startQ = isChord && lastNote ? lastNote.startQ : cursor;

        const tempoOnNote = readTempo(el);
        if (tempoOnNote) {
          if (!firstBpm) firstBpm = tempoOnNote;
          bpm = tempoOnNote;
          pushTempo(tempoMap, startQ, tempoOnNote);
        }
        const dynOnNote = readDynamics(el);
        if (dynOnNote != null) gain = dynOnNote;

        if (!isRest) {
          const pitch = el.querySelector('pitch');
          if (pitch) {
            const midi = midiFromXmlPitch(
              text(pitch, 'step') || 'C',
              text(pitch, 'alter'),
              text(pitch, 'octave') || '3'
            );
            const staccato = !!el.querySelector('staccato');
            const accent = !!(el.querySelector('accent') || el.querySelector('strong-accent'));
            const fermata = !!el.querySelector('fermata');
            const tieStart = !![...el.querySelectorAll('tie, tied')].find(n => (n.getAttribute('type') || '') === 'start');
            const tieStop = !![...el.querySelectorAll('tie, tied')].find(n => (n.getAttribute('type') || '') === 'stop');

            if (tieStop && openTies.has(midi)) {
              const prev = openTies.get(midi);
              prev.durQ += durQ;
              if (fermata) prev.fermata = true;
              if (!tieStart) openTies.delete(midi);
              lastNote = prev;
            } else {
              const note = {
                midi,
                startQ,
                durQ: Math.max(isGrace ? 0.08 : 0, durQ),
                measure: bar,
                gain,
                staccato,
                accent,
                fermata,
              };
              out.push(note);
              lastNote = note;
              if (tieStart) openTies.set(midi, note);
            }
          }
        }

        if (!isChord && !isGrace) cursor += durQ;
      }

      const written = beats * (4 / beatType);
      q = Math.max(cursor, q + written);
    });

    if (!firstBpm) firstBpm = bpm;
    if (!tempoMap.length) pushTempo(tempoMap, 0, firstBpm);
    if (tempoMap[0].q > 0) tempoMap.unshift({ q: 0, bpm: firstBpm });

    meta = { bpm: firstBpm, beats, beatType, title, tempoMap };
    return out.sort((a, b) => a.startQ - b.startQ || a.midi - b.midi);
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
    let tempoUs = 500000;
    const ppq = view.getUint16(12) || 480;
    const events = [];
    const tempoMap = [];
    let beats = 4;
    let beatType = 4;
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
            tempoUs = (view.getUint8(i.n) << 16) | (view.getUint8(i.n + 1) << 8) | view.getUint8(i.n + 2);
            pushTempo(tempoMap, tick / ppq, 60000000 / tempoUs);
          } else if (type === 0x58 && l >= 2) {
            beats = view.getUint8(i.n) || 4;
            beatType = 2 ** view.getUint8(i.n + 1) || 4;
          }
          i.n += l;
        } else if (st === 0xf0 || st === 0xf7) {
          const l = readVarLen(view, i); i.n += l;
        } else i.n++;
      }
      off = end;
    }
    const starts = new Map();
    const out = [];
    events.sort((a, b) => a.tick - b.tick);
    events.forEach(ev => {
      const startQ = ev.tick / ppq;
      if (ev.on) starts.set(ev.midi, startQ);
      else if (starts.has(ev.midi)) {
        const s = starts.get(ev.midi);
        out.push({ midi: ev.midi, startQ: s, durQ: Math.max(0.05, startQ - s), measure: Math.floor(s / beats) + 1, gain: 0.45 });
        starts.delete(ev.midi);
      }
    });
    const firstBpm = tempoMap[0]?.bpm || 120;
    if (!tempoMap.length) pushTempo(tempoMap, 0, firstBpm);
    if (tempoMap[0].q > 0) tempoMap.unshift({ q: 0, bpm: firstBpm });
    meta = { bpm: Math.round(firstBpm), beats, beatType, title: '', tempoMap };
    return out.sort((a, b) => a.startQ - b.startQ);
  }

  function secAt(q, playBpm, written) {
    const scale = (written.bpm || 72) ? playBpm / written.bpm : 1;
    const map = written.tempoMap?.length ? written.tempoMap : [{ q: 0, bpm: written.bpm || 72 }];
    let t = 0;
    for (let i = 0; i < map.length; i++) {
      const a = map[i];
      const next = map[i + 1];
      const end = next ? Math.min(q, next.q) : q;
      if (end <= a.q) break;
      const local = (a.bpm || written.bpm) * scale;
      t += (end - a.q) * (60 / local);
      if (!next || q <= next.q) break;
    }
    return t;
  }

  function materialize(src, playBpm) {
    const written = meta;
    return src.map(n => {
      const startSec = secAt(n.startQ, playBpm, written);
      let durSec = Math.max(0.12, secAt(n.startQ + (n.durQ || 0), playBpm, written) - startSec);
      if (n.staccato) durSec *= 0.45;
      if (n.fermata) durSec *= 1.5;
      let gain = n.gain != null ? n.gain : 0.45;
      if (n.accent) gain = Math.min(0.9, gain * 1.35);
      return { ...n, startSec, durSec, gain };
    });
  }

  async function loadFile(file) {
    const name = (file.name || '').toLowerCase();
    notes = [];
    playNotes = [];
    lastXml = null;
    osmd = null;
    meta = defaultMeta();
    if (name.endsWith('.mid') || name.endsWith('.midi')) {
      const buf = await file.arrayBuffer();
      notes = parseMidi(buf);
      if (!notes.length) throw new Error('parse failed');
      playNotes = materialize(notes, meta.bpm);
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

  async function loadUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const name = String(url.split('?')[0] || '').toLowerCase();
    if (name.endsWith('.mxl') && window.JSZip) {
      const zip = await JSZip.loadAsync(await res.arrayBuffer());
      const entry = Object.keys(zip.files).find(k => /\.xml$/i.test(k) && !k.startsWith('META-INF'));
      if (!entry) throw new Error('parse failed');
      return loadXml(await zip.files[entry].async('string'));
    }
    return loadXml(await res.text());
  }

  function loadXml(xml) {
    lastXml = xml;
    osmd = null;
    meta = defaultMeta();
    notes = parseMusicXmlText(xml);
    if (!notes.length) throw new Error('parse failed');
    playNotes = materialize(notes, meta.bpm);
    return notes;
  }

  function seekCursor(startQ) {
    if (!osmd?.cursor) return;
    const target = (startQ || 0) / 4;
    try {
      const it = osmd.cursor.Iterator;
      let stamp = it?.currentTimeStamp?.realValue;
      if (stamp == null || stamp > target + 1e-3 || it.endReached) {
        osmd.cursor.reset();
        stamp = osmd.cursor.Iterator?.currentTimeStamp?.realValue ?? 0;
      }
      let guard = 0;
      while (!osmd.cursor.Iterator.endReached && guard++ < 800) {
        stamp = osmd.cursor.Iterator.currentTimeStamp?.realValue ?? 0;
        if (stamp + 1e-3 >= target) break;
        osmd.cursor.next();
      }
      osmd.cursor.show();
      osmd.cursor.update?.();
    } catch (e) {
      console.warn('[ScoreFollow] cursor', e);
    }
  }

  function ensureHlLayer() {
    if (!host) return null;
    hlLayer = host.querySelector('.cello-hl-layer');
    if (!hlLayer) {
      hlLayer = document.createElement('div');
      hlLayer.className = 'cello-hl-layer';
      hlLayer.setAttribute('aria-hidden', 'true');
      host.appendChild(hlLayer);
    }
    return hlLayer;
  }

  function clearHighlight() {
    if (hlLayer) hlLayer.innerHTML = '';
  }

  function domNoteheads() {
    if (!host) return [];
    const origin = host.getBoundingClientRect();
    return [...host.querySelectorAll('.vf-notehead')].map(el => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - origin.left + host.scrollLeft,
        y: r.top - origin.top + host.scrollTop,
        w: Math.max(r.width, 10),
        h: Math.max(r.height, 8),
      };
    });
  }

  function walkGraphic() {
    const out = [];
    const list = osmd?.graphic?.measureList;
    if (!list) return out;
    const visit = measure => {
      if (!measure?.staffEntries) return;
      for (const se of measure.staffEntries) {
        const q = (se.absoluteTimestamp?.realValue ?? 0) * 4;
        for (const ve of se.graphicalVoiceEntries || []) {
          for (const gn of ve.notes || []) {
            const src = gn.sourceNote;
            if (!src || src.isRest?.()) continue;
            const midi = src.halfTone != null ? src.halfTone + 12 : null;
            out.push({ startQ: q, midi });
          }
        }
      }
    };
    for (const staff of list) {
      (Array.isArray(staff) ? staff : [staff]).forEach(visit);
    }
    return out;
  }

  function locateNotes() {
    const heads = domNoteheads();
    const graphic = walkGraphic();
    if (graphic.length && heads.length) {
      const n = Math.min(graphic.length, heads.length);
      const paired = [];
      for (let i = 0; i < n; i++) paired.push({ ...graphic[i], ...heads[i] });
      const used = new Set();
      return playNotes.map(note => {
        let best = -1, bestD = 1e9;
        paired.forEach((g, i) => {
          if (used.has(i)) return;
          const dq = Math.abs((g.startQ ?? 0) - note.startQ);
          const dm = g.midi != null ? Math.abs(g.midi - note.midi) : 0;
          const d = dq * 5 + dm * 0.2;
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best < 0) return null;
        used.add(best);
        return paired[best];
      });
    }
    return playNotes.map((_, i) => heads[i] || null);
  }

  function paintSpectrum(idx) {
    const layer = ensureHlLayer();
    if (!layer || !playNotes.length) return;
    const boxes = locateNotes();
    layer.innerHTML = '';
    for (let i = 0; i < LOOKAHEAD; i++) {
      const box = boxes[idx + i];
      if (!box) continue;
      const el = document.createElement('i');
      el.className = i === 0 ? 'cello-hl cello-hl--now' : 'cello-hl cello-hl--soon';
      const padX = 2, padY = 1.5;
      el.style.left = `${box.x - padX}px`;
      el.style.top = `${box.y - padY}px`;
      el.style.width = `${box.w + padX * 2}px`;
      el.style.height = `${box.h + padY * 2}px`;
      el.style.setProperty('--hl', String(Math.max(0.08, 1 - i / LOOKAHEAD)));
      el.style.setProperty('--hi', String(i));
      layer.appendChild(el);
    }
    layer.querySelector('.cello-hl--now')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  async function renderOsmd(el) {
    const ns = OSMD();
    if (!ns || !lastXml) return false;
    const Ctor = ns.OpenSheetMusicDisplay || ns;
    el.innerHTML = '';
    hlLayer = null;
    osmd = new Ctor(el, {
      autoResize: true,
      drawTitle: false,
      followCursor: true,
      drawingParameters: 'compact',
      cursorsOptions: [{ type: 1, color: '#D71921', alpha: 0, follow: true }],
      cursorOptions: [{ type: 1, color: '#D71921', alpha: 0, follow: true }],
    });
    await osmd.load(lastXml);
    await osmd.render();
    try { osmd.cursor?.hide?.(); } catch {}
    ensureHlLayer();
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
    const stave = new Stave(8, 10, w - 16)
      .addClef('bass')
      .addTimeSignature(`${meta.beats}/${meta.beatType}`);
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
    const voice = new Voice({ num_beats: meta.beats, beat_value: meta.beatType }).setStrict(false);
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
    while (cursorIdx < playNotes.length && playNotes[cursorIdx].startSec <= now) {
      const n = playNotes[cursorIdx];
      currentTarget = n.midi;
      if (onTarget) onTarget(n.midi);
      if (window.PitchDetect) window.PitchDetect.setTarget(n.midi);
      const dur = Math.min(Math.max(n.durSec, 0.12), 4);
      const gain = n.gain ?? 0.45;
      window.CelloEngine?.play(n.midi, dur, 0, gain);
      if (ensembleOn && window.CelloEngine?.getId?.() !== 'ensemble') {
        window.CelloEngine?.playEnsemble?.(n.midi, dur, 0, gain);
      }
      seekCursor(n.startQ);
      paintSpectrum(cursorIdx);
      if (onCursor) onCursor(cursorIdx, n);
      cursorIdx++;
    }
    if (cursorIdx >= playNotes.length) {
      const last = playNotes[playNotes.length - 1];
      if (last && now < last.startSec + last.durSec) {
        raf = requestAnimationFrame(loop);
        return;
      }
      playing = false;
      if (onEnd) onEnd();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function play(opts = {}) {
    if (!notes.length) return;
    lastBpm = opts.bpm || meta.bpm || 72;
    playNotes = materialize(notes, lastBpm);
    onTarget = opts.onTarget || null;
    onEnd = opts.onEnd || null;
    onCursor = opts.onCursor || null;
    ensembleOn = opts.ensemble !== false;
    if (paused && playing) {
      paused = false;
      t0 = performance.now();
      loop();
      return;
    }
    stop();
    playNotes = materialize(notes, lastBpm);
    ensembleOn = opts.ensemble !== false;
    playing = true;
    paused = false;
    const first = playNotes[0];
    pauseAccum = (opts.fromSounding && first) ? first.startSec : 0;
    t0 = performance.now();
    cursorIdx = 0;
    currentTarget = null;
    seekCursor(first?.startQ || 0);
    paintSpectrum(0);
    if (window.TrainerAudio?.setMetroMeter) window.TrainerAudio.setMetroMeter(meta.beats, meta.beatType);
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
    clearHighlight();
    window.PitchDetect?.setTarget(null);
  }

  function destroy() {
    stop();
    if (host) host.innerHTML = '';
    osmd = null;
    host = null;
    notes = [];
    playNotes = [];
    lastXml = null;
    meta = defaultMeta();
  }

  return {
    loadFile, loadUrl, loadXml, render, play, pause, stop, destroy,
    getNotes: () => notes,
    getFirstMidi: () => notes.find(n => n.midi != null)?.midi ?? null,
    getMeta: () => ({ ...meta, tempoMap: meta.tempoMap.slice() }),
    getCurrentTarget: () => currentTarget,
    isPlaying: () => playing && !paused,
    isPaused: () => playing && paused,
    isActive: () => playing,
    getElapsed: elapsed,
    hasXml: () => !!lastXml,
  };
})();

window.ScoreFollow = ScoreFollow;
