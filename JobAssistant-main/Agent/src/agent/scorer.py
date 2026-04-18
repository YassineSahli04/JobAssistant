"""Resume scoring logic using Gemini 2.5 Flash (its free) .

This module exposes a single public function, `score_resume`, which:
  1. Formats the resume and job description into the scorer prompt.
  2. Calls Gemini 2.5 Flash via LangChain (automatically traced by LangSmith).
  3. Parses and returns the structured JSON assessment.

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
import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import RESUME_SCORER_SYSTEM, RESUME_SCORER_USER_TEMPLATE

logger = logging.getLogger(__name__)

_GEMINI_PRIMARY  = "gemini-2.5-flash"
_GEMINI_FALLBACK = "gemini-3.1-flash-lite-preview"

# Lazily initialised — created on first call so that importing this module does
# not require GOOGLE_API_KEY to be set (unit tests never call score_resume).
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


async def _invoke_with_resilience(messages: list) -> object:
    """Call primary model with retry on 503; fall back to secondary on 429 or exhausted retries.

    Retry schedule for 503: 1 s → 2 s → give up → fallback.
    429 skips retries entirely and goes straight to the fallback.
    """
    primary  = _get_primary()
    fallback = _get_fallback()

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


async def score_resume(jd_text: str, resume_text: str) -> dict:
    """Score a resume against a job description using Gemini 2.5 Flash.

    Args:
        jd_text: Clean job description text (output of ``scrape_job_description``).
        resume_text: The candidate's resume as plain text.

    Returns:
        Parsed assessment dict matching the resume scorer output schema:
            {
                "match_score":      int,          # 0–100
                "matched_skills":   list[str],
                "missing_skills":   list[str],
                "experience_gap":   str,
                "top_improvements": list[dict],   # action / reason / priority
                "summary":          str,
            }

    Raises:
        ValueError: If the LLM response cannot be parsed as valid JSON dict.
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

    response = await _invoke_with_resilience(messages)
    return _parse_json(_extract_text(response.content))


# ── Helpers ───────────────────────────────────────────────────────────────────


def _extract_text(content: str | list) -> str:
    """Normalise LLM response content to a plain string.

    Most models return content as a str. Some (e.g. gemini-3.1-flash-lite-preview)
    return a list of content parts: [{"type": "text", "text": "..."}].
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            part["text"] if isinstance(part, dict) and "text" in part else str(part)
            for part in content
        )
    return str(content)


def _parse_json(raw: str) -> dict:
    """Strip optional markdown fences and parse JSON from an LLM response.

    Some models wrap their output in ```json ... ``` blocks despite being
    instructed not to. This function handles both the clean and wrapped cases.

    Args:
        raw: Raw string content from the LLM response.

    Returns:
        Parsed JSON as a dict.

    Raises:
        ValueError: If the cleaned string is not valid JSON.
    """
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM returned non-JSON output. First 200 chars: {raw[:200]!r}"
        ) from exc

    if not isinstance(parsed, dict):
        raise ValueError(
            f"LLM returned valid JSON but not an object (got {type(parsed).__name__}). "
            f"First 200 chars: {raw[:200]!r}"
        )

    return parsed
