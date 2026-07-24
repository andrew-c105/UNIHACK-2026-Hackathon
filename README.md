# TrackSync – The Music GitHub

**Git for music co-production.** Push WAV stems from LMMS, review pull requests in the browser, and resolve conflicts with side-by-side waveform comparison.

Built for UNIHACK 2026.

DEMO VIDEO: [TRACKSYNC](https://www.youtube.com/watch?v=fhlOkANMoIU&t)

## How It Works

1. **Create a project** in the web app and copy the Project ID.
2. **Connect LMMS** via the TrackSync sidebar plugin — select a feature branch (not `main`).
3. **Push** — LMMS renders sample tracks to WAV and uploads them to the backend.
4. **Review** — open a pull request on the web to compare branches side by side.
5. **Merge** — resolve any conflicts (same track name, different audio) and merge into `main`.
6. **Pull** — download the merged tracks back into LMMS.

Each project is stored as a local Git repo on the server (`tracks/*.wav` per branch). The backend auto-mixes stems into a main preview track (`main.mp3`).

## Tech Stack

- **LMMS plugin:** C++ / Qt sidebar — connect, push, pull, create PRs
- **Frontend:** React, Tailwind CSS, Wavesurfer.js (deployed on Vercel)
- **Backend:** FastAPI, GitPython, FFmpeg (deployed on Railway)
- **Storage:** Supabase (optional) with local JSON fallback

## Live Demo

| Service | URL |
|---------|-----|
| Web app | https://frontend-sigma-inky-bbx27rv9il.vercel.app |
| Backend API | https://backend-production-8b2a.up.railway.app |

In LMMS, set the API URL to the **web app URL** (no `/projects` suffix). Vercel proxies API requests to Railway.

## Quick Start (Local)

From the repo root:

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Or run both together from the repo root (requires backend venv already set up):

```bash
npm install
npm run dev
```

Open **http://localhost:3000**

Copy `.env.example` to `.env` and fill in values if using Supabase locally:

```bash
cp .env.example .env
```

## Deployment

**Backend (Railway):**
- Root directory: `backend`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Mount a persistent volume at `/app/data` for Git repos and audio
- Set `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_KEY` in Railway variables

**Frontend (Vercel):**
- Root directory: `frontend`
- `frontend/vercel.json` proxies `/projects` and `/audio` to the Railway backend
- Set `VITE_API_URL` in Vercel env vars if not using the proxy rewrites

```bash
npm run deploy:frontend        # production
npm run deploy:frontend:preview  # preview
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET/PATCH/DELETE | `/projects/{id}` | Get / update / delete project |
| POST | `/projects/{id}/cover` | Upload album cover |
| GET | `/projects/{id}/dashboard` | Dashboard data (tracks, history, main mix) |
| GET/POST | `/projects/{id}/branches` | List / create branches |
| POST | `/projects/{id}/push-files` | Push WAV stems to a branch |
| GET | `/projects/{id}/clone` | Clone manifest for LMMS pull |
| POST | `/projects/{id}/pull` | Pull latest (server-side git) |
| GET | `/projects/{id}/history` | Commit timeline |
| GET/POST | `/projects/{id}/prs` | List / create pull requests |
| GET | `/projects/{id}/pr/{prId}` | Pull request detail + live diff |
| POST | `/projects/{id}/pr/{prId}/merge` | Merge with conflict resolutions |
| GET | `/projects/{id}/conflict?track=X&pr=Y` | Conflict audio URLs |
| POST | `/projects/{id}/audio-diff` | Compare two WAV files |
| GET | `/audio/{id}/branch/{branch}/{path}` | Stream audio from a git branch |

## Requirements

- **FFmpeg** (optional): mixes stems to MP3; Python WAV fallback used if unavailable
- **Node 18+** for frontend
- **Python 3.9+** for backend
- **LMMS** with TrackSync sidebar plugin (in `lmms/` submodule) for DAW integration

## License

MIT
