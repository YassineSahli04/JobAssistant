from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()  # Loads API keys from .env file

class Supabase:
    def __init__(self) -> None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL or SUPABASE_SECRET_KEY are not defined.")
        self.supabase = create_client(url, key)

    def insert_resume(self, data: dict):
        """Insert resume metadata into the 'resumes' table."""
        return self.supabase.table("resumes").insert(data).execute()

    def get_resumes_by_user(self, user_id: str):
        return self.supabase.table("resumes").select("file_path").eq("user_id", user_id).execute()

    def get_latest_resume_record(self, user_id: str):
        return (
            self.supabase.table("resumes")
            .select("file_path, original_filename, mime_type, parsed_text, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

    def delete_resumes_by_user(self, user_id: str):
        return self.supabase.table("resumes").delete().eq("user_id", user_id).execute()

_instance: Supabase | None = None

def get_db() -> Supabase:
    global _instance
    if _instance is None:
        _instance = Supabase()
    return _instance
