from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from Backend.database.db_client import Supabase


class User:
    BUCKET_NAME = "Resumes"
    SUPPORTED_RESUME_MIMETYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    def __init__(self, user_id: str) -> None:
        self.user_id = user_id

    def get_latest_resume(self, db: Supabase) -> tuple[str, bytes, str] | tuple[None, None, None]:
        files = db.supabase.storage.from_(self.BUCKET_NAME).list(self.user_id)

        files = [
            f for f in files
            if f.get("metadata", {}).get("mimetype") in self.SUPPORTED_RESUME_MIMETYPES
        ]

        latest = max(files, key=lambda f: f["created_at"], default=None)
        if not latest:
            return None, None, None

        file_name = latest["name"]
        mimetype = latest["metadata"]["mimetype"]
        file_bytes = db.supabase.storage.from_(self.BUCKET_NAME).download(
            f"{self.user_id}/{file_name}"
        )
        return file_name, file_bytes, mimetype
