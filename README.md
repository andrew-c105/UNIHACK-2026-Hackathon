# TrackSync – The Music GitHub

**Git for music co-production.** Push, pull, review PRs, and resolve conflicts with side-by-side waveform comparison.

Built for UNIHACK 2026.

DEMO VIDEO: [TRACKSYNC](https://www.youtube.com/watch?v=fhlOkANMoIU&t=2s)

## Tech Stack

- **Frontend:** React, Tailwind CSS, Wavesurfer.js, JavaScript
- **Backend:** FastAPI, GitPython, FFmpeg
- **Storage:** Supabase

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

## Requirements

- **FFmpeg** (optional): For mixing stems to MP3. Install with `brew install ffmpeg` (macOS) or your package manager.
- **Node 18+** for frontend.
- **Python 3.9+** for backend.

## License

MIT
