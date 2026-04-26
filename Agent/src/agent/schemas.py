"""Data contracts for the agent's inputs and outputs."""

from __future__ import annotations

from typing import List
from typing_extensions import Literal
from pydantic import BaseModel, Field


# ── Resume Scorer output ───────────────────────────────────────────────────────

class Improvement(BaseModel):
    action: str = Field(description="Verb phrase — what to add or change in the resume")
    reason: str = Field(description="One sentence — why it matters for this JD")
    priority: Literal["high", "medium", "low"]


class ScoreResult(BaseModel):
    match_score: int = Field(ge=0, le=100, description="Overall match percentage (0–100)")
    matched_skills: List[str] = Field(description="Skills present in both resume and JD")
    missing_skills: List[str] = Field(description="Skills present in JD but absent from resume")
    experience_gap: str = Field(description="One sentence on seniority or years delta")
    top_improvements: List[Improvement] = Field(description="1–5 actionable improvements, ordered by priority")
    summary: str = Field(description="Two sentences: strongest match signal, then biggest gap")


# ── Tailored Answer output ─────────────────────────────────────────────────────

class TailorAnswerResult(BaseModel):
    answer: str = Field(description="Personalised answer in first person, ≤250 words")


# ── Agent input contract ───────────────────────────────────────────────────────

class UserProfileInput(BaseModel):
    """Fields the agent reads from the user profile to perform analysis."""
    resume_text: str = Field(description="Full resume as plain text")
    work_history: str = Field(description="Roles, companies, and years of experience")
    skills: List[str] = Field(default_factory=list, description="Technical and soft skills")
    education: str = Field(default="", description="Degrees, institutions, and graduation years")
