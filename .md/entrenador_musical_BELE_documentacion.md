# Entrenador Musical — Prueba de Admisión Laudería BELE Bilbao
## Documentación técnica completa

> **Contexto:** Esta app fue construida para preparar la Prueba Sustitutoria de Música del examen de admisión de Laudería en el BELE (Conservatorio Bilbao), nivel 4º Enseñanzas Elementales. Cubre los tres bloques del examen: lectura rítmica (a.1), identificación de errores melódicos (b.1), e identificación de acordes por audición (b.2). Se añadió una sección de lectura en clave de Sol orientada a instrumentistas que leen principalmente en clave de Fa (violonchelistas, bajistas).

**Referencia oficial del examen:** https://www.bele.es/es/estudios/inscripcion/  
**PDF de la prueba:** https://www.bele.es/wp-content/uploads/2020/06/Prueba-Musical-Sustitutoria-LOGOS.pdf  
**Marco normativo:** Decreto 229/2007 BOPV · Orden 30 enero 2014 BOPV

---

## Índice

1. [Stack técnico](#1-stack-técnico)
2. [Arquitectura de la app](#2-arquitectura-de-la-app)
3. [Secciones y ejercicios](#3-secciones-y-ejercicios)
4. [Motor de audio — Web Audio API](#4-motor-de-audio--web-audio-api)
5. [Notación musical — VexFlow](#5-notación-musical--vexflow)
6. [Sistema de historial y progreso](#6-sistema-de-historial-y-progreso)
7. [Cheatsheets colapsables y teoría](#7-cheatsheets-colapsables-y-teoría)
8. [Código HTML completo — versión final](#8-código-html-completo--versión-final)
9. [Fuentes y referencias](#9-fuentes-y-referencias)

---

## 1. Stack técnico

### Lenguajes y paradigma

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Estructura | HTML5 semántico | — |
| Estilos | CSS3 con custom properties | — |
| Lógica | JavaScript ES2020 (vanilla) | — |
| Notación musical | VexFlow | 4.2.2 |
| Audio | Web Audio API | nativa del navegador |
| Persistencia | localStorage | nativa del navegador |

### Sin frameworks, sin bundler

La app es un único archivo HTML autocontenido. No usa React, Vue, Angular, ni ningún bundler (Webpack, Vite, Parcel). Todo el código corre directamente en el navegador. Esto la hace portable: se puede abrir como archivo local, incrustar en un iframe, o servir desde cualquier servidor estático.

### CDN único

```html
<script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
```

VexFlow se carga desde `cdn.jsdelivr.net`. El resto de recursos son 100% locales (inline HTML/CSS/JS).

### Tipografía

Se usan **únicamente** las fuentes del sistema operativo y las variables CSS del design system de Claude.ai:

```css
font-family: var(--font-sans);   /* Anthropic Sans / system-ui */
font-family: var(--font-mono);   /* monoespaciada del sistema */
font-family: var(--font-voice);  /* serif del sistema */
```

No se cargan Google Fonts ni fuentes externas. Las variables `--font-*` son resueltas por el host (claude.ai) y se heredan al widget automáticamente.

Para los caracteres musicales especiales (figuras, silencios) se usan los caracteres Unicode de notación musical:

```
𝅝  → Redonda (U+1D15D)
𝅗  → Blanca (U+1D157)
♩  → Negra (U+2669)
♪  → Corchea (U+266A)
𝅘𝅥𝅯 → Semicorchea (U+1D158 + U+1D165 + U+1D16F)
𝄻  → Silencio de redonda (U+1D13B)
𝄼  → Silencio de blanca (U+1D13C)
𝄽  → Silencio de negra (U+1D13D)
𝄾  → Silencio de corchea (U+1D13E)
𝄿  → Silencio de semicorchea (U+1D13F)
𝄞  → Clave de Sol (U+1D11E)
```

### Sistema de diseño

La app usa el **Claude Design System (CDS)** a través de CSS custom properties. Todas las variables de color, espaciado, radio de borde y tipografía son tokens del sistema:

```css
/* Superficies */
var(--surface-0)        /* fondo de página */
var(--surface-1)        /* tarjeta ligeramente elevada */
var(--surface-2)        /* tarjeta principal, blanco */

/* Texto */
var(--text-primary)     /* negro / blanco en dark */
var(--text-secondary)   /* gris medio */
var(--text-muted)       /* gris claro, placeholders */
var(--text-accent)      /* azul de acento */
var(--text-success)     /* verde */
var(--text-danger)      /* rojo */
var(--text-warning)     /* ámbar */

/* Bordes */
var(--border)           /* hairline 0.5px por defecto */
var(--border-strong)    /* énfasis */
var(--border-accent)    /* azul */

/* Fondos de rol */
var(--bg-accent)        /* azul pálido */
var(--bg-success)       /* verde pálido */
var(--bg-danger)        /* rojo pálido */
var(--bg-warning)       /* ámbar pálido */
var(--bg-pro)           /* morado pálido */

/* Rellenos de control */
var(--fill-accent)      /* azul sólido, botón primario */
var(--fill-accent-hover)
var(--on-accent)        /* texto sobre fill-accent */

/* Tipografía */
var(--font-sans)
var(--font-mono)
var(--radius)           /* 8px, radio estándar de control */
```

El design system cambia automáticamente entre modo claro y oscuro sin ningún código adicional.

### Iconos

Tabler Icons (outline, webfont), ya cargados en claude.ai:

```html
<i class="ti ti-music-note" aria-hidden="true"></i>
<i class="ti ti-player-play" aria-hidden="true"></i>
<i class="ti ti-chart-bar" aria-hidden="true"></i>
<!-- etc. -->
```

Se usan con `aria-hidden="true"` cuando son decorativos y con `aria-label` cuando son el único contenido de un botón.

---

## 2. Arquitectura de la app

### Estructura general

```
<div class="app">
  ├── Header (scores globales)
  ├── Nav (botones de sección)
  └── Secciones (display:none/block según selección)
      ├── #sec-lectura    → Lectura en clave de Sol
      ├── #sec-acordes    → Identificación de acordes
      ├── #sec-ritmo      → Lectura rítmica
      ├── #sec-errores    → Errores melódicos
      ├── #sec-teoria     → Cuestionario de teoría
      └── #sec-historial  → Progreso y estadísticas
```

### Patrón de estado por sección

Cada sección sigue el mismo patrón de estado:

```javascript
// Estado de la sección de lectura (ejemplo)
let lectDiff = 'basico';   // nivel de dificultad
let lectSeries = [];        // array de 10 notas para la serie actual
let lectIdx = 0;            // índice de la nota actual (0–9)
let lectAns = false;        // si ya respondió esta nota (evita doble-click)
let lectErrs = [];          // lista de errores para mostrar al final
```

### Navegación entre secciones

```javascript
function showSec(id, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  document.getElementById('sec-' + id).classList.add('on');
  btn.classList.add('on');
  if (id === 'historial') renderHist();
}
```

### Sistema de persistencia

```javascript
const HIST_KEY = 'music_bele_v1';

function loadH() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || nH(); }
  catch(e) { return nH(); }
}

function nH() {
  return {
    log: [],                       // últimas 100 respuestas
    scores: {
      lect: { c: 0, t: 0 },       // lectura: correctas / total
      ac:   { c: 0, t: 0 },       // acordes
      rt:   { c: 0, t: 0 },       // ritmo
      teo:  { c: 0, t: 0 }        // teoría
    },
    streak: 0,                     // racha actual
    best: 0,                       // mejor racha histórica
    noteErr: {}                    // mapa nota → nº errores (lectura)
  };
}

function saveH() {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(H)); }
  catch(e) {}  // falla silenciosamente si no hay localStorage
}
```

---

## 3. Secciones y ejercicios

### 3.1 Lectura en clave de Sol

**Objetivo:** Preparar a instrumentistas que leen en clave de Fa (violonchelistas, bajistas) para identificar notas en clave de Sol, requisito del examen BELE.

**Tres niveles de dificultad:**

```javascript
const DIFF_SETS = {
  basico:   ['Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5','Fa5','Sol5'],
  // Corresponde a los ejercicios 1–21 del Pozzoli (intervalos conjuntos en posición central)
  
  medio:    ['Do4','Re4','Mi4','Fa4','Sol4','La4','Si4','Do5','Re5','Mi5',
             'Fa5','Sol5','La5','Si5'],
  // Incluye Do central y notas de acceso con líneas adicionales inferiores
  
  avanzado: NOTES_ALL.map(n => n.name)
  // Do3 a Do6, incluyendo todas las líneas adicionales del examen
};
```

**Flujo del ejercicio:**
1. Se genera una serie aleatoria de 10 notas sin repetición consecutiva
2. VexFlow dibuja la nota en el pentagrama
3. La alumna escucha la nota (botón de audio)
4. Selecciona entre 4 opciones (nombre de la nota)
5. La nota cambia a verde (✓) o roja (✗) en el pentagrama
6. Al finalizar las 10 notas: resumen con errores listados y notas falladas

**Notas ancla enseñadas (método de conservatorio):**
- Do4 → 1ª línea adicional inferior
- Sol4 → 2ª línea (ancla de la clave, el espiral la rodea)
- Si4 → 3ª línea
- Re5 → 4ª línea
- Fa5 → 5ª línea
- Espacios: Fa4 · La4 · Do5 · Mi5 (FACE)

**Tabla de equivalencias clave de Sol ↔ clave de Fa:**

| Nota | En clave de Sol | En clave de Fa |
|------|----------------|----------------|
| Do4 (central) | 1ª línea adicional inferior | 1ª línea adicional superior |
| Sol3 | Debajo del pentagrama | 2ª línea |
| Fa3 | Debajo del pentagrama | 4ª línea (ancla) |
| La3 | Debajo del pentagrama → espacio | 2º espacio |

### 3.2 Test de acordes (ejercicio b.2 del examen)

**Objetivo:** Identificar los cuatro tipos de tríada por audición.

**Los cuatro tipos y sus fórmulas:**

| Tipo | Fórmula | Semitonos | Ejemplo | Sonido |
|------|---------|-----------|---------|--------|
| Mayor (M) | 3ªM + 5ªJ | 0-4-7 | Do-Mi-Sol | Estable, luminoso |
| menor (m) | 3ªm + 5ªJ | 0-3-7 | La-Do-Mi | Oscuro, introspectivo |
| Disminuido (dim) | 3ªm + 5ªdim | 0-3-6 | Si-Re-Fa | Tenso, tritono |
| Aumentado (aum) | 3ªM + 5ªaum | 0-4-8 | Do-Mi-Sol♯ | Misterioso, simétrico |

**Generación de series:**
```javascript
const CT = [
  { name: 'Mayor',      intervals: [0,4,7], keys: ['c/4','e/4','g/4'],   accs: [null,null,null] },
  { name: 'menor',      intervals: [0,3,7], keys: ['a/3','c/4','e/4'],   accs: [null,null,null] },
  { name: 'Disminuido', intervals: [0,3,6], keys: ['b/3','d/4','f/4'],   accs: [null,null,null] },
  { name: 'Aumentado',  intervals: [0,4,8], keys: ['c/4','e/4','g#/4'],  accs: [null,null,'#'] },
];

// Las fundamentales rotan entre 7 alturas:
const RMIDI = [60, 62, 64, 65, 67, 69, 71];  // Do Re Mi Fa Sol La Si
```

### 3.3 Lectura rítmica (ejercicio a.1 del examen)

**Objetivo:** Identificar el compás de un patrón rítmico escrito en VexFlow y escuchado.

**Patrones incluidos:**

```javascript
const RHYTHMS = [
  { dur: ['q','q','q','q'],   ts: '4/4', beats: [.5,.5,.5,.5],   c: '4/4'  },
  { dur: ['qd','e','qd','e'], ts: '6/8', beats: [.75,.25,.75,.25], c: '6/8' },
  { dur: ['q','q','q'],       ts: '3/4', beats: [.5,.5,.5],       c: '3/4'  },
  { dur: ['h','h'],           ts: '4/4', beats: [1,1],            c: '4/4'  },
  { dur: ['q','q'],           ts: '2/4', beats: [.5,.5],          c: '2/4'  },
  { dur: ['h','q','h','q'],   ts: '3/2', beats: [1,.5,1,.5],      c: '3/2'  },
];
```

Compases del examen BELE según Decreto 229/2007:
- Simples denominador 4: 2/4 · 3/4 · 4/4 (pulso = negra)
- Simples denominador 2: 2/2 · 3/2 (pulso = blanca, alla breve)
- Simples denominador 8 a 1 tiempo: 2/8 · 3/8 (pulso = corchea)
- Compuestos denominador 8: 6/8 · 9/8 · 12/8 (pulso = negra con puntillo)

### 3.4 Errores melódicos (ejercicio b.1 del examen)

**Objetivo:** Detectar errores de altura entre una melodía escrita y la versión sonada.

El examen real presenta:
- 8 compases escritos en partitura
- 4 escuchas del fragmento al piano
- 5 errores de altura (nunca de ritmo)
- El alumno debe señalar gráficamente la posición de cada error

**Tipos de errores en los ejercicios:**

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Cromático | ±1 semitono | Mi → Mi♭ |
| Diatónico | ±1 tono | Sol → La |
| VIº/VIIº en menor | Alteración de escala | Sol♮ → Sol♯ en La menor armónica |
| Accidental olvidado | Armadura ignorada | Si♭ → Si♮ en Fa Mayor |

**Estrategia recomendada para el examen:**
1. 1ª escucha: seguir la partitura sin marcar
2. 2ª escucha: marcar compases sospechosos con lápiz
3. 3ª escucha: confirmar qué nota exacta cambió
4. 4ª escucha: revisión final y señalización gráfica

### 3.5 Cuestionario de teoría

15 preguntas rotativas organizadas por categorías:

| Categoría | Contenido |
|-----------|-----------|
| Intervalos | Semitonos de 3ªM, 3ªm, 5ªJ, 5ªdim, 5ªaum |
| Acordes | Tipos de tríada, diferencias, fórmulas |
| Tonalidad | Armaduras, relativas, escala Mayor/menor |
| Menor armónica | VIIº elevado, sensible, cadencia |
| Compases | Simples/compuestos, pulso, equivalencias |
| Claves | Clave de Fa y Sol, líneas, espacios |
| Clave de Sol | EGBDF, FACE, Do central, anclas |
| Pozzoli | Metodología del 1er Curso, compases iniciales |
| Examen BELE | Número de escuchas, alteraciones, estructura |

---

## 4. Motor de audio — Web Audio API

Todo el sonido se genera con síntesis en tiempo real mediante la **Web Audio API** nativa del navegador. No se usa ninguna librería de audio externa.

### Inicialización (lazy, por política del navegador)

```javascript
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
```

El `AudioContext` se inicializa en el primer evento de usuario (click) porque los navegadores modernos bloquean la reproducción automática.

### Función base de reproducción de nota

```javascript
function playNote(freq, start, dur, vol = 0.4, type = 'triangle') {
  const ctx = getAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = type;           // 'triangle' imita un timbre de piano/flauta
  o.frequency.value = freq;
  
  const t = ctx.currentTime + start;
  
  // Envolvente ADSR simplificada (AD + sustain plano + R)
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);   // Attack: 15ms
  g.gain.setValueAtTime(vol, t + dur - 0.05);        // Sustain hasta 50ms antes del final
  g.gain.linearRampToValueAtTime(0, t + dur);        // Release: 50ms
  
  o.start(t);
  o.stop(t + dur);
}
```

### Conversión MIDI a frecuencia

```javascript
function mf(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
  // La4 = MIDI 69 = 440 Hz
  // Cada semitono × 2^(1/12) ≈ 1.0595
}
```

**Tabla de referencia de MIDIs usados:**

| Nota | MIDI | Frecuencia |
|------|------|-----------|
| Do3 | 48 | 130.81 Hz |
| Do4 (central) | 60 | 261.63 Hz |
| La4 (diapasón) | 69 | 440.00 Hz |
| Do5 | 72 | 523.25 Hz |
| Sol5 | 79 | 783.99 Hz |
| Do6 | 84 | 1046.50 Hz |

### Reproducción de acordes (arpegio)

```javascript
function playChordMidi(root, intervals) {
  intervals.forEach((iv, i) => {
    playNote(mf(root + iv), i * 0.12, 1.5, 0.35, 'triangle');
    //                       ↑ 120ms entre notas = arpegio
  });
}
```

### Reproducción de melodías

```javascript
function playErrMelody(notes) {
  notes.forEach((midi, i) => {
    playNote(mf(midi), i * 0.35, 0.3, 0.4, 'triangle');
    //               ↑ 350ms entre notas
  });
}
```

### Animación de la barra de progreso de audio

```javascript
function animWave(id, ms, cb) {
  const el = document.getElementById(id);
  el.style.width = '0%';
  const start = performance.now();
  
  function step(now) {
    const pct = Math.min((now - start) / ms * 100, 100);
    el.style.width = pct + '%';
    if (pct < 100) requestAnimationFrame(step);
    else { el.style.width = '0%'; if (cb) cb(); }
  }
  requestAnimationFrame(step);
}
```

### Reproducción rítmica con acentuación

```javascript
// El tiempo fuerte (i === 0) suena más alto (vol 0.5) que los débiles (0.35)
beats.forEach((b, i) => {
  playNote(mf(i === 0 ? 65 : 60), t, b * bd * 0.85, i === 0 ? 0.5 : 0.35);
  //                  ↑ Fa4 (acento)  ↑ Do4 (débil)
  t += b * bd;
});
```

---

## 5. Notación musical — VexFlow

**Versión:** VexFlow 4.2.2  
**Referencia:** https://github.com/0xfe/vexflow  
**CDN:** `https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js`

VexFlow es la librería de notación musical en SVG/Canvas más usada en JavaScript. Permite renderizar pentagramas completos con claves, indicaciones de compás, notas, alteraciones, ligaduras y puntillos directamente en el navegador.

### Importación de clases

```javascript
const {
  Renderer, Stave, StaveNote, Voice,
  Formatter, Accidental, Annotation
} = Vex.Flow;
```

### Función auxiliar de renderización

```javascript
function makeRenderer(el, w, h) {
  el.innerHTML = '';  // Limpia el contenedor antes de re-renderizar
  const r = new Renderer(el, Renderer.Backends.SVG);
  r.resize(w, h);
  return r;
}
```

### Renderizar una nota individual

```javascript
function drawSingleNote(el, noteStr, accStr, clef = 'treble', highlight = '#378ADD') {
  const r = makeRenderer(el, 280, 100);
  const ctx = r.getContext();

  // Crear y dibujar el pentagrama
  const stave = new Stave(10, 10, 255);
  stave.addClef(clef).addTimeSignature('4/4');
  stave.setContext(ctx).draw();

  // Crear la nota
  const n = new StaveNote({ clef, keys: [noteStr], duration: 'w' });
  if (accStr) n.addModifier(new Accidental(accStr));
  
  // Colorear la nota (azul por defecto, verde al acertar, rojo al fallar)
  n.setStyle({ fillStyle: highlight, strokeStyle: highlight });

  // Crear voz y formatear
  const voice = new Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables([n]);
  new Formatter().joinVoices([voice]).format([voice], 200);
  voice.draw(ctx, stave);
}
```

**Formato de claves VexFlow:**
```
'c/4'  → Do4    'c/3' → Do3    'c/5' → Do5
'd/4'  → Re4    'e/4' → Mi4    'f/4' → Fa4
'g/4'  → Sol4   'a/4' → La4    'b/4' → Si4
'g#/4' → Sol♯4  'bb/4' → Si♭4  'f#/4' → Fa♯4
```

### Renderizar un acorde

```javascript
function drawChordVex(el, keys, accs, w = 260, h = 100) {
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 18);
  stave.addClef('treble');
  stave.setContext(ctx).draw();

  // StaveNote acepta múltiples claves para acordes
  const n = new StaveNote({ clef: 'treble', keys, duration: 'w' });
  
  // Añadir alteraciones a posiciones específicas
  accs.forEach((a, i) => { if (a) n.addModifier(new Accidental(a), i); });

  const voice = new Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables([n]);
  new Formatter().joinVoices([voice]).format([voice], w - 60);
  voice.draw(ctx, stave);
}
```

### Renderizar un patrón rítmico

```javascript
function drawRhythmVex(el, durs, ts, w = 580, h = 110) {
  const r = makeRenderer(el, w, h);
  const ctx = r.getContext();
  const stave = new Stave(8, 8, w - 20);
  stave.addClef('treble').addTimeSignature(ts);
  stave.setContext(ctx).draw();

  const vexNotes = durs.map(d => {
    const hasDot = d.endsWith('d');
    const baseDur = hasDot ? d.slice(0, -1) : d;
    const sn = new StaveNote({ clef: 'treble', keys: ['b/4'], duration: baseDur, stem_direction: 1 });
    if (hasDot) sn.addDotToAll();
    return sn;
  });

  // Parsear indicación de compás
  const [numB, bv] = ts.split('/').map(Number);
  const voice = new Voice({ num_beats: numB, beat_value: bv }).setStrict(false);
  voice.addTickables(vexNotes);
  
  try { new Formatter().joinVoices([voice]).format([voice], w - 100); } catch(e) {}
  voice.draw(ctx, stave);
}
```

**Códigos de duración en VexFlow:**

| Código VexFlow | Figura | Equivalencia |
|---------------|--------|-------------|
| `w` | Redonda | 4 tiempos |
| `h` | Blanca | 2 tiempos |
| `hd` | Blanca con puntillo | 3 tiempos |
| `q` | Negra | 1 tiempo |
| `qd` | Negra con puntillo | 1.5 tiempos |
| `e` | Corchea | 0.5 tiempos |
| `ed` | Corchea con puntillo | 0.75 tiempos |
| `16` | Semicorchea | 0.25 tiempos |

**Alteraciones en VexFlow:**

| Código | Símbolo |
|--------|---------|
| `'#'` | ♯ sostenido |
| `'b'` | ♭ bemol |
| `'n'` | ♮ becuadro |
| `'##'` | × doble sostenido |
| `'bb'` | 𝄫 doble bemol |

### Manejo de errores de VexFlow

VexFlow puede lanzar excepciones si el compás no cuadra exactamente. Se usa `setStrict(false)` y try/catch para graceful degradation:

```javascript
const voice = new Voice({ num_beats: numB, beat_value: bv }).setStrict(false);
try {
  new Formatter().joinVoices([voice]).format([voice], w - 100);
} catch(e) {
  // Continúa sin formatear perfectamente
}
```

---

## 6. Sistema de historial y progreso

### Estructura de datos en localStorage

```javascript
{
  "log": [
    { "sec": "lect", "ok": true,  "lbl": "Sol4", "ts": 1719600000000 },
    { "sec": "ac",   "ok": false, "lbl": "Mayor", "ts": 1719600001000 },
    // máximo 100 entradas, más reciente primero
  ],
  "scores": {
    "lect": { "c": 42, "t": 60 },   // c = correctas, t = total
    "ac":   { "c": 28, "t": 40 },
    "rt":   { "c": 15, "t": 20 },
    "teo":  { "c": 35, "t": 45 }
  },
  "streak": 7,    // racha actual de respuestas correctas seguidas
  "best": 12,     // mejor racha histórica
  "noteErr": {    // notas más falladas en lectura
    "Si5": 8,
    "Do6": 6,
    "Re3": 4
  }
}
```

### Función de registro

```javascript
function logA(sec, ok, lbl) {
  H.scores[sec].t++;
  if (ok) {
    H.scores[sec].c++;
    H.streak++;
    if (H.streak > H.best) H.best = H.streak;
  } else {
    H.streak = 0;
    // Registrar error específico de nota (solo en lectura)
    if (sec === 'lect' && lbl) {
      H.noteErr[lbl] = (H.noteErr[lbl] || 0) + 1;
    }
  }
  H.log.unshift({ sec, ok, lbl, ts: Date.now() });
  if (H.log.length > 100) H.log = H.log.slice(0, 100);
  saveH();
  updSc(sec);
}
```

### Pantalla de historial

La sección de historial muestra:
1. **Resumen global:** total de respuestas, correctas, y precisión en %
2. **Racha actual y mejor racha**
3. **Barras de precisión por sección** con porcentaje y fracción
4. **Mapa de notas más falladas** en lectura, con barra proporcional al error más frecuente
5. **Log de las últimas 20 respuestas** con sección, etiqueta, fecha y hora

---

## 7. Cheatsheets colapsables y teoría

### Patrón de cheatsheet colapsable

Cada sección tiene un panel de teoría que empieza abierto y se puede ocultar durante la práctica:

```html
<div class="cs-wrap">
  <div class="cs-hdr" onclick="toggleCS(this)">
    <div class="cs-ttl">
      <i class="ti ti-info-circle" aria-hidden="true"></i> Título del cheatsheet
    </div>
    <div class="cs-tog open">
      <i class="ti ti-chevron-down" aria-hidden="true"></i>
    </div>
  </div>
  <div class="cs-body open">
    <!-- Contenido teórico -->
  </div>
</div>
```

```javascript
function toggleCS(hdr) {
  const body = hdr.nextElementSibling;
  const tog  = hdr.querySelector('.cs-tog');
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  tog.classList.toggle('open', !open);
  // La rotación del ícono (180°) se hace con CSS transition en .cs-tog.open
}
```

### Fuentes de la teoría incluida

Todo el contenido teórico está basado en las siguientes fuentes verificables:

| Fuente | Contenido cubierto |
|--------|-------------------|
| Open Music Theory (Viva Pressbooks, 2021) | Triadas, intervalos, lectura de claves, escalas menor |
| musictheory.net | Compases simples/compuestos, armaduras, círculo de quintas |
| musictheoryacademy.com | Triadas, mnemotécnicos de clave de Sol, intervalos |
| allaboutmusictheory.com | Lectura en clave de Sol, Do central, líneas adicionales |
| Wikipedia — Triad (music) | Fórmulas y semitonos de los cuatro tipos de tríada |
| musictheory.pugetsound.edu | Intervalos aumentados y disminuidos |
| Jordan Rudess Online Conservatory | Carácter sonoro de cada tipo de acorde |
| Pozzoli, Solfeos Hablados y Cantados, 1er Curso (Ricordi) | Metodología, advertencia sobre solfeo cantado, orden de ejercicios |
| Decreto 229/2007 BOPV | Compases del examen, contenidos, grupos especiales |
| Prueba Sustitutoria LOGOS (bele.es) | Estructura exacta del examen, número de escuchas, nº de errores |

---

## 8. Código HTML completo — versión final

El código completo de la versión más avanzada del entrenador (con VexFlow, audio, historial, cheatsheets colapsables y todas las secciones) se estructura así:

```
entrenador_musical_bele.html
├── <style>            → ~80 líneas de CSS con variables CDS
├── <div class="app">  → Contenedor principal
│   ├── Header (lbl + título + subtítulo)
│   ├── Score row (4 contadores: Lectura, Acordes, Ritmo, Teoría)
│   ├── Nav (6 botones de sección)
│   ├── #sec-lectura
│   │   ├── .cs-wrap (cheatsheet Pozzoli + método conservatorio)
│   │   ├── .diff-sel (3 niveles)
│   │   ├── .pb (barra de progreso)
│   │   ├── #lect-main (pentagrama VexFlow + audio + opciones)
│   │   └── #lect-result (resumen con errores)
│   ├── #sec-acordes
│   │   ├── .cs-wrap (guía de tríadas con fórmulas)
│   │   ├── Ejercicio principal (pentagrama + audio + opciones)
│   │   └── Referencia visual de los 4 tipos con pentagramas
│   ├── #sec-ritmo
│   │   ├── .cs-wrap (compases del examen)
│   │   ├── Ejercicio rítmico VexFlow
│   │   └── Botones de escucha por compás
│   ├── #sec-errores
│   │   ├── .cs-wrap (estrategia del examen)
│   │   ├── Pentagrama VexFlow de la melodía
│   │   └── Dos botones de audio (escrita / sonada)
│   ├── #sec-teoria
│   │   ├── .cs-wrap (tonalidad, escalas, intervalos)
│   │   └── Cuestionario 15 preguntas rotativas
│   └── #sec-historial
│       ├── Resumen global
│       ├── Racha actual / mejor racha
│       ├── Barras de precisión por sección
│       ├── Mapa de notas más falladas
│       └── Log de las últimas 20 respuestas
├── <script src="cdn.jsdelivr.net/vexflow@4.2.2">
└── <script>           → ~500 líneas de JavaScript
    ├── Helpers VexFlow (makeRenderer, drawSingleNote, drawChordVex, drawRhythmVex)
    ├── Motor de audio (getAudio, mf, playNote, animWave)
    ├── Historial (loadH, nH, saveH, logA, updSc, initSc)
    ├── Navegación (showSec, toggleCS)
    ├── Sección Lectura (startLect, renderLect, playLectNote, checkLect, nextLect)
    ├── Sección Acordes (startAcordes, renderAcorde, playCurrentChord, checkAcorde)
    ├── Sección Ritmo (nextRhythm, playRhythm, checkRhythm, playTS)
    ├── Sección Errores (startErrores, playErrMelody, checkError)
    ├── Sección Teoría (startTeo, renderTeo, checkTeo, nextTeo)
    └── Sección Historial (renderHist, resetHist)
```

### Cómo usar la app de forma offline

1. Copiar el HTML completo en un archivo `entrenador_musical_bele.html`
2. Abrir con cualquier navegador moderno (Chrome, Firefox, Safari, Edge)
3. La única dependencia externa es VexFlow (requiere conexión al primer uso, luego el navegador cachea el script)
4. El historial se guarda automáticamente en el navegador y persiste entre sesiones

### Cómo incrustar en una web existente

```html
<iframe
  src="entrenador_musical_bele.html"
  width="100%"
  height="800px"
  style="border: none;"
  title="Entrenador musical BELE">
</iframe>
```

---

## 9. Fuentes y referencias

### Examen y normativa

- **Prueba Sustitutoria de Música — Nivel 4º EE**  
  https://www.bele.es/wp-content/uploads/2020/06/Prueba-Musical-Sustitutoria-LOGOS.pdf
- **BELE — Información de matrícula e inscripción**  
  https://www.bele.es/es/estudios/inscripcion/
- **Decreto 229/2007, de 11 de diciembre** (contenidos curriculares BOPV)

### Método Pozzoli

- Pozzoli, H. (Ricordi Americana, ERA 1151). *Solfeos Hablados y Cantados — Primer Curso.* Buenos Aires. Incluye: Solfeos Hablados (ejercicios 1–45), Solfeos Cantados (ejercicios 1–60), ejercicios sobre intervalos conjuntos/disjuntos, puntillo, contratiempo, escalas cromáticas, menor natural/armónica/melódica.

### Teoría musical

- **Open Music Theory** (Viva Pressbooks, 2021) — Triads, Clefs, Minor Scales  
  https://viva.pressbooks.pub/openmusictheory/
- **musictheory.net** — Lessons (Staff, Clefs, Time Signatures, Key Signatures)  
  https://www.musictheory.net/lessons
- **Music Theory Academy** — Triads, Treble Clef  
  https://www.musictheoryacademy.com/
- **All About Music Theory** — Reading Treble Clef Notes  
  https://www.allaboutmusictheory.com/
- **musictheory.pugetsound.edu** — Augmented and Diminished Intervals
- **Wikipedia** — Triad (music)  
  https://en.wikipedia.org/wiki/Triad_(music)
- **Jordan Rudess Online Conservatory** — Triads

### Tecnologías

- **VexFlow** (0xfe) — https://github.com/0xfe/vexflow
- **Web Audio API** — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **localStorage API** — https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **Tabler Icons** — https://tabler.io/icons

---

*Documentación generada en junio 2026. App desarrollada iterativamente en conversación con Claude Sonnet 4.6 (Anthropic).*
