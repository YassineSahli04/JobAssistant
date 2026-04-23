from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any


class ProfileStore:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parent / "data"
        base_dir.mkdir(parents=True, exist_ok=True)
        self._path = base_dir / "profiles.json"
        self._lock = Lock()

    def get(self, user_id: str) -> dict[str, Any]:
        data = self._read_all()
        profile = data.get(user_id)
        return profile if isinstance(profile, dict) else {}

    def upsert(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            data = self._read_all()
            current = data.get(user_id)
            if not isinstance(current, dict):
                current = {}

            current.update(payload)
            data[user_id] = current
            self._write_all(data)
            return current

    def _read_all(self) -> dict[str, Any]:
        if not self._path.exists():
            return {}

        try:
            loaded = json.loads(self._path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

        return loaded if isinstance(loaded, dict) else {}

    def _write_all(self, data: dict[str, Any]) -> None:
        self._path.write_text(json.dumps(data, indent=2, ensure_ascii=True), encoding="utf-8")


profile_store = ProfileStore()
