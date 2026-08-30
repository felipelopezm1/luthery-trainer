/* PitchDetect — McLeod/YIN via pitchy, cello-range clamp, autocorrelation fallback */
const PitchDetect = (() => {
  const LISTEN_KEY = 'music_bele_cello_listen';
  let running = false;
  let stream = null;
  let analyser = null;
  let ac = null;
  let raf = null;
  let detector = null;
  let buf = null;
  let targetMidi = null;
  let last = null;
  let onPitch = null;
  let minHz = 65;
  let maxHz = 880;

  function midiFromHz(hz) {
    return Math.round(69 + 12 * Math.log2(hz / 440));
  }

  function centsOff(hz, midi) {
    const targetHz = 440 * Math.pow(2, (midi - 69) / 12);
    return Math.round(1200 * Math.log2(hz / targetHz));
  }

  function noteName(midi) {
    if (typeof window.midiLabel === 'function') return window.midiLabel(midi);
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function rms(samples) {
    let s = 0;
    for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
    return Math.sqrt(s / samples.length);
  }

  function autocorrPitch(samples, sampleRate) {
    const size = samples.length;
    let bestLag = -1, best = 0;
    const minLag = Math.floor(sampleRate / maxHz);
    const maxLag = Math.min(Math.floor(sampleRate / minHz), size - 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < size - lag; i++) corr += samples[i] * samples[i + lag];
      if (corr > best) { best = corr; bestLag = lag; }
    }
    if (bestLag < 0 || best < 0.01) return null;
    return sampleRate / bestLag;
  }

  function emit(payload) {
    last = payload;
    if (onPitch) onPitch(payload);
  }

  function tick() {
    if (!running || !analyser) return;
    analyser.getFloatTimeDomainData(buf);
    if (rms(buf) < 0.008) {
      raf = requestAnimationFrame(tick);
      return;
    }
    let hz = null, clarity = 0;
    if (detector) {
      const out = detector.findPitch(buf, ac.sampleRate);
      hz = out[0];
      clarity = out[1];
    } else {
      hz = autocorrPitch(buf, ac.sampleRate);
      clarity = hz ? 0.9 : 0;
    }
    if (hz && clarity >= 0.85 && hz >= minHz && hz <= maxHz) {
      const midi = midiFromHz(hz);
      const cents = targetMidi != null ? centsOff(hz, targetMidi) : centsOff(hz, midi);
      emit({
        hz, midi, note: noteName(midi), cents, confidence: clarity,
        hit: targetMidi != null ? Math.abs(cents) <= 40 : null,
        target: targetMidi,
      });
    }
    raf = requestAnimationFrame(tick);
  }

  async function start(opts = {}) {
    if (opts.onPitch !== undefined) onPitch = opts.onPitch;
    if (opts.minHz) minHz = opts.minHz;
    if (opts.maxHz) maxHz = opts.maxHz;
    if (running) return true;
    try {
      const media = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      stream = await Promise.race([
        media,
        new Promise((_, reject) => setTimeout(() => reject(new Error('mic-timeout')), 8000)),
      ]);
    } catch {
      emit({ error: 'denied' });
      return false;
    }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') await ac.resume();
    const src = ac.createMediaStreamSource(stream);
    analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    try {
      const { PitchDetector } = await import('https://esm.sh/pitchy@4');
      detector = PitchDetector.forFloat32Array(buf.length);
    } catch {
      detector = null;
    }
    running = true;
    tick();
    return true;
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (stream) stream.getTracks().forEach(tr => tr.stop());
    stream = null;
    if (ac && ac.state !== 'closed') ac.close().catch(() => {});
    ac = null;
    analyser = null;
    detector = null;
  }

  return {
    start,
    stop,
    setTarget(midi) { targetMidi = midi == null ? null : +midi; },
    getLast: () => last,
    isRunning: () => running,
    listenEnabled: () => localStorage.getItem(LISTEN_KEY) === '1',
    setListenEnabled(on) { localStorage.setItem(LISTEN_KEY, on ? '1' : '0'); },
  };
})();

window.PitchDetect = PitchDetect;
