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

    def _ensure_no_gpg_sign(self, repo: Repo) -> None:
        """Disable commit signing for this repo — TrackSync is out of scope for GPG."""
        try:
            with repo.config_writer() as cw:
                cw.set_value("commit", "gpgsign", "false")
        except Exception:
            pass

    def init_project(self, project_id: str):
        proj_path = self._project_path(project_id)
        proj_path.mkdir(parents=True, exist_ok=True)
        (proj_path / "tracks").mkdir(exist_ok=True)
        if not (proj_path / ".git").exists():
            repo = Repo.init(proj_path)
            self._ensure_no_gpg_sign(repo)
            (proj_path / "tracks" / ".gitkeep").touch()
            repo.index.add(["tracks/.gitkeep"])
            repo.index.commit("Initial commit")

    def list_branches(self, project_id: str) -> list:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return []
        repo = Repo(proj_path)
        return [b.name for b in repo.branches]

    def create_branch(self, project_id: str, branch_name: str, base_branch: str = "main") -> dict:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}
        repo = Repo(proj_path)
        if branch_name in [b.name for b in repo.branches]:
            return {"error": f"Branch '{branch_name}' already exists"}
        base = repo.branches[base_branch] if base_branch in [b.name for b in repo.branches] else repo.active_branch
        repo.create_head(branch_name, base.commit)
        return {"success": True, "branch": branch_name, "base": base.name}

    def get_current_branch(self, project_id: str) -> str:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return "main"
        repo = Repo(proj_path)
        return repo.active_branch.name

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
        self._ensure_no_gpg_sign(repo)

        # Checkout or create the target branch
        if branch not in [b.name for b in repo.branches]:
            repo.create_head(branch, repo.active_branch.commit)
        repo.heads[branch].checkout()

        tracks_dir = proj_path / "tracks"
        tracks_dir.mkdir(exist_ok=True)

        # Full replace: remove all existing wav files from index so branch = exactly what we push
        try:
            tree = repo.commit(branch).tree
            tracks_tree = tree["tracks"]
            for blob in tracks_tree.blobs:
                if blob.name.lower().endswith(".wav") and not blob.name.startswith("."):
                    repo.index.remove([f"tracks/{blob.name}"])
        except (KeyError, TypeError):
            pass

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

        # Regenerate main mix before committing so it's included in the same commit
        wav_files = [f for f in tracks_dir.iterdir()
                     if f.suffix.lower() == ".wav" and not f.name.startswith(".")]
        if wav_files:
            mixed = self.ffmpeg.mix_to_mp3(proj_path, sorted(wav_files))
            if mixed and self.storage:
                self.storage.upload_main_mix(project_id, proj_path / "main.mp3")
            if mixed:
                main_mp3 = proj_path / "main.mp3"
                if main_mp3.exists():
                    repo.index.add([str(main_mp3.relative_to(proj_path))])

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

        return {
            "success": True,
            "commit_message": commit_message,
            "tracks_added": added,
            "branch": branch,
        }

    def get_session(self, project_id: str, producer_id: str, branch: str = "main") -> Optional[dict]:
        """Get session view scoped to a specific branch."""
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return None

        repo = Repo(proj_path)
        branch_names = [b.name for b in repo.branches]

        if branch in branch_names and repo.active_branch.name != branch:
            repo.heads[branch].checkout(force=True)

        tracks_dir = proj_path / "tracks"
        tracks = []
        for f in sorted(tracks_dir.iterdir()):
            if f.name.startswith("."):
                continue
            if f.suffix.lower() in (".wav", ".mp3"):
                tracks.append({
                    "id": f.stem,
                    "name": f.stem.replace("_", " ").title(),
                    "filename": f.name,
                    "status": "up to date",
                    "status_type": "up",
                })
        return {"project_id": project_id, "tracks": tracks, "branch": branch}

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

    def get_main_mix_url_for_branch(self, project_id: str, branch: str) -> Optional[str]:
        """Return URL for branch main mix. Uses tree if committed, else generates to cache."""
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return None
        repo = Repo(proj_path)
        branch_names = [b.name for b in repo.branches]
        if branch not in branch_names:
            return None
        tree = repo.commit(branch).tree
        if "main.mp3" in tree:
            return f"/audio/{project_id}/branch/{branch}/main.mp3"
        cache_dir = proj_path / "_mix_cache"
        cache_dir.mkdir(exist_ok=True)
        cache_file = cache_dir / f"{branch.replace('/', '_')}.mp3"
        if cache_file.exists():
            return f"/audio/{project_id}/_mix_cache/{cache_file.name}"
        original = repo.active_branch.name
        try:
            repo.heads[branch].checkout(force=True)
            tracks_dir = proj_path / "tracks"
            wav_files = [f for f in sorted(tracks_dir.iterdir())
                         if f.suffix.lower() == ".wav" and not f.name.startswith(".")]
            if wav_files:
                mixed = self.ffmpeg.mix_to_mp3(proj_path, wav_files)
                if mixed and (proj_path / "main.mp3").exists():
                    import shutil
                    shutil.copy(proj_path / "main.mp3", cache_file)
        finally:
            if original in branch_names:
                repo.heads[original].checkout(force=True)
        return f"/audio/{project_id}/_mix_cache/{cache_file.name}" if cache_file.exists() else None

    def get_clone_manifest(self, project_id: str, branch: str = "main") -> dict:
        """Return tracks from a branch with download URLs for pull/clone."""
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}
        try:
            repo = Repo(proj_path)
        except Exception:
            return {"error": "Not a git repo"}
        branch_names = [b.name for b in repo.branches]
        if branch not in branch_names:
            return {"error": f"Branch '{branch}' not found"}
        wavs = self._list_branch_wavs(repo, branch)
        tracks = []
        for key in sorted(wavs.keys()):
            fname = wavs[key][0]
            stem = Path(fname).stem
            download_url = f"/audio/{project_id}/branch/{branch}/tracks/{fname}"
            tracks.append({
                "name": stem.replace("_", " ").title(),
                "filename": fname,
                "download_url": download_url,
            })
        return {"tracks": tracks}

    def _list_branch_wavs(self, repo, branch_name: str) -> dict:
        """List WAV files on a branch by reading the git tree (no checkout).
        Returns {canonical_key: (filename, size)} so we can normalize case and avoid
        same track appearing as both added and removed."""
        try:
            tree = repo.commit(branch_name).tree
            tracks_tree = tree["tracks"]
        except (KeyError, TypeError):
            return {}
        result = {}
        for blob in tracks_tree.blobs:
            if blob.name.lower().endswith(".wav") and not blob.name.startswith("."):
                key = blob.name.lower()
                result[key] = (blob.name, blob.size)
        return result

    def create_pull_request(
        self, project_id: str, source_branch: str,
        target_branch: str = "main", author: str = "producer-1",
    ) -> dict:
        proj_path = self._project_path(project_id)
        if not proj_path.exists():
            return {"error": "Project not found"}

        repo = Repo(proj_path)
        branch_names = [b.name for b in repo.branches]

        if source_branch not in branch_names:
            return {"error": f"Branch '{source_branch}' does not exist"}
        if target_branch not in branch_names:
            return {"error": f"Branch '{target_branch}' does not exist"}
        if source_branch == target_branch:
            return {"error": "Source and target branches must differ"}

        target_tracks = self._list_branch_wavs(repo, target_branch)
        source_tracks = self._list_branch_wavs(repo, source_branch)

        added = set(source_tracks.keys()) - set(target_tracks.keys())
        removed = set(target_tracks.keys()) - set(source_tracks.keys())
        common = set(source_tracks.keys()) & set(target_tracks.keys())
        modified = {k for k in common if source_tracks[k][1] != target_tracks[k][1]}

        def _fname(key, prefer_source=True):
            if prefer_source and key in source_tracks:
                return source_tracks[key][0]
            if key in target_tracks:
                return target_tracks[key][0]
            return source_tracks.get(key, target_tracks.get(key, (key, 0)))[0]

        changed_tracks = []
        for key in sorted(added):
            changed_tracks.append((_fname(key), "added"))
        for key in sorted(modified):
            changed_tracks.append((_fname(key), "modified"))
        for key in sorted(removed):
            changed_tracks.append((_fname(key), "removed"))

        if not changed_tracks:
            return {"error": "No differences between branches"}

        pr_row = self.storage.create_pr(
            project_id=project_id,
            branch=source_branch,
            author=author,
            has_conflicts=False,
            target_branch=target_branch,
        )
        pr_id = pr_row["id"]

        for fname, change_type in changed_tracks:
            track_name = Path(fname).stem
            self.storage.add_pr_track(
                pr_id=pr_id,
                track_name=track_name,
                change_type=change_type,
                main_path=fname,
                branch_path=fname,
                status=change_type,
            )

        return {
            "success": True,
            "pr": {
                "id": pr_id,
                "project_id": project_id,
                "source_branch": source_branch,
                "target_branch": target_branch,
                "author": author,
                "status": "open",
                "tracks_changed": len(changed_tracks),
            },
        }

    def get_pr(self, project_id: str, pr_id: str) -> Optional[dict]:
        from urllib.parse import quote

        proj_path = self._project_path(project_id)
        source_branch = "feature"
        target_branch = "main"
        author = ""
        has_conflicts = False
        status = "open"
        created_at = ""
        changed_tracks = []

        if self.storage:
            db_pr = self.storage.get_pr(pr_id)
            if db_pr:
                source_branch = db_pr.get("branch", "feature")
                target_branch = db_pr.get("target_branch", "main")
                author = db_pr.get("author", "")
                has_conflicts = db_pr.get("has_conflicts", False)
                status = db_pr.get("status", "open")
                created_at = db_pr.get("created_at", "")
            else:
                return None

        def _audio_url(branch, fname):
            encoded = quote(fname, safe="")
            return f"/audio/{project_id}/branch/{branch}/tracks/{encoded}"

        # Always compute diff from live branch state so PR reflects latest commits.
        # If the source branch is pushed again after PR creation, the diff updates.
        repo = None
        if proj_path and proj_path.exists():
            try:
                repo = Repo(proj_path)
            except Exception:
                pass

        target_files = {}
        source_files = {}
        if repo:
            target_files = self._list_branch_wavs(repo, target_branch)
            source_files = self._list_branch_wavs(repo, source_branch)

        all_keys = set(target_files.keys()) | set(source_files.keys())

        def _fname(key, prefer_source=True):
            if prefer_source and key in source_files:
                return source_files[key][0]
            if key in target_files:
                return target_files[key][0]
            return key

        tracks = []
        for key in sorted(all_keys):
            in_target = key in target_files
            in_source = key in source_files

            if in_source and not in_target:
                change_type = "added"
            elif in_target and not in_source:
                change_type = "removed"
            elif in_source and in_target and source_files[key][1] != target_files[key][1]:
                change_type = "modified"
            else:
                change_type = "unchanged"

            if change_type == "unchanged":
                continue

            fname = _fname(key)
            stem = Path(fname).stem
            target_fname = target_files[key][0] if in_target else None
            source_fname = source_files[key][0] if in_source else None
            tracks.append({
                "id": stem,
                "name": stem,
                "filename": fname,
                "change_type": change_type,
                "base_url": _audio_url(target_branch, target_fname) if in_target else None,
                "compare_url": _audio_url(source_branch, source_fname) if in_source else None,
            })

        return {
            "id": pr_id,
            "project_id": project_id,
            "source_branch": source_branch,
            "target_branch": target_branch,
            "author": author,
            "tracks": tracks,
            "has_conflicts": has_conflicts,
            "status": status,
            "merged": status == "merged",
            "created_at": created_at,
        }

    def get_conflict_urls(self, project_id: str, track_id: str) -> Optional[dict]:
        proj_path = self._project_path(project_id)
        tracks_dir = proj_path / "tracks"
        mine = tracks_dir / f"{track_id}_mine.wav"
        theirs = tracks_dir / f"{track_id}_theirs.wav"
        base = tracks_dir / f"{track_id}.wav"

        base_url = f"/audio/{project_id}/tracks"
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

        if not self.storage:
            return {"error": "Storage not configured"}
        db_pr = self.storage.get_pr(pr_id)
        if not db_pr:
            return {"error": "PR not found"}
        source_branch = db_pr.get("branch", "feature")
        target_branch = db_pr.get("target_branch", "main")

        repo = Repo(proj_path)
        self._ensure_no_gpg_sign(repo)
        branch_names = [b.name for b in repo.branches]
        if source_branch not in branch_names:
            return {"error": f"Source branch '{source_branch}' not found"}
        if target_branch not in branch_names:
            return {"error": f"Target branch '{target_branch}' not found"}

        original_branch = repo.active_branch.name
        try:
            repo.heads[target_branch].checkout(force=True)
            repo.git.merge(source_branch, "--no-edit")
        except GitCommandError as e:
            if original_branch in branch_names:
                repo.heads[original_branch].checkout(force=True)
            return {"error": f"Merge failed: {e.stderr or str(e)}"}

        tracks_dir = proj_path / "tracks"
        wav_files = [f for f in sorted(tracks_dir.iterdir())
                     if f.suffix.lower() == ".wav"
                     and not f.stem.endswith("_mine")
                     and not f.stem.endswith("_theirs")]
        if wav_files:
            mixed = self.ffmpeg.mix_to_mp3(proj_path, wav_files)
            if mixed:
                main_mp3 = proj_path / "main.mp3"
                if main_mp3.exists():
                    repo.index.add([str(main_mp3.relative_to(proj_path))])
                    repo.index.commit("Update main mix after merge")
                if self.storage:
                    self.storage.upload_main_mix(project_id, proj_path / "main.mp3")

        cache_dir = proj_path / "_mix_cache"
        cache_file = cache_dir / f"{target_branch.replace('/', '_')}.mp3"
        if cache_file.exists():
            cache_file.unlink(missing_ok=True)

        self.storage.merge_pr(pr_id)

        if original_branch in branch_names:
            repo.heads[original_branch].checkout(force=True)

        return {"success": True, "main_updated": True}
