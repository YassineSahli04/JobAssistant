from supabase import create_client
import os
from datetime import datetime, timezone
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()



def _normalize_supabase_url(raw_url: str) -> str:
    """Accept either project URL or REST URL and normalize to project base URL."""
    parsed = urlparse(raw_url.strip())
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return raw_url.rstrip("/")

class Supabase:
    def __init__(self) -> None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL or SUPABASE_SECRET_KEY are not defined.")
        self.supabase = create_client(_normalize_supabase_url(url), key)

    def insert_resume(self, data: dict):
        return self.supabase.table("resumes").insert(data).execute()

    def ensure_user(self, user_id: str, full_name: str | None = None):
        existing = (
            self.supabase.table("users")
            .select("id")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing
        display_name = (full_name or "").strip() or f"User {user_id[:8]}"
        return self.supabase.table("users").insert({"id": user_id, "full_name": display_name}).execute()

    def upsert_user_profile(self, user_id: str, profile: dict):
        """
        users table   → full_name, email, phone, location
        profiles table → everything else (linkedin lives here as linkedin_profile)
        """

        # ── 1. users ──────────────────────────────────────────────────────────
        existing_user = (
            self.supabase.table("users")
            .select("full_name")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        existing_full_name = ""
        if existing_user.data:
            existing_full_name = str(existing_user.data[0].get("full_name") or "").strip()

        incoming_full_name = str(profile.get("full_name") or "").strip()
        full_name = incoming_full_name or existing_full_name or f"User {user_id[:8]}"
        users_payload: dict = {"id": user_id, "full_name": full_name}

        # Only columns that actually exist in users
        for key in ("email", "phone", "location"):
            value = profile.get(key)
            if value is not None:
                users_payload[key] = value

        try:
            self.supabase.table("users").upsert(users_payload, on_conflict="id").execute()
        except Exception as e:
            print(f"[db_client] users upsert failed (keys={list(users_payload.keys())}): {e}. Retrying minimal.")
            self.supabase.table("users").upsert({"id": user_id, "full_name": full_name}, on_conflict="id").execute()

        # ── 2. profiles ───────────────────────────────────────────────────────
        # Maps (frontend/pydantic key, profiles column)
        # Use a list so alias pairs are processed in order and the first write wins.
        profiles_field_map: list[tuple[str, str]] = [
            ("work_experience",         "work_experience"),
            ("skills",                  "skills"),
            ("desired_job_type",        "desired_job_type"),
            ("employment_type",         "desired_job_type"),   # alias — won't overwrite
            ("preferred_industry",      "preferred_industry"),
            ("linkedin",                "linkedin_profile"),
            ("current_job_title",       "current_job"),
            ("years_of_experience",     "experience_years"),
            ("summary",                 "prof_summary"),
            ("desired_job_title",       "desired_job"),
            ("salary_range",            "salary_range"),
            ("preferred_work_location", "preferred_location"),
            ("preferred_industries",    "preferred_industries"),
        ]

        profile_payload: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}

        for frontend_key, column in profiles_field_map:
            value = profile.get(frontend_key)
            if value is not None and column not in profile_payload:
                profile_payload[column] = value

        if set(profile_payload.keys()) == {"updated_at"}:
            return {"message": "users updated; no profile fields to persist"}

        errors: list[str] = []
        for id_key, conflict_key in (("user_id", "user_id"), ("id", "id")):
            row = {id_key: user_id, **profile_payload}
            try:
                return self.supabase.table("profiles").upsert(row, on_conflict=conflict_key).execute()
            except Exception as e:
                errors.append(f"[{id_key}/{conflict_key}] {e}")

        raise RuntimeError("Failed to persist profile: " + " | ".join(errors))

    def get_user_profile(self, user_id: str) -> dict:
        """Merge users + profiles into one dict for the given user_id."""

        # users columns that actually exist (no linkedin here)
        user_row = (
            self.supabase.table("users")
            .select("id, full_name, email, phone, location")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        # profiles holds linkedin as linkedin_profile
        profile_row = (
            self.supabase.table("profiles")
            .select(
                "work_experience, skills, desired_job_type, preferred_industry, "
                "linkedin_profile, current_job, experience_years, prof_summary, "
                "desired_job, salary_range, preferred_location, preferred_industries, "
                "updated_at"
            )
            .or_(f"user_id.eq.{user_id},id.eq.{user_id}")
            .limit(1)
            .execute()
        )

        user_data: dict = user_row.data[0] if user_row.data else {}
        profile_data: dict = profile_row.data[0] if profile_row.data else {}

        return {**user_data, **profile_data}

    def get_resumes_by_user(self, user_id: str):
        return self.supabase.table("resumes").select("file_path").eq("user_id", user_id).execute()

    def delete_resumes_by_user(self, user_id: str):
        return self.supabase.table("resumes").delete().eq("user_id", user_id).execute()
    
    # User management methods
    def create_user(self, data: dict):
        return self.supabase.table("users").insert(data).execute()

    def get_user(self, user_id: str):
        return self.supabase.table("users").select("*").eq("id", user_id).execute()

    def update_user(self, user_id: str, data: dict):
        return self.supabase.table("users").update(data).eq("id", user_id).execute()

    def delete_user(self, user_id: str):
        return self.supabase.table("users").delete().eq("id", user_id).execute()

    # Profile management methods
    def create_profile(self, data: dict):
        return self.supabase.table("profiles").insert(data).execute()

    def get_profile_by_user(self, user_id: str):
        return self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()

    def update_profile(self, profile_id: str, data: dict):
        return self.supabase.table("profiles").update(data).eq("id", profile_id).execute()

    def delete_profile(self, profile_id: str):
        return self.supabase.table("profiles").delete().eq("id", profile_id).execute()


_instance: Supabase | None = None


def get_db() -> Supabase:
    global _instance
    if _instance is None:
        _instance = Supabase()
    return _instance