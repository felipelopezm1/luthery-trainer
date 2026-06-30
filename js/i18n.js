/* i18n — ES / EN */
const I18N = {
  es: {
    brand: 'ENTRENADOR · BELE',
    brand_sub: 'Prueba sustitutoria · 4º EE',
    page_title: 'Entrenador Musical · BELE Laudería',
    diff_label: 'Dificultad',
    diff_easy: 'Fácil', diff_medium: 'Medio', diff_hard: 'Difícil',
    diff_meta: '{n} ítems · {o} opciones{listens}{timer}',
    listens_meta: ' · {n} escuchas', timer_meta: ' · {n}s',
    listens_hud: 'Escuchas', item_hud: 'Ítem',
    nav_prev: 'Anterior', nav_next: 'Siguiente', nav_hint: 'Responde para continuar',
    fb_ok: '✓ Correcto', fb_wrong: '✗ Era {x}', fb_wrong_teo: '✗ Correcta: {x}',
    timeout: '⏱ Tiempo agotado — revisa la respuesta correcta marcada.',
    run_done: 'Serie completada', accuracy: 'Precisión', correct: 'Aciertos',
    back_home: 'Volver al inicio', run_summary: 'Resultado · {mod} · {diff}',
    run_items: 'Respuestas de esta serie',
    metro: 'Metrónomo', bpm: 'BPM', metro_bpm_aria: 'Pulsos por minuto',
    theme_dark: 'DARK', theme_light: 'LIGHT',
    sc_lect: 'Lect.', sc_ac: 'Ac.', sc_rt: 'Rit.', sc_err: 'Err.', sc_teo: 'Teo.',
    sec_rt: 'Ritmo', sec_err: 'Errores', sec_ac: 'Acordes', sec_lect: 'Lectura', sec_teo: 'Teoría',
    rt_hint: 'El compás no se muestra — identifícalo escuchando el patrón.',
    rt_title: '¿Qué compás es?', rt_listen: 'Escuchar patrón', rt_fast: 'Pulso rápido', rt_aural: 'Escucha',
    err_title: '¿Dónde está el error?', err_note: 'Nota {n}', err_num: '{n}. {name}',
    err_score: 'Partitura ✓', err_wrong: 'Con error', err_ab: 'A/B alternado',
    ac_title: '¿Qué tríada escuchas?', ac_listen: 'Escuchar', ac_arp: 'Arpegio',
    ac_type: 'Tipo', ac_intervals: 'Intervalos',
    lect_title: '¿Qué nota es?', lect_listen: 'Escuchar', lect_ref: 'Do4 referencia',
    start_rt: 'Comenzar serie', start_err: 'Comenzar', start_ac: 'Comenzar test',
    start_lect: 'Comenzar lectura', start_teo: 'Comenzar',
    prep: 'Preparación', prep_rt_lead: 'Serie de {n} patrones en modo {diff}.',
    hist_title: 'Historial', hist_meta: 'Progreso', hist_precision: 'Precisión', hist_streak: 'Racha',
    hist_best: 'Mejor racha', hist_answers: 'Respuestas', hist_by_sec: 'Por sección',
    hist_by_diff: 'Por dificultad', hist_recent: 'Actividad reciente', hist_empty: 'Sin actividad aún',
    sync_now: 'Sincronizar ahora', reset_hist: 'Reiniciar historial',
    sync_cloud: 'Nube (Upstash)', sync_name: 'Nombre', sync_optional: 'Opcional', sync_loading: 'Sincronizando…',
    sync_idle: 'Listo', sync_syncing: 'Guardando…', sync_ok: 'Guardado en la nube',
    sync_err: 'Error al guardar', sync_offline: 'Sin conexión',
    nav_inicio: 'Examen', nav_ritmo: 'Ritmo a.1', nav_errores: 'Errores b.1',
    nav_acordes: 'Acordes b.2', nav_lectura: 'Clave de Sol', nav_teoria: 'Teoría', nav_historial: 'Progreso',
    seq_01_intro: 'Secuencia 01 · Introducción', seq_01_content: 'Secuencia 01 · Contenidos', seq_01_practice: 'Secuencia 01 · Práctica',
    seq_rt: 'Secuencia 02 · Ritmo', seq_err: 'Secuencia 03 · Errores', seq_ac: 'Secuencia 04 · Acordes',
    seq_lect: 'Secuencia 05 · Clave de Sol', seq_teo: 'Secuencia 06 · Teoría',
    home_signal: 'Prueba sustitutoria · BELE Bilbao',
    home_title: 'Prueba de lenguaje musical',
    home_quote: 'Equivalente al 4º curso de Enseñanzas Elementales.',
    home_exam_h: 'Estructura del examen',
    home_exam_1: 'a.1 Lectura rítmica — 8–16 compases, cambio de clave y compás.',
    home_exam_2: 'b.1 Errores melódicos — 5 errores de altura · 4 escuchas.',
    home_exam_3: 'b.2 Test de acordes — 10 tríadas · 2 escuchas de la serie.',
    home_modes_h: 'Modos de entrenamiento',
    home_easy: 'Fácil — 5 ítems, sin límite de escuchas.',
    home_medium: 'Medio — 10 ítems, 3 escuchas, 45 s por ítem.',
    home_hard: 'Difícil — 15 ítems, 2 escuchas, 25 s, acordes en bloque.',
    home_content_title: 'Contenidos evaluados',
    home_rt_h: 'Lectura rítmica',
    home_rt_1: 'Claves Sol y Fa · compases 2/4–12/8',
    home_rt_2: 'Figuras hasta semicorchea · tresillo, dosillo, cuatrillo',
    home_aural_h: 'Audición',
    home_aural_1: 'Errores solo de altura — nunca ritmo',
    home_aural_2: 'Tríadas Mayor, menor, disminuido, aumentado',
    home_pick_title: 'Elige módulo y dificultad',
    home_pick_lead: 'Usa las pestañas Fácil · Medio · Difícil en cada sección. Debes responder cada ítem antes de avanzar.',
    home_score_h: 'Puntuación oficial', home_score_part: 'Parte', home_score_pts: 'Puntos',
    home_score_rt: 'Lectura rítmica', home_score_err: 'Errores', home_score_ac: 'Acordes',
    rt_intro_title: 'Lectura rítmica · a.1',
    rt_intro_lead: 'Identifica el compás escrito y escuchado. En difícil aparecen 9/8, 12/8 y patrones con semicorcheas.',
    rt_intro_h: 'Compases del examen', rt_intro_1: 'Simples /4, /2, /8 · Compuestos /8',
    rt_intro_2: 'El pulso fuerte suena más alto al escuchar',
    err_intro_title: 'Errores melódicos · b.1',
    err_intro_lead: 'Compara partitura y audio. En difícil hay {n} notas y errores de ±1 semitono.',
    err_intro_h: 'Estrategia (4 escuchas en examen)',
    err_intro_1: 'Seguir sin marcar · marcar sospechas · confirmar · señalar',
    err_prep_title: 'Serie auditiva', err_prep_lead: '{n} melodías · localiza la nota errónea.',
    ac_intro_title: 'Test auditivo · b.2',
    ac_intro_lead: 'Identifica el tipo de tríada. En difícil suenan en bloque (simultáneas).',
    ac_prep_title: 'Serie de {n}',
    lect_intro_title: 'Lectura en clave de Sol',
    lect_intro_lead: 'Para lectores de clave de Fa. Difícil: Do3–Do6 con distractores adyacentes.',
    lect_intro_h: 'Anclas', lect_intro_1: 'Do4 línea adicional · Sol4 2ª línea · Si4 3ª · Re5 4ª · Fa5 5ª',
    lect_prep_title: 'Serie de {n} notas',
    lect_prep_lead: 'Pool: {pool} · {o} opciones por nota.',
    pool_basico: 'básico', pool_medio: 'medio', pool_avanzado: 'avanzado',
    teo_intro_title: 'Cuestionario', teo_intro_lead: '{n} preguntas · tier {tier}.',
    err_desc: '{w} → {p} ({semi})', err_semi_flat: '♭', err_semi_sharp: '♯', err_semi_n: '{n} semitonos',
    target_melody_err: 'Melodía · encuentra el error', target_pulse: 'Pulso fuerte · débil',
    pane_exercise: 'Ejercicio', pane_instrument: 'Instrumento', pane_util: 'Utilización',
    compare_live: 'Comparación en vivo', compare_target: 'Objetivo', compare_you: 'Tu nota',
    compare_hint: 'Toca el teclado para comparar con el ejercicio',
    compare_pick: 'Selecciona un ejercicio con audio', compare_play: 'Toca en LPK25 o escucha',
    compare_match: '✓ {n} coincide con {t}', compare_miss: '✗ {n} · objetivo {t}',
    compare_chord_ok: '✓ {n} pertenece al acorde {c}', compare_chord_no: '✗ {n} no está en {c}',
    compare_melody: 'Entrada: {n} · sigue la melodía en partitura',
    instr_piano: 'Piano', instr_wind: 'Viento', instr_brass: 'Metal', instr_strings: 'Cuerdas',
    instr_guitar: 'Guitarra', instr_organ: 'Acordes',
    instr_loading: 'Cargando {n}…', instr_ready: '{n} listo', instr_fail: 'Error al cargar · pulso sintético',
    midi_connect: 'Conectar LPK25', midi_device: 'Dispositivo MIDI', midi_none: 'Ningún dispositivo',
    midi_prompt: 'Conecta tu AKAI LPK25', midi_connected: 'MIDI · {n}',
    midi_no_support: 'Web MIDI no soportado (usa Chrome/Edge)',
    midi_denied: 'Permiso MIDI denegado — pulsa MIDI o toca la página',
    midi_waiting: 'Sin controlador · conecta LPK25 y espera…',
    viz_wave: 'Forma de onda', viz_spec: 'Espectro', viz_keyboard: 'Teclado MIDI',
    util_general: 'Panel general', util_trend: 'Tendencia · sesiones recientes',
    util_trend_aria: 'Tendencia por sesión', util_ring_aria: 'Precisión y secciones',
    util_empty: 'Sin actividad registrada aún', util_section: 'Sección',
    util_usage_sec: 'Uso en {mod} ({diff}) · racha {s} · mejor {b}',
    util_usage_global: 'Utilización global · {n} eventos registrados',
    util_kpi_acc: 'Precisión', util_kpi_ans: 'Respuestas', util_kpi_sess: 'Sesiones', util_kpi_imp: 'Mejora',
    focus_exercise: 'Ejercicio', focus_viz: 'Instrumento · MIDI', focus_stats: 'Utilización',
    focus_close: '✕ Volver', focus_fullscreen: 'Pantalla completa · {n}',
    focus_close_full: 'Cerrar pantalla completa',
    focus_ex: 'ejercicio', focus_viz_short: 'panel MIDI', focus_stats_short: 'estadísticas',
    expand_exercise: 'Expandir ejercicio', expand_viz: 'Expandir panel MIDI', expand_stats: 'Expandir estadísticas',
    aria_lang: 'Idioma', aria_theme: 'Tema', aria_metro: 'Metrónomo global', aria_sections: 'Secciones',
    aria_viz: 'Audio y visualización', aria_util: 'Utilización y progreso',
    nav_playground: 'Playground',
    pg_seq: 'Laboratorio · Libre', pg_title: 'Playground', pg_lead: 'Toca con MIDI o teclado, graba hasta 3 capas y genera la partitura al vuelo.',
    pg_tab_score: 'Partitura', pg_record: 'Grabar', pg_stop: 'Parar', pg_play: 'Reproducir',
    pg_track: 'Pista', pg_mute: 'Silenciar pista', pg_partiture: 'Partitura', pg_clear_track: 'Vaciar pista',
    pg_hint: 'Selecciona pista · pulsa Grabar · toca · Parar · guarda con nombre y fecha.',
    pg_save_h: 'Sesiones guardadas', pg_save_ph: 'Nombre de la sesión…', pg_save: 'Guardar',
    pg_new: 'Nueva sesión', pg_saved: 'Guardado', pg_no_saves: 'Aún no hay sesiones.',
    pg_notes: 'notas', pg_delete: 'Eliminar', pg_ready: 'Listo', pg_recording: 'Grabando pista {n}',
    pg_playing: 'Reproduciendo…', pg_pane: 'Playground',
    auth_page_title: 'Acceso · BELE Laudería',
    auth_title: 'Entrenador Musical',
    auth_lead: 'Inicia sesión para la nube, o entra sin cuenta.',
    auth_tab_login: 'Entrar', auth_tab_signup: 'Crear cuenta',
    auth_name: 'Nombre', auth_email: 'Correo', auth_password: 'Contraseña',
    auth_name_ph: 'Tu nombre', auth_email_ph: 'tu@correo.com', auth_password_ph: 'Mínimo 8 caracteres',
    auth_submit_login: 'Entrar', auth_submit_signup: 'Crear cuenta',
    auth_sign_in: 'Entrar', auth_sign_out: 'Salir',
    auth_loading: 'Conectando…',
    auth_err_invalid_email: 'Correo no válido.',
    auth_err_password_too_short: 'La contraseña debe tener al menos 8 caracteres.',
    auth_err_name_required: 'Indica tu nombre.',
    auth_err_email_taken: 'Ese correo ya está registrado.',
    auth_err_invalid_credentials: 'Correo o contraseña incorrectos.',
    auth_err_generic: 'No se pudo completar. Inténtalo de nuevo.',
    auth_sync_note: 'Progreso sincronizado con Upstash Redis.',
    auth_account: 'Cuenta', auth_signed_in: 'Sesión iniciada como {n}',
    auth_guest: 'Continuar sin cuenta', auth_guest_mode: 'Invitado', auth_guest_note: 'Modo invitado · el progreso se guarda en este dispositivo.',
    auth_guest_prompt: 'Inicia sesión para sincronizar tu progreso entre dispositivos.',
    auth_or: 'o', auth_lead_guest: 'Inicia sesión para la nube, o entra sin cuenta.',
  },
  en: {
    brand: 'BELE TRAINER',
    brand_sub: 'Substitute music exam · Grade 4',
    page_title: 'Music Trainer · BELE Laudería',
    diff_label: 'Difficulty',
    diff_easy: 'Easy', diff_medium: 'Medium', diff_hard: 'Hard',
    diff_meta: '{n} items · {o} options{listens}{timer}',
    listens_meta: ' · {n} listens', timer_meta: ' · {n}s',
    listens_hud: 'Listens', item_hud: 'Item',
    nav_prev: 'Previous', nav_next: 'Next', nav_hint: 'Answer to continue',
    fb_ok: '✓ Correct', fb_wrong: '✗ It was {x}', fb_wrong_teo: '✗ Correct: {x}',
    timeout: '⏱ Time up — check the marked correct answer.',
    run_done: 'Series complete', accuracy: 'Accuracy', correct: 'Correct',
    back_home: 'Back to home', run_summary: 'Result · {mod} · {diff}',
    run_items: 'Answers in this run',
    metro: 'Metronome', bpm: 'BPM', metro_bpm_aria: 'Beats per minute',
    theme_dark: 'DARK', theme_light: 'LIGHT',
    sc_lect: 'Read.', sc_ac: 'Ch.', sc_rt: 'Rhy.', sc_err: 'Err.', sc_teo: 'Th.',
    sec_rt: 'Rhythm', sec_err: 'Errors', sec_ac: 'Chords', sec_lect: 'Reading', sec_teo: 'Theory',
    rt_hint: 'Time signature hidden — identify it by listening.',
    rt_title: 'What time signature?', rt_listen: 'Listen pattern', rt_fast: 'Fast pulse', rt_aural: 'Listen',
    err_title: 'Where is the error?', err_note: 'Note {n}', err_num: '{n}. {name}',
    err_score: 'Score ✓', err_wrong: 'With error', err_ab: 'A/B alternate',
    ac_title: 'Which triad do you hear?', ac_listen: 'Listen', ac_arp: 'Arpeggio',
    ac_type: 'Type', ac_intervals: 'Intervals',
    lect_title: 'Which note?', lect_listen: 'Listen', lect_ref: 'C4 reference',
    start_rt: 'Start series', start_err: 'Start', start_ac: 'Start test',
    start_lect: 'Start reading', start_teo: 'Start',
    prep: 'Warm-up', prep_rt_lead: 'Series of {n} patterns · {diff} mode.',
    hist_title: 'History', hist_meta: 'Progress', hist_precision: 'Accuracy', hist_streak: 'Streak',
    hist_best: 'Best streak', hist_answers: 'Answers', hist_by_sec: 'By section',
    hist_by_diff: 'By difficulty', hist_recent: 'Recent activity', hist_empty: 'No activity yet',
    sync_now: 'Sync now', reset_hist: 'Reset history',
    sync_cloud: 'Cloud (Upstash)', sync_name: 'Name', sync_optional: 'Optional', sync_loading: 'Syncing…',
    sync_idle: 'Ready', sync_syncing: 'Saving…', sync_ok: 'Saved to cloud',
    sync_err: 'Save failed', sync_offline: 'Offline',
    nav_inicio: 'Exam', nav_ritmo: 'Rhythm a.1', nav_errores: 'Melodic errors b.1',
    nav_acordes: 'Chords b.2', nav_lectura: 'Treble clef', nav_teoria: 'Theory', nav_historial: 'Progress',
    seq_01_intro: 'Sequence 01 · Introduction', seq_01_content: 'Sequence 01 · Content', seq_01_practice: 'Sequence 01 · Practice',
    seq_rt: 'Sequence 02 · Rhythm', seq_err: 'Sequence 03 · Errors', seq_ac: 'Sequence 04 · Chords',
    seq_lect: 'Sequence 05 · Treble clef', seq_teo: 'Sequence 06 · Theory',
    home_signal: 'Substitute exam · BELE Bilbao',
    home_title: 'Music language exam',
    home_quote: 'Equivalent to Grade 4 Elementary Music.',
    home_exam_h: 'Exam structure',
    home_exam_1: 'a.1 Rhythm reading — 8–16 bars, clef and time-signature changes.',
    home_exam_2: 'b.1 Melodic errors — 5 pitch errors · 4 listens.',
    home_exam_3: 'b.2 Chord test — 10 triads · 2 listens for the series.',
    home_modes_h: 'Training modes',
    home_easy: 'Easy — 5 items, unlimited listens.',
    home_medium: 'Medium — 10 items, 3 listens, 45 s per item.',
    home_hard: 'Hard — 15 items, 2 listens, 25 s, block chords.',
    home_content_title: 'Assessed content',
    home_rt_h: 'Rhythm reading',
    home_rt_1: 'Treble & bass clefs · meters 2/4–12/8',
    home_rt_2: 'Notes up to semiquavers · triplets, duplets, quadruplets',
    home_aural_h: 'Aural skills',
    home_aural_1: 'Pitch errors only — never rhythm',
    home_aural_2: 'Major, minor, diminished, augmented triads',
    home_pick_title: 'Pick a module and difficulty',
    home_pick_lead: 'Use the Easy · Medium · Hard tabs in each section. Answer every item before advancing.',
    home_score_h: 'Official scoring', home_score_part: 'Part', home_score_pts: 'Points',
    home_score_rt: 'Rhythm reading', home_score_err: 'Errors', home_score_ac: 'Chords',
    rt_intro_title: 'Rhythm reading · a.1',
    rt_intro_lead: 'Identify written and heard time signatures. Hard adds 9/8, 12/8 and semiquaver patterns.',
    rt_intro_h: 'Exam meters', rt_intro_1: 'Simple /4, /2, /8 · Compound /8',
    rt_intro_2: 'Strong beats sound louder when you listen',
    err_intro_title: 'Melodic errors · b.1',
    err_intro_lead: 'Compare score and audio. Hard uses {n} notes and ±1-semitone errors.',
    err_intro_h: 'Strategy (4 listens in the exam)',
    err_intro_1: 'Follow without marking · flag suspects · confirm · point',
    err_prep_title: 'Aural series', err_prep_lead: '{n} melodies · find the wrong note.',
    ac_intro_title: 'Aural test · b.2',
    ac_intro_lead: 'Identify the triad type. Hard plays block (simultaneous) chords.',
    ac_prep_title: 'Series of {n}',
    lect_intro_title: 'Treble clef reading',
    lect_intro_lead: 'For bass-clef readers. Hard: C3–C6 with adjacent distractors.',
    lect_intro_h: 'Landmarks', lect_intro_1: 'C4 ledger below · G4 line 2 · B4 line 3 · D5 line 4 · F5 line 5',
    lect_prep_title: 'Series of {n} notes',
    lect_prep_lead: 'Pool: {pool} · {o} options per note.',
    pool_basico: 'basic', pool_medio: 'medium', pool_avanzado: 'advanced',
    teo_intro_title: 'Questionnaire', teo_intro_lead: '{n} questions · tier {tier}.',
    err_desc: '{w} → {p} ({semi})', err_semi_flat: '♭', err_semi_sharp: '♯', err_semi_n: '{n} semitones',
    target_melody_err: 'Melody · find the error', target_pulse: 'Strong · weak pulse',
    pane_exercise: 'Exercise', pane_instrument: 'Instrument', pane_util: 'Usage',
    compare_live: 'Live comparison', compare_target: 'Target', compare_you: 'Your note',
    compare_hint: 'Play the keyboard to compare with the exercise',
    compare_pick: 'Select an audio exercise', compare_play: 'Play on LPK25 or listen',
    compare_match: '✓ {n} matches {t}', compare_miss: '✗ {n} · target {t}',
    compare_chord_ok: '✓ {n} belongs to {c} chord', compare_chord_no: '✗ {n} not in {c}',
    compare_melody: 'Input: {n} · follow the melody on the staff',
    instr_piano: 'Piano', instr_wind: 'Wind', instr_brass: 'Brass', instr_strings: 'Strings',
    instr_guitar: 'Guitar', instr_organ: 'Chords',
    instr_loading: 'Loading {n}…', instr_ready: '{n} ready', instr_fail: 'Load failed · synthetic pulse',
    midi_connect: 'Connect LPK25', midi_device: 'MIDI device', midi_none: 'No device',
    midi_prompt: 'Connect your AKAI LPK25', midi_connected: 'MIDI · {n}',
    midi_no_support: 'Web MIDI not supported (use Chrome/Edge)',
    midi_denied: 'MIDI permission denied — click MIDI or tap the page',
    midi_waiting: 'No controller · connect LPK25 and wait…',
    viz_wave: 'Waveform', viz_spec: 'Spectrum', viz_keyboard: 'MIDI keyboard',
    util_general: 'Overview panel', util_trend: 'Trend · recent sessions',
    util_trend_aria: 'Session trend', util_ring_aria: 'Accuracy and sections',
    util_empty: 'No activity recorded yet', util_section: 'Section',
    util_usage_sec: 'Usage in {mod} ({diff}) · streak {s} · best {b}',
    util_usage_global: 'Global usage · {n} events logged',
    util_kpi_acc: 'Accuracy', util_kpi_ans: 'Answers', util_kpi_sess: 'Sessions', util_kpi_imp: 'Improvement',
    focus_exercise: 'Exercise', focus_viz: 'Instrument · MIDI', focus_stats: 'Usage',
    focus_close: '✕ Back', focus_fullscreen: 'Fullscreen · {n}',
    focus_close_full: 'Close fullscreen',
    focus_ex: 'exercise', focus_viz_short: 'MIDI panel', focus_stats_short: 'statistics',
    expand_exercise: 'Expand exercise', expand_viz: 'Expand MIDI panel', expand_stats: 'Expand statistics',
    aria_lang: 'Language', aria_theme: 'Theme', aria_metro: 'Global metronome', aria_sections: 'Sections',
    aria_viz: 'Audio and visualization', aria_util: 'Usage and progress',
    nav_playground: 'Playground',
    pg_seq: 'Lab · Free play', pg_title: 'Playground', pg_lead: 'Play with MIDI or on-screen keys, record up to 3 layers, and auto-build the score.',
    pg_tab_score: 'Score', pg_record: 'Record', pg_stop: 'Stop', pg_play: 'Play',
    pg_track: 'Track', pg_mute: 'Mute track', pg_partiture: 'Score', pg_clear_track: 'Clear track',
    pg_hint: 'Pick a track · Record · play · Stop · save with name and date.',
    pg_save_h: 'Saved sessions', pg_save_ph: 'Session name…', pg_save: 'Save',
    pg_new: 'New session', pg_saved: 'Saved', pg_no_saves: 'No sessions yet.',
    pg_notes: 'notes', pg_delete: 'Delete', pg_ready: 'Ready', pg_recording: 'Recording track {n}',
    pg_playing: 'Playing…', pg_pane: 'Playground',
    auth_page_title: 'Sign in · BELE Laudería',
    auth_title: 'Music Trainer',
    auth_lead: 'Sign in for cloud sync, or continue without an account.',
    auth_tab_login: 'Sign in', auth_tab_signup: 'Sign up',
    auth_name: 'Name', auth_email: 'Email', auth_password: 'Password',
    auth_name_ph: 'Your name', auth_email_ph: 'you@email.com', auth_password_ph: 'At least 8 characters',
    auth_submit_login: 'Sign in', auth_submit_signup: 'Create account',
    auth_sign_in: 'Sign in', auth_sign_out: 'Sign out',
    auth_loading: 'Connecting…',
    auth_err_invalid_email: 'Invalid email address.',
    auth_err_password_too_short: 'Password must be at least 8 characters.',
    auth_err_name_required: 'Name is required.',
    auth_err_email_taken: 'That email is already registered.',
    auth_err_invalid_credentials: 'Incorrect email or password.',
    auth_err_generic: 'Something went wrong. Try again.',
    auth_sync_note: 'Progress synced via Upstash Redis.',
    auth_account: 'Account', auth_signed_in: 'Signed in as {n}',
    auth_guest: 'Continue without account', auth_guest_mode: 'Guest', auth_guest_note: 'Guest mode · progress stays on this device.',
    auth_guest_prompt: 'Sign in to sync progress across devices.',
    auth_or: 'or', auth_lead_guest: 'Sign in for cloud sync, or continue without an account.',
  },
};

const TEO_Q_EN = [
  { q: 'How many semitones in a major 3rd?', opts: ['3', '4', '5', '2'] },
  { q: 'How many semitones in a minor 3rd?', opts: ['3', '4', '2', '5'] },
  { q: 'A major triad is built from…', opts: ['M3 + P5', 'm3 + P5', 'm3 + dim5', 'M3 + aug5'] },
  { q: 'In treble clef, the lines (bottom to top) are…', opts: ['E G B D F', 'F A C E G', 'C E G B A', 'D F A C E'] },
  { q: 'In exam b.1, how many errors must you find?', opts: ['5', '4', '3', '10'] },
  { q: 'A diminished chord contains…', opts: ['m3 + dim5', 'M3 + P5', 'm3 + P5', 'M3 + aug5'] },
  { q: 'In A harmonic minor, the 7th degree is raised to…', opts: ['G♯', 'F♯', 'B♭', 'C♯'] },
  { q: 'Treble clef spaces (bottom to top) are…', opts: ['F A C E', 'E G B D', 'A C E G', 'C D E F'] },
  { q: 'In compound 6/8, the beat equals…', opts: ['Dotted crotchet', 'Quaver', 'Minim', 'Semiquaver'] },
  { q: 'In b.1, the fragment is heard…', opts: ['4 times', '2 times', '1 time', '5 times'] },
  { q: '2/2 (alla breve) has a beat of…', opts: ['Minim', 'Crotchet', 'Quaver', 'Semibreve'] },
  { q: 'Middle C in treble clef sits on…', opts: ['1st ledger line below', '2nd line', '3rd line', '4th line'] },
  { q: 'The main sonic difference between major and minor is…', opts: ['Major 3rd vs minor 3rd', 'Perfect 5th vs dim 5th', 'Tritone vs octave', 'Major 2nd vs minor 2nd'] },
  { q: 'In compound 9/8, how many beats per bar?', opts: ['3', '2', '4', '9'] },
  { q: 'A chromatic error in b.1 means…', opts: ['±1 semitone in pitch', 'Time signature change', 'Rhythm change', '±2 diatonic steps'] },
  { q: 'The leading note in harmonic minor creates an interval of…', opts: ['2 semitones to tonic', '3 semitones to tonic', 'Tritone to dominant', 'Unison'] },
  { q: 'Each correct chord in b.2 is worth…', opts: ['0.25 pt', '0.5 pt', '1 pt', '0.1 pt'] },
  { q: 'Equivalence: 6/8 one beat ≈ …', opts: ['3/8 one beat', '4/4', '2/2', '5/4'] },
  { q: 'An augmented chord has a 5th that is…', opts: ['Augmented (+8 semitones)', 'Perfect', 'Diminished', 'Minor'] },
  { q: 'The music language exam is worth…', opts: ['10 points', '20 points', '5 points', '2.5 points'] },
];

const NOTE_ES_EN = { Do: 'C', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
const NOTE_PC_ES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const NOTE_PC_EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

const LANG_KEY = 'music_bele_lang';
const THEME_KEY = 'music_bele_theme';
let lang = localStorage.getItem(LANG_KEY) || 'es';

function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

function chordName(name) {
  if (lang === 'es') return name;
  const map = { Mayor: 'Major', menor: 'minor', Disminuido: 'Diminished', Aumentado: 'Augmented' };
  return map[name] || name;
}

function noteDisplayName(name) {
  if (lang === 'es' || !name) return name;
  return String(name).replace(/^(Do|Re|Mi|Fa|Sol|La|Si)(♯|♭)?/,
    (_, n, acc) => (NOTE_ES_EN[n] || n) + (acc || ''));
}

function midiLabel(m) {
  const pc = ((m % 12) + 12) % 12;
  const oct = Math.floor(m / 12) - 1;
  const es = `${NOTE_PC_ES[pc]}${oct}`;
  return noteDisplayName(es);
}

function poolLabel(key) {
  return t('pool_' + (key || 'medio'));
}

function getTeoQ(base, idx) {
  if (lang === 'es' || !TEO_Q_EN[idx]) return base;
  const en = TEO_Q_EN[idx];
  return { ...base, q: en.q, opts: en.opts };
}

function formatErrDesc(ex) {
  if (!ex) return '';
  const w = noteDisplayName(noteByMidi?.(ex.written[ex.errIdx]?.key)?.name || '?');
  const p = noteDisplayName(noteByMidiNum?.(ex.played[ex.errIdx])?.name || '?');
  const semi = ex.semi ?? 0;
  const semiTxt = semi === -1 ? t('err_semi_flat') : semi === 1 ? t('err_semi_sharp') : t('err_semi_n', { n: semi });
  return t('err_desc', { w, p, semi: semiTxt });
}

function localeDate(ts) {
  return new Date(ts).toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  });
}

function instrLabel(id) {
  const map = { piano: 'instr_piano', wind: 'instr_wind', brass: 'instr_brass', strings: 'instr_strings', guitar: 'instr_guitar', organ: 'instr_organ' };
  return t(map[id] || 'instr_piano');
}

function setLang(l) {
  lang = l === 'en' ? 'en' : 'es';
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyChromeI18n();
  if (typeof render === 'function') render();
  if (window.StatsViz) window.StatsViz.refresh();
  if (window.TrainerAudio?.onLangChange) window.TrainerAudio.onLangChange();
  if (window.Playground?.onLangChange) window.Playground.onLangChange();
  if (window.updSyncMeta) window.updSyncMeta();
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
  document.title = t('page_title');
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
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    const translated = t(k);
    if (translated && translated !== k) el.textContent = translated;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  const metroBtn = document.querySelector('#metro-toggle span');
  if (metroBtn) metroBtn.textContent = t('metro');
  const navMap = {
    inicio: 'nav_inicio', ritmo: 'nav_ritmo', errores: 'nav_errores',
    acordes: 'nav_acordes', lectura: 'nav_lectura', teoria: 'nav_teoria', historial: 'nav_historial',
    playground: 'nav_playground',
  };
  document.querySelectorAll('#main-nav .r-i').forEach(b => {
    const k = navMap[b.dataset.mod];
    if (k) { b.title = t(k); b.setAttribute('aria-label', t(k)); }
  });
  updScoreLabels();
  if (window.BeleAuth?.updateUserChip) window.BeleAuth.updateUserChip();
  if (typeof updateFocusButtons === 'function') updateFocusButtons();
  if (typeof updateFocusTitle === 'function') updateFocusTitle();
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
window.lang = () => lang;
window.chordName = chordName;
window.noteDisplayName = noteDisplayName;
window.midiLabel = midiLabel;
window.poolLabel = poolLabel;
window.getTeoQ = getTeoQ;
window.formatErrDesc = formatErrDesc;
window.localeDate = localeDate;
window.instrLabel = instrLabel;
window.setLang = setLang;
window.loadTheme = loadTheme;
window.setTheme = setTheme;
window.applyChromeI18n = applyChromeI18n;
