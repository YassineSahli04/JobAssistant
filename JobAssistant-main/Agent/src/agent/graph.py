"""Resume Scorer Agent — LangGraph pipeline.

Two-node workflow:
    scrape_job -> run_scorer

    1. scrape_job : Fetches and cleans the job info from the given URL.
    2. run_scorer : Sends the resume + job description to Gemini 2.5 Flash and returns a structured JSON assessment.

Example usage::
    result = await graph.ainvoke({
        "job_url": "https://www.linkedin.com/jobs/view/...",
        "resume_text": "Jane Doe | ...",
    })
    score = result["score_result"]  # dict matching the scorer output schema
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict

from langgraph.graph import StateGraph

from agent.scraper import scrape_job_description
from agent.scorer import score_resume


# ── State ─────────────────────────────────────────────────────────────────────


@dataclass
class State:
    """Agent state.

    Input fields are provided at invocation time.
    Output fields are populated by the nodes during execution.

    Attributes:
        job_url: Full URL of the job posting to analyse.
        resume_text: Candidate resume as plain text.
        job_description: Scraped and cleaned job description (set by scrape_job).
        score_result: Structured JSON assessment from the LLM (set by run_scorer).
    """

    # ── inputs (required at invoke time) ──────────────────────────────────────
    job_url: str
    resume_text: str

    # ── outputs (populated during execution) ──────────────────────────────────
    job_description: str = ""
    score_result: dict = field(default_factory=dict)


# ── Nodes ─────────────────────────────────────────────────────────────────────


async def scrape_job(state: State) -> Dict[str, Any]:
    """Fetch and clean the job description from the posting URL."""
    # scrape_job_description is synchronous and blocks I/O (network + Playwright). Run it in a thread pool so it does not block the event loop.
    # LinkedIn collection-URL normalisation (currentJobId -> /jobs/view/) is handled internally by the scraper's _extract_linkedin_job_id helper.
    jd_text = await asyncio.to_thread(scrape_job_description, state.job_url)
    return {"job_description": jd_text}


async def run_scorer(state: State) -> Dict[str, Any]:
    """Score the resume against the scraped job description."""
    result = await score_resume(
        jd_text=state.job_description,
        resume_text=state.resume_text,
    )
    return {"score_result": result}


# ── Graph ─────────────────────────────────────────────────────────────────────

graph = (
    StateGraph(State)
    .add_node(scrape_job)
    .add_node(run_scorer)
    .add_edge("__start__", "scrape_job")
    .add_edge("scrape_job", "run_scorer")
    .compile(name="Resume Scorer")
)
