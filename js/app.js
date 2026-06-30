/* Entrenador Musical BELE — paginated · difficulty tiers · interactive drills */

const HIST_KEY = 'music_bele_v3';
const LEVEL_KEY = 'music_bele_level';
const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

const LEVELS = ['easy', 'medium', 'hard'];
const DIFF = {
  easy:   { label: 'Fácil',   count: 5,  opts: 4, listens: 99, timer: 0,  chordBlock: false, errLen: 4, teoTier: 1 },
  medium: { label: 'Medio',   count: 10, opts: 4, listens: 3,  timer: 45, chordBlock: false, errLen: 6, teoTier: 2 },
  hard:   { label: 'Difícil', count: 15, opts: 6, listens: 2,  timer: 25, chordBlock: true,  errLen: 8, teoTier: 3 }
};
const LEVEL_LECT = { easy: 'basico', medium: 'medio', hard: 'avanzado' };
const MOD_SEC = { ritmo: 'rt', errores: 'err', acordes: 'ac', lectura: 'lect', teoria: 'teo' };

function cfg() {
  const base = DIFF[state.level];
  return { ...base, label: t('diff_' + state.level) };
}
function exCount() { return cfg().count; }

/* ── persistence ── */
function nH() {
  return {
    log: [], scores: { lect: { c: 0, t: 0 }, ac: { c: 0, t: 0 }, rt: { c: 0, t: 0 }, teo: { c: 0, t: 0 }, err: { c: 0, t: 0 } },
    streak: 0, best: 0, noteErr: {}, byLevel: { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } }
  };
}
function loadH() { try { return { ...nH(), ...JSON.parse(localStorage.getItem(HIST_KEY)) }; } catch { return nH(); } }
function saveH(skipSync) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(H)); } catch {}
  if (!skipSync && window.BeleSync) window.BeleSync.schedulePush(() => H, () => state.level);
}
function loadLevel() { try { return localStorage.getItem(LEVEL_KEY) || 'medium'; } catch { return 'medium'; } }
function saveLevel(skipSync) {
  try { localStorage.setItem(LEVEL_KEY, state.level); } catch {}
  if (!skipSync && window.BeleSync) window.BeleSync.schedulePush(() => H, () => state.level);
}
let H = loadH();

function logA(sec, ok, lbl) {
  H.scores[sec].t++;
  H.byLevel[state.level].t++;
  if (ok) {
    H.scores[sec].c++; H.byLevel[state.level].c++;
    H.streak++; if (H.streak > H.best) H.best = H.streak;
  } else {
    H.streak = 0;
    if (sec === 'lect' && lbl) H.noteErr[lbl] = (H.noteErr[lbl] || 0) + 1;
  }
  H.log.unshift({ sec, ok, lbl, lvl: state.level, ts: Date.now() });
  if (H.log.length > 120) H.log = H.log.slice(0, 120);
  if (state.run?.sec === sec) state.run.answers.push({ ok, lbl });
  saveH(); updSc();
  if (window.StatsViz) window.StatsViz.refresh();
}

function updSc() {
  ['lect', 'ac', 'rt', 'teo'].forEach(s => {
    const id = s === 'lect' ? 'sc-lect' : 'sc-' + s;
    const el = document.getElementById(id);
    if (el) el.textContent = `${H.scores[s].c}/${H.scores[s].t}`;
  });
  const errEl = document.getElementById('sc-err');
  if (errEl) errEl.textContent = `${H.scores.err.c}/${H.scores.err.t}`;
}

/* ── session (per exercise page) ── */
function resetSession() {
  if (state.session.interval) clearInterval(state.session.interval);
  state.session = { answered: false, listens: 0, remaining: cfg().timer, interval: null };
  if (cfg().timer > 0 && isExercisePage()) startTimer();
}

function startTimer() {
  const el = document.getElementById('timer-val');
  if (!el) return;
  state.session.interval = setInterval(() => {
    state.session.remaining--;
    const t = document.getElementById('timer-val');
    if (t) t.textContent = Math.max(0, state.session.remaining);
    const bar = document.getElementById('timer-bar');
    if (bar) bar.style.width = `${(state.session.remaining / cfg().timer) * 100}%`;
    if (state.session.remaining <= 0) {
      clearInterval(state.session.interval);
      if (!state.session.answered) timeoutAnswer();
    }
  }, 1000);
}

function timeoutAnswer() {
  state.session.answered = true;
  const fb = document.querySelector('.exercise-panel .feedback');
  if (fb) { fb.className = 'feedback show no'; fb.textContent = t('timeout'); }
  document.querySelectorAll('.exercise-panel .opt-btn').forEach(b => {
    b.disabled = true;
    if (String(btnValue(b)) === String(b.dataset.correct)) b.classList.add('correct');
  });
  document.querySelectorAll('[data-nav="next"]').forEach(b => b.disabled = false);
  if (state.mod === 'ritmo') rhythmVexReveal(true);
  maybeAdvanceRun();
}

function useListen() {
  state.session.listens++;
  updListenUI();
}

function updListenUI() {
  const max = cfg().listens;
  const left = max >= 99 ? '∞' : Math.max(0, max - state.session.listens);
  document.querySelectorAll('[data-listen-left]').forEach(el => { el.textContent = left; });
  if (max < 99 && state.session.listens >= max) {
    document.querySelectorAll('[data-play]').forEach(b => { b.disabled = true; });
  }
}

let advanceTimer = null;

function clearAdvanceTimer() {
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
}

function maybeAdvanceRun() {
  const m = moduleMeta(state.mod);
  if (!isExercisePage()) return;
  clearAdvanceTimer();
  const targetPage = state.page;
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    goPage(targetPage === m.results - 1 ? m.results : targetPage + 1);
  }, 700);
}

function canListen() { return cfg().listens >= 99 || state.session.listens < cfg().listens; }

/* ── audio ── */
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function keyToMidi(key) {
  const m = key.match(/^([a-g])(#|b)?\/(\d)$/);
  if (!m) return 60;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]];
  let semi = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (parseInt(m[3], 10) + 1) * 12 + semi;
}
function midiToVexKey(m) {
  const oct = Math.floor(m / 12) - 1;
  const chrom = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  return `${chrom[((m % 12) + 12) % 12]}/${oct}`;
}
function playNote(freq, start, dur, vol = 0.4, type = 'triangle') {
  if (window.TrainerAudio) {
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    window.TrainerAudio.playMidi(midi, dur, start, vol);
    return;
  }
  const ctx = getAudio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type; o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.setValueAtTime(vol, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.start(t); o.stop(t + dur);
}
function playMidi(m, start, dur, vol = 0.55) {
  if (window.TrainerAudio) { window.TrainerAudio.playMidi(m, dur, start, vol); return; }
  playNote(mf(m), start, dur, vol);
}
function playChord(root, ivs, block) {
  if (window.TrainerAudio) { window.TrainerAudio.playChord(root, ivs, block); return; }
  if (block) ivs.forEach(iv => playNote(mf(root + iv), 0, 1.6, 0.32));
  else ivs.forEach((iv, i) => playNote(mf(root + iv), i * 0.1, 1.4, 0.34));
}
function playMelody(midis, gap = 0.32, dur = 0.28) {
  if (window.TrainerAudio) { window.TrainerAudio.playMelody(midis, gap, dur); return; }
  midis.forEach((m, i) => playNote(mf(m), i * gap, dur, 0.4));
}
function animWave(id, ms) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = '0%';
  const start = performance.now();
  (function step(now) {
    const pct = Math.min((now - start) / ms * 100, 100);
    el.style.width = pct + '%';
    if (pct < 100) requestAnimationFrame(step);
    else el.style.width = '0%';
  })(start);
}

/* ── vexflow ── */
function vexW() {
  const stage = document.getElementById('page-stage');
  return Math.min(Math.max((stage?.clientWidth || 560) - 32, 260), 640);
}
function makeRenderer(el, w, h) {
  el.innerHTML = '';
  const r = new Renderer(el, Renderer.Backends.SVG);
  r.resize(w, h);
  return r;
}
function drawSingleNote(el, key, acc, highlight) {
  const w = Math.min(vexW(), 300);
  const r = makeRenderer(el, w, 100);
  const ctx = r.getContext();
  const stave = new Stave(10, 10, w - 30).addClef('treble').addTimeSignature('4/4');
  stave.setContext(ctx).draw();
  const n = new StaveNote({ clef: 'treble', keys: [key], duration: 'w' });
  if (acc) n.addModifier(new Accidental(acc));
  n.setStyle({ fillStyle: highlight || '#EDEDED', strokeStyle: highlight || '#EDEDED' });
  const voice = new Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables([n]);
  new Formatter().joinVoices([voice]).format([voice], w - 50);
  voice.draw(ctx, stave);
}
function drawRhythmVex(el, durs, ts, revealTs = false) {
  const w = vexW(), h = 115;
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 20).addClef('treble');
  if (revealTs) stave.addTimeSignature(ts);
  stave.setContext(ctx).draw();
  const notes = durs.map(d => {
    const base = d.endsWith('d') ? d.slice(0, -1) : d;
    return new StaveNote({ clef: 'treble', keys: ['b/4'], duration: base, stem_direction: 1 });
  });
  const [nb, bv] = ts.split('/').map(Number);
  const voice = new Voice({ num_beats: nb, beat_value: bv }).setStrict(false);
  voice.addTickables(notes);
  try { new Formatter().joinVoices([voice]).format([voice], w - 90); } catch {}
  voice.draw(ctx, stave);
}

function rhythmVexReveal(reveal) {
  const wrap = document.getElementById('vex-rt-wrap');
  const el = document.getElementById('vex-rt');
  const r = state.rt.series[exerciseIndex()];
  if (!el || !r) return;
  if (wrap) wrap.classList.toggle('revealed', reveal);
  try { drawRhythmVex(el, r.dur, r.ts, reveal); } catch (e) { el.innerHTML = ''; }
}
function drawMelodyVex(el, notes) {
  const w = vexW(), h = 130;
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 20).addClef('treble').addTimeSignature('4/4');
  stave.setContext(ctx).draw();
  const vexNotes = notes.map(n => {
    const sn = new StaveNote({ clef: 'treble', keys: [n.key], duration: n.dur || '8', stem_direction: 1 });
    if (n.acc) sn.addModifier(new Accidental(n.acc));
    return sn;
  });
  const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(vexNotes);
  try { new Formatter().joinVoices([voice]).format([voice], w - 70); } catch {}
  voice.draw(ctx, stave);
}

/* ── data ── */
const NOTE_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const DIATONIC_SEMI = [0, 2, 4, 5, 7, 9, 11];
const NOTES_ALL = [];
for (let o = 3; o <= 6; o++)
  for (let n = 0; n < 7; n++)
    NOTES_ALL.push({
      name: `${NOTE_NAMES[n]}${o}`,
      key: `${'cderfgab'[n]}/${o}`,
      midi: (o + 1) * 12 + DIATONIC_SEMI[n],
    });

const DIFF_SETS = {
  basico: ['Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5','Fa5','Sol5'],
  medio: ['Do4','Re4','Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5','Fa5','Sol5','La5','Si5'],
  avanzado: NOTES_ALL.map(n => n.name)
};

function noteByName(name) {
  return NOTES_ALL.find(x => x.name === name) || null;
}

const CT = [
  { name: 'Mayor', iv: [0, 4, 7] },
  { name: 'menor', iv: [0, 3, 7] },
  { name: 'Disminuido', iv: [0, 3, 6] },
  { name: 'Aumentado', iv: [0, 4, 8] }
];
const RMIDI = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];

const RHYTHMS = [
  { dur: ['q','q','q','q'], ts: '4/4', beats: [.5,.5,.5,.5], label: '4/4', tier: 1 },
  { dur: ['q','q','q'], ts: '3/4', beats: [.5,.5,.5], label: '3/4', tier: 1 },
  { dur: ['q','q'], ts: '2/4', beats: [.5,.5], label: '2/4', tier: 1 },
  { dur: ['h','h'], ts: '4/4', beats: [1, 1], label: '4/4', tier: 1 },
  { dur: ['qd','e','qd','e'], ts: '6/8', beats: [.75,.25,.75,.25], label: '6/8', tier: 2 },
  { dur: ['h','q','h','q'], ts: '3/2', beats: [1,.5,1,.5], label: '3/2', tier: 2 },
  { dur: ['e','e','e','e','e','e','e','e'], ts: '2/4', beats: [.25,.25,.25,.25,.25,.25,.25,.25], label: '2/4', tier: 2 },
  { dur: ['q','e','e','q','q'], ts: '6/8', beats: [.5,.25,.25,.5,.5], label: '6/8', tier: 3 },
  { dur: ['q','q','q','q','q','q'], ts: '9/8', beats: [.33,.33,.34,.33,.33,.34], label: '9/8', tier: 3 },
  { dur: ['16','16','16','16','q','q'], ts: '3/4', beats: [.125,.125,.125,.125,.5,.5], label: '3/4', tier: 3 },
  { dur: ['q','q','q','q'], ts: '2/2', beats: [.5,.5,.5,.5], label: '2/2', tier: 3 },
  { dur: ['e','q','e','q','e','q'], ts: '12/8', beats: [.25,.5,.25,.5,.25,.5], label: '12/8', tier: 3 }
];

const TEO_Q = [
  { q: '¿Cuántos semitonos tiene una 3ª mayor?', opts: ['3','4','5','2'], a: 1, cat: 'Intervalos', tier: 1 },
  { q: '¿Cuántos semitonos tiene una 3ª menor?', opts: ['3','4','2','5'], a: 0, cat: 'Intervalos', tier: 1 },
  { q: 'Un acorde tríada Mayor tiene la fórmula…', opts: ['3ªM + 5ªJ','3ªm + 5ªJ','3ªm + 5ªdim','3ªM + 5ªaum'], a: 0, cat: 'Acordes', tier: 1 },
  { q: 'En clave de Sol, las líneas (de abajo arriba) son…', opts: ['Mi Sol Si Re Fa','Fa La Do Mi Sol','Do Mi Sol Si La','Re Fa La Do Mi'], a: 0, cat: 'Clave de Sol', tier: 1 },
  { q: 'En el examen b.1, ¿cuántos errores hay que localizar?', opts: ['5','4','3','10'], a: 0, cat: 'Examen BELE', tier: 1 },
  { q: 'Un acorde disminuido contiene…', opts: ['3ªm + 5ªdim','3ªM + 5ªJ','3ªm + 5ªJ','3ªM + 5ªaum'], a: 0, cat: 'Acordes', tier: 2 },
  { q: 'En La menor armónica, el VIIº grado se eleva a…', opts: ['Sol♯','Fa♯','Si♭','Do♯'], a: 0, cat: 'Menor armónica', tier: 2 },
  { q: 'Los espacios en clave de Sol (de abajo arriba) son…', opts: ['Fa La Do Mi','Mi Sol Si Re','La Do Mi Sol','Do Re Mi Fa'], a: 0, cat: 'Clave de Sol', tier: 2 },
  { q: 'En 6/8 compuesto, el pulso equivale a…', opts: ['Negra con puntillo','Corchea','Blanca','Semicorchea'], a: 0, cat: 'Compases', tier: 2 },
  { q: 'En b.1, el fragmento se escucha…', opts: ['4 veces','2 veces','1 vez','5 veces'], a: 0, cat: 'Examen BELE', tier: 2 },
  { q: '2/2 (alla breve) tiene pulso de…', opts: ['Blanca','Negra','Corchea','Redonda'], a: 0, cat: 'Compases', tier: 2 },
  { q: 'Do central en clave de Sol está en…', opts: ['1ª línea adicional inferior','2ª línea','3ª línea','4ª línea'], a: 0, cat: 'Clave de Sol', tier: 2 },
  { q: 'Diferencia sonora clave entre Mayor y menor…', opts: ['3ª mayor vs 3ª menor','5ª justa vs 5ª dism','Tritono vs octava','2ª mayor vs 2ª menor'], a: 0, cat: 'Acordes', tier: 3 },
  { q: 'En 9/8 compuesto, ¿cuántos pulsos tiene un compás?', opts: ['3','2','4','9'], a: 0, cat: 'Compases', tier: 3 },
  { q: 'Un error cromático en b.1 implica…', opts: ['±1 semitono de altura','Cambio de compás','Cambio de ritmo','±2 tonos diatónicos'], a: 0, cat: 'Examen BELE', tier: 3 },
  { q: 'La sensible en menor armónica crea intervalo de…', opts: ['2 semitonos al tónico','3 semitonos al tónico','Tritono con la dominante','Unísono'], a: 0, cat: 'Menor armónica', tier: 3 },
  { q: 'Cada acorde acertado en b.2 vale…', opts: ['0,25 pt','0,5 pt','1 pt','0,1 pt'], a: 0, cat: 'Examen BELE', tier: 2 },
  { q: 'Equivalencia: 6/8 a un tiempo ≈ …', opts: ['3/8 a un tiempo','4/4','2/2','5/4'], a: 0, cat: 'Compases', tier: 3 },
  { q: 'Un acorde aumentado tiene 5ª…', opts: ['Aumentada (+8 semitonos)','Justa','Disminuida','Menor'], a: 0, cat: 'Acordes', tier: 3 },
  { q: 'La prueba de lenguaje musical vale…', opts: ['10 puntos','20 puntos','5 puntos','2,5 puntos'], a: 0, cat: 'Examen BELE', tier: 1 }
];

const SCALE = [0, 2, 4, 5, 7, 9, 11];
function genErrExercise(len, level) {
  const base = 60 + Math.floor(Math.random() * 5) * 2;
  const steps = Array.from({ length: len }, () => SCALE[Math.floor(Math.random() * SCALE.length)]);
  let midi = base;
  const written = [], played = [];
  steps.forEach(s => {
    midi = Math.max(48, Math.min(84, midi + s - 2));
    written.push({ key: midiToVexKey(midi), dur: '8' });
    played.push(midi);
  });
  const errIdx = 1 + Math.floor(Math.random() * (len - 2));
  const semi = level === 'easy' ? (Math.random() < 0.5 ? -2 : 2) : (Math.random() < 0.5 ? -1 : 1);
  played[errIdx] = Math.max(48, Math.min(84, played[errIdx] + semi));
  return { written, played, errIdx, semi, errDesc: '' };
}
function noteByMidi(key) {
  return NOTES_ALL.find(n => n.key === key) || { name: key, key, midi: keyToMidi(key) };
}
function noteByMidiNum(m) {
  return NOTES_ALL.find(n => n.midi === m) || { name: `M${m}`, midi: m };
}

/* ── state ── */
const state = {
  mod: 'inicio', page: 0, level: loadLevel(),
  session: { answered: false, listens: 0, remaining: 0, interval: null },
  lect: { series: [] },
  ac: { series: [] },
  rt: { series: [] },
  err: { series: [] },
  teo: { order: [] },
  run: null
};

function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function pickSeries(pool, n) {
  const s = shuffle(pool), out = [];
  for (let i = 0; i < n; i++) {
    let item = s[i % s.length];
    if (out.length && out[out.length - 1] === item) item = s[(i + 1) % s.length];
    out.push(item);
  }
  return out;
}

function rhythmsForLevel() {
  const maxTier = state.level === 'easy' ? 1 : state.level === 'medium' ? 2 : 3;
  return RHYTHMS.filter(r => r.tier <= maxTier);
}

function moduleMeta(mod) {
  if (mod === 'teoria') return { prep: 0, exStart: 1, results: 1 + exCount() };
  return { prep: 1, exStart: 2, results: 2 + exCount() };
}

function pageCount(mod) {
  if (mod === 'inicio') return 3;
  if (mod === 'historial') return 1;
  if (mod === 'teoria') return 2 + exCount();
  return 3 + exCount();
}

function isExercisePage() {
  if (['inicio', 'historial'].includes(state.mod)) return false;
  const m = moduleMeta(state.mod);
  return state.page >= m.exStart && state.page < m.results;
}

function isResultsPage() {
  if (['inicio', 'historial'].includes(state.mod)) return false;
  return state.page === moduleMeta(state.mod).results;
}

function exerciseItemNum() {
  const m = moduleMeta(state.mod);
  return state.page - m.exStart + 1;
}

function exerciseIndex() {
  return state.page - moduleMeta(state.mod).exStart;
}

function beginRun(sec) {
  state.run = { sec, answers: [], level: state.level, mod: state.mod };
}

function renderRunResults() {
  const run = state.run || { answers: [], sec: MOD_SEC[state.mod], level: state.level };
  const total = run.answers.length;
  const correct = run.answers.filter(a => a.ok).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const secKey = 'sec_' + (run.sec || MOD_SEC[state.mod] || 'rt');
  const items = run.answers.map((a, i) =>
    `<div class="log-item"><span class="${a.ok ? 'ok' : 'no'}">${a.ok ? '✓' : '✗'}</span><span>${i + 1}</span><span>${a.lbl || '—'}</span></div>`
  ).join('');
  return `<p class="exam-signal run-done-signal"><span class="d"></span> ${t('run_summary', { mod: t(secKey), diff: t('diff_' + (run.level || state.level)) })}</p>
    <h1 class="page-title">${t('run_done')}</h1>
    <div class="hist-grid">
      <div class="hist-stat"><div class="val">${pct}<span class="pct">%</span></div><div class="lbl">${t('accuracy')}</div></div>
      <div class="hist-stat"><div class="val">${correct}<span class="pct">/${total}</span></div><div class="lbl">${t('correct')}</div></div>
    </div>
    <h4 class="sub">${t('run_items')}</h4>
    <div class="log-list">${items || '—'}</div>`;
}

function goPage(n) {
  clearAdvanceTimer();
  const max = pageCount(state.mod) - 1;
  if (n > state.page && isExercisePage() && !state.session.answered) return;
  state.page = Math.max(0, Math.min(n, max));
  resetSession();
  render();
}

function setMod(mod) {
  clearAdvanceTimer();
  if (state.mod === 'playground' && mod !== 'playground') window.Playground?.leave();
  state.mod = mod;
  state.page = 0;
  resetSession();
  document.querySelectorAll('#main-nav .r-i').forEach(b => b.classList.toggle('on', b.dataset.mod === mod));
  render();
}

function setLevel(lvl) {
  state.level = lvl;
  saveLevel();
  state.lect.series = [];
  state.ac.series = [];
  state.rt.series = [];
  state.err.series = [];
  state.teo.order = [];
  if (isExercisePage()) state.page = 1;
  resetSession();
  render();
}

function startLect() {
  beginRun('lect');
  const pool = DIFF_SETS[LEVEL_LECT[state.level]];
  state.lect.series = pickSeries(pool, exCount()).map(n => noteByName(n)).filter(Boolean);
}
function startAc() {
  beginRun('ac');
  const n = exCount();
  state.ac.series = Array.from({ length: n }, () => ({
    type: Math.floor(Math.random() * CT.length),
    root: RMIDI[Math.floor(Math.random() * RMIDI.length)]
  }));
}
function startRt() {
  beginRun('rt');
  const pool = rhythmsForLevel();
  state.rt.series = pickSeries(pool.map((_, i) => i), exCount()).map(i => pool[i % pool.length]);
}
function startErr() {
  beginRun('err');
  state.err.series = Array.from({ length: exCount() }, () => genErrExercise(cfg().errLen, state.level));
}
function startTeo() {
  beginRun('teo');
  const maxTier = cfg().teoTier;
  const pool = TEO_Q.map((_, i) => i).filter(i => TEO_Q[i].tier <= maxTier);
  state.teo.order = pickSeries(pool, Math.min(exCount(), pool.length));
}

function getLectOptions(correct) {
  const pool = DIFF_SETS[LEVEL_LECT[state.level]];
  let distractors = pool.filter(n => n !== correct.name);
  if (state.level === 'hard') {
    const idx = pool.indexOf(correct.name);
    const near = pool.filter((_, i) => Math.abs(i - idx) <= 2 && pool[i] !== correct.name);
    if (near.length >= cfg().opts - 1) distractors = near;
  }
  const opts = shuffle(distractors).slice(0, cfg().opts - 1);
  opts.push(correct.name);
  return shuffle(opts);
}

function tsDistractors(correct) {
  const similar = {
    '4/4': ['2/4','3/4','2/2'], '3/4': ['4/4','2/4','6/8'], '6/8': ['3/8','9/8','3/4'],
    '2/4': ['4/4','3/4'], '3/2': ['2/2','4/4'], '9/8': ['6/8','12/8'], '12/8': ['9/8','6/8'], '2/2': ['3/2','4/4']
  };
  const pool = similar[correct] || ['2/4','3/4','6/8','9/8','2/2','3/2','12/8'].filter(x => x !== correct);
  const opts = shuffle(pool).slice(0, cfg().opts - 1);
  opts.push(correct);
  return shuffle(opts);
}

/* ── render helpers ── */
function diffTabs() {
  const c = cfg();
  const listens = c.listens < 99 ? t('listens_meta', { n: c.listens }) : '';
  const timer = c.timer ? t('timer_meta', { n: c.timer }) : '';
  return `<div class="diff-tabs"><span class="label">${t('diff_label')}</span>
    <div class="tabpills">${LEVELS.map(l =>
      `<span class="${state.level === l ? 'on' : ''}" data-level="${l}">${t('diff_' + l)}</span>`).join('')}</div>
    <span class="diff-meta">${t('diff_meta', { n: c.count, o: c.opts, listens, timer })}</span></div>`;
}

function exerciseHUD() {
  if (!isExercisePage()) return '';
  const listen = cfg().listens < 99
    ? `<span class="hud-pill">${t('listens_hud')} <b data-listen-left>${cfg().listens}</b></span>` : '';
  const timer = cfg().timer > 0
    ? `<span class="hud-pill timer-pill"><span class="lp hud-timer"><i id="timer-bar" style="width:100%"></i></span><b id="timer-val">${cfg().timer}</b>s</span>` : '';
  return `<div class="exercise-hud">${listen}${timer}<span class="hud-pill">${t('item_hud')} <b>${exerciseItemNum()}</b> / ${exCount()}</span></div>`;
}

function pageNav(total) {
  if (isResultsPage()) {
    return `<div class="page-nav results-nav">
      <button type="button" class="btn btn-primary" data-action="finish-run">${t('back_home')}</button>
    </div>`;
  }
  const p = state.page;
  const blockNext = isExercisePage() && !state.session.answered;
  const show = Math.min(total, 9);
  const start = total <= show ? 0 : Math.max(0, Math.min(p - 4, total - show));
  const dots = Array.from({ length: Math.min(show, total) }, (_, i) => {
    const idx = start + i;
    return `<a href="#" class="${idx === p ? 'on' : ''}" data-goto="${idx}">${idx + 1}</a>`;
  }).join('');
  return `<div class="page-nav">
    <button type="button" class="btn btn-outline" data-nav="prev" ${p === 0 ? 'disabled' : ''}>
      <svg class="ico sm"><use href="#i-chev-l"/></svg><span class="nav-txt">${t('nav_prev')}</span>
    </button>
    <div class="pager">${dots}</div>
    <button type="button" class="btn btn-primary" data-nav="next" ${p >= total - 1 || blockNext ? 'disabled' : ''}>
      <span class="nav-txt">${t('nav_next')}</span><svg class="ico sm"><use href="#i-chev-r"/></svg>
    </button>
  </div>${blockNext ? `<p class="nav-hint">${t('nav_hint')}</p>` : ''}`;
}

function stepper(total) {
  const p = state.page, show = Math.min(total, 6);
  let html = '<div class="stepper-wrap"><div class="stepper">';
  for (let i = 0; i < show; i++) {
    if (i) html += '<span class="ln"></span>';
    html += `<span class="st ${i <= p ? 'on' : ''}">${i + 1}</span>`;
  }
  if (total > show) html += `<span class="step-more">+${total - show}</span>`;
  return html + '</div></div>';
}

function progressBar(pct) {
  return `<div class="lp page-progress"><i style="width:${pct}%"></i></div>`;
}

function moduleHeader(seq, title, total) {
  return `<div class="page-meta"><span class="seq-label">${seq}</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}${diffTabs()}${exerciseHUD()}`;
}

/* ── sections ── */
function renderInicio() {
  const pages = [
    () => `${moduleHeader(t('seq_01_intro'), '', 3)}
      <p class="exam-signal"><span class="d"></span> ${t('home_signal')}</p>
      <h1 class="page-title">${t('home_title')}</h1>
      <p class="editorial-quote">${t('home_quote')}</p>
      <div class="theory-card"><h4>${t('home_exam_h')}</h4><ul>
        <li><strong>${t('home_exam_1')}</strong></li>
        <li><strong>${t('home_exam_2')}</strong></li>
        <li><strong>${t('home_exam_3')}</strong></li>
      </ul></div>
      <div class="theory-card"><h4>${t('home_modes_h')}</h4><ul>
        <li><strong>${t('home_easy')}</strong></li>
        <li><strong>${t('home_medium')}</strong></li>
        <li><strong>${t('home_hard')}</strong></li>
      </ul></div>`,
    () => `${moduleHeader(t('seq_01_content'), '', 3)}
      <h1 class="page-title">${t('home_content_title')}</h1>
      <div class="theory-card"><h4>${t('home_rt_h')}</h4><ul>
        <li>${t('home_rt_1')}</li>
        <li>${t('home_rt_2')}</li>
      </ul></div>
      <div class="theory-card"><h4>${t('home_aural_h')}</h4><ul>
        <li>${t('home_aural_1')}</li>
        <li>${t('home_aural_2')}</li>
      </ul></div>`,
    () => `${moduleHeader(t('seq_01_practice'), '', 3)}
      <h1 class="page-title">${t('home_pick_title')}</h1>
      <p class="page-lead">${t('home_pick_lead')}</p>
      <div class="theory-card"><h4>${t('home_score_h')}</h4>
        <table class="theory-table"><tr><th>${t('home_score_part')}</th><th>${t('home_score_pts')}</th></tr>
        <tr><td>${t('home_score_rt')}</td><td>5</td></tr><tr><td>${t('home_score_err')}</td><td>2,5</td></tr><tr><td>${t('home_score_ac')}</td><td>2,5</td></tr></table></div>`
  ];
  return pages[state.page]() + pageNav(3);
}

function renderRitmo() {
  const total = pageCount('ritmo');
  if (state.page === 0) {
    return `${moduleHeader(t('seq_rt'), '', total)}
      <h1 class="page-title">${t('rt_intro_title')}</h1>
      <p class="page-lead">${t('rt_intro_lead')}</p>
      <div class="theory-card"><h4>${t('rt_intro_h')}</h4><ul>
        <li>${t('rt_intro_1')}</li>
        <li>${t('rt_intro_2')}</li>
      </ul></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `${moduleHeader(t('seq_rt'), '', total)}
      <h1 class="page-title">${t('prep')}</h1>
      <p class="page-lead">${t('prep_rt_lead', { n: exCount(), diff: cfg().label })}</p>
      <button type="button" class="btn btn-primary" data-action="start-rt">${t('start_rt')}</button>` + pageNav(total);
  }
  if (!state.rt.series.length) startRt();
  const exIdx = exerciseIndex();
  const r = state.rt.series[exIdx];
  if (!r) return `${moduleHeader(t('seq_rt'), '', total)}<p class="page-lead">${t('run_done')}</p>` + pageNav(total);
  const options = tsDistractors(r.label);
  return `${moduleHeader(t('seq_rt'), '', total)}
    <h1 class="page-title">${t('rt_title')}</h1>
    <p class="exercise-hint">${t('rt_hint')}</p>
    <div class="exercise-panel">
      <div class="vex-host vex-rt-mask${state.session.answered ? ' revealed' : ''}" id="vex-rt-wrap">
        <div id="vex-rt"></div>
        <div class="vex-aural-mask" aria-hidden="true">
          <span class="vex-aural-label">?/?</span>
          <span class="vex-aural-hint">${t('rt_aural')}</span>
        </div>
      </div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play="rt" ${canListen() ? '' : 'disabled'}><svg class="ico sm"><use href="#i-play"/></svg> ${t('rt_listen')}</button>
        <button type="button" class="btn btn-outline" data-play="rt-fast" ${canListen() ? '' : 'disabled'}>${t('rt_fast')}</button>
        <div class="wave-bar"><i id="wave-rt"></i></div>
      </div>
      <div class="options-grid cols-${cfg().opts}">${options.map(o =>
        `<button type="button" class="opt-btn" data-rt-ans="${o}" data-correct="${r.label}">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb-rt"></div>
    </div>` + pageNav(total);
}

function renderErrores() {
  const total = pageCount('errores');
  if (state.page === 0) {
    return `${moduleHeader(t('seq_err'), '', total)}
      <h1 class="page-title">${t('err_intro_title')}</h1>
      <p class="page-lead">${t('err_intro_lead', { n: cfg().errLen })}</p>
      <div class="theory-card"><h4>${t('err_intro_h')}</h4><ol>
        <li>${t('err_intro_1')}</li>
      </ol></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `${moduleHeader(t('seq_err'), '', total)}
      <h1 class="page-title">${t('err_prep_title')}</h1>
      <p class="page-lead">${t('err_prep_lead', { n: exCount() })}</p>
      <button type="button" class="btn btn-primary" data-action="start-err">${t('start_err')}</button>` + pageNav(total);
  }
  if (!state.err.series.length) startErr();
  const exIdx = exerciseIndex();
  const ex = state.err.series[exIdx];
  if (!ex) return `${moduleHeader(t('seq_err'), '', total)}<p class="page-lead">${t('run_done')}</p>` + pageNav(total);
  const labels = ex.written.map((n, i) => {
    const nm = noteDisplayName(noteByMidi(n.key)?.name || `N${i + 1}`);
    return state.level === 'easy' ? t('err_num', { n: i + 1, name: nm })
      : state.level === 'medium' ? t('err_note', { n: i + 1 }) : `#${i + 1}`;
  });
  return `${moduleHeader(t('seq_err'), '', total)}
    <h1 class="page-title">${t('err_title')}</h1>
    <div class="exercise-panel">
      <div class="vex-host" id="vex-err"></div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play="err-w" ${canListen() ? '' : 'disabled'}>${t('err_score')}</button>
        <button type="button" class="btn btn-outline" data-play="err-p" ${canListen() ? '' : 'disabled'}>${t('err_wrong')}</button>
        <button type="button" class="btn btn-outline" data-play="err-both" ${canListen() ? '' : 'disabled'}>${t('err_ab')}</button>
        <div class="wave-bar"><i id="wave-err"></i></div>
      </div>
      <div class="options-grid cols-${Math.min(cfg().opts, labels.length)}">${labels.map((l, i) =>
        `<button type="button" class="opt-btn" data-err-ans="${i}" data-correct="${ex.errIdx}">${l}</button>`).join('')}</div>
      <div class="feedback" id="fb-err"></div>
    </div>` + pageNav(total);
}

function renderAcordes() {
  const total = pageCount('acordes');
  if (state.page === 0) {
    return `${moduleHeader(t('seq_ac'), '', total)}
      <h1 class="page-title">${t('ac_intro_title')}</h1>
      <p class="page-lead">${t('ac_intro_lead')}</p>
      <div class="theory-card"><h4>${t('ac_type')}</h4>
        <table class="theory-table"><tr><th>${t('ac_type')}</th><th>${t('ac_intervals')}</th></tr>
        <tr><td>${chordName('Mayor')}</td><td>0-4-7</td></tr><tr><td>${chordName('menor')}</td><td>0-3-7</td></tr>
        <tr><td>${chordName('Disminuido')}</td><td>0-3-6</td></tr><tr><td>${chordName('Aumentado')}</td><td>0-4-8</td></tr></table></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `${moduleHeader(t('seq_ac'), '', total)}
      <h1 class="page-title">${t('ac_prep_title', { n: exCount() })}</h1>
      <button type="button" class="btn btn-primary" data-action="start-ac">${t('start_ac')}</button>` + pageNav(total);
  }
  if (!state.ac.series.length) startAc();
  const exIdx = exerciseIndex();
  const item = state.ac.series[exIdx];
  if (!item) return `${moduleHeader(t('seq_ac'), '', total)}<p class="page-lead">${t('run_done')}</p>` + pageNav(total);
  const chord = CT[item.type];
  const opts = shuffle(CT.map(c => c.name)).slice(0, cfg().opts);
  return `${moduleHeader(t('seq_ac'), '', total)}
    <h1 class="page-title">${t('ac_title')}</h1>
    <div class="exercise-panel">
      <div class="audio-row">
        <button type="button" class="btn btn-primary" data-play="ac" ${canListen() ? '' : 'disabled'}><svg class="ico sm"><use href="#i-play"/></svg> ${t('ac_listen')}</button>
        <button type="button" class="btn btn-outline" data-play="ac-arp" ${canListen() ? '' : 'disabled'}>${t('ac_arp')}</button>
        <div class="wave-bar"><i id="wave-ac"></i></div>
      </div>
      <div class="options-grid cols-${cfg().opts}">${opts.map(n =>
        `<button type="button" class="opt-btn" data-ac-ans="${n}" data-correct="${chord.name}">${chordName(n)}</button>`).join('')}</div>
      <div class="feedback" id="fb-ac"></div>
    </div>` + pageNav(total);
}

function renderLectura() {
  const total = pageCount('lectura');
  if (state.page === 0) {
    return `${moduleHeader(t('seq_lect'), '', total)}
      <h1 class="page-title">${t('lect_intro_title')}</h1>
      <p class="page-lead">${t('lect_intro_lead')}</p>
      <div class="theory-card"><h4>${t('lect_intro_h')}</h4><ul>
        <li>${t('lect_intro_1')}</li>
      </ul></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `${moduleHeader(t('seq_lect'), '', total)}
      <h1 class="page-title">${t('lect_prep_title', { n: exCount() })}</h1>
      <p class="page-lead">${t('lect_prep_lead', { pool: poolLabel(LEVEL_LECT[state.level]), o: cfg().opts })}</p>
      <button type="button" class="btn btn-primary" data-action="start-lect">${t('start_lect')}</button>` + pageNav(total);
  }
  if (!state.lect.series.length) startLect();
  const exIdx = exerciseIndex();
  const note = state.lect.series[exIdx];
  if (!note) return renderLectura();
  const opts = getLectOptions(note);
  return `${moduleHeader(t('seq_lect'), '', total)}
    <h1 class="page-title">${t('lect_title')}</h1>
    <div class="exercise-panel">
      <div class="vex-host" id="vex-lect"></div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play="lect" ${canListen() ? '' : 'disabled'}><svg class="ico sm"><use href="#i-play"/></svg> ${t('lect_listen')}</button>
        <button type="button" class="btn btn-outline" data-play="lect-ref" ${canListen() ? '' : 'disabled'}>${t('lect_ref')}</button>
        <div class="wave-bar"><i id="wave-lect"></i></div>
      </div>
      <div class="options-grid cols-${cfg().opts}">${opts.map(o =>
        `<button type="button" class="opt-btn" data-lect-ans="${o}" data-correct="${note.name}">${noteDisplayName(o)}</button>`).join('')}</div>
      <div class="feedback" id="fb-lect"></div>
    </div>` + pageNav(total);
}

function renderTeoria() {
  const total = pageCount('teoria');
  if (state.page === 0) {
    return `${moduleHeader(t('seq_teo'), '', total)}
      <h1 class="page-title">${t('teo_intro_title')}</h1>
      <p class="page-lead">${t('teo_intro_lead', { n: exCount(), tier: cfg().teoTier })}</p>
      <button type="button" class="btn btn-primary" data-action="start-teo">${t('start_teo')}</button>` + pageNav(total);
  }
  if (!state.teo.order.length) startTeo();
  const qIdx = state.teo.order[exerciseIndex()];
  if (qIdx == null) return `${moduleHeader(t('seq_teo'), '', total)}<p class="page-lead">${t('run_done')}</p>` + pageNav(total);
  const q = getTeoQ(TEO_Q[qIdx], qIdx);
  const correctText = q.opts[q.a];
  let displayOpts = shuffle([...q.opts]);
  if (!displayOpts.includes(correctText)) displayOpts[0] = correctText;
  return `${moduleHeader(t('seq_teo'), '', total)}
    <h1 class="page-title q-title">${q.q}</h1>
    <div class="exercise-panel">
      <div class="options-grid cols-${displayOpts.length}">${displayOpts.map(o =>
        `<button type="button" class="opt-btn" data-teo-ans="${o}" data-correct="${correctText}">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb-teo"></div>
    </div>` + pageNav(total);
}

function renderHistorial() {
  const total = H.log.length, correct = H.log.filter(x => x.ok).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const secKeys = { lect: 'sec_lect', ac: 'sec_ac', rt: 'sec_rt', teo: 'sec_teo', err: 'sec_err' };
  const secs = ['lect', 'ac', 'rt', 'teo', 'err'].map(id => ({ id, label: t(secKeys[id]) }));
  const bars = secs.map(s => {
    const sc = H.scores[s.id];
    const p = sc.t ? Math.round(sc.c / sc.t * 100) : 0;
    return `<div class="bar-row"><div class="bar-head"><span>${s.label}</span><b>${p}% · ${sc.c}/${sc.t}</b></div><div class="lp"><i style="width:${p}%"></i></div></div>`;
  }).join('');
  const lvlBars = LEVELS.map(l => {
    const b = H.byLevel[l] || { c: 0, t: 0 };
    const p = b.t ? Math.round(b.c / b.t * 100) : 0;
    return `<div class="bar-row"><div class="bar-head"><span>${t('diff_' + l)}</span><b>${p}% · ${b.c}/${b.t}</b></div><div class="lp"><i style="width:${p}%"></i></div></div>`;
  }).join('');
  const log = H.log.slice(0, 24).map(e => {
    const d = new Date(e.ts);
    return `<div class="log-item"><span class="${e.ok ? 'ok' : 'no'}">${e.ok ? '✓' : '✗'}</span>
      <span>${t('sec_' + (e.sec === 'err' ? 'err' : e.sec))}</span><span>${t('diff_' + e.lvl)}</span><span>${noteDisplayName(e.lbl) || e.lbl || '—'}</span>
      <span class="log-time">${localeDate(e.ts)}</span></div>`;
  }).join('');
  return `<div class="page-meta"><span class="seq-label">${t('hist_meta')}</span></div>
    <h1 class="page-title">${t('hist_title')}</h1>
    <div class="hist-grid">
      <div class="hist-stat"><div class="val">${pct}<span class="pct">%</span></div><div class="lbl">${t('hist_precision')}</div></div>
      <div class="hist-stat"><div class="val">${H.streak}</div><div class="lbl">${t('hist_streak')}</div></div>
      <div class="hist-stat"><div class="val">${H.best}</div><div class="lbl">${t('hist_best')}</div></div>
      <div class="hist-stat"><div class="val">${total}</div><div class="lbl">${t('hist_answers')}</div></div>
    </div>
    <h4 class="sub">${t('hist_by_sec')}</h4>${bars}
    <h4 class="sub">${t('hist_by_diff')}</h4>${lvlBars}
    <h4 class="sub">${t('hist_recent')}</h4>
    <div class="log-list">${log || `<div class="log-item">${t('hist_empty')}</div>`}</div>
    <div class="sync-panel">
      <h4 class="sub">${t('sync_cloud')}</h4>
      <label class="sync-name"><span>${t('sync_name')}</span>
        <input type="text" id="sync-name" maxlength="64" data-i18n-placeholder="sync_optional" placeholder="${t('sync_optional')}" value="${esc(window.BeleSync?.getName?.() || '')}">
      </label>
      <p class="sync-meta" id="sync-meta">${t('sync_loading')}</p>
      <div class="sync-actions">
        <button type="button" class="btn btn-outline" data-action="sync-now">${t('sync_now')}</button>
        <button type="button" class="btn btn-outline reset-btn" data-action="reset-hist">${t('reset_hist')}</button>
      </div>
    </div>`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function updSyncMeta() {
  const el = document.getElementById('sync-meta');
  if (!el || !window.BeleSync) return;
  const st = window.BeleSync.getStatus();
  const labels = { idle: t('sync_idle'), syncing: t('sync_syncing'), ok: t('sync_ok'), err: t('sync_err'), offline: t('sync_offline') };
  const uid = window.BeleSync.getUid();
  el.textContent = `${labels[st] || st} · ID ${uid.slice(0, 8)}…`;
}
window.updSyncMeta = updSyncMeta;

function render() {
  const stage = document.getElementById('page-stage');
  const seqLabels = {
    ritmo: t('seq_rt'), errores: t('seq_err'), acordes: t('seq_ac'),
    lectura: t('seq_lect'), teoria: t('seq_teo'),
  };
  if (isResultsPage()) {
    const total = pageCount(state.mod);
    stage.innerHTML = moduleHeader(seqLabels[state.mod] || '', '', total) + renderRunResults() + pageNav(total);
    postRender();
    return;
  }
  const map = { inicio: renderInicio, ritmo: renderRitmo, errores: renderErrores, acordes: renderAcordes, lectura: renderLectura, teoria: renderTeoria, historial: renderHistorial, playground: () => window.Playground?.render() || '' };
  stage.innerHTML = map[state.mod]() || '';
  postRender();
}

function syncAudioTarget() {
  const TA = window.TrainerAudio;
  if (!TA) return;
  const { mod, page } = state;
  if (!isExercisePage() || mod === 'inicio' || mod === 'historial' || mod === 'playground') { TA.clearTarget(); return; }
  const idx = exerciseIndex();
  if (mod === 'lectura' && state.lect.series[idx]) {
    const n = state.lect.series[idx];
    TA.setTarget({ type: 'note', midis: [n.midi], label: noteDisplayName(n.name), pitchClass: false });
  } else if (mod === 'acordes' && state.ac.series[idx]) {
    const item = state.ac.series[idx];
    const midis = CT[item.type].iv.map(iv => item.root + iv);
    TA.setTarget({ type: 'chord', midis, chordName: CT[item.type].name, label: midis.map(m => TA.midiToLabel(m)).join(' ') });
  } else if (mod === 'errores' && state.err.series[idx]) {
    const ex = state.err.series[idx];
    TA.setTarget({ type: 'melody', midis: ex.written.map(n => keyToMidi(n.key)), label: t('target_melody_err') });
  } else if (mod === 'ritmo') {
    TA.setTarget({ type: 'melody', midis: [67, 60, 62, 64], label: t('target_pulse') });
  } else TA.clearTarget();
}

function postRender() {
  const { mod } = state;
  if (mod === 'ritmo' && isExercisePage() && state.rt.series[exerciseIndex()]) {
    rhythmVexReveal(state.session.answered);
  }
  if (mod === 'errores' && isExercisePage() && state.err.series[exerciseIndex()]) {
    drawMelodyVex(document.getElementById('vex-err'), state.err.series[exerciseIndex()].written);
  }
  if (mod === 'lectura' && isExercisePage() && state.lect.series[exerciseIndex()]) {
    drawSingleNote(document.getElementById('vex-lect'), state.lect.series[exerciseIndex()].key, null);
  }
  if (isExercisePage() && cfg().timer > 0 && !state.session.interval && !state.session.answered) startTimer();
  updListenUI();
  syncAudioTarget();
  if (mod === 'historial') updSyncMeta();
  if (mod === 'playground') window.Playground?.mount();
  else window.TrainerAudio?.setUserNoteHook?.(null);
  const paneLabel = document.querySelector('.pane-label');
  if (paneLabel) paneLabel.textContent = mod === 'playground' ? t('pg_pane') : t('pane_exercise');
  if (window.StatsViz) window.StatsViz.refresh();
}

function btnValue(b) {
  return b.dataset.lectAns ?? b.dataset.acAns ?? b.dataset.rtAns ?? b.dataset.errAns ?? b.dataset.teoAns;
}

function bindFeedback(btn, fbId, ok, msgOk, msgNo, sec, lbl) {
  state.session.answered = true;
  if (state.session.interval) clearInterval(state.session.interval);
  const correct = btn.dataset.correct;
  btn.closest('.options-grid')?.querySelectorAll('.opt-btn').forEach(b => {
    b.disabled = true;
    if (String(btnValue(b)) === String(correct)) b.classList.add('correct');
    else if (b === btn && !ok) b.classList.add('wrong');
  });
  const fb = document.getElementById(fbId);
  if (fb) { fb.className = 'feedback show ' + (ok ? 'ok' : 'no'); fb.textContent = ok ? msgOk : msgNo; }
  if (sec) logA(sec, ok, lbl);
  document.querySelectorAll('[data-nav="next"]').forEach(b => b.disabled = false);
  if (sec === 'rt') rhythmVexReveal(true);
  maybeAdvanceRun();
}

document.addEventListener('click', e => {
  getAudio();
  const nav = e.target.closest('[data-nav]');
  if (nav && !nav.disabled) { goPage(state.page + (nav.dataset.nav === 'next' ? 1 : -1)); return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { e.preventDefault(); goPage(+goto.dataset.goto); return; }
  const modBtn = e.target.closest('#main-nav .r-i');
  if (modBtn) { setMod(modBtn.dataset.mod); return; }
  const lvl = e.target.closest('[data-level]');
  if (lvl) { setLevel(lvl.dataset.level); return; }

  if (e.target.closest('[data-action="start-lect"]')) { startLect(); goPage(2); return; }
  if (e.target.closest('[data-action="start-ac"]')) { startAc(); goPage(2); return; }
  if (e.target.closest('[data-action="start-rt"]')) { startRt(); goPage(2); return; }
  if (e.target.closest('[data-action="start-err"]')) { startErr(); goPage(2); return; }
  if (e.target.closest('[data-action="start-teo"]')) { startTeo(); goPage(1); return; }
  if (e.target.closest('[data-action="finish-run"]')) {
    state.run = null;
    setMod('inicio');
    return;
  }
  if (e.target.closest('[data-action="reset-hist"]')) { H = nH(); saveH(); updSc(); render(); return; }
  if (e.target.closest('[data-action="sync-now"]')) {
    if (window.BeleSync) {
      const nameEl = document.getElementById('sync-name');
      if (nameEl) window.BeleSync.setName(nameEl.value);
      window.BeleSync.push(H, state.level, window.BeleSync.getName()).then(() => updSyncMeta());
    }
    return;
  }

  const play = e.target.closest('[data-play]');
  if (play && !play.disabled) {
    useListen();
    const kind = play.dataset.play;
    const idx = exerciseIndex();
    if (kind === 'lect') {
      const n = state.lect.series[idx]; if (n) { playMidi(n.midi, 0, 1.1, 0.65); animWave('wave-lect', 1100); }
    } else if (kind === 'lect-ref') {
      playMidi(60, 0, 0.8, 0.55);
      setTimeout(() => { const n = state.lect.series[idx]; if (n) playMidi(n.midi, 0, 1.1, 0.65); }, 900);
      animWave('wave-lect', 2000);
    } else if (kind === 'ac' || kind === 'ac-arp') {
      const item = state.ac.series[idx];
      if (item) { playChord(item.root, CT[item.type].iv, kind === 'ac' && cfg().chordBlock); animWave('wave-ac', 1800); }
    } else if (kind === 'rt' || kind === 'rt-fast') {
      const r = state.rt.series[idx];
      if (r) {
        let t = 0; const bd = kind === 'rt-fast' ? 0.35 : 0.55;
        r.beats.forEach((b, i) => { playMidi(i === 0 ? 67 : 60, t, b * bd * 0.85, i === 0 ? 0.52 : 0.34); t += b * bd; });
        animWave('wave-rt', t * 1000 + 150);
      }
    } else if (kind === 'err-w') {
      const ex = state.err.series[idx];
      playMelody(ex.written.map(n => keyToMidi(n.key))); animWave('wave-err', ex.written.length * 320);
    } else if (kind === 'err-p') {
      playMelody(state.err.series[idx].played); animWave('wave-err', state.err.series[idx].played.length * 320);
    } else if (kind === 'err-both') {
      const ex = state.err.series[idx];
      playMelody(ex.written.map(n => keyToMidi(n.key)), 0.28);
      setTimeout(() => playMelody(ex.played, 0.28), ex.written.length * 280 + 400);
      animWave('wave-err', ex.written.length * 600);
    }
    return;
  }

  const lectBtn = e.target.closest('[data-lect-ans]');
  if (lectBtn && !lectBtn.disabled) {
    const ok = lectBtn.dataset.lectAns === lectBtn.dataset.correct;
    bindFeedback(lectBtn, 'fb-lect', ok, t('fb_ok'), t('fb_wrong', { x: noteDisplayName(lectBtn.dataset.correct) }), 'lect', lectBtn.dataset.correct);
    return;
  }
  const acBtn = e.target.closest('[data-ac-ans]');
  if (acBtn && !acBtn.disabled) {
    bindFeedback(acBtn, 'fb-ac', acBtn.dataset.acAns === acBtn.dataset.correct, t('fb_ok'), t('fb_wrong', { x: chordName(acBtn.dataset.correct) }), 'ac', acBtn.dataset.correct);
    return;
  }
  const rtBtn = e.target.closest('[data-rt-ans]');
  if (rtBtn && !rtBtn.disabled) {
    bindFeedback(rtBtn, 'fb-rt', rtBtn.dataset.rtAns === rtBtn.dataset.correct, t('fb_ok'), t('fb_wrong', { x: rtBtn.dataset.correct }), 'rt', rtBtn.dataset.correct);
    return;
  }
  const errBtn = e.target.closest('[data-err-ans]');
  if (errBtn && !errBtn.disabled) {
    const ex = state.err.series[exerciseIndex()];
    const desc = formatErrDesc(ex);
    bindFeedback(errBtn, 'fb-err', +errBtn.dataset.errAns === ex.errIdx, '✓ ' + desc, '✗ ' + desc, 'err', desc);
    return;
  }
  const teoBtn = e.target.closest('[data-teo-ans]');
  if (teoBtn && !teoBtn.disabled) {
    bindFeedback(teoBtn, 'fb-teo', teoBtn.dataset.teoAns === teoBtn.dataset.correct, t('fb_ok'), t('fb_wrong_teo', { x: teoBtn.dataset.correct }), 'teo', t('sec_teo'));
    return;
  }
});

document.querySelectorAll('[data-theme-set]').forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.themeSet));
});
document.querySelectorAll('[data-lang-set]').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.langSet));
});

window.addEventListener('resize', () => { if (isExercisePage()) postRender(); });
document.addEventListener('bele:sync', updSyncMeta);
document.addEventListener('change', e => {
  if (e.target.id === 'sync-name' && window.BeleSync) {
    window.BeleSync.setName(e.target.value);
    window.BeleSync.schedulePush(() => H, () => state.level);
  }
});

let focusMode = '';
let focusRestore = null;

const FOCUS_MAP = {
  exercise: { id: 'stage-pane', titleKey: 'focus_exercise' },
  viz: { id: 'viz-panel', titleKey: 'focus_viz' },
  stats: { id: 'util-panel', titleKey: 'focus_stats' },
};

function refreshFocusLayout() {
  window.dispatchEvent(new Event('resize'));
  if (window.StatsViz) window.StatsViz.refresh();
  if (window.TrainerAudio?.drawKeyboard) window.TrainerAudio.drawKeyboard();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function restoreFocusElement(restore) {
  if (!restore?.el?.parentElement) return;
  const { el, parent, next } = restore;
  if (next && next.parentElement === parent) parent.insertBefore(el, next);
  else parent.appendChild(el);
  el.classList.remove('focus-elevated');
}

function updateFocusButtons() {
  document.querySelectorAll('.focus-toggle').forEach(btn => {
    const on = btn.dataset.focus === focusMode;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const keys = { exercise: 'focus_ex', viz: 'focus_viz_short', stats: 'focus_stats_short' };
    btn.title = on ? t('focus_close_full') : t('focus_fullscreen', { n: t(keys[btn.dataset.focus] || '') });
  });
}
window.updateFocusButtons = updateFocusButtons;

function updateFocusTitle() {
  if (!focusMode) return;
  const cfg = FOCUS_MAP[focusMode];
  const title = document.getElementById('focus-lightbox-title');
  if (cfg && title) title.textContent = t(cfg.titleKey);
}
window.updateFocusTitle = updateFocusTitle;

function closeFocus() {
  const lb = document.getElementById('focus-lightbox');
  if (!focusRestore) {
    if (lb) {
      lb.classList.remove('is-open', 'focus-lightbox--viz', 'focus-lightbox--stats');
      lb.hidden = true;
      lb.setAttribute('aria-hidden', 'true');
    }
    focusMode = '';
    document.body.classList.remove('focus-open');
    updateFocusButtons();
    return;
  }
  lb?.classList.remove('is-open');
  document.body.classList.remove('focus-open');
  lb?.classList.remove('focus-lightbox--viz', 'focus-lightbox--stats');
  setTimeout(() => {
    restoreFocusElement(focusRestore);
    focusRestore = null;
    focusMode = '';
    if (lb) { lb.hidden = true; lb.setAttribute('aria-hidden', 'true'); }
    updateFocusButtons();
    refreshFocusLayout();
  }, 260);
}

function openFocus(mode) {
  const cfg = FOCUS_MAP[mode];
  const lb = document.getElementById('focus-lightbox');
  const body = document.getElementById('focus-lightbox-body');
  const title = document.getElementById('focus-lightbox-title');
  const el = cfg && document.getElementById(cfg.id);
  if (!cfg || !el || !lb || !body) return;

  if (focusRestore) restoreFocusElement(focusRestore);

  focusRestore = { el, parent: el.parentElement, next: el.nextSibling, mode };
  if (title) title.textContent = t(cfg.titleKey);
  body.appendChild(el);
  el.classList.add('focus-elevated');

  lb.hidden = false;
  lb.setAttribute('aria-hidden', 'false');
  lb.classList.toggle('focus-lightbox--viz', mode === 'viz');
  lb.classList.toggle('focus-lightbox--stats', mode === 'stats');
  document.body.classList.add('focus-open');
  focusMode = mode;
  updateFocusButtons();
  requestAnimationFrame(() => {
    lb.classList.add('is-open');
    setTimeout(refreshFocusLayout, 280);
  });
}

function setFocus(mode) {
  if (focusMode === mode) closeFocus();
  else if (mode) openFocus(mode);
  else closeFocus();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && focusMode) closeFocus();
});

document.addEventListener('click', e => {
  if (e.target.closest('[data-focus-close]') || e.target.closest('#focus-lightbox-close')) {
    closeFocus();
    return;
  }
  const fb = e.target.closest('[data-focus]');
  if (fb) { setFocus(fb.dataset.focus); return; }
});

(async function boot() {
  if (!H.byLevel) H.byLevel = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
  setTheme(loadTheme());
  applyChromeI18n();
  if (window.BeleSync) {
    await window.BeleSync.initMerge(
      () => H,
      () => state.level,
      (progress, level) => {
        H = { ...nH(), ...progress };
        if (level && LEVELS.includes(level)) state.level = level;
        saveH(true);
        saveLevel(true);
      }
    );
  }
  updSc();
  resetSession();
  render();
  updSyncMeta();
  if (window.TrainerAudio) window.TrainerAudio.init();
  if (window.StatsViz) {
    window.StatsViz.init({
      getProgress: () => H,
      getContext: () => ({ mod: state.mod, level: state.level }),
    });
  }
})();
