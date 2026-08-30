/* CelloEngine — string-family tones for the cello room.
   Karoryfer × bigcat cello is the intended SFZ source
   https://github.com/sfzinstruments/karoryfer-bigcat.cello
   v1 uses MusyngKite soundfonts; drop trimmed SFZ samples in assets/cello-sfz/ later. */
const CelloEngine = (() => {
  const STRINGS = [
    { id: 'cello', sf: 'cello', midi: 45 },
    { id: 'viola', sf: 'viola', midi: 57 },
    { id: 'violin', sf: 'violin', midi: 69 },
    { id: 'bass', sf: 'contrabass', midi: 33 },
    { id: 'pizz', sf: 'pizzicato_strings', midi: 57 },
    { id: 'ensemble', sf: 'string_ensemble_1', midi: 60 },
  ];
  const STORE = 'music_bele_cello_string';

  let engine = 'osc';
  let ac = null;
  let inst = null;
  let ready = null;
  let currentId = localStorage.getItem(STORE) || 'cello';

  function defOf(id) {
    return STRINGS.find(s => s.id === id) || STRINGS[0];
  }

  function ensureCtx() {
    if (window.TrainerAudio?.getContext) {
      try {
        const ctx = window.TrainerAudio.getContext();
        if (ctx) { ac = ctx; return ac; }
      } catch {}
    }
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function oscPlay(midi, dur, when, gain) {
    const ctx = ensureCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.value = 0;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * 0.28, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  async function load(id, preview) {
    const def = defOf(id);
    currentId = def.id;
    localStorage.setItem(STORE, def.id);
    ready = (async () => {
      if (typeof Soundfont === 'undefined') {
        engine = 'osc';
        inst = null;
        return engine;
      }
      try {
        ensureCtx();
        inst = await Soundfont.instrument(ac, def.sf, { soundfont: 'MusyngKite' });
        engine = 'soundfont';
      } catch (e) {
        console.warn('[CelloEngine] soundfont', def.sf, e);
        inst = null;
        engine = 'osc';
      }
      return engine;
    })();
    await ready;
    if (preview) play(def.midi, 0.7, 0, 0.55);
    return engine;
  }

  async function init() {
    return load(currentId, false);
  }

  function play(midi, dur = 0.8, when = 0, gain = 0.7) {
    if (inst) {
      inst.play(midi, (ac?.currentTime || 0) + when, { duration: dur, gain });
      return;
    }
    if (window.TrainerAudio?.playMidi) {
      window.TrainerAudio.playMidi(midi, dur, when, gain);
      return;
    }
    oscPlay(midi, dur, when, gain);
  }

  return {
    init, load, play,
    list: () => STRINGS.slice(),
    getId: () => currentId,
    engineName: () => engine,
  };
})();

window.CelloEngine = CelloEngine;
