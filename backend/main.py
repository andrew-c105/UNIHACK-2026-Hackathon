"""
TrackSync - Music GitHub Backend
FastAPI server with Supabase persistence, Git operations, and FFmpeg mixing.
"""
import os
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

from git import Repo
from services.git_service import GitService
from services.storage_service import StorageService
from services.local_storage_service import LocalStorageService
from services.audio_analysis_service import AudioAnalysisService

load_dotenv()

app = FastAPI(title="TrackSync API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase (optional – falls back to local JSON storage)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Local data dir (for git repos and audio file serving)
DATA_DIR = Path(os.getenv("TRACKSYNC_DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    storage_service = StorageService(supabase, DATA_DIR)
    print("Using Supabase storage")
else:
    storage_service = LocalStorageService(DATA_DIR)
    print("No Supabase credentials found – using local JSON storage")

git_service = GitService(DATA_DIR, storage_service)
audio_service = AudioAnalysisService()


# --- Models ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class MergeRequest(BaseModel):
    project_id: str
    pr_id: str
    conflict_resolutions: Optional[dict] = {}


class AudioDiffRequest(BaseModel):
    file_a: str
    file_b: str
    num_peaks: Optional[int] = 200


class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignees: Optional[list[str]] = []
    author: Optional[str] = "producer-1"


# --- Routes ---
@app.get("/")
def root():
    return {"message": "TrackSync API", "version": "1.0.0"}


@app.get("/projects")
def list_projects():
    projects = storage_service.list_projects()
    out_projects = []
    for project in projects:
        out = dict(project)
        project_id = project.get("id")
        if project_id:
            proj_path = DATA_DIR / project_id
            if proj_path.exists():
                for name in ("cover", "album"):
                    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                        if (proj_path / f"{name}{ext}").exists():
                            out["cover_url"] = f"/audio/{project_id}/{name}{ext}"
                            break
                    if "cover_url" in out:
                        break
        out_projects.append(out)
    return {"projects": out_projects}


@app.post("/projects")
def create_project(body: ProjectCreate):
    project_id = str(uuid.uuid4())[:8]
    project = storage_service.create_project(project_id, body.name, body.description or "")
    git_service.init_project(project_id)
    return {"project": project}


@app.get("/projects/{project_id}")
def get_project(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    proj_path = DATA_DIR / project_id
    out = dict(project)
    if proj_path.exists():
        for name in ("cover", "album"):
            for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                cover_path = proj_path / f"{name}{ext}"
                if cover_path.exists():
                    out["cover_url"] = f"/audio/{project_id}/{name}{ext}"
                    return {"project": out}
    return {"project": out}

@app.delete("/projects/{project_id}")
def delete_project(project_id: str):
    success = storage_service.delete_project(project_id)
    if not success:
        raise HTTPException(404, "Project not found or could not be deleted")
    return {"success": True}

class ProjectUpdate(BaseModel):
    description: Optional[str] = None


@app.patch("/projects/{project_id}")
def update_project(project_id: str, body: ProjectUpdate):
    if not storage_service.get_project(project_id):
        raise HTTPException(404, "Project not found")
    project = storage_service.update_project(project_id, description=body.description)
    out = dict(project) if project else {}
    proj_path = DATA_DIR / project_id
    if proj_path.exists():
        for name in ("cover", "album"):
            for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                p = proj_path / f"{name}{ext}"
                if p.exists():
                    out["cover_url"] = f"/audio/{project_id}/{name}{ext}"
                    return {"project": out}
    return {"project": out}


@app.post("/projects/{project_id}/cover")
async def upload_cover(project_id: str, file: UploadFile = File(...)):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    ext = Path(file.filename or "cover.jpg").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(400, "Only image files (jpg, png, webp, gif) allowed")
    proj_path = DATA_DIR / project_id
    proj_path.mkdir(parents=True, exist_ok=True)
    for old in proj_path.glob("cover.*") or []:
        old.unlink(missing_ok=True)
    for old in proj_path.glob("album.*") or []:
        old.unlink(missing_ok=True)
    out_path = proj_path / f"cover{ext}"
    content = await file.read()
    with open(out_path, "wb") as f:
        f.write(content)
    return {"url": f"/audio/{project_id}/cover{ext}"}


@app.get("/projects/{project_id}/dashboard")
def get_dashboard(project_id: str, producer_id: Optional[str] = None, branch: str = "main"):
    """Batch endpoint: project + session + history + main_audio in one response. Much faster than 4 separate calls."""
    producer_id = producer_id or "producer-1"
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    proj_path = DATA_DIR / project_id
    out = dict(project)
    if proj_path.exists():
        for name in ("cover", "album"):
            for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                cover_path = proj_path / f"{name}{ext}"
                if cover_path.exists():
                    out["cover_url"] = f"/audio/{project_id}/{name}{ext}"
                    break
            if "cover_url" in out:
                break

    session = git_service.get_session(project_id, producer_id, branch)
    history = git_service.get_history(project_id, branch)
    main_url = None
    try:
        main_url = git_service.get_main_mix_url_for_branch(project_id, branch)
    except Exception:
        pass
    if not main_url:
        main_url = storage_service.get_main_audio_url(project_id)

    return {
        "project": out,
        "session": session,
        "history": history,
        "main_audio_url": main_url,
    }


@app.get("/projects/{project_id}/clone")
def clone_project(project_id: str, branch: str = "main"):
    """Return project manifest with tracks from the specified branch for pull/clone."""
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    manifest = git_service.get_clone_manifest(project_id, branch)
    if manifest.get("error"):
        raise HTTPException(404, manifest["error"])
    return {
        "project": {"name": project.get("name", project_id)},
        "tracks": manifest["tracks"],
    }


@app.get("/projects/{project_id}/session")
def get_session(project_id: str, producer_id: Optional[str] = None, branch: str = "main"):
    producer_id = producer_id or "producer-1"
    session = git_service.get_session(project_id, producer_id, branch)
    if not session:
        raise HTTPException(404, "Project not found")
    return {"session": session}


@app.get("/projects/{project_id}/branches")
def list_branches(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    branches = git_service.list_branches(project_id)
    current = git_service.get_current_branch(project_id)
    return {"branches": branches, "current": current}


class BranchCreate(BaseModel):
    name: str
    base: Optional[str] = "main"


@app.post("/projects/{project_id}/branches")
def create_branch(project_id: str, body: BranchCreate):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    result = git_service.create_branch(project_id, body.name, body.base or "main")
    if result.get("error"):
        raise HTTPException(400, result["error"])
    return result


@app.post("/projects/{project_id}/push-files")
async def push_files(
    project_id: str,
    commit_message: str = Form(...),
    branch: str = Form("main"),
    producer_id: str = Form("producer-1"),
    files: list[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(400, "No files uploaded")
    result = await git_service.push_files(project_id, producer_id, branch, commit_message, files)
    return result


@app.post("/projects/{project_id}/pull")
def pull_latest(project_id: str, branch: str = "main", producer_id: str = "producer-1"):
    result = git_service.pull(project_id, producer_id, branch)
    return result


@app.get("/projects/{project_id}/history")
def get_history(project_id: str, branch: str = "main"):
    history = git_service.get_history(project_id, branch)
    return {"history": history}


class PullRequestCreate(BaseModel):
    source_branch: str
    target_branch: Optional[str] = "main"
    author: Optional[str] = "producer-1"


@app.get("/projects/{project_id}/prs")
def list_prs(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    prs = storage_service.get_prs_for_project(project_id)
    return {"pull_requests": prs}


@app.post("/projects/{project_id}/prs")
def create_pr(project_id: str, body: PullRequestCreate):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    result = git_service.create_pull_request(
        project_id, body.source_branch, body.target_branch or "main", body.author or "producer-1"
    )
    if result.get("error"):
        raise HTTPException(400, result["error"])
    return result


@app.get("/projects/{project_id}/issues")
def list_issues(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    issues = storage_service.get_issues_for_project(project_id)
    return {"issues": issues}


@app.post("/projects/{project_id}/issues")
def create_issue(project_id: str, body: IssueCreate):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    issue = storage_service.create_issue(
        project_id=project_id,
        title=body.title,
        description=body.description or "",
        author=body.author or "producer-1",
        assignees=body.assignees or [],
    )
    return {"issue": issue}


@app.get("/projects/{project_id}/pr/{pr_id}")
def get_pr(project_id: str, pr_id: str):
    pr = git_service.get_pr(project_id, pr_id)
    if not pr:
        raise HTTPException(404, "PR not found")
    return {"pr": pr}


@app.post("/projects/{project_id}/pr/{pr_id}/merge")
def merge_pr(project_id: str, pr_id: str, body: MergeRequest):
    result = git_service.merge_pr(project_id, pr_id, body.conflict_resolutions or {})
    if result.get("error"):
        raise HTTPException(400, result["error"])
    return result


@app.get("/projects/{project_id}/conflict")
def get_conflict(project_id: str, track: str = Query("Bass_Synth")):
    conflict = git_service.get_conflict_urls(project_id, track)
    if not conflict:
        raise HTTPException(404, "No conflict for this track")
    return {"conflict": conflict}


@app.get("/projects/{project_id}/main-audio")
def get_main_audio(project_id: str, branch: str = "main"):
    """Return URL for main mix for the given branch. Never falls back to workspace storage."""
    try:
        url = git_service.get_main_mix_url_for_branch(project_id, branch)
        if url:
            return {"url": url}
        # Branch exists but has no mix (e.g. empty main) — return silence for comparison
        return {"url": "/audio/silence.wav", "empty": True}
    except Exception:
        return {"url": None}


@app.get("/projects/{project_id}/waveform/{filename:path}")
def get_waveform(project_id: str, filename: str, num_peaks: int = 200):
    filepath = DATA_DIR / project_id / filename
    if not filepath.exists():
        filepath = DATA_DIR / project_id / "tracks" / filename
    result = audio_service.get_waveform_peaks(filepath, num_peaks)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


@app.post("/projects/{project_id}/audio-diff")
def audio_diff(project_id: str, body: AudioDiffRequest):
    base = DATA_DIR / project_id
    file_a = base / body.file_a
    file_b = base / body.file_b
    if not file_a.exists():
        file_a = base / "tracks" / body.file_a
    if not file_b.exists():
        file_b = base / "tracks" / body.file_b
    result = audio_service.compute_diff(file_a, file_b, body.num_peaks or 200)
    if result.get("error"):
        raise HTTPException(404, result["error"])
    return result


@app.post("/seed-demo")
def seed_demo_route():
    try:
        from seed_demo import seed_demo
        seed_demo(storage_service, git_service)
        return {"success": True, "project_id": "demo"}
    except Exception as e:
        raise HTTPException(500, str(e))


# Minimal 1s silent WAV for empty-branch comparison (44.1kHz mono 16-bit)
_SILENCE_WAV = None

def _get_silence_wav() -> bytes:
    global _SILENCE_WAV
    if _SILENCE_WAV is not None:
        return _SILENCE_WAV
    import struct
    sample_rate, n_channels, bits = 44100, 1, 16
    num_samples = sample_rate * n_channels
    data_size = num_samples * (bits // 8)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE", b"fmt ", 16,
        1, n_channels, sample_rate, sample_rate * n_channels * (bits // 8),
        n_channels * (bits // 8), bits, b"data", data_size,
    )
    _SILENCE_WAV = header + (b"\x00" * data_size)
    return _SILENCE_WAV


@app.get("/audio/silence.wav")
def serve_silence():
    """Serve 1 second of silence for empty-branch comparison."""
    return Response(content=_get_silence_wav(), media_type="audio/wav")


@app.get("/audio/{project_id}/branch/{branch_name}/{path:path}")
def serve_branch_audio(project_id: str, branch_name: str, path: str):
    """Serve audio from a specific git branch without checkout."""
    from urllib.parse import unquote
    path = unquote(path)
    proj_path = DATA_DIR / project_id
    if not proj_path.exists():
        raise HTTPException(404, "Project not found")
    try:
        repo = Repo(proj_path)
    except Exception:
        raise HTTPException(404, "Not a git repo")
    branch_names = [b.name for b in repo.branches]
    if branch_name not in branch_names:
        raise HTTPException(404, f"Branch '{branch_name}' not found")
    try:
        tree = repo.commit(branch_name).tree
        for part in path.split("/"):
            tree = tree[part]
        data = tree.data_stream.read()
    except (KeyError, TypeError, AttributeError):
        raise HTTPException(404, f"File '{path}' not found on branch '{branch_name}'")
    media = "audio/mpeg" if path.endswith(".mp3") else "audio/wav"
    return Response(content=data, media_type=media)


@app.get("/audio/{project_id}/{path:path}")
def serve_audio(project_id: str, path: str):
    full_path = DATA_DIR / project_id / path
    if not full_path.exists():
        raise HTTPException(404, "File not found")
    media = "audio/mpeg" if full_path.suffix == ".mp3" else "audio/wav"
    return FileResponse(full_path, media_type=media)
