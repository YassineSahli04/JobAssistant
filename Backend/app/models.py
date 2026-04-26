from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)


class UserResponse(BaseModel):
    id: str
    full_name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileCreate(BaseModel):
    work_experience: list[str] | str = Field(...)
    skills: list[str] | str = Field(...)
    desired_job_type: str = Field(..., min_length=1)
    preferred_industry: str = Field(..., min_length=1)


class ProfileUpdate(BaseModel):
    work_experience: Optional[list[str] | str] = Field(None)
    skills: Optional[list[str] | str] = Field(None)
    desired_job_type: Optional[str] = Field(None, min_length=1)
    preferred_industry: Optional[str] = Field(None, min_length=1)


class UserProfileUpdate(BaseModel):
    """Full profile update sent by the frontend — spans both users and profiles tables."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    current_job_title: Optional[str] = None
    years_of_experience: Optional[str] = None
    summary: Optional[str] = None
    desired_job_title: Optional[str] = None
    desired_job_type: Optional[str] = None
    employment_type: Optional[str] = None
    salary_range: Optional[str] = None
    preferred_work_location: Optional[str] = None
    preferred_industry: Optional[str] = None
    preferred_industries: Optional[str] = None
    work_experience: Optional[list[str]] = None
    skills: Optional[list[str]] = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    work_experience: list[str] | str
    skills: list[str] | str
    desired_job_type: str
    preferred_industry: str
    updated_at: datetime

    class Config:
        from_attributes = True
