/* TrainerAudio — soundfonts, visualizer, Web MIDI, target comparison */

const TrainerAudio = (() => {
  const INSTRUMENTS = [
    { id: 'piano', label: 'Piano', sf: 'acoustic_grand_piano' },
    { id: 'wind', label: 'Viento', sf: 'flute' },
    { id: 'brass', label: 'Metal', sf: 'trumpet' },
    { id: 'strings', label: 'Cuerdas', sf: 'violin' },
    { id: 'guitar', label: 'Guitarra', sf: 'acoustic_guitar_nylon' },
    { id: 'organ', label: 'Acordes', sf: 'church_organ' }
  ];

  const NOTE_NAMES = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
  const INSTR_KEY = 'music_bele_instr';
  const SF_PACK = 'MusyngKite';

  let ac = null, master = null, analyser = null;
  let instrument = null, loading = false, loadPromise = null;
  let currentId = localStorage.getItem(INSTR_KEY) || 'piano';
  let midiAccess = null, activeInput = null, animId = null;
  let target = null; // { type, midis, label, chordName }
  let lastUser = null;
  let compareResult = null; // { ok, msg }
  let activeNotes = new Set();

  function midiToLabel(m) {
    const pc = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    return `${NOTE_NAMES[pc]}${oct}`;
  }

  function ensureCtx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.85;
      analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      master.connect(analyser);
      analyser.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  async function loadInstrument(id) {
    if (typeof Soundfont === 'undefined') return null;
    const def = INSTRUMENTS.find(i => i.id === id) || INSTRUMENTS[0];
    currentId = id;
    loading = true;
    renderInstruments();
    const job = (async () => {
      try {
        ensureCtx();
        instrument = await Soundfont.instrument(ac, def.sf, {
          soundfont: SF_PACK,
          destination: master,
        });
        localStorage.setItem(INSTR_KEY, id);
        setInstrStatus(`${def.label} listo`);
      } catch (e) {
        console.warn('Soundfont load failed', def.sf, e);
        instrument = null;
        setInstrStatus('Error al cargar · pulso sintético');
      } finally {
        loading = false;
        loadPromise = null;
        renderInstruments();
      }
      return instrument;
    })();
    loadPromise = job;
    return job;
  }

  function whenReady(fn) {
    if (loadPromise) loadPromise.then(fn);
    else fn();
  }

  function playMidi(m, dur = 1.1, when = 0, gain = 0.7) {
    whenReady(() => {
      ensureCtx();
      flashKey(m, 'target');
      if (instrument) {
        instrument.play(m, ac.currentTime + when, { duration: dur, gain });
      } else {
        oscPlay(m, dur, when, gain);
      }
      pulseViz();
    });
  }

  function playMidis(arr, gap = 0.1, dur = 1.2, block = false) {
    if (block) arr.forEach(m => playMidi(m, dur, 0, 0.55));
    else arr.forEach((m, i) => playMidi(m, dur, i * gap, 0.65));
  }

  function oscPlay(m, dur, when, gain) {
    const ctx = ensureCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = 'triangle';
    o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * 0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function playFreq(freq, start, dur, vol = 0.4) {
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    playMidi(midi, dur, start, vol);
  }

  function playMelody(midis, gap = 0.32, dur = 0.28) {
    midis.forEach((m, i) => playMidi(m, dur, i * gap, 0.55));
  }

  function playChord(root, ivs, block) {
    const midis = ivs.map(iv => root + iv);
    playMidis(midis, block ? 0 : 0.12, block ? 1.6 : 1.3, block);
  }

  /* ── target & comparison ── */
  function setTarget(t) {
    target = t;
    lastUser = null;
    compareResult = null;
    updateCompareUI();
    drawKeyboard();
  }

  function clearTarget() {
    setTarget(null);
  }

  function compareNote(userMidi) {
    if (!target) return;
    lastUser = userMidi;
    if (target.type === 'note') {
      const t = target.midis[0];
      const ok = userMidi === t || (target.pitchClass && (userMidi % 12) === (t % 12));
      compareResult = {
        ok,
        msg: ok
          ? `✓ ${midiToLabel(userMidi)} coincide con ${target.label || midiToLabel(t)}`
          : `✗ ${midiToLabel(userMidi)} · objetivo ${target.label || midiToLabel(t)}`
      };
    } else if (target.type === 'chord') {
      const pcs = target.midis.map(m => m % 12);
      const ok = pcs.includes(userMidi % 12);
      compareResult = {
        ok,
        msg: ok
          ? `✓ ${midiToLabel(userMidi)} pertenece al acorde ${target.chordName || ''}`
          : `✗ ${midiToLabel(userMidi)} no está en ${target.chordName || 'el acorde'}`
      };
    } else if (target.type === 'melody') {
      compareResult = { ok: null, msg: `Entrada: ${midiToLabel(userMidi)} · sigue la melodía en partitura` };
    }
    updateCompareUI();
    flashKey(userMidi, compareResult.ok ? 'match' : 'miss');
  }

  /* ── Web MIDI (LPK25 etc.) ── */
  async function connectMidi() {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus('Web MIDI no soportado en este navegador');
      return;
    }
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      bindMidiInputs();
      midiAccess.onstatechange = bindMidiInputs;
      setMidiStatus(activeInput ? activeInput.name : 'Conecta tu LPK25…');
    } catch (e) {
      setMidiStatus('Permiso MIDI denegado');
    }
  }

  function bindMidiInputs() {
    if (!midiAccess) return;
    if (activeInput) activeInput.onmidimessage = null;
    activeInput = null;
    for (const input of midiAccess.inputs.values()) {
      activeInput = input;
      input.onmidimessage = onMidi;
      break;
    }
    setMidiStatus(activeInput ? `MIDI · ${activeInput.name}` : 'Sin controlador MIDI');
    renderMidiSelect();
  }

  function onMidi(e) {
    const [st, n, v] = e.data;
    if (st >= 144 && st <= 159 && v > 0) {
      playUserNote(n, v / 127);
      compareNote(n);
    } else if ((st >= 128 && st <= 143) || (st >= 144 && st <= 159 && v === 0)) {
      releaseUserNote(n);
    }
  }

  function playUserNote(m, gain = 0.75) {
    activeNotes.add(m);
    flashKey(m, 'user');
    if (instrument) instrument.play(m, ac.currentTime, { duration: 1.8, gain: gain * 0.8 });
    else oscPlay(m, 1.2, 0, gain * 0.5);
    pulseViz();
    drawKeyboard();
  }

  function releaseUserNote(m) {
    activeNotes.delete(m);
    drawKeyboard();
  }

  function setMidiStatus(txt) {
    const el = document.getElementById('midi-status');
    if (el) el.textContent = txt;
  }

  function renderMidiSelect() {
    const sel = document.getElementById('midi-select');
    if (!sel || !midiAccess) return;
    sel.innerHTML = '';
    let has = false;
    for (const input of midiAccess.inputs.values()) {
      has = true;
      const o = document.createElement('option');
      o.value = input.id;
      o.textContent = input.name || input.id;
      o.selected = activeInput && input.id === activeInput.id;
      sel.appendChild(o);
    }
    if (!has) {
      const o = document.createElement('option');
      o.textContent = 'Ningún dispositivo';
      sel.appendChild(o);
    }
  }

  /* ── visualization ── */
  const keyMin = 48, keyMax = 84;
  let pulse = 0;

  function pulseViz() { pulse = 1; }

  function startVizLoop() {
    if (animId) return;
    const wave = document.getElementById('viz-wave');
    const spec = document.getElementById('viz-spec');
    if (!wave || !spec) return;
    const wctx = wave.getContext('2d');
    const sctx = spec.getContext('2d');
    const timeData = new Uint8Array(analyser ? analyser.frequencyBinCount : 1024);
    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 1024);

    function frame() {
      animId = requestAnimationFrame(frame);
      const W = wave.width = wave.clientWidth * devicePixelRatio;
      const H = wave.height = wave.clientHeight * devicePixelRatio;
      const SW = spec.width = spec.clientWidth * devicePixelRatio;
      const SH = spec.height = spec.clientHeight * devicePixelRatio;

      if (analyser) {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);
      }

      const style = getComputedStyle(document.documentElement);
      const fg = style.getPropertyValue('--display').trim() || '#fff';
      const muted = style.getPropertyValue('--line-2').trim() || '#333';
      const accent = style.getPropertyValue('--accent').trim() || '#D71921';
      const bg = 'transparent';

      wctx.clearRect(0, 0, W, H);
      wctx.fillStyle = bg;
      wctx.fillRect(0, 0, W, H);
      wctx.lineWidth = 1.5 * devicePixelRatio;
      wctx.strokeStyle = fg;
      wctx.beginPath();
      const slice = W / timeData.length;
      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) wctx.moveTo(0, y);
        else wctx.lineTo(i * slice, y);
      }
      wctx.stroke();

      if (pulse > 0) {
        wctx.strokeStyle = accent;
        wctx.globalAlpha = pulse * 0.35;
        wctx.stroke();
        wctx.globalAlpha = 1;
        pulse = Math.max(0, pulse - 0.06);
      }

      sctx.clearRect(0, 0, SW, SH);
      const bars = 48;
      const step = Math.floor(freqData.length / bars);
      const bw = SW / bars - 2;
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += freqData[i * step + j];
        const h = (sum / step / 255) * SH;
        sctx.fillStyle = i < 4 ? accent : fg;
        sctx.globalAlpha = 0.15 + (h / SH) * 0.85;
        sctx.fillRect(i * (bw + 2), SH - h, bw, h);
      }
      sctx.globalAlpha = 1;
    }
    frame();
  }

  const keyFlash = {};
  function flashKey(m, kind) {
    keyFlash[m] = { kind, t: performance.now() };
    drawKeyboard();
  }

  function drawKeyboard() {
    const kb = document.getElementById('viz-keyboard');
    if (!kb) return;
    kb.innerHTML = '';
    for (let m = keyMin; m <= keyMax; m++) {
      const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
      const key = document.createElement('div');
      key.className = 'vkey' + (isBlack ? ' black' : ' white');
      key.dataset.midi = m;
      if (target && target.midis.includes(m)) key.classList.add('target');
      if (target && target.midis.some(t => t % 12 === m % 12) && !target.midis.includes(m))
        key.classList.add('target-pc');
      if (activeNotes.has(m)) key.classList.add('user');
      if (lastUser === m) key.classList.add(compareResult?.ok ? 'match' : 'miss');
      const fl = keyFlash[m];
      if (fl && performance.now() - fl.t < 400) key.classList.add('flash-' + fl.kind);
      kb.appendChild(key);
    }
  }

  function updateCompareUI() {
    const tgt = document.getElementById('compare-target');
    const usr = document.getElementById('compare-user');
    const res = document.getElementById('compare-result');
    if (!tgt) return;
    if (!target) {
      tgt.textContent = '—';
      if (usr) usr.textContent = '—';
      if (res) { res.textContent = 'Selecciona un ejercicio con audio'; res.className = 'compare-result'; }
      return;
    }
    tgt.textContent = target.label || target.midis.map(midiToLabel).join(' · ');
    if (usr) usr.textContent = lastUser != null ? midiToLabel(lastUser) : 'Toca en LPK25 o escucha';
    if (res && compareResult) {
      res.textContent = compareResult.msg;
      res.className = 'compare-result ' + (compareResult.ok ? 'ok' : compareResult.ok === false ? 'no' : '');
    }
  }

  function setInstrStatus(txt) {
    const el = document.getElementById('instr-status');
    if (el) el.textContent = txt;
  }

  function renderInstruments() {
    const wrap = document.getElementById('instr-tabs');
    if (!wrap) return;
    wrap.innerHTML = INSTRUMENTS.map(i => {
      const on = currentId === i.id;
      const busy = on && loading;
      return `<button type="button" class="chip ${on ? 'on' : ''}${busy ? ' loading' : ''}" data-instr="${i.id}" ${loading ? 'disabled' : ''} aria-busy="${busy}">${i.label}${busy ? '…' : ''}</button>`;
    }).join('');
  }

  function initPanel() {
    renderInstruments();
    drawKeyboard();
    updateCompareUI();
    startVizLoop();
    const def = INSTRUMENTS.find(i => i.id === currentId) || INSTRUMENTS[0];
    setInstrStatus(`Cargando ${def.label}…`);
    loadInstrument(currentId);
  }

  function bindUI() {
    document.getElementById('instr-tabs')?.addEventListener('click', e => {
      const b = e.target.closest('[data-instr]');
      if (b && !loading) loadInstrument(b.dataset.instr);
    });
    document.getElementById('midi-connect')?.addEventListener('click', connectMidi);
    document.getElementById('midi-select')?.addEventListener('change', e => {
      if (!midiAccess) return;
      for (const input of midiAccess.inputs.values()) {
        if (input.id === e.target.value) {
          if (activeInput) activeInput.onmidimessage = null;
          activeInput = input;
          input.onmidimessage = onMidi;
          setMidiStatus(`MIDI · ${input.name}`);
          break;
        }
      }
    });
    document.getElementById('viz-keyboard')?.addEventListener('click', e => {
      const k = e.target.closest('.vkey');
      if (!k) return;
      const m = +k.dataset.midi;
      playUserNote(m);
      if (target) compareNote(m);
    });
  }

  return {
    init() { ensureCtx(); bindUI(); initPanel(); },
    playMidi, playMidis, playMelody, playChord, playFreq,
    setTarget, clearTarget, compareNote,
    connectMidi, midiToLabel,
    getInstrumentId: () => currentId,
    getInstruments: () => INSTRUMENTS,
    loadInstrument,
    whenReady,
  };
})();

function keyToMidiGlobal(key) {
  const m = key.match(/^([a-g])(#|b)?\/(\d)$/);
  if (!m) return 60;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]];
  let semi = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (parseInt(m[3], 10) + 1) * 12 + semi;
}

window.TrainerAudio = TrainerAudio;
