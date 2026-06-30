/* Entrenador Musical BELE — paginated training sequences */

const HIST_KEY = 'music_bele_v2';
const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

/* ── persistence ── */
function nH() {
  return {
    log: [],
    scores: { lect: { c: 0, t: 0 }, ac: { c: 0, t: 0 }, rt: { c: 0, t: 0 }, teo: { c: 0, t: 0 }, err: { c: 0, t: 0 } },
    streak: 0, best: 0, noteErr: {}
  };
}
function loadH() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || nH(); } catch { return nH(); }
}
function saveH() { try { localStorage.setItem(HIST_KEY, JSON.stringify(H)); } catch {} }
let H = loadH();

function logA(sec, ok, lbl) {
  H.scores[sec].t++;
  if (ok) { H.scores[sec].c++; H.streak++; if (H.streak > H.best) H.best = H.streak; }
  else { H.streak = 0; if (sec === 'lect' && lbl) H.noteErr[lbl] = (H.noteErr[lbl] || 0) + 1; }
  H.log.unshift({ sec, ok, lbl, ts: Date.now() });
  if (H.log.length > 100) H.log = H.log.slice(0, 100);
  saveH(); updSc();
}

function updSc() {
  ['lect', 'ac', 'rt', 'teo'].forEach(s => {
    const el = document.getElementById('sc-' + (s === 'lect' ? 'lect' : s === 'ac' ? 'ac' : s === 'rt' ? 'rt' : 'teo'));
    if (el) el.textContent = `${H.scores[s].c}/${H.scores[s].t}`;
  });
}

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
function playNote(freq, start, dur, vol = 0.4, type = 'triangle') {
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
function playChordMidi(root, ivs) {
  ivs.forEach((iv, i) => playNote(mf(root + iv), i * 0.12, 1.5, 0.35));
}
function playMelody(midis, gap = 0.35, dur = 0.3) {
  midis.forEach((m, i) => playNote(mf(m), i * gap, dur, 0.4));
}
function animWave(id, ms) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = '0%';
  const start = performance.now();
  function step(now) {
    const pct = Math.min((now - start) / ms * 100, 100);
    el.style.width = pct + '%';
    if (pct < 100) requestAnimationFrame(step);
    else el.style.width = '0%';
  }
  requestAnimationFrame(step);
}

/* ── vexflow ── */
function makeRenderer(el, w, h) {
  el.innerHTML = '';
  const r = new Renderer(el, Renderer.Backends.SVG);
  r.resize(w, h);
  return r;
}
function drawSingleNote(el, key, acc, highlight = 'var(--display)') {
  const r = makeRenderer(el, 280, 100);
  const ctx = r.getContext();
  const stave = new Stave(10, 10, 255).addClef('treble').addTimeSignature('4/4');
  stave.setContext(ctx).draw();
  const n = new StaveNote({ clef: 'treble', keys: [key], duration: 'w' });
  if (acc) n.addModifier(new Accidental(acc));
  n.setStyle({ fillStyle: highlight, strokeStyle: highlight });
  const voice = new Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables([n]);
  new Formatter().joinVoices([voice]).format([voice], 200);
  voice.draw(ctx, stave);
}
function drawRhythmVex(el, durs, ts, w = 560, h = 110) {
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 20).addClef('treble').addTimeSignature(ts);
  stave.setContext(ctx).draw();
  const notes = durs.map(d => {
    const dot = d.endsWith('d');
    const base = dot ? d.slice(0, -1) : d;
    const sn = new StaveNote({ clef: 'treble', keys: ['b/4'], duration: base, stem_direction: 1 });
    if (dot) sn.addDotToAll();
    return sn;
  });
  const [nb, bv] = ts.split('/').map(Number);
  const voice = new Voice({ num_beats: nb, beat_value: bv }).setStrict(false);
  voice.addTickables(notes);
  try { new Formatter().joinVoices([voice]).format([voice], w - 100); } catch {}
  voice.draw(ctx, stave);
}
function drawMelodyVex(el, notes, w = 580, h = 120) {
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 20).addClef('treble').addTimeSignature('4/4');
  stave.setContext(ctx).draw();
  const vexNotes = notes.map(n => {
    const sn = new StaveNote({ clef: 'treble', keys: [n.key], duration: n.dur || 'q', stem_direction: 1 });
    if (n.acc) sn.addModifier(new Accidental(n.acc));
    return sn;
  });
  const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(vexNotes);
  try { new Formatter().joinVoices([voice]).format([voice], w - 80); } catch {}
  voice.draw(ctx, stave);
}

/* ── data ── */
const NOTE_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NOTES_ALL = [];
for (let o = 3; o <= 6; o++) for (let n = 0; n < 7; n++) NOTES_ALL.push({ name: `${NOTE_NAMES[n]}${o}`, key: `${'cderfgab'[n]}/${o}`, midi: (o + 1) * 12 + n });
const DIFF_SETS = {
  basico: ['Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5','Fa5','Sol5'],
  medio: ['Do4','Re4','Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5','Fa5','Sol5','La5','Si5'],
  avanzado: NOTES_ALL.map(n => n.name)
};
function noteByName(name) {
  const m = name.match(/^([A-Za-zÁÉÍÓÚáéíóú]+)([0-9])$/);
  if (!m) return null;
  const map = { Do:0, Re:1, Mi:2, Fa:3, Sol:4, La:5, Si:6 };
  const n = map[m[1]]; const o = +m[2];
  if (n == null) return null;
  return NOTES_ALL.find(x => x.name === `${NOTE_NAMES[n]}${o}`) || { name, key: `${'cderfgab'[n]}/${o}`, midi: (o + 1) * 12 + n };
}

const CT = [
  { name: 'Mayor', iv: [0,4,7], keys: ['c/4','e/4','g/4'], accs: [null,null,null] },
  { name: 'menor', iv: [0,3,7], keys: ['a/3','c/4','e/4'], accs: [null,null,null] },
  { name: 'Disminuido', iv: [0,3,6], keys: ['b/3','d/4','f/4'], accs: [null,null,null] },
  { name: 'Aumentado', iv: [0,4,8], keys: ['c/4','e/4','g#/4'], accs: [null,null,'#'] }
];
const RMIDI = [60, 62, 64, 65, 67, 69, 71];

const RHYTHMS = [
  { dur: ['q','q','q','q'], ts: '4/4', beats: [.5,.5,.5,.5], label: '4/4' },
  { dur: ['qd','e','qd','e'], ts: '6/8', beats: [.75,.25,.75,.25], label: '6/8' },
  { dur: ['q','q','q'], ts: '3/4', beats: [.5,.5,.5], label: '3/4' },
  { dur: ['h','h'], ts: '4/4', beats: [1,1], label: '4/4' },
  { dur: ['q','q'], ts: '2/4', beats: [.5,.5], label: '2/4' },
  { dur: ['h','q','h','q'], ts: '3/2', beats: [1,.5,1,.5], label: '3/2' }
];

const TEO_Q = [
  { q: '¿Cuántos semitonos tiene una 3ª mayor?', opts: ['3','4','5','2'], a: 1, cat: 'Intervalos' },
  { q: '¿Cuántos semitonos tiene una 3ª menor?', opts: ['3','4','2','5'], a: 0, cat: 'Intervalos' },
  { q: 'Un acorde tríada Mayor tiene la fórmula…', opts: ['3ªM + 5ªJ','3ªm + 5ªJ','3ªm + 5ªdim','3ªM + 5ªaum'], a: 0, cat: 'Acordes' },
  { q: 'Un acorde disminuido contiene…', opts: ['3ªm + 5ªdim','3ªM + 5ªJ','3ªm + 5ªJ','3ªM + 5ªaum'], a: 0, cat: 'Acordes' },
  { q: 'En La menor armónica, el VIIº grado se eleva a…', opts: ['Sol♯','Fa♯','Si♭','Do♯'], a: 0, cat: 'Menor armónica' },
  { q: 'En clave de Sol, las líneas (de abajo arriba) son…', opts: ['Mi Sol Si Re Fa','Fa La Do Mi Sol','Do Mi Sol Si La','Re Fa La Do Mi'], a: 0, cat: 'Clave de Sol' },
  { q: 'Los espacios en clave de Sol (de abajo arriba) son…', opts: ['Fa La Do Mi','Mi Sol Si Re','La Do Mi Sol','Do Re Mi Fa'], a: 0, cat: 'Clave de Sol' },
  { q: 'Do central en clave de Sol está en…', opts: ['1ª línea adicional inferior','2ª línea','3ª línea','4ª línea'], a: 0, cat: 'Clave de Sol' },
  { q: 'En 6/8 compuesto, el pulso equivale a…', opts: ['Negra con puntillo','Corchea','Blanca','Semicorchea'], a: 0, cat: 'Compases' },
  { q: '2/2 (alla breve) tiene pulso de…', opts: ['Blanca','Negra','Corchea','Redonda'], a: 0, cat: 'Compases' },
  { q: 'En el examen b.1, ¿cuántos errores hay que localizar?', opts: ['5','4','3','10'], a: 0, cat: 'Examen BELE' },
  { q: 'En b.1, el fragmento se escucha…', opts: ['4 veces','2 veces','1 vez','5 veces'], a: 0, cat: 'Examen BELE' },
  { q: 'En b.2, la serie de 10 acordes se repite…', opts: ['2 veces','4 veces','1 vez','3 veces'], a: 0, cat: 'Examen BELE' },
  { q: 'La prueba de lenguaje musical vale…', opts: ['10 puntos','20 puntos','5 puntos','2,5 puntos'], a: 0, cat: 'Examen BELE' },
  { q: 'Cada acorde acertado en b.2 vale…', opts: ['0,25 pt','0,5 pt','1 pt','0,1 pt'], a: 0, cat: 'Examen BELE' }
];

const ERR_EX = [
  { written: [{ key:'e/4',dur:'q'},{ key:'f/4',dur:'q'},{ key:'g/4',dur:'q'},{ key:'a/4',dur:'q'}],
    played: [64,64,67,69], errIdx: 1, errDesc: 'Mi4 → Mi♭4 (cromático −1)' },
  { written: [{ key:'c/5',dur:'q'},{ key:'d/5',dur:'q'},{ key:'e/5',dur:'q'},{ key:'f/5',dur:'q'}],
    played: [72,74,76,77], errIdx: 3, errDesc: 'Fa5 → Mi5 (diatónico −1)' },
  { written: [{ key:'g/4',dur:'q'},{ key:'a/4',dur:'q'},{ key:'b/4',dur:'q'},{ key:'c/5',dur:'q'}],
    played: [67,69,70,72], errIdx: 2, errDesc: 'Si4 → Si♭4 (cromático)' }
];

/* ── module state ── */
const state = {
  mod: 'inicio', page: 0,
  lect: { diff: 'basico', series: [], idx: 0, ans: false, errs: [] },
  ac: { series: [], idx: 0, ans: false, errs: [] },
  rt: { order: [], idx: 0, ans: false },
  err: { order: [], idx: 0, ans: false },
  teo: { order: [], idx: 0, ans: false }
};

function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function pickSeries(pool, n) {
  const s = shuffle(pool);
  const out = [];
  for (let i = 0; i < n; i++) {
    let item = s[i % s.length];
    if (out.length && out[out.length - 1] === item) item = s[(i + 1) % s.length];
    out.push(item);
  }
  return out;
}

const MODULES = {
  inicio: { title: 'Examen', pages: 3 },
  ritmo: { title: 'Ritmo · a.1', pages: () => 2 + RHYTHMS.length },
  errores: { title: 'Errores · b.1', pages: () => 2 + ERR_EX.length },
  acordes: { title: 'Acordes · b.2', pages: () => 2 + 10 },
  lectura: { title: 'Clave de Sol', pages: () => 2 + 10 },
  teoria: { title: 'Teoría', pages: () => 1 + TEO_Q.length },
  historial: { title: 'Progreso', pages: 1 }
};

function pageCount(mod) {
  const m = MODULES[mod];
  return typeof m.pages === 'function' ? m.pages() : m.pages;
}

function goPage(n) {
  const max = pageCount(state.mod) - 1;
  state.page = Math.max(0, Math.min(n, max));
  render();
}

function setMod(mod) {
  state.mod = mod;
  state.page = 0;
  if (mod === 'lectura' && !state.lect.series.length) startLect();
  if (mod === 'acordes' && !state.ac.series.length) startAc();
  if (mod === 'ritmo' && !state.rt.order.length) state.rt.order = shuffle([...RHYTHMS.keys()]);
  if (mod === 'errores' && !state.err.order.length) state.err.order = shuffle([...ERR_EX.keys()]);
  if (mod === 'teoria' && !state.teo.order.length) state.teo.order = shuffle([...TEO_Q.keys()]);
  document.querySelectorAll('#main-nav .r-i').forEach(b => b.classList.toggle('on', b.dataset.mod === mod));
  render();
}

/* ── exercise starters ── */
function startLect() {
  const pool = DIFF_SETS[state.lect.diff];
  state.lect.series = pickSeries(pool, 10).map(n => noteByName(n));
  state.lect.idx = 0; state.lect.ans = false; state.lect.errs = [];
}
function startAc() {
  const types = shuffle([...CT.keys(), ...CT.keys(), ...CT.keys()].slice(0, 10));
  state.ac.series = types.map(t => {
    const root = RMIDI[Math.floor(Math.random() * RMIDI.length)];
    return { type: t, root };
  });
  state.ac.idx = 0; state.ac.ans = false; state.ac.errs = [];
}

function getLectOptions(correct) {
  const pool = DIFF_SETS[state.lect.diff].filter(n => n !== correct.name);
  const opts = shuffle(pool).slice(0, 3);
  opts.push(correct.name);
  return shuffle(opts);
}

/* ── render helpers ── */
function pageNav(total) {
  const p = state.page;
  const dots = Array.from({ length: Math.min(total, 12) }, (_, i) =>
    `<a href="#" class="${i === p ? 'on' : ''}" data-goto="${i}">${i + 1}</a>`).join('');
  return `<div class="page-nav">
    <button type="button" class="btn btn-outline" data-nav="prev" ${p === 0 ? 'disabled' : ''}>
      <svg class="ico sm"><use href="#i-chev-l"/></svg> Anterior
    </button>
    <div class="pager">${dots}</div>
    <button type="button" class="btn btn-primary" data-nav="next" ${p >= total - 1 ? 'disabled' : ''}>
      Siguiente <svg class="ico sm"><use href="#i-chev-r"/></svg>
    </button>
  </div>`;
}

function stepper(total) {
  const p = state.page;
  let html = '<div class="stepper">';
  for (let i = 0; i < Math.min(total, 8); i++) {
    if (i) html += '<span class="ln"></span>';
    html += `<span class="st ${i <= p ? 'on' : ''}">${i + 1}</span>`;
  }
  if (total > 8) html += `<span class="label" style="margin-left:8px">+${total - 8}</span>`;
  return html + '</div>';
}

function progressBar(pct) {
  return `<div class="lp" style="margin-bottom:16px"><i style="width:${pct}%"></i></div>`;
}

/* ── section renders ── */
function renderInicio() {
  const pages = [
    () => `<div class="page-meta"><span class="seq-label">Secuencia 01 · Introducción</span><span class="page-num">${state.page + 1} / 3</span></div>
      ${stepper(3)}${progressBar(33)}
      <p class="exam-signal"><span class="d"></span> Prueba sustitutoria · BELE Bilbao</p>
      <h1 class="page-title">Prueba de lenguaje musical</h1>
      <p class="editorial-quote">Equivalente al 4º curso de Enseñanzas Elementales.</p>
      <div class="theory-card"><h4>Estructura del examen</h4><ul>
        <li><strong>a.1 Lectura rítmica</strong> — fragmento de 8–16 compases con cambio de clave y compás.</li>
        <li><strong>b.1 Errores melódicos</strong> — 5 diferencias de altura en 8 compases (4 escuchas).</li>
        <li><strong>b.2 Test de acordes</strong> — 10 tríadas en estado fundamental (2 escuchas).</li>
      </ul></div>
      <div class="theory-card"><h4>Puntuación</h4>
        <table class="theory-table"><tr><th>Parte</th><th>Puntos</th></tr>
        <tr><td>Lectura rítmica</td><td>5</td></tr>
        <tr><td>Errores (0,5 c/u)</td><td>2,5</td></tr>
        <tr><td>Acordes (0,25 c/u)</td><td>2,5</td></tr></table>
        <p style="margin-top:12px;font-size:11px;color:var(--secondary)">Mínimo <strong style="color:var(--primary)">5/10</strong> en lenguaje musical para superar la prueba.</p>
      </div>`,
    () => `<div class="page-meta"><span class="seq-label">Secuencia 01 · Contenidos</span><span class="page-num">2 / 3</span></div>
      ${stepper(3)}${progressBar(66)}
      <h1 class="page-title">Contenidos evaluados</h1>
      <p class="page-lead">Según el Decreto 229/2007 y la Orden de 30 enero 2014 BOPV.</p>
      <div class="theory-card"><h4>Lectura rítmica</h4><ul>
        <li>Claves de Sol y Fa (4ª línea)</li>
        <li>Compases 2/4, 3/4, 4/4, 2/2, 3/2, 2/8, 3/8, 6/8, 9/8, 12/8</li>
        <li>Figuras hasta semicorchea · tresillo, dosillo, cuatrillo</li>
      </ul></div>
      <div class="theory-card"><h4>Audición b.1</h4><ul>
        <li>Tonalidad Mayor o menor (hasta 3 alteraciones)</li>
        <li>Errores solo de altura — nunca de ritmo</li>
        <li>VIº/VIIº elevados, dominantes secundarias, floreos</li>
      </ul></div>`,
    () => `<div class="page-meta"><span class="seq-label">Secuencia 01 · Criterios</span><span class="page-num">3 / 3</span></div>
      ${stepper(3)}${progressBar(100)}
      <h1 class="page-title">Cómo practicar aquí</h1>
      <p class="page-lead">Cada módulo está <strong>paginado</strong>: primero teoría breve, luego ejercicios uno a uno.</p>
      <div class="theory-card"><h4>Modo de realización oficial</h4><ul>
        <li><strong>a.1:</strong> 5 min de lectura previa en clausura individual.</li>
        <li><strong>b.1:</strong> pulso al inicio · 4 repeticiones con pausa.</li>
        <li><strong>b.2:</strong> 10 acordes · serie repetida 2 veces.</li>
      </ul></div>
      <p class="page-lead">Usa la barra lateral para empezar por <strong>Ritmo</strong>, <strong>Errores</strong> o <strong>Acordes</strong>.</p>`
  ];
  return pages[state.page]() + pageNav(3);
}

function renderRitmo() {
  const total = pageCount('ritmo');
  if (state.page === 0) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 02 · Ritmo</span><span class="page-num">1 / ${total}</span></div>
      ${stepper(total)}${progressBar(100 / total)}
      <h1 class="page-title">Lectura rítmica · a.1</h1>
      <p class="page-lead">Identifica el compás del patrón escrito y escuchado. El pulso fuerte suena más alto.</p>
      <div class="theory-card"><h4>Compases del examen</h4><ul>
        <li><strong>Simples /4:</strong> 2/4 · 3/4 · 4/4 — pulso = negra</li>
        <li><strong>Simples /2:</strong> 2/2 · 3/2 — pulso = blanca</li>
        <li><strong>Simples /8:</strong> 2/8 · 3/8 — pulso = corchea</li>
        <li><strong>Compuestos /8:</strong> 6/8 · 9/8 · 12/8 — pulso = negra con puntillo</li>
      </ul></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 02 · Ritmo</span><span class="page-num">2 / ${total}</span></div>
      ${stepper(total)}${progressBar(200 / total)}
      <h1 class="page-title">Equivalencias clave</h1>
      <div class="theory-card"><h4>Recuerda</h4><ul>
        <li>En compás compuesto 6/8, dos corcheas = una negra con puntillo.</li>
        <li>Cambia de compás con fluidez — el examen incluye al menos un cambio.</li>
        <li>Escucha el acento del primer pulso antes de leer.</li>
      </ul></div>
      <button type="button" class="btn btn-primary" data-action="start-ritmo">Comenzar ejercicios</button>` + pageNav(total);
  }
  const exIdx = state.page - 2;
  const r = RHYTHMS[state.rt.order[exIdx % state.rt.order.length]];
  const opts = shuffle(['2/4','3/4','4/4','6/8','3/2','2/8']).slice(0, 4);
  if (!opts.includes(r.label)) opts[0] = r.label;
  const options = shuffle(opts);
  return `<div class="page-meta"><span class="seq-label">Ejercicio rítmico ${exIdx + 1} / ${RHYTHMS.length}</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}
    <h1 class="page-title">¿Qué compás es?</h1>
    <div class="exercise-panel">
      <div class="vex-host" id="vex-rt"></div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play-rhythm="${exIdx}"><svg class="ico sm"><use href="#i-play"/></svg> Escuchar</button>
        <div class="wave-bar"><i id="wave-rt"></i></div>
      </div>
      <div class="options-grid" id="opts-rt">${options.map(o =>
        `<button type="button" class="opt-btn" data-rt-ans="${o}" data-correct="${r.label}">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb-rt"></div>
    </div>` + pageNav(total);
}

function renderErrores() {
  const total = pageCount('errores');
  if (state.page === 0) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 03 · Errores</span><span class="page-num">1 / ${total}</span></div>
      ${stepper(total)}${progressBar(100 / total)}
      <h1 class="page-title">Errores melódicos · b.1</h1>
      <p class="page-lead">Localiza <strong>5 errores de altura</strong> entre la partitura y lo escuchado. En el examen: 8 compases, 4 escuchas.</p>
      <div class="theory-card"><h4>Estrategia recomendada</h4><ol>
        <li>1ª escucha: seguir sin marcar</li>
        <li>2ª escucha: marcar compases sospechosos</li>
        <li>3ª escucha: confirmar la nota exacta</li>
        <li>4ª escucha: señalización final</li>
      </ol></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 03 · Errores</span><span class="page-num">2 / ${total}</span></div>
      ${stepper(total)}${progressBar(200 / total)}
      <h1 class="page-title">Tipos de error</h1>
      <div class="theory-card"><h4>En el examen BELE</h4>
        <table class="theory-table"><tr><th>Tipo</th><th>Ejemplo</th></tr>
        <tr><td>Cromático ±1</td><td>Mi → Mi♭</td></tr>
        <tr><td>Diatónico ±1 tono</td><td>Sol → La</td></tr>
        <tr><td>VIº/VIIº menor</td><td>Sol♮ → Sol♯</td></tr>
        <tr><td>Accidental olvidado</td><td>Si♭ → Si♮</td></tr></table>
      </div>
      <button type="button" class="btn btn-primary" data-action="start-errores">Comenzar ejercicios</button>` + pageNav(total);
  }
  const exIdx = state.page - 2;
  const ex = ERR_EX[state.err.order[exIdx % ERR_EX.length]];
  const noteLabels = ['Nota 1','Nota 2','Nota 3','Nota 4'];
  return `<div class="page-meta"><span class="seq-label">Ejercicio ${exIdx + 1} / ${ERR_EX.length}</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}
    <h1 class="page-title">¿Dónde está el error?</h1>
    <div class="exercise-panel">
      <div class="vex-host" id="vex-err"></div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play-written="${exIdx}">Partitura (correcta)</button>
        <button type="button" class="btn btn-outline" data-play-played="${exIdx}">Escuchado (con error)</button>
        <div class="wave-bar"><i id="wave-err"></i></div>
      </div>
      <div class="options-grid" id="opts-err">${noteLabels.map((l, i) =>
        `<button type="button" class="opt-btn" data-err-ans="${i}" data-correct="${ex.errIdx}">${l}</button>`).join('')}</div>
      <div class="feedback" id="fb-err"></div>
    </div>` + pageNav(total);
}

function renderAcordes() {
  const total = pageCount('acordes');
  if (state.page === 0) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 04 · Acordes</span><span class="page-num">1 / ${total}</span></div>
      ${stepper(total)}${progressBar(100 / total)}
      <h1 class="page-title">Test auditivo · b.2</h1>
      <p class="page-lead">Identifica el <strong>tipo de tríada</strong> — no las notas exactas. 10 ítems · 2 escuchas de la serie completa.</p>
      <div class="theory-card"><h4>Los cuatro tipos</h4>
        <table class="theory-table"><tr><th>Tipo</th><th>Fórmula</th><th>Semitonos</th></tr>
        <tr><td>Mayor</td><td>3ªM + 5ªJ</td><td>0-4-7</td></tr>
        <tr><td>menor</td><td>3ªm + 5ªJ</td><td>0-3-7</td></tr>
        <tr><td>Disminuido</td><td>3ªm + 5ªdim</td><td>0-3-6</td></tr>
        <tr><td>Aumentado</td><td>3ªM + 5ªaum</td><td>0-4-8</td></tr></table>
      </div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 04 · Acordes</span><span class="page-num">2 / ${total}</span></div>
      ${stepper(total)}${progressBar(200 / total)}
      <h1 class="page-title">Carácter sonoro</h1>
      <div class="theory-card"><h4>Referencia auditiva</h4><ul>
        <li><strong>Mayor</strong> — estable, luminoso</li>
        <li><strong>menor</strong> — oscuro, introspectivo</li>
        <li><strong>Disminuido</strong> — tenso, tritono interior</li>
        <li><strong>Aumentado</strong> — misterioso, simétrico</li>
      </ul></div>
      <button type="button" class="btn btn-primary" data-action="start-acordes">Comenzar serie de 10</button>` + pageNav(total);
  }
  if (!state.ac.series.length) startAc();
  const exIdx = state.page - 2;
  const item = state.ac.series[exIdx];
  const chord = CT[item.type];
  return `<div class="page-meta"><span class="seq-label">Acorde ${exIdx + 1} / 10</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}
    <h1 class="page-title">¿Qué tríada escuchas?</h1>
    <div class="exercise-panel">
      <div class="audio-row">
        <button type="button" class="btn btn-primary" data-play-chord="${exIdx}"><svg class="ico sm"><use href="#i-play"/></svg> Escuchar acorde</button>
        <div class="wave-bar"><i id="wave-ac"></i></div>
      </div>
      <div class="options-grid">${shuffle(CT.map(c => c.name)).map(n =>
        `<button type="button" class="opt-btn" data-ac-ans="${n}" data-correct="${chord.name}">${n}</button>`).join('')}</div>
      <div class="feedback" id="fb-ac"></div>
    </div>` + pageNav(total);
}

function renderLectura() {
  const total = pageCount('lectura');
  if (state.page === 0) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 05 · Clave de Sol</span><span class="page-num">1 / ${total}</span></div>
      ${stepper(total)}${progressBar(100 / total)}
      <h1 class="page-title">Lectura en clave de Sol</h1>
      <p class="page-lead">Para instrumentistas de clave de Fa (violonchelo, contrabajo). Método conservatorio + Pozzoli.</p>
      <div class="theory-card"><h4>Anclas en clave de Sol</h4><ul>
        <li><strong>Do4</strong> — 1ª línea adicional inferior</li>
        <li><strong>Sol4</strong> — 2ª línea (espiral de la clave)</li>
        <li><strong>Si4</strong> — 3ª línea · <strong>Re5</strong> — 4ª · <strong>Fa5</strong> — 5ª</li>
        <li>Espacios: <strong>Fa La Do Mi</strong> (FACE)</li>
      </ul></div>` + pageNav(total);
  }
  if (state.page === 1) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 05 · Clave de Sol</span><span class="page-num">2 / ${total}</span></div>
      ${stepper(total)}${progressBar(200 / total)}
      <h1 class="page-title">Elige dificultad</h1>
      <div class="diff-row">
        <button type="button" class="chip ${state.lect.diff === 'basico' ? 'on' : ''}" data-diff="basico">Básico · Pozzoli 1–21</button>
        <button type="button" class="chip ${state.lect.diff === 'medio' ? 'on' : ''}" data-diff="medio">Medio · Do central</button>
        <button type="button" class="chip ${state.lect.diff === 'avanzado' ? 'on' : ''}" data-diff="avanzado">Avanzado · Do3–Do6</button>
      </div>
      <button type="button" class="btn btn-primary" data-action="start-lect">Serie de 10 notas</button>` + pageNav(total);
  }
  if (!state.lect.series.length) startLect();
  const exIdx = state.page - 2;
  const note = state.lect.series[exIdx];
  const opts = getLectOptions(note);
  return `<div class="page-meta"><span class="seq-label">Nota ${exIdx + 1} / 10</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}
    <h1 class="page-title">¿Qué nota es?</h1>
    <div class="exercise-panel">
      <div class="vex-host" id="vex-lect"></div>
      <div class="audio-row">
        <button type="button" class="btn btn-outline" data-play-note="${exIdx}"><svg class="ico sm"><use href="#i-play"/></svg> Escuchar</button>
        <div class="wave-bar"><i id="wave-lect"></i></div>
      </div>
      <div class="options-grid">${opts.map(o =>
        `<button type="button" class="opt-btn" data-lect-ans="${o}" data-correct="${note.name}">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb-lect"></div>
    </div>` + pageNav(total);
}

function renderTeoria() {
  const total = pageCount('teoria');
  if (state.page === 0) {
    return `<div class="page-meta"><span class="seq-label">Secuencia 06 · Teoría</span><span class="page-num">1 / ${total}</span></div>
      ${stepper(total)}${progressBar(100 / total)}
      <h1 class="page-title">Cuestionario de repaso</h1>
      <p class="page-lead">15 preguntas sobre intervalos, acordes, compases, claves y formato del examen BELE.</p>
      <button type="button" class="btn btn-primary" data-action="start-teo">Comenzar cuestionario</button>` + pageNav(total);
  }
  const qIdx = state.teo.order[state.page - 1];
  const q = TEO_Q[qIdx];
  return `<div class="page-meta"><span class="seq-label">${q.cat}</span><span class="page-num">${state.page + 1} / ${total}</span></div>
    ${stepper(total)}${progressBar((state.page + 1) / total * 100)}
    <h1 class="page-title" style="font-size:20px">${q.q}</h1>
    <div class="exercise-panel">
      <div class="options-grid">${q.opts.map((o, i) =>
        `<button type="button" class="opt-btn" data-teo-ans="${i}" data-correct="${q.a}">${o}</button>`).join('')}</div>
      <div class="feedback" id="fb-teo"></div>
    </div>` + pageNav(total);
}

function renderHistorial() {
  const total = H.log.length, correct = H.log.filter(x => x.ok).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const secs = [
    { id: 'lect', label: 'Lectura Sol' }, { id: 'ac', label: 'Acordes' },
    { id: 'rt', label: 'Ritmo' }, { id: 'teo', label: 'Teoría' }
  ];
  const bars = secs.map(s => {
    const sc = H.scores[s.id];
    const p = sc.t ? Math.round(sc.c / sc.t * 100) : 0;
    return `<div class="bar-row"><div class="bar-head"><span>${s.label}</span><b>${p}% · ${sc.c}/${sc.t}</b></div><div class="lp"><i style="width:${p}%"></i></div></div>`;
  }).join('');
  const noteErr = Object.entries(H.noteErr).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const noteBars = noteErr.map(([n, c]) => {
    const max = noteErr[0][1];
    return `<div class="bar-row"><div class="bar-head"><span>${n}</span><b>${c}</b></div><div class="lp"><i style="width:${c / max * 100}%"></i></div></div>`;
  }).join('');
  const log = H.log.slice(0, 20).map(e => {
    const labels = { lect: 'Lectura', ac: 'Acordes', rt: 'Ritmo', teo: 'Teoría', err: 'Errores' };
    const d = new Date(e.ts);
    return `<div class="log-item"><span class="${e.ok ? 'ok' : 'no'}">${e.ok ? '✓' : '✗'}</span><span>${labels[e.sec] || e.sec}</span><span>${e.lbl || '—'}</span><span style="margin-left:auto">${d.toLocaleString('es-ES',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span></div>`;
  }).join('');
  return `<div class="page-meta"><span class="seq-label">Progreso</span></div>
    <h1 class="page-title">Historial</h1>
    <div class="hist-grid">
      <div class="hist-stat"><div class="val">${pct}<span style="font-size:16px">%</span></div><div class="lbl">Precisión global</div></div>
      <div class="hist-stat"><div class="val">${H.streak}</div><div class="lbl">Racha actual</div></div>
      <div class="hist-stat"><div class="val">${H.best}</div><div class="lbl">Mejor racha</div></div>
      <div class="hist-stat"><div class="val">${total}</div><div class="lbl">Respuestas</div></div>
    </div>
    <h4 class="sub">Por sección</h4>${bars}
    ${noteBars ? `<h4 class="sub">Notas más falladas</h4>${noteBars}` : ''}
    <h4 class="sub">Últimas respuestas</h4>
    <div class="log-list">${log || '<div class="log-item">Sin actividad aún</div>'}</div>
    <button type="button" class="btn btn-outline" style="margin-top:16px" data-action="reset-hist">Reiniciar historial</button>`;
}

function render() {
  const stage = document.getElementById('page-stage');
  let html = '';
  switch (state.mod) {
    case 'inicio': html = renderInicio(); break;
    case 'ritmo': html = renderRitmo(); break;
    case 'errores': html = renderErrores(); break;
    case 'acordes': html = renderAcordes(); break;
    case 'lectura': html = renderLectura(); break;
    case 'teoria': html = renderTeoria(); break;
    case 'historial': html = renderHistorial(); break;
  }
  stage.innerHTML = html;
  postRender();
}

function postRender() {
  const mod = state.mod, p = state.page;
  if (mod === 'ritmo' && p >= 2) {
    const r = RHYTHMS[state.rt.order[(p - 2) % state.rt.order.length]];
    const el = document.getElementById('vex-rt');
    if (el) drawRhythmVex(el, r.dur, r.ts);
  }
  if (mod === 'errores' && p >= 2) {
    const ex = ERR_EX[state.err.order[(p - 2) % ERR_EX.length]];
    const el = document.getElementById('vex-err');
    if (el) drawMelodyVex(el, ex.written);
  }
  if (mod === 'lectura' && p >= 2 && state.lect.series[p - 2]) {
    const note = state.lect.series[p - 2];
    const el = document.getElementById('vex-lect');
    if (el) drawSingleNote(el, note.key, null);
  }
}

/* ── event handling ── */
function btnValue(b) {
  return b.dataset.lectAns ?? b.dataset.acAns ?? b.dataset.rtAns ?? b.dataset.errAns ?? b.dataset.teoAns;
}

function bindFeedback(btn, fbId, ok, msgOk, msgNo, sec, lbl) {
  const correct = btn.dataset.correct;
  btn.parentElement.querySelectorAll('.opt-btn').forEach(b => {
    b.disabled = true;
    const val = btnValue(b);
    if (String(val) === String(correct)) b.classList.add('correct');
    else if (b === btn && !ok) b.classList.add('wrong');
  });
  const fb = document.getElementById(fbId);
  if (fb) { fb.className = 'feedback show ' + (ok ? 'ok' : 'no'); fb.textContent = ok ? msgOk : msgNo; }
  if (sec) logA(sec, ok, lbl);
}

document.addEventListener('click', e => {
  getAudio();
  const nav = e.target.closest('[data-nav]');
  if (nav) { goPage(state.page + (nav.dataset.nav === 'next' ? 1 : -1)); return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { e.preventDefault(); goPage(+goto.dataset.goto); return; }
  const modBtn = e.target.closest('#main-nav .r-i');
  if (modBtn) { setMod(modBtn.dataset.mod); return; }

  const diff = e.target.closest('[data-diff]');
  if (diff) { state.lect.diff = diff.dataset.diff; state.lect.series = []; render(); return; }

  if (e.target.closest('[data-action="start-lect"]')) { startLect(); goPage(2); return; }
  if (e.target.closest('[data-action="start-acordes"]')) { startAc(); goPage(2); return; }
  if (e.target.closest('[data-action="start-ritmo"]')) { state.rt.order = shuffle([...RHYTHMS.keys()]); goPage(2); return; }
  if (e.target.closest('[data-action="start-errores"]')) { state.err.order = shuffle([...ERR_EX.keys()]); goPage(2); return; }
  if (e.target.closest('[data-action="start-teo"]')) { state.teo.order = shuffle([...TEO_Q.keys()]); goPage(1); return; }
  if (e.target.closest('[data-action="reset-hist"]')) { H = nH(); saveH(); updSc(); render(); return; }

  const playNoteBtn = e.target.closest('[data-play-note]');
  if (playNoteBtn) {
    const n = state.lect.series[+playNoteBtn.dataset.playNote];
    if (n) { playNote(mf(n.midi), 0, 1.2); animWave('wave-lect', 1200); }
    return;
  }
  const playChord = e.target.closest('[data-play-chord]');
  if (playChord) {
    const item = state.ac.series[+playChord.dataset.playChord];
    if (item) { playChordMidi(item.root, CT[item.type].iv); animWave('wave-ac', 1800); }
    return;
  }
  const playRt = e.target.closest('[data-play-rhythm]');
  if (playRt) {
    const r = RHYTHMS[state.rt.order[(state.page - 2) % state.rt.order.length]];
    let t = 0; const bd = 0.6;
    r.beats.forEach((b, i) => { playNote(mf(i === 0 ? 65 : 60), t, b * bd * 0.85, i === 0 ? 0.5 : 0.35); t += b * bd; });
    animWave('wave-rt', t * 1000 + 200);
    return;
  }
  const pw = e.target.closest('[data-play-written]');
  if (pw) {
    const ex = ERR_EX[state.err.order[(state.page - 2) % ERR_EX.length]];
    const midis = ex.written.map(n => keyToMidi(n.key));
    playMelody(midis); animWave('wave-err', midis.length * 350);
    return;
  }
  const pp = e.target.closest('[data-play-played]');
  if (pp) {
    const ex = ERR_EX[state.err.order[(state.page - 2) % ERR_EX.length]];
    playMelody(ex.played); animWave('wave-err', ex.played.length * 350);
    return;
  }

  const lectBtn = e.target.closest('[data-lect-ans]');
  if (lectBtn && !lectBtn.disabled) {
    const ok = lectBtn.dataset.lectAns === lectBtn.dataset.correct;
    bindFeedback(lectBtn, 'fb-lect', ok, '✓ Correcto', `✗ Era ${lectBtn.dataset.correct}`, 'lect', lectBtn.dataset.correct);
    return;
  }
  const acBtn = e.target.closest('[data-ac-ans]');
  if (acBtn && !acBtn.disabled) {
    const ok = acBtn.dataset.acAns === acBtn.dataset.correct;
    bindFeedback(acBtn, 'fb-ac', ok, '✓ Correcto', `✗ Era ${acBtn.dataset.correct}`, 'ac', acBtn.dataset.correct);
    return;
  }
  const rtBtn = e.target.closest('[data-rt-ans]');
  if (rtBtn && !rtBtn.disabled) {
    const ok = rtBtn.dataset.rtAns === rtBtn.dataset.correct;
    bindFeedback(rtBtn, 'fb-rt', ok, '✓ Correcto', `✗ Era ${rtBtn.dataset.correct}`, 'rt', rtBtn.dataset.correct);
    return;
  }
  const errBtn = e.target.closest('[data-err-ans]');
  if (errBtn && !errBtn.disabled) {
    const ex = ERR_EX[state.err.order[(state.page - 2) % ERR_EX.length]];
    const ok = +errBtn.dataset.errAns === ex.errIdx;
    bindFeedback(errBtn, 'fb-err', ok, '✓ Correcto — ' + ex.errDesc, `✗ ${ex.errDesc}`, 'err', ex.errDesc);
    return;
  }
  const teoBtn = e.target.closest('[data-teo-ans]');
  if (teoBtn && !teoBtn.disabled) {
    const ok = +teoBtn.dataset.teoAns === +teoBtn.dataset.correct;
    const q = TEO_Q[state.teo.order[state.page - 1]];
    bindFeedback(teoBtn, 'fb-teo', ok, '✓ Correcto', `✗ Correcta: ${q.opts[q.a]}`, 'teo', q.cat);
    return;
  }
});

document.querySelectorAll('.fab button').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.themeSet;
    document.documentElement.dataset.theme = theme;
    document.querySelector('.app-shell').dataset.theme = theme;
    document.querySelectorAll('.fab button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
  });
});

updSc();
render();
