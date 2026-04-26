from __future__ import annotations

import asyncio
import os
from typing import Any, Dict

import httpx

from agent.scorer import score_resume
from agent.tailor import tailor_answer_question
from agent.tools.scraper import scrape_job_description
from agent.state import State

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")


async def fetch_resume(state: State) -> Dict[str, Any]:
    """Fetch the user's latest resume text from the backend."""
    if not state.get("user_id"):
        raise ValueError("user_id is required")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{BACKEND_BASE_URL}/users/{state['user_id']}/resume")
        resp.raise_for_status()
    data = resp.json()
    if "text" not in data:
        raise ValueError(f"Backend response missing 'text' field: {data}")
    return {"resume_text": data["text"]}


async def scrape_job(state: State) -> Dict[str, Any]:
    """Fetch and clean the job description from the posting URL."""
    jd_text = await asyncio.to_thread(scrape_job_description, state["job_url"])
    return {"job_description": jd_text}


async def run_scorer(state: State) -> Dict[str, Any]:
    """Score the resume against the scraped job description."""
    result = await score_resume(
        jd_text=state["job_description"],
        resume_text=state["resume_text"],
    )
    return {"score_result": result}

async def tailor_answer(state: State) -> Dict[str, Any]:
    result = await tailor_answer_question(
        jd_text=state.get("job_description") or "",
        resume_text=state.get("resume_text") or "",
        user_question=state.get("user_question") or "",
    )
    return {"ai_answer": result.answer}
