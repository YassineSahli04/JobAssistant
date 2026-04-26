import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..database.db_client import Supabase, get_db
from ..helper import Helper
from ..user import User

router = APIRouter()

AGENT_BASE_URL = os.getenv("AGENT_BASE_URL", "http://localhost:8001")

class ScoreRequest(BaseModel):
    job_url: str


class TailorAnswerRequest(BaseModel):
    job_url: str
    user_question: str


class UserProfileRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    current_job_title: str | None = None
    years_of_experience: str | None = None
    summary: str | None = None
    desired_job_title: str | None = None
    desired_job_type: str | None = None
    salary_range: str | None = None
    preferred_work_location: str | None = None
    employment_type: str | None = None
    preferred_industry: str | None = None
    preferred_industries: str | None = None
    work_experience: list[str] | None = None
    skills: list[str] | None = None


@router.get("/{user_id}/profile")
def get_profile(user_id: str, db: Supabase = Depends(get_db)):
    """Return merged users + profiles data for the given user_id."""
    return db.get_user_profile(user_id)


@router.get("/{user_id}/resume")
def get_resume_text(user_id: str, db: Supabase = Depends(get_db)):
    user = User(user_id)
    file_name, file_bytes, mimetype = user.get_latest_resume(db)
    if not file_name or not file_bytes or not mimetype:
        raise HTTPException(status_code=404, detail="No resume found for this user.")
    try:
        return {"text": Helper.parse_resume_text(file_bytes, mimetype)}
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract text from stored resume. Re-upload a searchable PDF or DOCX file. ({str(e)})",
        )


@router.post("/{user_id}/score")
async def score_resume(user_id: str, body: ScoreRequest):
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.post(
                f"{AGENT_BASE_URL}/score",
                params={"user_id": user_id},
                json={"job_url": body.job_url},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Agent unreachable: {e}")
    return response.json()


@router.put("/{user_id}/profile")
def upsert_profile(user_id: str, body: UserProfileRequest, db: Supabase = Depends(get_db)):
    try:
        db.upsert_user_profile(user_id, body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile save failed: {str(e)}")
    return {"message": "Profile saved", "user_id": user_id}


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = None,
    db: Supabase = Depends(get_db),
):
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only searchable PDF and DOCX files are allowed",
        )
    if not user_id:
        user_id = str(uuid.uuid4())
    file_path = f"{user_id}/{file.filename}"
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        db.supabase.storage.from_("Resumes").remove([file_path])
    except Exception:
        pass

    existing = db.get_resumes_by_user(user_id)
    if existing.data:
        old_paths: list[str] = [
            str(r["file_path"]) for r in existing.data if r.get("file_path")
        ]
        try:
            db.supabase.storage.from_("Resumes").remove(old_paths)
        except Exception:
            pass
        db.delete_resumes_by_user(user_id)

    try:
        db.supabase.storage.from_("Resumes").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    try:
        parsed_text = Helper.parse_resume_text(file_bytes, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract text from resume. Upload a searchable PDF or DOCX file. ({str(e)})",
        )

    resume_data = {
        "user_id": user_id,
        "file_path": file_path,
        "original_filename": file.filename,
        "mime_type": file.content_type,
        "parsed_text": parsed_text,
    }
    try:
        db.ensure_user(user_id)
        db.insert_resume(resume_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    return {
        "message": "Upload successful",
        "file_path": file_path,
        "user_id": user_id,
    }


@router.post("/{user_id}/answer")
async def tailor_answer(user_id: str, body: TailorAnswerRequest):
    """Forward the tailored answer request to the agent."""
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.post(
                f"{AGENT_BASE_URL}/answer",
                params={"user_id": user_id},
                json={"job_url": body.job_url, "user_question": body.user_question},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Agent error: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Agent unreachable: {e}")

    return response.json()