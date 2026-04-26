"""Tailored answer generation using Gemini 2.5 Flash."""

from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import TAILORED_ANSWER_SYSTEM, TAILORED_ANSWER_USER_TEMPLATE
from agent.schemas import TailorAnswerResult

logger = logging.getLogger(__name__)

_GEMINI_PRIMARY = "gemini-2.5-flash"
_GEMINI_FALLBACK = "gemini-3.1-flash-lite-preview"

_primary_llm: ChatGoogleGenerativeAI | None = None
_fallback_llm: ChatGoogleGenerativeAI | None = None


def _get_primary() -> ChatGoogleGenerativeAI:
    global _primary_llm
    if _primary_llm is None:
        _primary_llm = ChatGoogleGenerativeAI(model=_GEMINI_PRIMARY, request_timeout=60)
    return _primary_llm


def _get_fallback() -> ChatGoogleGenerativeAI:
    global _fallback_llm
    if _fallback_llm is None:
        _fallback_llm = ChatGoogleGenerativeAI(model=_GEMINI_FALLBACK, request_timeout=60)
    return _fallback_llm


async def tailor_answer_question(jd_text: str, resume_text: str, user_question: str) -> TailorAnswerResult:
    """Generate a tailored interview answer grounded in the resume and job description.

    Args:
        jd_text: Clean job description text.
        resume_text: The candidate's resume as plain text.
        user_question: The interview or job-related question to answer.

    Returns:
        A TailorAnswerResult with the personalised answer as plain text.

    Raises:
        RuntimeError: If both primary and fallback models fail.
    """
    messages = [
        SystemMessage(content=TAILORED_ANSWER_SYSTEM),
        HumanMessage(
            content=TAILORED_ANSWER_USER_TEMPLATE.format(
                resume_text=resume_text,
                jd_text=jd_text,
                user_question=user_question,
            )
        ),
    ]

    primary = _get_primary()
    fallback = _get_fallback()

    try:
        response = await primary.ainvoke(messages)
    except Exception as primary_exc:
        logger.warning("Primary model failed (%s) — switching to fallback.", primary_exc)
        try:
            response = await fallback.ainvoke(messages)
        except Exception as fallback_exc:
            raise RuntimeError(
                f"Both models failed.\n"
                f"  Primary  ({_GEMINI_PRIMARY}):  {primary_exc}\n"
                f"  Fallback ({_GEMINI_FALLBACK}): {fallback_exc}"
            ) from fallback_exc

    content = response.content
    if isinstance(content, list):
        content = "".join(
            part["text"] if isinstance(part, dict) and "text" in part else str(part)
            for part in content
        )
    return TailorAnswerResult(answer=str(content).strip())
