# Resume Scorer Agent

Two-node LangGraph pipeline that scrapes a job posting and scores a resume against it using Gemini 2.5 Flash. Every run is automatically traced in LangSmith.

```
scrape_job  →  run_scorer
```

---

## Prerequisites

| Tool | Purpose |
|---|---|
| Docker Desktop | Runs the JupyterLab container |
| [uv](https://docs.astral.sh/uv/) | Updates the Python lock file after dependency changes |
| Google AI Studio key | Gemini 2.5 Flash access (free tier) |
| LangSmith key | Observability dashboard (free tier) |

Install uv if you don't have it:
```bash
brew install uv
```

---

## Setup

**1. Update the lock file** (required whenever `pyproject.toml` changes):
```bash
cd Agent
uv lock
```

**2. Create your `.env` file:**
```bash
cp .env.example .env
```

Fill in the two keys:
```
GOOGLE_API_KEY=       # https://aistudio.google.com/apikey
LANGCHAIN_API_KEY=    # https://smith.langchain.com -> Settings -> API Keys
```

---

## Run

From the project root:
```bash
docker-compose build agent   # only needed after dependency or Dockerfile changes
docker-compose up agent
```

JupyterLab is available at `http://localhost:8888`.

---

## Test

1. Open `notebooks/test_resume_scorer.ipynb` in JupyterLab
2. In **Cell 2**, replace `JOB_URL` with a real job posting URL and optionally update `RESUME_TEXT`
3. Run all cells top to bottom (`Shift+Enter`)
4. The result prints inline; the full trace appears in your LangSmith dashboard under the `resume-scorer` project

---

## Backend Usage

The graph exposes a single async entry-point. The backend calls `graph.ainvoke`, waits for it, and reads `result["score_result"]`. Scraping, the LLM call, and LangSmith tracing are all invisible to the caller.

### Import

```python
from agent.graph import graph          # always import directly from agent.graph
from agent.scraper import ScraperError # catch scraping failures
```

> **Note:** Do **not** use `from agent import graph`. The package `__init__.py` is intentionally empty — re-exporting the graph would force the LLM client to initialise on every import, breaking unit tests that never invoke the scorer.

### Async framework (FastAPI / Starlette)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent.graph import graph
from agent.scraper import ScraperError

app = FastAPI()

class ScoreRequest(BaseModel):
    job_url: str
    resume_text: str

@app.post("/score")
async def score(payload: ScoreRequest) -> dict:
    try:
        result = await graph.ainvoke({
            "job_url": payload.job_url,
            "resume_text": payload.resume_text,
        })
    except ScraperError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ValueError as exc:          # LLM returned malformed JSON
        raise HTTPException(status_code=502, detail=str(exc))

    return result["score_result"]
```

`result` is the final `State` dict. `result["score_result"]` is the structured assessment matching the [Output Schema](#output-schema).

### Sync framework (Flask / Django)

Wrap `ainvoke` with `asyncio.run` if the framework does not provide an async request handler:

```python
import asyncio
from agent.graph import graph

result = asyncio.run(graph.ainvoke({
    "job_url": job_url,
    "resume_text": resume_text,
}))
score = result["score_result"]
```

> Avoid calling `asyncio.run` inside an already-running event loop (e.g. inside a Jupyter cell or an async view). Use `await graph.ainvoke(...)` instead.

### Environment variables required at runtime

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Authenticates Gemini 2.5 Flash. Required when `score_resume` is first called (validated lazily, not at import time). |
| `LANGCHAIN_API_KEY` | Sends traces to LangSmith. Optional — tracing is silently skipped if absent. |
| `LANGCHAIN_TRACING_V2` | Set to `true` to enable LangSmith tracing. |

### Error surface

| Exception | Raised by | Meaning |
|---|---|---|
| `agent.scraper.ScraperError` | `scrape_job` node | URL is invalid, unreachable, or all extraction strategies returned too little text. |
| `ValueError` | `run_scorer` node | Gemini returned a response that could not be parsed as a JSON object. |

---

## Architecture

### Graph flow

```
ainvoke({"job_url": "...", "resume_text": "..."})
         │
         │  scrape_job node
  Calls scrape_job_description(url) via asyncio.to_thread
  -> State.job_description populated
         │
         │  run_scorer node
  Calls score_resume(jd_text, resume_text)
  -> Gemini 2.5 Flash via LangChain (traced by LangSmith)
  -> State.score_result populated
         │
         │
  Returns final State dict
```

### State

| Field | Type | Set by |
|---|---|---|
| `job_url` | `str` | caller (input) |
| `resume_text` | `str` | caller (input) |
| `job_description` | `str` | `scrape_job` node |
| `score_result` | `dict` | `run_scorer` node |

---

## Files Changed

### New files

| File | Purpose |
|---|---|
| `src/agent/prompts.py` | Prompt templates (system prompt + user template) for the resume scorer. Kept separate from logic so prompts can be edited without touching Python code. |
| `src/agent/scorer.py` | Async function that calls Gemini 2.5 Flash via LangChain, parses the JSON response, and returns the structured assessment dict. |
| `notebooks/test_resume_scorer.ipynb` | Interactive test notebook. Define a job URL and resume, run the agent, and inspect the result. |

### Modified files

**`src/agent/graph.py`** — replaced the boilerplate placeholder with the actual agent.
- `State` now has four fields: `job_url` and `resume_text` (inputs) + `job_description` and `score_result` (populated by nodes).
- Two async nodes wired in sequence: `scrape_job` and `run_scorer`.
- `scrape_job_description` is wrapped in `asyncio.to_thread` because it is synchronous and performs blocking I/O (network and Playwright); calling it directly inside an async node would block the event loop.
- `score_resume` is awaited because it is an async function.
- `_normalize_linkedin_url` was removed after a code review found that `scraper.py` already handles URL normalisation internally via `_extract_linkedin_job_id`.

**`src/agent/scorer.py`** — several fixes applied after code review.
- `score_resume` is `async def` and uses `await llm.ainvoke()`. The previous synchronous `llm.invoke()` blocked the event loop during the Gemini API network round-trip.
- `_llm` is now lazily initialised via `_get_llm()` instead of being instantiated at module scope. `ChatGoogleGenerativeAI.__init__` validates `GOOGLE_API_KEY` immediately, so a module-level instance caused every import of the package to crash in environments without the key set (e.g. unit tests, CI). The lazy pattern defers that validation to the first actual call to `score_resume`. The single-instance / transport-reuse benefit is preserved — the client is still created once and cached.
- `_parse_json` now validates that the parsed result is a `dict` before returning. Previously, valid JSON that was not an object (e.g. a JSON array) would pass through silently and crash downstream with a confusing `TypeError`.

**`src/agent/__init__.py`** — removed the `from agent.graph import graph` re-export; file is now a bare package marker.
- The re-export caused `from agent.scraper import ...` to silently load the full chain (was pulling the entire graph at import time, which returned a validation error when running unit tests): `graph → scorer → LLM client`. Any import from the `agent` package — even the scraper — would trigger `GOOGLE_API_KEY` validation and load LangGraph and LangChain into memory.
- Removing it enforces true module independence: importing `agent.scraper` loads only the scraper. The downside is that `from agent import graph` no longer works; callers must use `from agent.graph import graph` directly, which is more explicit about where the object lives.
- We could use the old `from agent.graph import graph` to allow `from agent import graph`, but that would load LangGraph, LangChain and the LLM client even if only `agent.scraper` was imported 

**`pyproject.toml`** — added `langchain-google-genai>=2.0.0`.
- Required to call Gemini via LangChain. Using LangChain (rather than the raw Google SDK) gives automatic LangSmith tracing with zero extra code.

**`.env.example`** — added `GOOGLE_API_KEY` and `LANGCHAIN_API_KEY` / `LANGCHAIN_TRACING_V2`.
- Documents all keys the agent needs to run.

**`Dockerfile`** — fixed a build-ordering bug.
- `uv sync` was running before `src/agent/` was copied into the image, so setuptools could not find the package directory and the build failed.
- Fix: split into two stages — `uv sync --no-install-project` (installs third-party deps only), then `COPY . .`, then `uv sync` (installs the project). This also improves Docker layer caching: the heavy dependencies layer only rebuilds when `pyproject.toml` or `uv.lock` change, not on every source code change.

**`src/agent/scraper.py`** — fixed LinkedIn extraction producing too much noise.
- Root cause: `trafilatura` ran first on the full LinkedIn page HTML, which includes a sidebar of other job listings. It extracted the largest text block, which encompassed both the job description and the sidebar titles.
- Fix 1 — extraction order: heuristic JS now runs before CSS selectors and trafilatura for LinkedIn. The heuristic strips `<aside>` tags and elements with `recommend`/`sidebar`/`related` in their class or id before reading text. Not dependent on LinkedIn-specific class names.
- Fix 2 — post-processing: `_clean_linkedin_text()` truncates the extracted text at the first known LinkedIn footer marker (`Seniority level`, `Similar jobs`, `People also viewed`, etc.) and removes the "See who X has hired for this role" CTA. These markers appear in English on every LinkedIn page regardless of the posting language.

---

## Output Schema

```json
{
  "match_score":      85,
  "matched_skills":   ["Python", "FastAPI", "Docker"],
  "missing_skills":   ["Kubernetes", "AWS"],
  "experience_gap":   "JD requires 5+ years; resume shows 3 years.",
  "top_improvements": [
    {
      "action":   "Add AWS certifications or side projects",
      "reason":   "AWS is explicitly required and absent from the resume.",
      "priority": "high"
    }
  ],
  "summary": "Strong Python and API background aligns well with the stack. The main gap is cloud infrastructure experience."
}
```

---

## Concerns / To Do

| # | Issue | Status | Fix applied |
|---|---|---|---|
| 1 | LinkedIn collection URLs (e.g. `/jobs/collections/...?currentJobId=123`) scrape the full page including the sidebar job list, adding noise and wasting tokens. | **Fixed** | `_extract_linkedin_job_id` in `scraper.py` rewrites to `/jobs/view/{id}` before fetching. `_clean_linkedin_text` truncates at footer markers post-extraction. |
| 2 | LLM in high demand | **Fixed** | Retry with backoff (3 attempts waiting 1-4 seconds); in case all retries fails, the model fallbacks to a simplier model `gemini-3.1-flash-lite-preview`
|3| LLM API KEY quota reached| **Fixed**| Instead of retry (wasting quota), it fallbacks to a lower model immediately|
|4| Gemini 3.1 flash lite returns list of content instead of string| **Fixed**| _extract_text helper to handle those cases.|
