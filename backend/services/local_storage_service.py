"""
TrackSync Local Storage Service
JSON-file-based storage that mirrors the Supabase StorageService interface.
Used when Supabase credentials are not configured.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class LocalStorageService:
    """Drop-in replacement for StorageService using local JSON files."""

    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._db_path = self.data_dir / "_metadata.json"
        self._db = self._load()

    def _load(self) -> dict:
        default = {"projects": {}, "tracks": {}, "commits": {}, "pull_requests": {}, "pr_tracks": {}, "issues": {}}
        if self._db_path.exists():
            data = json.load(open(self._db_path))
            if "issues" not in data:
                data["issues"] = {}
            return data
        return default

    def _save(self):
        with open(self._db_path, "w") as f:
            json.dump(self._db, f, indent=2, default=str)

    # ---- Projects ----

    def list_projects(self) -> list:
        projects = list(self._db["projects"].values())
        projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        return projects

    def create_project(self, project_id: str, name: str, description: str = "") -> dict:
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": project_id,
            "name": name,
            "description": description or "",
            "created_at": now,
            "updated_at": now,
        }
        self._db["projects"][project_id] = row
        (self.data_dir / project_id / "tracks").mkdir(parents=True, exist_ok=True)
        self._save()
        return row

    def get_project(self, project_id: str) -> Optional[dict]:
        return self._db["projects"].get(project_id)

    def update_project(self, project_id: str, description: Optional[str] = None) -> Optional[dict]:
        if project_id not in self._db["projects"]:
            return None
        if description is not None:
            self._db["projects"][project_id]["description"] = description
            self._db["projects"][project_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save()
        return self._db["projects"][project_id]

    # ---- Commits ----

    def save_commit(self, project_id: str, commit_hash: str, message: str,
                    author: str, tracks_changed: list[str]) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        cid = str(uuid.uuid4())[:8]
        row = {
            "id": cid,
            "project_id": project_id,
            "commit_hash": commit_hash,
            "message": message,
            "author": author,
            "tracks_changed": tracks_changed,
            "created_at": now,
        }
        self._db["commits"].setdefault(project_id, []).append(row)
        self._save()
        return row

    def get_commits(self, project_id: str, limit: int = 20) -> list:
        commits = self._db["commits"].get(project_id, [])
        commits.sort(key=lambda c: c.get("created_at", ""), reverse=True)
        return commits[:limit]

    # ---- Tracks ----

    def upsert_track(self, project_id: str, name: str, filename: str,
                     storage_path: str, modified_by: str, status: str = "up to date") -> dict:
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "project_id": project_id,
            "name": name,
            "filename": filename,
            "storage_path": storage_path,
            "status": status,
            "last_modified_by": modified_by,
            "updated_at": now,
        }
        key = f"{project_id}:{name}"
        self._db["tracks"][key] = row
        self._save()
        return row

    def get_tracks(self, project_id: str) -> list:
        tracks = [t for t in self._db["tracks"].values() if t["project_id"] == project_id]
        tracks.sort(key=lambda t: t.get("name", ""))
        return tracks

    def update_track_status(self, project_id: str, track_name: str, status: str):
        key = f"{project_id}:{track_name}"
        if key in self._db["tracks"]:
            self._db["tracks"][key]["status"] = status
            self._save()

    # ---- Pull Requests ----

    def create_pr(self, project_id: str, branch: str, author: str,
                  has_conflicts: bool = False, target_branch: str = "master") -> dict:
        now = datetime.now(timezone.utc).isoformat()
        pr_id = str(uuid.uuid4())[:8]
        row = {
            "id": pr_id,
            "project_id": project_id,
            "branch": branch,
            "target_branch": target_branch,
            "author": author,
            "status": "open",
            "has_conflicts": has_conflicts,
            "created_at": now,
        }
        self._db["pull_requests"][pr_id] = row
        self._save()
        return row

    def get_pr(self, pr_id: str) -> Optional[dict]:
        return self._db["pull_requests"].get(pr_id)

    def get_prs_for_project(self, project_id: str) -> list:
        prs = [p for p in self._db["pull_requests"].values() if p["project_id"] == project_id]
        prs.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        return prs

    def merge_pr(self, pr_id: str):
        if pr_id in self._db["pull_requests"]:
            self._db["pull_requests"][pr_id]["status"] = "merged"
            self._db["pull_requests"][pr_id]["merged_at"] = datetime.now(timezone.utc).isoformat()
            self._save()

    # ---- PR Tracks ----

    def add_pr_track(self, pr_id: str, track_name: str, change_type: str,
                     main_path: str, branch_path: str, status: str = "modified") -> dict:
        tid = str(uuid.uuid4())[:8]
        row = {
            "id": tid,
            "pr_id": pr_id,
            "track_name": track_name,
            "change_type": change_type,
            "main_storage_path": main_path,
            "branch_storage_path": branch_path,
            "status": status,
        }
        self._db["pr_tracks"].setdefault(pr_id, []).append(row)
        self._save()
        return row

    def get_pr_tracks(self, pr_id: str) -> list:
        return self._db["pr_tracks"].get(pr_id, [])

    # ---- Issues ----

    def create_issue(self, project_id: str, title: str, description: str,
                     author: str, assignees: list) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        issue_id = str(uuid.uuid4())[:8]
        row = {
            "id": issue_id,
            "project_id": project_id,
            "title": title,
            "description": description or "",
            "author": author,
            "assignees": assignees or [],
            "status": "open",
            "created_at": now,
        }
        self._db["issues"].setdefault(project_id, []).append(row)
        self._save()
        return row

    def get_issues_for_project(self, project_id: str) -> list:
        issues = self._db["issues"].get(project_id, [])
        issues.sort(key=lambda i: i.get("created_at", ""), reverse=True)
        return issues

    # ---- Audio file storage (local only) ----

    def upload_track_file(self, project_id: str, filename: str, file_bytes: bytes) -> str:
        """Save locally. Returns the storage path."""
        storage_path = f"{project_id}/{filename}"
        out = self.data_dir / project_id / "tracks" / filename
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "wb") as f:
            f.write(file_bytes)
        return storage_path

    def get_public_url(self, bucket: str, path: str) -> str:
        return f"/audio/{path}"

    def upload_main_mix(self, project_id: str, file_path: Path) -> str:
        # File is already in the right place on disk
        return f"{project_id}/main.mp3"

    def get_main_audio_url(self, project_id: str) -> Optional[str]:
        mp3_local = self.data_dir / project_id / "main.mp3"
        if mp3_local.exists():
            return f"/audio/{project_id}/main.mp3"
        wav_local = self.data_dir / project_id / "main.wav"
        if wav_local.exists():
            return f"/audio/{project_id}/main.wav"
        return None
