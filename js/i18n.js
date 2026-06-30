/* i18n — ES / EN */
const I18N = {
  es: {
    brand: 'ENTRENADOR · BELE',
    brand_sub: 'Prueba sustitutoria · 4º EE',
    diff_label: 'Dificultad',
    diff_easy: 'Fácil', diff_medium: 'Medio', diff_hard: 'Difícil',
    diff_meta: '{n} ítems · {o} opciones{listens}{timer}',
    listens_meta: ' · {n} escuchas',
    timer_meta: ' · {n}s',
    listens_hud: 'Escuchas',
    item_hud: 'Ítem',
    nav_prev: 'Anterior', nav_next: 'Siguiente', nav_hint: 'Responde para continuar',
    fb_ok: '✓ Correcto', fb_wrong: '✗ Era {x}', fb_wrong_teo: '✗ Correcta: {x}',
    timeout: '⏱ Tiempo agotado — revisa la respuesta correcta marcada.',
    run_done: 'Serie completada', accuracy: 'Precisión', correct: 'Aciertos',
    back_home: 'Volver al inicio', run_summary: 'Resultado · {mod} · {diff}',
    run_items: 'Respuestas de esta serie',
    metro: 'Metrónomo', bpm: 'BPM',
    theme_dark: 'DARK', theme_light: 'LIGHT',
    sc_lect: 'Lect.', sc_ac: 'Ac.', sc_rt: 'Rit.', sc_err: 'Err.', sc_teo: 'Teo.',
    sec_rt: 'Ritmo', sec_err: 'Errores', sec_ac: 'Acordes', sec_lect: 'Lectura', sec_teo: 'Teoría',
    rt_hint: 'El compás no se muestra — identifícalo escuchando el patrón.',
    rt_title: '¿Qué compás es?', rt_listen: 'Escuchar patrón', rt_fast: 'Pulso rápido', rt_aural: 'Escucha',
    err_title: '¿Dónde está el error?',
    ac_title: '¿Qué tríada escuchas?', ac_listen: 'Escuchar', ac_arp: 'Arpegio',
    lect_title: '¿Qué nota es?', lect_listen: 'Escuchar', lect_ref: 'Do4 referencia',
    start_rt: 'Comenzar serie', start_err: 'Comenzar', start_ac: 'Comenzar test',
    start_lect: 'Comenzar lectura', start_teo: 'Comenzar',
    prep: 'Preparación', finish_run_auto: 'Mostrando resultado…',
    hist_title: 'Historial', hist_precision: 'Precisión', hist_streak: 'Racha',
    hist_best: 'Mejor racha', hist_answers: 'Respuestas', hist_by_sec: 'Por sección',
    hist_by_diff: 'Por dificultad', hist_recent: 'Actividad reciente', hist_empty: 'Sin actividad aún',
    sync_now: 'Sincronizar ahora', reset_hist: 'Reiniciar historial',
    nav_inicio: 'Examen', nav_ritmo: 'Ritmo a.1', nav_errores: 'Errores b.1',
    nav_acordes: 'Acordes b.2', nav_lectura: 'Clave de Sol', nav_teoria: 'Teoría', nav_historial: 'Progreso',
  },
  en: {
    brand: 'BELE TRAINER',
    brand_sub: 'Substitute music exam · Grade 4',
    diff_label: 'Difficulty',
    diff_easy: 'Easy', diff_medium: 'Medium', diff_hard: 'Hard',
    diff_meta: '{n} items · {o} options{listens}{timer}',
    listens_meta: ' · {n} listens',
    timer_meta: ' · {n}s',
    listens_hud: 'Listens',
    item_hud: 'Item',
    nav_prev: 'Previous', nav_next: 'Next', nav_hint: 'Answer to continue',
    fb_ok: '✓ Correct', fb_wrong: '✗ It was {x}', fb_wrong_teo: '✗ Correct: {x}',
    timeout: '⏱ Time up — check the marked correct answer.',
    run_done: 'Series complete', accuracy: 'Accuracy', correct: 'Correct',
    back_home: 'Back to home', run_summary: 'Result · {mod} · {diff}',
    run_items: 'Answers in this run',
    metro: 'Metronome', bpm: 'BPM',
    theme_dark: 'DARK', theme_light: 'LIGHT',
    sc_lect: 'Read.', sc_ac: 'Ch.', sc_rt: 'Rhy.', sc_err: 'Err.', sc_teo: 'Th.',
    sec_rt: 'Rhythm', sec_err: 'Errors', sec_ac: 'Chords', sec_lect: 'Reading', sec_teo: 'Theory',
    rt_hint: 'Time signature hidden — identify it by listening.',
    rt_title: 'What time signature?', rt_listen: 'Listen pattern', rt_fast: 'Fast pulse', rt_aural: 'Listen',
    err_title: 'Where is the error?',
    ac_title: 'Which triad do you hear?', ac_listen: 'Listen', ac_arp: 'Arpeggio',
    lect_title: 'Which note?', lect_listen: 'Listen', lect_ref: 'C4 reference',
    start_rt: 'Start series', start_err: 'Start', start_ac: 'Start test',
    start_lect: 'Start reading', start_teo: 'Start',
    prep: 'Warm-up', finish_run_auto: 'Showing results…',
    hist_title: 'History', hist_precision: 'Accuracy', hist_streak: 'Streak',
    hist_best: 'Best streak', hist_answers: 'Answers', hist_by_sec: 'By section',
    hist_by_diff: 'By difficulty', hist_recent: 'Recent activity', hist_empty: 'No activity yet',
    sync_now: 'Sync now', reset_hist: 'Reset history',
    nav_inicio: 'Exam', nav_ritmo: 'Rhythm a.1', nav_errores: 'Melodic errors b.1',
    nav_acordes: 'Chords b.2', nav_lectura: 'Treble clef', nav_teoria: 'Theory', nav_historial: 'Progress',
  },
};

const LANG_KEY = 'music_bele_lang';
const THEME_KEY = 'music_bele_theme';
let lang = localStorage.getItem(LANG_KEY) || 'es';

function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
  return s;
}

function chordName(name) {
  if (lang === 'es') return name;
  const map = { Mayor: 'Major', menor: 'minor', Disminuido: 'Diminished', Aumentado: 'Augmented' };
  return map[name] || name;
}

function setLang(l) {
  lang = l === 'en' ? 'en' : 'es';
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyChromeI18n();
  if (typeof render === 'function') render();
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  const shell = document.querySelector('.app-shell');
  if (shell) shell.dataset.theme = theme;
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.themeSet === theme ? 'true' : 'false');
  });
}

function applyChromeI18n() {
  const brand = document.querySelector('.brand-mark');
  const sub = document.querySelector('.brand-sub');
  if (brand) brand.textContent = t('brand');
  if (sub) sub.textContent = t('brand_sub');
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.textContent = t(b.dataset.themeSet === 'dark' ? 'theme_dark' : 'theme_light');
  });
  document.querySelectorAll('[data-lang-set]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.langSet === lang ? 'true' : 'false');
  });
  const metroBtn = document.querySelector('#metro-toggle span');
  if (metroBtn) metroBtn.textContent = t('metro');
  const navMap = {
    inicio: 'nav_inicio', ritmo: 'nav_ritmo', errores: 'nav_errores',
    acordes: 'nav_acordes', lectura: 'nav_lectura', teoria: 'nav_teoria', historial: 'nav_historial',
  };
  document.querySelectorAll('#main-nav .r-i').forEach(b => {
    const k = navMap[b.dataset.mod];
    if (k) { b.title = t(k); b.setAttribute('aria-label', t(k)); }
  });
  updScoreLabels();
}

function updScoreLabels() {
  const map = { 'sc-lect': 'sc_lect', 'sc-ac': 'sc_ac', 'sc-rt': 'sc_rt', 'sc-err': 'sc_err', 'sc-teo': 'sc_teo' };
  document.querySelectorAll('.score-pill').forEach(pill => {
    const b = pill.querySelector('b');
    if (!b) return;
    const k = map[b.id];
    if (k) pill.firstChild.textContent = t(k);
  });
}

document.documentElement.lang = lang;

window.t = t;
window.chordName = chordName;
window.setLang = setLang;
window.loadTheme = loadTheme;
window.setTheme = setTheme;
window.applyChromeI18n = applyChromeI18n;
