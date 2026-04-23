import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from ..database.db_client import Supabase, get_db
from ..helper import Helper
from ..profile_store import profile_store
from ..user import User

router = APIRouter()

AGENT_BASE_URL = os.getenv("AGENT_BASE_URL", "http://localhost:8001")

class ScoreRequest(BaseModel):
    job_url: str


class TailorAnswerRequest(BaseModel):
    job_url: str
    user_question: str


class UserProfilePayload(BaseModel):
    fullName: str = ""
    email: str = ""
    dateOfBirth: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    workExperience: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    employmentType: str = ""
    preferredIndustry: str = ""
    currentJobTitle: str = ""
    yearsOfExperience: str = ""
    summary: str = ""
    desiredJobTitle: str = ""
    salaryRange: str = ""
    preferredWorkLocation: str = ""
    preferredIndustries: str = ""
    profileSaved: bool = False
    onboardingCompleted: bool = False


@router.get("/{user_id}/profile")
def get_profile(user_id: str):
    return profile_store.get(user_id)


@router.put("/{user_id}/profile")
def save_profile(user_id: str, body: UserProfilePayload):
    return profile_store.upsert(user_id, body.model_dump(exclude_unset=True))


@router.get("/{user_id}/resume")
def get_resume_text(user_id: str, db: Supabase = Depends(get_db)):
    latest_resume = db.get_latest_resume_record(user_id)
    if latest_resume.data:
        record = latest_resume.data[0]
        parsed_text = record.get("parsed_text")
        if isinstance(parsed_text, str) and parsed_text.strip():
            return {"text": parsed_text}

    user = User(user_id)
    file_name, file_bytes, mimetype = user.get_latest_resume(db)
    if not file_name or not file_bytes or not mimetype:
        raise HTTPException(status_code=404, detail="No resume found for this user.")
    try:
        return {"text": Helper.parse_resume_text(file_bytes, mimetype)}
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{str(e)} Please upload a text-based PDF or DOCX file. "
                "Scanned/image-only resumes cannot be analyzed yet."
            ),
        )


@router.get("/{user_id}/resume-metadata")
def get_resume_metadata(user_id: str, db: Supabase = Depends(get_db)):
    latest_resume = db.get_latest_resume_record(user_id)
    if latest_resume.data:
        record = latest_resume.data[0]
        return {
            "file_name": record.get("original_filename") or record.get("file_path"),
            "file_path": record.get("file_path"),
        }

    raise HTTPException(status_code=404, detail="No resume found for this user.")


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

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = None,
    db: Supabase = Depends(get_db)
):
    allowed_types = [
        "application/pdf",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # .docx
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and Word documents (.doc, .docx) are allowed"
        )
    if not user_id:
        user_id = str(uuid.uuid4())
    file_path = f"{user_id}/{file.filename}"
    file_bytes = await file.read()

    # Empty file validation
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        parsed_text = Helper.parse_resume_text(file_bytes, file.content_type)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{str(e)} Please upload a text-based PDF or DOCX file. "
                "Scanned/image-only resumes cannot be analyzed yet."
            ),
        )

    existing = db.get_resumes_by_user(user_id)
    if existing.data:
        old_paths: list[str] = [str(r["file_path"]) for r in existing.data if r.get("file_path")]  # type: ignore[union-attr]
        try:
            db.supabase.storage.from_("Resumes").remove(old_paths)
        except Exception:
            pass
        db.delete_resumes_by_user(user_id)

    try:
        db.supabase.storage.from_("Resumes").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    resume_data = {
        "user_id": user_id,
        "file_path": file_path,
        "original_filename": file.filename,
        "mime_type": file.content_type,
        "parsed_text": parsed_text
    }
    try:
        db.insert_resume(resume_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")
    return {
        "message": "Upload successful",
        "file_path": file_path,
        "user_id": user_id
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
