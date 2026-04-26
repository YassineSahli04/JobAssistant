"""FastAPI server exposing the Resume Scorer agent over HTTP."""

from __future__ import annotations

import logging

from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI, HTTPException

logger = logging.getLogger(__name__)
from pydantic import BaseModel

from agent.graph import create_graph
from agent.schemas import ScoreResult, TailorAnswerResult
from agent.state import State, RequestType

load_dotenv(find_dotenv())

app = FastAPI(title="Resume Scorer Agent")

graph = create_graph()


class ScoreRequest(BaseModel):
    job_url: str


class TailorAnswerRequest(BaseModel):
    job_url: str
    user_question: str


@app.post("/score", response_model=ScoreResult)
async def score(user_id: str, body: ScoreRequest):
    """Score the user's saved resume against the given job posting."""
    config = {"configurable": {"thread_id": user_id}}
    try:
        result = await graph.ainvoke(
            State(user_id=user_id, job_url=body.job_url, request_type=RequestType.score),
            config=config, # type: ignore
        )
    except Exception as e:
        logger.exception("Score request failed for user %s", user_id)
        raise HTTPException(status_code=500, detail=str(e))
    return result["score_result"]


@app.post("/answer", response_model=TailorAnswerResult)
async def answer(user_id: str, body: TailorAnswerRequest):
    """Answer a job-related question tailored to the user's resume."""
    config = {"configurable": {"thread_id": user_id}}
    try:
        result = await graph.ainvoke(
            State(user_id=user_id, job_url=body.job_url, user_question=body.user_question, request_type=RequestType.question), # type: ignore
            config=config, # type: ignore
        )
    except Exception as e:
        logger.exception("Answer request failed for user %s", user_id)
        raise HTTPException(status_code=500, detail=str(e))
    return TailorAnswerResult(answer=result["ai_answer"])


@app.get("/health")
def health():
    return {"status": "ok"}
