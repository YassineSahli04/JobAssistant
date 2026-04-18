from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from Backend.database.db_client import Supabase, get_db
from Backend.user import User
from Backend.helper import Helper
import uuid

router = APIRouter()

# Existing GET endpoint – unchanged
@router.get("/{user_id}/resume")
def get_resume_text(user_id: str, db: Supabase = Depends(get_db)):
    user = User(user_id)
    file_name, file_bytes, mimetype = user.get_latest_resume(db)
    if not file_name or not file_bytes or not mimetype:
        raise HTTPException(status_code=404, detail="No resume found for this user.")
    try:
        return {"text": Helper.parse_resume_text(file_bytes, mimetype)}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

# NEW POST endpoint – upload resume
@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = None,
    db: Supabase = Depends(get_db)
):
    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # 2. Assign user_id if missing (for unregistered users)
    if not user_id:
        user_id = str(uuid.uuid4())
    
    # 3. Define storage path
    file_path = f"{user_id}/{file.filename}"
    
    # 4. Read file content
    file_bytes = await file.read()
    
    # 5. Upload to Supabase Storage (bucket "resumes")
    try:
        db.supabase.storage.from_("Resumes").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    
    # 6. Extract text from PDF (optional, for future use)
    try:
        parsed_text = Helper.parse_resume_text(file_bytes, file.content_type)
    except Exception:
        parsed_text = None
    
    # 7. Prepare metadata
    resume_data = {
        "user_id": user_id,
        "file_path": file_path,
        "original_filename": file.filename,
        "mime_type": file.content_type,
        "parsed_text": parsed_text
    }
    
    # 8. Insert into database
    try:
        db.insert_resume(resume_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")
    
    # 9. Return success
    return {
        "message": "Upload successful",
        "file_path": file_path,
        "user_id": user_id
    }