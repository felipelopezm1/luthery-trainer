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
- **Upstash Redis** cloud sync with **email login** (signup/login at `login.html`)
- **Playground** lab for MIDI recording and layered tracks

---

## Stack

| Layer | Tech |
|-------|------|
| UI | Static HTML + [Nothing UI](https://github.com/wangbh030722/vibe-nothing-ui-design) tokens |
| Logic | Vanilla JS (`js/app.js`, `js/audio-engine.js`, `js/sync.js`, `js/auth.js`) |
| Notation | VexFlow 4.2.2 (CDN) |
| Audio | soundfont-player + gleitz MusyngKite soundfonts |
| API | Vercel serverless `api/progress.js`, `api/auth/*` |
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
| `bele:auth:user:{id}` | Account (email, name, password hash) |
| `bele:auth:email:{email}` | Email → user id index |
| `bele:auth:session:{token}` | Login session (30-day TTL) |
| `bele:auth:count` | Registered user counter |
| `bele:progress:{userId}` | Scores, activity log, streaks, difficulty level |
| `bele:user:{userId}` | Profile metadata |

Sign up at `/login.html` for cloud sync across devices, or use **Continue without account** for local-only progress. Anonymous device UUIDs merge into your account on signup/login.

**Capacity (Upstash free tier, rough guide)**

| Limit | Typical headroom |
|-------|------------------|
| **256 MB storage** | ~**20k–50k users** at ~5–10 KB each (account + progress) |
| **500k commands/month** | ~**500–2k active users/month** depending on sync frequency |

Storage is usually not the bottleneck first — monthly Redis commands are. A classroom cohort (dozens to low hundreds) is well within the free tier; thousands of daily active users would need a paid Upstash plan.

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
login.html          Sign in / sign up
js/app.js           Trainer logic, exercises, difficulty
js/auth.js          Session client (login, logout)
js/audio-engine.js  Soundfonts, viz, MIDI, comparison
js/sync.js          Upstash sync client
js/playground.js    MIDI playground lab
js/nothing-ui.js    Theme / UI helpers
css/                Nothing UI + app styles
api/progress.js     GET/PUT/DELETE user progress
api/auth/           signup, login, me, logout
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
