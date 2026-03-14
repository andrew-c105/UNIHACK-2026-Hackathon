"""
TrackSync Git Service
GitPython-based version control for music tracks.
Persists metadata to Supabase via StorageService.
"""
import shutil
from pathlib import Path
from typing import Optional

from git import Repo
from git.exc import GitCommandError

from services.ffmpeg_service import FFmpegService


class GitService:
    def __init__(self, data_dir: Path, storage_service=None):
        self.data_dir = Path(data_dir)
        self.ffmpeg = FFmpegService()
        self.storage = storage_service

    def _project_path(self, project_id: str) -> Path:
        return self.data_dir / project_id

    def init_project(self, project_id: str):
        proj_path = self._project_path(project_id)
        proj_path.mkdir(parents=True, exist_ok=True)
        (proj_path / "tracks").mkdir(exist_ok=True)
        if not (proj_path / ".git").exists():
            repo = Repo.init(proj_path)
            (proj_path / "tracks" / ".gitkeep").touch()
            repo.index.add(["tracks/.gitkeep"])
            repo.index.commit("Initial commit")

    async def push_files(
        self,
        project_id: str,
        producer_id: str,
        branch: str,
        commit_message: str,
        files: list,
    ) -> dict:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}

        repo = Repo(proj_path)
        tracks_dir = proj_path / "tracks"
        tracks_dir.mkdir(exist_ok=True)

        added = []
        for f in files:
            name = Path(f.filename).stem
            ext = Path(f.filename).suffix or ".wav"
            content = await f.read()

            # Save to local git repo
            out_path = tracks_dir / f"{name}{ext}"
            with open(out_path, "wb") as fp:
                fp.write(content)
            repo.index.add([str(out_path.relative_to(proj_path))])

            # Upload to Supabase Storage + upsert track metadata
            if self.storage:
                storage_path = self.storage.upload_track_file(
                    project_id, f"{name}{ext}", content
                )
                self.storage.upsert_track(
                    project_id=project_id,
                    name=name.replace("_", " ").title(),
                    filename=f"{name}{ext}",
                    storage_path=storage_path,
                    modified_by=producer_id,
                    status="up to date",
                )
            added.append(name)

        if not added:
            return {"error": "No files saved"}

        commit = repo.index.commit(f"{commit_message} (by {producer_id})")

        # Persist commit metadata to Supabase
        if self.storage:
            self.storage.save_commit(
                project_id=project_id,
                commit_hash=commit.hexsha[:7],
                message=commit_message,
                author=producer_id,
                tracks_changed=added,
            )

        # Regenerate main mix
        wav_files = [f for f in tracks_dir.iterdir()
                     if f.suffix.lower() == ".wav" and not f.name.startswith(".")]
        if wav_files:
            mixed = self.ffmpeg.mix_to_mp3(proj_path, sorted(wav_files))
            if mixed and self.storage:
                self.storage.upload_main_mix(project_id, proj_path / "main.mp3")

        return {
            "success": True,
            "commit_message": commit_message,
            "tracks_added": added,
            "branch": branch,
        }

    def get_session(self, project_id: str, producer_id: str) -> Optional[dict]:
        """Get session view. Reads from Supabase first, falls back to filesystem."""
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return None

        # Try Supabase first
        if self.storage:
            db_tracks = self.storage.get_tracks(project_id)
            if db_tracks:
                STATUS_MAP = {
                    "up to date": "up",
                    "conflict": "conflict",
                    "your changes": "changed",
                    "changed": "changed",
                }
                tracks = [{
                    "id": t["filename"].rsplit(".", 1)[0] if t.get("filename") else t["name"],
                    "name": t["name"],
                    "status": t.get("status", "up to date"),
                    "status_type": STATUS_MAP.get(t.get("status", "up to date"), "up"),
                } for t in db_tracks]
                return {"project_id": project_id, "tracks": tracks, "branch": "main"}

        # Fallback to filesystem
        tracks_dir = proj_path / "tracks"
        tracks = []
        for f in sorted(tracks_dir.iterdir()):
            if f.name.startswith("."):
                continue
            if f.suffix.lower() in (".wav", ".mp3"):
                tracks.append({
                    "id": f.stem,
                    "name": f.stem.replace("_", " ").title(),
                    "status": "up to date",
                    "status_type": "up",
                })
        return {"project_id": project_id, "tracks": tracks, "branch": "main"}

    def pull(self, project_id: str, producer_id: str, branch: str) -> dict:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}
        repo = Repo(proj_path)
        try:
            repo.git.pull("origin", branch, allow_unrelated_histories=True)
        except GitCommandError:
            pass  # No remote / local only
        return {"success": True, "branch": branch}

    def get_history(self, project_id: str, branch: str) -> list:
        """Get version timeline. Reads from Supabase first, falls back to git log."""
        if self.storage:
            commits = self.storage.get_commits(project_id)
            if commits:
                return [{
                    "id": c.get("commit_hash", c.get("id", "")[:7]),
                    "message": c["message"],
                    "author": c["author"],
                    "timestamp": c.get("created_at", ""),
                    "tracks_changed": c.get("tracks_changed", []),
                } for c in commits]

        # Fallback to git log
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return []
        repo = Repo(proj_path)
        history = []
        for commit in repo.iter_commits(branch, max_count=20):
            history.append({
                "id": commit.hexsha[:7],
                "message": commit.message.strip(),
                "author": str(commit.author),
                "timestamp": str(commit.committed_datetime),
                "tracks_changed": [],
            })
        return history

    def get_pr(self, project_id: str, pr_id: str) -> Optional[dict]:
        # Try Supabase first
        if self.storage:
            db_pr = self.storage.get_pr(pr_id)
            if db_pr:
                pr_tracks = self.storage.get_pr_tracks(pr_id)
                tracks = [{
                    "id": t["track_name"].replace(" ", "_"),
                    "name": t["track_name"],
                    "status": t.get("status", "modified"),
                    "main_url": f"/api/audio/{project_id}/tracks/{t.get('main_storage_path', '')}",
                    "branch_url": f"/api/audio/{project_id}/tracks/{t.get('branch_storage_path', '')}",
                } for t in pr_tracks]
                return {
                    "id": pr_id,
                    "project_id": project_id,
                    "tracks": tracks,
                    "has_conflicts": db_pr.get("has_conflicts", False),
                    "status": db_pr.get("status", "open"),
                    "merged": db_pr.get("status") == "merged",
                }

        # Fallback: list tracks from filesystem
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return None
        tracks_dir = proj_path / "tracks"
        tracks = []
        for f in sorted(tracks_dir.iterdir()):
            if f.name.startswith(".") or f.suffix.lower() not in (".wav", ".mp3"):
                continue
            tracks.append({
                "id": f.stem,
                "name": f.stem.replace("_", " ").title(),
                "status": "modified",
                "main_url": f"/api/audio/{project_id}/tracks/{f.name}",
                "branch_url": f"/api/audio/{project_id}/tracks/{f.name}",
            })
        return {
            "id": pr_id,
            "project_id": project_id,
            "tracks": tracks,
            "has_conflicts": any(t.get("status") == "conflict" for t in tracks),
        }

    def get_conflict_urls(self, project_id: str, track_id: str) -> Optional[dict]:
        proj_path = self._project_path(project_id)
        tracks_dir = proj_path / "tracks"
        mine = tracks_dir / f"{track_id}_mine.wav"
        theirs = tracks_dir / f"{track_id}_theirs.wav"
        base = tracks_dir / f"{track_id}.wav"

        base_url = f"/api/audio/{project_id}/tracks"
        if mine.exists() and theirs.exists():
            return {
                "mine_url": f"{base_url}/{mine.name}",
                "theirs_url": f"{base_url}/{theirs.name}",
                "track_id": track_id,
            }
        if base.exists():
            return {
                "mine_url": f"{base_url}/{base.name}",
                "theirs_url": f"{base_url}/{base.name}",
                "track_id": track_id,
            }
        return {
            "mine_url": f"{base_url}/{track_id}.wav",
            "theirs_url": f"{base_url}/{track_id}.wav",
            "track_id": track_id,
        }

    def merge_pr(self, project_id: str, pr_id: str, conflict_resolutions: dict) -> dict:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}

        tracks_dir = proj_path / "tracks"
        wav_files = [f for f in sorted(tracks_dir.iterdir())
                     if f.suffix.lower() == ".wav"
                     and not f.stem.endswith("_mine")
                     and not f.stem.endswith("_theirs")]
        if wav_files:
            mixed = self.ffmpeg.mix_to_mp3(proj_path, wav_files)
            if mixed and self.storage:
                self.storage.upload_main_mix(project_id, proj_path / "main.mp3")

        # Mark PR as merged in Supabase
        if self.storage:
            self.storage.merge_pr(pr_id)

        return {"success": True, "main_updated": True}
