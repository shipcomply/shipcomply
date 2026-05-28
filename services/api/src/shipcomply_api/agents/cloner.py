from shipcomply_api.observability.langfuse import traced
"""Cloner agent — validates repo_url, git-clones to /tmp, records commit SHA."""
from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path

from .state import ScanState

log = logging.getLogger(__name__)

MAX_REPO_SIZE_MB = int(os.environ.get("MAX_REPO_SIZE_MB", "500"))

# Persistent temp dir registry per scan so callers can clean up
_CLONE_DIRS: dict[str, tempfile.TemporaryDirectory] = {}  # type: ignore[type-arg]


@traced("cloner")
def cloner_node(state: ScanState) -> dict:
    scan_id = state["scan_id"]
    repo_url = state["repo_url"]
    branch = state["branch"]

    try:
        tmp_obj = tempfile.TemporaryDirectory(prefix=f"shipcomply-{scan_id}-")
        _CLONE_DIRS[scan_id] = tmp_obj
        tmp = tmp_obj.name

        result = subprocess.run(
            ["git", "clone", "--depth=1", "--branch", branch, "--", repo_url, tmp],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            stderr = result.stderr[:500]
            if "permission denied" in stderr.lower() or "authentication failed" in stderr.lower() or "not found" in stderr.lower():
                raise RuntimeError(f"PRIVATE_REPO: {stderr}")
            raise RuntimeError(f"git clone failed: {stderr}")

        size_result = subprocess.run(["du", "-sb", tmp], capture_output=True, text=True, timeout=30)
        if size_result.returncode == 0:
            size_mb = int(size_result.stdout.split()[0]) / (1024 * 1024)
            if size_mb > MAX_REPO_SIZE_MB:
                raise RuntimeError(f"Repo too large: {size_mb:.0f} MB exceeds limit of {MAX_REPO_SIZE_MB} MB")

        sha_result = subprocess.run(
            ["git", "-C", tmp, "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        commit_sha = sha_result.stdout.strip() or "unknown"

        file_list = [str(p) for p in Path(tmp).rglob("*") if p.is_file()]

        return {
            "repo_path": tmp,
            "commit_sha": commit_sha,
            "file_list": file_list,
            "step_log": [{"agent": "cloner", "status": "ok", "message": f"cloned {repo_url}@{branch}"}],
            "errors": [],
        }
    except Exception as exc:
        log.error("cloner_node failed scan=%s: %s", scan_id, exc)
        return {
            "repo_path": None,
            "commit_sha": None,
            "file_list": [],
            "step_log": [{"agent": "cloner", "status": "error", "message": str(exc)}],
            "errors": [str(exc)],
            "final_status": "failed",
        }


def cleanup_clone(scan_id: str) -> None:
    obj = _CLONE_DIRS.pop(scan_id, None)
    if obj:
        try:
            obj.cleanup()
        except Exception:
            pass

