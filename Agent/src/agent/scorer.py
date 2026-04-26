"""Resume scoring logic using Gemini 2.5 Flash (its free) .

This module exposes a single public function, `score_resume`, which:
  1. Formats the resume and job description into the scorer prompt.
  2. Calls Gemini 2.5 Flash via LangChain with structured output enforced.
  3. Returns a validated ScoreResult — no manual parsing needed.

Resilience strategy:
  - 503 UNAVAILABLE : retry primary up to 3 times with exponential backoff.
  - 429 RESOURCE_EXHAUSTED : skip retries, switch to fallback model immediately.
  - Fallback fails : raise a RuntimeError describing both failures.

Note: langchain-google-genai wraps google.api_core exceptions in its own types,
so exception detection is done via string matching on the error message rather
than isinstance checks, which would silently never match.
"""

from __future__ import annotations

import asyncio
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import RESUME_SCORER_SYSTEM, RESUME_SCORER_USER_TEMPLATE
from agent.schemas import ScoreResult

logger = logging.getLogger(__name__)

_GEMINI_PRIMARY  = "gemini-2.5-flash"
_GEMINI_FALLBACK = "gemini-3.1-flash-lite-preview"

# Lazily initialised — created on first call so that importing this module does not require GOOGLE_API_KEY to be set (unit tests never call score_resume).
_primary_llm:  ChatGoogleGenerativeAI | None = None
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


def _is_rate_limit(exc: Exception) -> bool:
    """Return True if exc is a 429 / RESOURCE_EXHAUSTED error."""
    s = str(exc)
    return "429" in s or "RESOURCE_EXHAUSTED" in s


def _is_unavailable(exc: Exception) -> bool:
    """Return True if exc is a 503 / UNAVAILABLE error."""
    s = str(exc)
    return "503" in s or "UNAVAILABLE" in s


async def _invoke_scored(messages: list) -> ScoreResult:
    """Call primary model with structured output; retry on 503, fall back on 429.

    with_structured_output forces Gemini to return data matching ScoreResult
    via function-calling — no string parsing or manual field validation needed.

    Retry schedule for 503: 1 s → 2 s → give up → fallback.
    429 skips retries entirely and goes straight to the fallback.
    """
    primary  = _get_primary().with_structured_output(ScoreResult)
    fallback = _get_fallback().with_structured_output(ScoreResult)
    last_exc: Exception | None = None

    for attempt in range(3):
        try:
            return await primary.ainvoke(messages)
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit(exc):
                logger.warning("Primary model rate-limited (429) — switching to fallback immediately.")
                break
            elif _is_unavailable(exc):
                if attempt < 2:
                    wait = 2 ** attempt  # 1 s, then 2 s
                    logger.warning("Primary model unavailable (503), retrying in %ds… (attempt %d/3)", wait, attempt + 1)
                    await asyncio.sleep(wait)
                else:
                    logger.warning("Primary model still unavailable after 3 attempts — switching to fallback.")
            else:
                logger.warning("Unexpected error from primary model (%s) — switching to fallback.", exc)
                break

    logger.info("Invoking fallback model: %s", _GEMINI_FALLBACK)
    try:
        return await fallback.ainvoke(messages)
    except Exception as fallback_exc:
        raise RuntimeError(
            f"Both models failed.\n"
            f"  Primary  ({_GEMINI_PRIMARY}):  {last_exc}\n"
            f"  Fallback ({_GEMINI_FALLBACK}): {fallback_exc}"
        ) from fallback_exc


async def score_resume(jd_text: str, resume_text: str) -> ScoreResult:
    """Score a resume against a job description using Gemini 2.5 Flash.

    Args:
        jd_text: Clean job description text (output of ``scrape_job_description``).
        resume_text: The candidate's resume as plain text.

    Returns:
        A validated ScoreResult instance with all fields guaranteed present and typed.

    Raises:
        ValidationError: If the LLM response does not conform to ScoreResult schema.
        RuntimeError: If both primary and fallback models fail.
    """
    messages = [
        SystemMessage(content=RESUME_SCORER_SYSTEM),
        HumanMessage(
            content=RESUME_SCORER_USER_TEMPLATE.format(
                resume_text=resume_text,
                jd_text=jd_text,
            )
        ),
    ]
    return await _invoke_scored(messages)
