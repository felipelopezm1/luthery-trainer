/* CelloEngine — Karoryfer x bigcat cello is the intended SFZ source
   https://github.com/sfzinstruments/karoryfer-bigcat.cello
   Full bank is 126MB (Sforzando/Kontakt). v1 uses MusyngKite cello soundfont;
   drop trimmed SFZ samples in assets/cello-sfz/ later for sfizz WASM. */
const CelloEngine = (() => {
  let engine = 'osc';
  let ac = null;
  let inst = null;
  let ready = null;

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

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      if (window.sfizz || window.Sfizz) {
        engine = 'sfz';
        return engine;
      }
      if (typeof Soundfont !== 'undefined') {
        try {
          ensureCtx();
          inst = await Soundfont.instrument(ac, 'cello', { soundfont: 'MusyngKite' });
          engine = 'soundfont';
          return engine;
        } catch (e) {
          console.warn('[CelloEngine] soundfont cello failed', e);
        }
      }
      engine = 'osc';
      return engine;
    })();
    return ready;
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

  return { init, play, engineName: () => engine };
})();

window.CelloEngine = CelloEngine;
