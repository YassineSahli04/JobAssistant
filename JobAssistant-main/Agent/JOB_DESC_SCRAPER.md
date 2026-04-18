# Job Description Scraper

Fetches a job posting URL and returns clean plain text of the job description.

---

## Files

- `Agent/src/agent/scraper.py` — core scraping library
- `Agent/tests/unit_tests/test_scraper.py` — Pytest unit tests (mocked)

---

## Install

```bash
pip install playwright requests trafilatura curl-cffi cloudscraper
playwright install chromium
```

`curl-cffi` and `cloudscraper` are required for LinkedIn and Indeed.  
`trafilatura` is used for readability-based extraction.  
`playwright` handles JS-rendered pages.  
`pytest` is required for running the tests.

---

## How it works

`scrape_job_description(url: str) -> str` is the single public function. It routes by domain, fetches the page, then runs up to three extraction strategies in order, returning the first result that exceeds 200 chars.

### Fetch routing

| Domain | Method | Reason |
|---|---|---|
| `linkedin.com` | `curl_cffi` → `cloudscraper` → `requests` | TLS impersonation bypasses bot detection at the HTTP layer. URL is normalised to `/jobs/view/{id}` internally via `_extract_linkedin_job_id`. |
| `indeed.com` | `curl_cffi` → `cloudscraper` → `requests` | Cloudflare blocks headless browsers; TLS impersonation works at the HTTP layer. |
| Everything else | Playwright headless Chromium (`networkidle`) | Handles JS-rendered SPAs and lazy-loaded content. |

### Extraction strategies

**LinkedIn** (order matters — see reasoning below):

| Order | Strategy | Why |
|---|---|---|
| 1st | Heuristic JS | Strips `<aside>`, `<nav>`, and any element whose class/id contains `recommend`, `sidebar`, `related` from the DOM before reading text. Robust to class-name changes. |
| 2nd | CSS selectors | Precise but brittle — LinkedIn class names change on frontend deploys. |
| 3rd | Trafilatura | Extracts the largest coherent text block. Demoted to last resort because on a full LinkedIn page it includes the sidebar job list. |

After any strategy succeeds, `_clean_linkedin_text()` truncates the result at the first LinkedIn footer marker (`Seniority level`, `Similar jobs`, `People also viewed`, etc.) and strips the "See who X has hired for this role" CTA. These markers appear in English on every LinkedIn page regardless of posting language.

**Indeed** (order unchanged):

| Order | Strategy |
|---|---|
| 1st | Trafilatura on static HTML |
| 2nd | CSS selectors (Playwright `set_content`) |
| 3rd | Heuristic JS |

**All other sites** (Playwright full navigation):

| Order | Strategy |
|---|---|
| 1st | CSS selectors (live post-JS DOM) |
| 2nd | Trafilatura (fully rendered HTML) |
| 3rd | Heuristic JS |

### Heuristic JS noise stripping

The heuristic removes elements before extracting text:
- All tags in `_NOISE_TAGS`: `nav`, `header`, `footer`, `aside`, `script`, `style`, `noscript`, `form`, `iframe`, `svg`, `figure`, `button`, `input`, `select`, `textarea`
- Any element whose `class` or `id` matches `_NOISE_PATTERN`: `nav`, `sidebar`, `recommend`, `related`, `social`, `share`, `breadcrumb`, `banner`, `cookie`, `modal`, `search`, etc.

Then picks the best semantic container: `<main>` → `<article>` → element with `job`/`posting`/`description`/`content` in id or class → `<body>`.

### Stealth measures (Playwright contexts)

- `navigator.webdriver` overridden to `undefined`
- `AutomationControlled` Blink feature disabled
- Realistic viewport (1280×900), locale (`en-US`), timezone (`America/New_York`)

---

## URL normalisation

Before scraping, domain-specific URL normalisation rewrites collection or search URLs to their canonical job-detail equivalents:

| Site | Input | Normalised to |
|---|---|---|
| LinkedIn | `/jobs/collections/...?currentJobId=123` | `/jobs/view/123` |
| Indeed | `/q-...-jobs.html?vjk=abc123` | `/viewjob?jk=abc123` |

---

## Tested platforms

LinkedIn, Indeed, Greenhouse, Lever, Workday, SmartRecruiters, Ashby, iCIMS

---

## Usage

```python
from agent.scraper import scrape_job_description, ScraperError

try:
    text = scrape_job_description("https://www.linkedin.com/jobs/view/...")
    print(text)
except ScraperError as e:
    print(f"Failed: {e}")
```

In the LangGraph pipeline, call it via `asyncio.to_thread` since the function is synchronous and performs blocking I/O:

```python
import asyncio
jd_text = await asyncio.to_thread(scrape_job_description, url)
```

---

## Testing

```bash
# Run all unit tests
pytest tests/unit_tests/test_scraper.py -v

# With coverage
pytest --cov=agent.scraper --cov-report=term-missing tests/unit_tests/test_scraper.py

# Single URL (quick manual check)
python3 -c "
from agent.scraper import scrape_job_description
text = scrape_job_description('https://www.linkedin.com/jobs/view/4386489615')
print(text[:1000])
"
```

The test suite mocks all external network requests (`requests`, `curl_cffi`) and browser interactions (Playwright) to ensure logic is validated without hitting real servers.

---

## Errors

All failures raise `ScraperError` with a descriptive message:

| Cause | Message pattern |
|---|---|
| Invalid URL scheme | `"Invalid URL scheme '...' — only http/https are supported."` |
| Page not found | `"Job posting not found (HTTP 404): ..."` |
| Access denied | `"Access denied (HTTP 403) for ..."` |
| Rate limited | `"LinkedIn guest API rate-limited. Wait a few minutes and retry."` |
| All strategies failed | `"All extraction strategies failed for ..."` |

---

## Concerns / Known limitations

| # | Issue | Status |
|---|---|---|
| 1 | LinkedIn collection URLs scrape the full page including the sidebar job list. | **Fixed** — `_extract_linkedin_job_id` rewrites to `/jobs/view/{id}` before fetching. `_clean_linkedin_text` truncates at footer markers post-extraction. |
| 2 | Latency of ~3–10 seconds per scrape. | Open — inherent to HTTP + Playwright. Mitigated by `asyncio.to_thread` (does not block the pipeline event loop). |
| 3 | Site-specific CSS selectors break when a site redesigns its frontend. | Open — log the URL and failing strategy on each fallback to detect regressions early. |
| 4 | IP bans on repeated scraping. | Open — proxy rotation (BrightData, ScraperAPI, Zyte) if needed at scale. |
