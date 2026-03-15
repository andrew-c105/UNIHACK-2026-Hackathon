"""
TrackSync Storage Service
Supabase PostgreSQL for metadata, Supabase Storage for audio files,
with local filesystem fallback.
Includes in-memory TTL cache for read-heavy endpoints.
"""
import os
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from postgrest.exceptions import APIError
from supabase import Client

# Cache TTL in seconds (30s for fast reads, invalidated on writes)
_CACHE_TTL = 30


class StorageService:
    def __init__(self, supabase: Client, data_dir: Path):
        self.sb = supabase
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self._read_cache = {}

    def _cache_get(self, key: tuple):
        now = time.monotonic()
        if key in self._read_cache:
            val, expiry = self._read_cache[key]
            if now < expiry:
                return val
        return None

    def _cache_set(self, key: tuple, val):
        self._read_cache[key] = (val, time.monotonic() + _CACHE_TTL)

    # ---- Projects (PostgreSQL) ----

    def list_projects(self) -> list:
        key = ("list_projects",)
        if (c := self._cache_get(key)) is not None:
            return c
        res = self.sb.table("projects").select("*").order("created_at", desc=True).execute()
        data = res.data or []
        self._cache_set(key, data)
        return data

    def create_project(self, project_id: str, name: str, description: str = "") -> dict:
        row = {
            "id": project_id,
            "name": name,
            "description": description or "",
        }
        res = self.sb.table("projects").upsert(row).execute()
        (self.data_dir / project_id / "tracks").mkdir(parents=True, exist_ok=True)
        self._read_cache.clear()
        return res.data[0] if res.data else row

    def get_project(self, project_id: str) -> Optional[dict]:
        key = ("get_project", project_id)
        if (c := self._cache_get(key)) is not None:
            return c
        res = self.sb.table("projects").select("*").eq("id", project_id).execute()
        data = res.data[0] if res.data else None
        self._cache_set(key, data)
        return data

    def update_project(self, project_id: str, description: Optional[str] = None) -> Optional[dict]:
        if description is not None:
            try:
                self.sb.table("projects").update({"description": description}).eq("id", project_id).execute()
            except Exception:
                pass
            self._read_cache.clear()
        return self.get_project(project_id)


    # ---- Commits (PostgreSQL) ----

    def save_commit(self, project_id: str, commit_hash: str, message: str,
                    author: str, tracks_changed: list[str]) -> dict:
        row = {
            "project_id": project_id,
            "commit_hash": commit_hash,
            "message": message,
            "author": author,
            "tracks_changed": tracks_changed,
        }
        res = self.sb.table("commits").insert(row).execute()
        self._read_cache.clear()
        return res.data[0] if res.data else row

    def get_commits(self, project_id: str, limit: int = 20) -> list:
        key = ("get_commits", project_id, limit)
        if (c := self._cache_get(key)) is not None:
            return c
        res = (self.sb.table("commits")
               .select("*")
               .eq("project_id", project_id)
               .order("created_at", desc=True)
               .limit(limit)
               .execute())
        data = res.data or []
        self._cache_set(key, data)
        return data

    # ---- Tracks (PostgreSQL) ----

    def upsert_track(self, project_id: str, name: str, filename: str,
                     storage_path: str, modified_by: str, status: str = "up to date") -> dict:
        row = {
            "project_id": project_id,
            "name": name,
            "filename": filename,
            "storage_path": storage_path,
            "status": status,
            "last_modified_by": modified_by,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        res = (self.sb.table("tracks")
               .upsert(row, on_conflict="project_id,name")
               .execute())
        return res.data[0] if res.data else row

    def get_tracks(self, project_id: str) -> list:
        res = (self.sb.table("tracks")
               .select("*")
               .eq("project_id", project_id)
               .order("name")
               .execute())
        return res.data or []

    def update_track_status(self, project_id: str, track_name: str, status: str):
        self.sb.table("tracks").update({"status": status}).eq(
            "project_id", project_id
        ).eq("name", track_name).execute()

    # ---- Pull Requests (PostgreSQL) ----

    def create_pr(self, project_id: str, branch: str, author: str,
                  has_conflicts: bool = False, target_branch: str = "master") -> dict:
        row = {
            "project_id": project_id,
            "branch": branch,
            "author": author,
            "status": "open",
            "has_conflicts": has_conflicts,
        }
        try:
            res = self.sb.table("pull_requests").insert({**row, "target_branch": target_branch}).execute()
        except APIError:
            res = self.sb.table("pull_requests").insert(row).execute()
        self._read_cache.clear()
        return res.data[0] if res.data else row

    def get_pr(self, pr_id: str) -> Optional[dict]:
        res = self.sb.table("pull_requests").select("*").eq("id", pr_id).execute()
        return res.data[0] if res.data else None

    def get_prs_for_project(self, project_id: str) -> list:
        key = ("get_prs_for_project", project_id)
        if (c := self._cache_get(key)) is not None:
            return c
        res = (self.sb.table("pull_requests")
               .select("*")
               .eq("project_id", project_id)
               .order("created_at", desc=True)
               .execute())
        data = res.data or []
        self._cache_set(key, data)
        return data

    def merge_pr(self, pr_id: str):
        self.sb.table("pull_requests").update({
            "status": "merged",
            "merged_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", pr_id).execute()
        self._read_cache.clear()

    # ---- PR Tracks ----

    def add_pr_track(self, pr_id: str, track_name: str, change_type: str,
                     main_path: str, branch_path: str, status: str = "modified") -> dict:
        row = {
            "pr_id": pr_id,
            "track_name": track_name,
            "change_type": change_type,
            "main_storage_path": main_path,
            "branch_storage_path": branch_path,
            "status": status,
        }
        res = self.sb.table("pr_tracks").insert(row).execute()
        return res.data[0] if res.data else row

    def get_pr_tracks(self, pr_id: str) -> list:
        res = self.sb.table("pr_tracks").select("*").eq("pr_id", pr_id).execute()
        return res.data or []

    # ---- Issues ----

    def create_issue(self, project_id: str, title: str, description: str,
                     author: str, assignees: list) -> dict:
        row = {
            "project_id": project_id,
            "title": title,
            "description": description or "",
            "author": author,
            "assignees": assignees or [],
            "status": "open",
        }
        try:
            res = self.sb.table("issues").insert(row).execute()
            self._read_cache.clear()
            return res.data[0] if res.data else row
        except APIError:
            return row

    def get_issues_for_project(self, project_id: str) -> list:
        key = ("get_issues_for_project", project_id)
        if (c := self._cache_get(key)) is not None:
            return c
        try:
            res = (self.sb.table("issues")
                   .select("*")
                   .eq("project_id", project_id)
                   .order("created_at", desc=True)
                   .execute())
            data = res.data or []
            self._cache_set(key, data)
            return data
        except APIError:
            return []

    # ---- Audio file storage ----

    def upload_track_file(self, project_id: str, filename: str, file_bytes: bytes) -> str:
        """Upload to Supabase Storage. Returns the storage path."""
        storage_path = f"{project_id}/{filename}"
        try:
            self.sb.storage.from_("stems").upload(
                storage_path, file_bytes,
                file_options={"content-type": "audio/wav", "upsert": "true"},
            )
        except Exception:
            pass  # Bucket may not exist yet; local fallback
        return storage_path

    def get_public_url(self, bucket: str, path: str) -> str:
        """Get public URL for a file in Supabase Storage."""
        return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{path}"

    def upload_main_mix(self, project_id: str, file_path: Path) -> str:
        storage_path = f"{project_id}/main.mp3"
        try:
            with open(file_path, "rb") as f:
                self.sb.storage.from_("mixes").upload(
                    storage_path, f.read(),
                    file_options={"content-type": "audio/mpeg", "upsert": "true"},
                )
        except Exception:
            pass
        return storage_path

    def get_main_audio_url(self, project_id: str) -> Optional[str]:
        """Return URL for main composition. Try Supabase first, then local."""
        mp3_local = self.data_dir / project_id / "main.mp3"
        if mp3_local.exists():
            return f"/audio/{project_id}/main.mp3"
        wav_local = self.data_dir / project_id / "main.wav"
        if wav_local.exists():
            return f"/audio/{project_id}/main.wav"
        return self.get_public_url("mixes", f"{project_id}/main.mp3")
