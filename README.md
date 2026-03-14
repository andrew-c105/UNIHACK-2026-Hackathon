# TrackSync – The Music GitHub

**Git for music co-production.** Push, pull, review PRs, and resolve conflicts with side-by-side waveform comparison.

Built for UNIHACK 2026.

## Tech Stack

- **Frontend:** React, Tailwind CSS, Wavesurfer.js, React Router
- **Backend:** FastAPI, GitPython, FFmpeg
- **Storage:** Local filesystem (Supabase optional)

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

### 3. Demo Flow

1. Click **Seed Demo** on the landing page to create a demo project with sample tracks.
2. Open the project → **Session** → Push your own .wav files or use the demo.
3. **Pull Latest** to fetch changes.
4. **View Pull Request** to see track diffs.
5. **Resolve Conflict** for side-by-side waveform comparison (Wavesurfer.js).

## Jake & Mia Scenario

1. **Jake** adds vocal ostinato + bassline → **Add Changes** → **Push**.
2. **Mia** clicks **Pull Latest** → sees Jake's changes.
3. **Mia** prefers her bassline → replaces it → **Push** → creates PR.
4. **Conflict** on Bass Synth → **Conflict Resolution** screen with two waveforms.
5. **Mia** chooses **Keep Mine** or **Keep Jake's** → merge → main playback updated.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects | List projects |
| POST | /projects | Create project |
| GET | /projects/{id}/session | Session view (tracks + status) |
| POST | /projects/{id}/push-files | Push track files |
| POST | /projects/{id}/pull | Pull latest |
| GET | /projects/{id}/history | Version timeline |
| GET | /projects/{id}/pr/{prId} | Pull request |
| POST | /projects/{id}/pr/{prId}/merge | Merge with conflict resolutions |
| GET | /projects/{id}/conflict?track=X | Conflict URLs for track |
| POST | /seed-demo | Seed demo project |

## Requirements

- **FFmpeg** (optional): For mixing stems to MP3. Install with `brew install ffmpeg` (macOS) or your package manager.
- **Node 18+** for frontend.
- **Python 3.9+** for backend.

## License

MIT
