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
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

from services.git_service import GitService
from services.storage_service import StorageService

load_dotenv()

app = FastAPI(title="TrackSync API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Local data dir (for git repos and audio file serving)
DATA_DIR = Path(os.getenv("TRACKSYNC_DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

storage_service = StorageService(supabase, DATA_DIR)
git_service = GitService(DATA_DIR, storage_service)


# --- Models ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class MergeRequest(BaseModel):
    project_id: str
    pr_id: str
    conflict_resolutions: Optional[dict] = {}


# --- Routes ---
@app.get("/")
def root():
    return {"message": "TrackSync API", "version": "1.0.0"}


@app.get("/projects")
def list_projects():
    projects = storage_service.list_projects()
    return {"projects": projects}


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
    return {"project": project}


@app.get("/projects/{project_id}/session")
def get_session(project_id: str, producer_id: Optional[str] = None):
    producer_id = producer_id or "producer-1"
    session = git_service.get_session(project_id, producer_id)
    if not session:
        raise HTTPException(404, "Project not found")
    return {"session": session}


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


@app.get("/projects/{project_id}/pr/{pr_id}")
def get_pr(project_id: str, pr_id: str):
    pr = git_service.get_pr(project_id, pr_id)
    if not pr:
        raise HTTPException(404, "PR not found")
    return {"pr": pr}


@app.post("/projects/{project_id}/pr/{pr_id}/merge")
def merge_pr(project_id: str, pr_id: str, body: MergeRequest):
    result = git_service.merge_pr(project_id, pr_id, body.conflict_resolutions or {})
    return result


@app.get("/projects/{project_id}/conflict")
def get_conflict(project_id: str, track: str = Query("Bass_Synth")):
    conflict = git_service.get_conflict_urls(project_id, track)
    if not conflict:
        raise HTTPException(404, "No conflict for this track")
    return {"conflict": conflict}


@app.get("/projects/{project_id}/main-audio")
def get_main_audio(project_id: str):
    url = storage_service.get_main_audio_url(project_id)
    return {"url": url}


@app.post("/seed-demo")
def seed_demo_route():
    try:
        from seed_demo import seed_demo
        seed_demo(storage_service, git_service)
        return {"success": True, "project_id": "demo"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/audio/{project_id}/{path:path}")
def serve_audio(project_id: str, path: str):
    full_path = DATA_DIR / project_id / path
    if not full_path.exists():
        raise HTTPException(404, "File not found")
    media = "audio/mpeg" if full_path.suffix == ".mp3" else "audio/wav"
    return FileResponse(full_path, media_type=media)
