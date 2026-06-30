# Entrenador Musical · BELE Laudería

Web app for **Prueba Sustitutoria de Música** (4º EE, Conservatorio Bilbao). Covers rhythmic reading (a.1), melodic error detection (b.1), chord identification (b.2), plus supplementary treble-clef reading and theory drills.

**Live (main):** [luthery-trainer.vercel.app](https://luthery-trainer.vercel.app)  
**Live (ceci-branch):** [luthery-trainer-ceci.vercel.app](https://luthery-trainer-ceci.vercel.app)  
**Repo:** [github.com/felipelopezm1/luthery-trainer](https://github.com/felipelopezm1/luthery-trainer)

---

## Features

- Paginated exercise modules with **Fácil / Medio / Difícil** tiers (item count, timers, listen limits)
- **VexFlow** notation, **soundfont-player** instruments (piano, wind, strings, guitar, organ)
- Right panel: waveform, spectrum, mini keyboard, **Web MIDI** (e.g. AKAI LPK25), target vs played comparison
- Progress history with section and difficulty breakdown
- **Upstash Redis** cloud sync (optional display name per device UUID)

---

## Stack

| Layer | Tech |
|-------|------|
| UI | Static HTML + [Nothing UI](https://github.com/wangbh030722/vibe-nothing-ui-design) tokens |
| Logic | Vanilla JS (`js/app.js`, `js/audio-engine.js`, `js/sync.js`) |
| Notation | VexFlow 4.2.2 (CDN) |
| Audio | soundfont-player + gleitz MusyngKite soundfonts |
| API | Vercel serverless `api/progress.js` |
| Storage | Upstash Redis (`@upstash/redis`) |

---

## Local development

```bash
npm install
npx vercel dev          # static site + /api routes (needs Redis env vars)
# or serve static only:
npx serve .
```

Copy `.env.example` to `.env.local` and fill in Upstash credentials for sync to work locally.

---

## Upstash Redis

1. In [Vercel → luthery-trainer → Integrations](https://vercel.com/chagra-amazon/luthery-trainer), add **Upstash for Redis** and connect to the project.
2. Vercel sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically.
3. Repeat for **luthery-trainer-ceci** if using the `ceci-branch` deployment (shared or separate Redis store).

**Data model**

| Key | Contents |
|-----|----------|
| `bele:progress:{uuid}` | Scores, activity log, streaks, difficulty level |
| `bele:user:{uuid}` | Optional display name |

Each browser generates a UUID in `localStorage`; no login required.

---

## Branches & deployments

| Branch | Vercel project | URL |
|--------|----------------|-----|
| `main` | `luthery-trainer` | https://luthery-trainer.vercel.app |
| `ceci-branch` | `luthery-trainer-ceci` | https://luthery-trainer-ceci.vercel.app |

Pushes to `main` or `ceci-branch` trigger GitHub Actions deploy workflows (requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and project IDs in repo secrets).

---

## Project layout

```
index.html          App shell
js/app.js           Trainer logic, exercises, difficulty
js/audio-engine.js  Soundfonts, viz, MIDI, comparison
js/sync.js          Upstash sync client
js/nothing-ui.js    Theme / UI helpers
css/                Nothing UI + app styles
api/progress.js     GET/PUT/DELETE user progress
fonts/open/         Doto, Geist, Newsreader
.md/                Internal BELE documentation (not deployed)
```

---

## Exam reference

- [BELE inscripción](https://www.bele.es/es/estudios/inscripcion/)
- [Prueba Musical Sustitutoria PDF](https://www.bele.es/wp-content/uploads/2020/06/Prueba-Musical-Sustitutoria-LOGOS.pdf)

---

## License

Fonts under their respective OFL files in `fonts/open/`. App code © project contributors.
