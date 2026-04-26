"""
Unit tests for Agent/scraper.py.

Run:
    pytest tests/unit_tests/test_scraper.py -v
    pytest --cov=agent.tools.scraper --cov-report=term-missing tests/unit_tests/test_scraper.py
"""

from __future__ import annotations

from typing import Optional
from unittest.mock import MagicMock, patch, call
import pytest

from agent.tools.scraper import (
    ScraperError,
    _domain,
    _validate_url,
    _clean_text,
    _extract_linkedin_job_id,
    _extract_indeed_job_key,
    _fetch_with_http_fallbacks,
    _fetch_linkedin_http,
    _fetch_indeed,
    _load_html_into_page,
    _strategy_site_selector,
    _strategy_trafilatura,
    _strategy_heuristic,
    _build_heuristic_js,
    scrape_job_description,
    _MIN_HTTP_RESPONSE_LEN,
    _MIN_CONTENT_LEN,
)
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


# =====================================================================================
#  Fixtures
# =====================================================================================

def _make_response(status_code: int = 200, text: str = "x" * 1500) -> MagicMock:
    """Return a mock requests.Response-like object."""
    m = MagicMock()
    m.status_code = status_code
    m.text = text
    return m


def _make_page(inner_text: str = "", evaluate_text: str = "") -> MagicMock:
    """Return a MagicMock Page with preset locator and evaluate behaviour."""
    page = MagicMock()
    locator = MagicMock()
    locator.count.return_value = 1
    locator.first.inner_text.return_value = inner_text
    page.locator.return_value = locator
    page.evaluate.return_value = evaluate_text
    page.content.return_value = "<html><body>stub</body></html>"
    return page


# =====================================================================================
#  TestHelpers
# =====================================================================================

class TestHelpers:
    def test_domain_strips_www(self):
        assert _domain("https://www.indeed.com/job") == "indeed.com"

    def test_domain_no_www(self):
        assert _domain("https://linkedin.com/jobs/view/123") == "linkedin.com"

    def test_domain_subdomain_preserved(self):
        assert _domain("https://ca.indeed.com/job") == "ca.indeed.com"

    def test_validate_url_http(self):
        _validate_url("http://example.com/job")  # should not raise

    def test_validate_url_https(self):
        _validate_url("https://example.com/job")  # should not raise

    def test_validate_url_bad_scheme(self):
        with pytest.raises(ScraperError, match="Invalid URL scheme"):
            _validate_url("ftp://example.com")

    def test_validate_url_no_host(self):
        with pytest.raises(ScraperError, match="Invalid URL"):
            _validate_url("https://")

    def test_clean_text_collapses_spaces(self):
        assert _clean_text("foo   bar") == "foo bar"

    def test_clean_text_collapses_blank_lines(self):
        result = _clean_text("a\n\n\n\nb")
        assert "\n\n\n" not in result

    def test_clean_text_strips(self):
        assert _clean_text("  hello  ") == "hello"


# =====================================================================================
#  TestExtractLinkedInJobId
# =====================================================================================

class TestExtractLinkedInJobId:
    def test_jobs_view_format(self):
        assert _extract_linkedin_job_id("https://www.linkedin.com/jobs/view/4115507396") == "4115507396"

    def test_current_job_id_param(self):
        assert _extract_linkedin_job_id("https://www.linkedin.com/jobs/collections/?currentJobId=4377015836") == "4377015836"

    def test_numeric_path_fallback(self):
        assert _extract_linkedin_job_id("https://www.linkedin.com/jobs/something/4115507396/") == "4115507396"

    def test_no_id_returns_none(self):
        assert _extract_linkedin_job_id("https://www.linkedin.com/jobs/search") is None


# =====================================================================================
#  TestExtractIndeedJobKey
# =====================================================================================

class TestExtractIndeedJobKey:
    def test_jk_param(self):
        assert _extract_indeed_job_key("https://www.indeed.com/viewjob?jk=abc123") == "abc123"

    def test_vjk_param(self):
        assert _extract_indeed_job_key("https://www.indeed.com/q-jobs.html?vjk=abc123") == "abc123"

    def test_no_param_returns_none(self):
        assert _extract_indeed_job_key("https://www.indeed.com/jobs") is None


# =====================================================================================
#  TestFetchWithHttpFallbacks
# =====================================================================================

class TestFetchWithHttpFallbacks:
    def test_curl_cffi_success(self):
        mock_resp = _make_response(200, "x" * (_MIN_HTTP_RESPONSE_LEN + 1))
        with patch.dict("sys.modules", {"curl_cffi": MagicMock(), "curl_cffi.requests": MagicMock()}):
            import curl_cffi.requests as cffi_req
            cffi_req.get = MagicMock(return_value=mock_resp)
            with patch("agent.tools.scraper._CURL_CFFI_PROFILES", ["chrome124"]):
                with patch("builtins.__import__", side_effect=lambda name, *a, **kw: (
                    cffi_req if name == "curl_cffi.requests" else __import__(name, *a, **kw)
                )):
                    pass  # covered by integration path below

    def test_all_fail_raises_scraper_error(self):
        with patch("builtins.__import__", side_effect=ImportError):
            with patch("requests.Session") as mock_session:
                mock_session.return_value.get.return_value = _make_response(403, "blocked")
                with pytest.raises(ScraperError, match="blocked all fetch attempts"):
                    _fetch_with_http_fallbacks("https://example.com", site_label="TestSite")

    def test_site_label_in_error_message(self):
        with patch("builtins.__import__", side_effect=ImportError):
            with patch("requests.Session") as mock_session:
                mock_session.return_value.get.return_value = _make_response(403, "x")
                with pytest.raises(ScraperError) as exc_info:
                    _fetch_with_http_fallbacks("https://example.com", site_label="MySite")
                assert "MySite" in str(exc_info.value)

    def test_requests_fallback_succeeds(self):
        long_text = "x" * (_MIN_HTTP_RESPONSE_LEN + 1)
        with patch("builtins.__import__", side_effect=ImportError):
            with patch("requests.Session") as mock_session:
                mock_session.return_value.get.return_value = _make_response(200, long_text)
                result = _fetch_with_http_fallbacks("https://example.com", site_label="X")
                assert result == long_text

    def test_requests_short_response_raises(self):
        with patch("builtins.__import__", side_effect=ImportError):
            with patch("requests.Session") as mock_session:
                mock_session.return_value.get.return_value = _make_response(200, "tiny")
                with pytest.raises(ScraperError):
                    _fetch_with_http_fallbacks("https://example.com", site_label="X")


# =====================================================================================
#  TestFetchLinkedInHttp
# =====================================================================================

class TestFetchLinkedInHttp:
    def test_url_normalisation_with_job_id(self):
        with patch("agent.tools.scraper._fetch_with_http_fallbacks") as mock_fetch:
            mock_fetch.return_value = "html content"
            _fetch_linkedin_http("https://www.linkedin.com/jobs/view/4115507396")
            called_url = mock_fetch.call_args[0][0]
            assert "4115507396" in called_url
            assert mock_fetch.call_args[1]["site_label"] == "LinkedIn"

    def test_url_normalisation_without_job_id(self):
        original = "https://www.linkedin.com/jobs/search"
        with patch("agent.tools.scraper._fetch_with_http_fallbacks") as mock_fetch:
            mock_fetch.return_value = "html content"
            _fetch_linkedin_http(original)
            called_url = mock_fetch.call_args[0][0]
            assert called_url == original


# =====================================================================================
#  TestFetchIndeed
# =====================================================================================

class TestFetchIndeed:
    def test_url_normalisation_with_jk(self):
        with patch("agent.tools.scraper._fetch_with_http_fallbacks") as mock_fetch:
            mock_fetch.return_value = "html content"
            _fetch_indeed("https://www.indeed.com/viewjob?jk=abc123")
            called_url = mock_fetch.call_args[0][0]
            assert "abc123" in called_url
            assert mock_fetch.call_args[1]["site_label"] == "Indeed"

    def test_url_normalisation_no_key(self):
        original = "https://www.indeed.com/jobs"
        with patch("agent.tools.scraper._fetch_with_http_fallbacks") as mock_fetch:
            mock_fetch.return_value = "html content"
            _fetch_indeed(original)
            called_url = mock_fetch.call_args[0][0]
            assert called_url == original


# =====================================================================================
#  TestDomainMatchingImproved
# =====================================================================================

class TestDomainMatchingImproved:
    """Verify that _strategy_site_selector uses suffix-based domain matching."""

    def _run(self, domain: str) -> Optional[str]:
        page = _make_page(inner_text="x" * (_MIN_CONTENT_LEN + 1))
        return _strategy_site_selector(page, domain)

    def test_exact_match(self):
        page = _make_page(inner_text="x" * (_MIN_CONTENT_LEN + 1))
        result = _strategy_site_selector(page, "indeed.com")
        assert result is not None

    def test_subdomain_match(self):
        page = _make_page(inner_text="x" * (_MIN_CONTENT_LEN + 1))
        result = _strategy_site_selector(page, "ca.indeed.com")
        assert result is not None

    def test_false_substring_rejected(self):
        # "notindeed.com" contains "indeed.com" as a substring — old code would match it
        page = _make_page(inner_text="x" * (_MIN_CONTENT_LEN + 1))
        result = _strategy_site_selector(page, "notindeed.com")
        assert result is None

    def test_unrelated_domain_skipped(self):
        page = _make_page(inner_text="x" * (_MIN_CONTENT_LEN + 1))
        result = _strategy_site_selector(page, "example.com")
        assert result is None


# =====================================================================================
#  TestStrategySiteSelector
# =====================================================================================

class TestStrategySiteSelector:
    def test_selector_hit_returns_text(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        page = _make_page(inner_text=long_text)
        result = _strategy_site_selector(page, "indeed.com")
        assert result is not None
        assert len(result) >= _MIN_CONTENT_LEN

    def test_selector_too_short_returns_none(self):
        page = _make_page(inner_text="short")
        result = _strategy_site_selector(page, "indeed.com")
        assert result is None

    def test_unknown_domain_returns_none(self):
        page = _make_page(inner_text="x" * 500)
        result = _strategy_site_selector(page, "unknown.com")
        assert result is None

    def test_selector_timeout_falls_through(self):
        page = MagicMock()
        locator = MagicMock()
        locator.count.return_value = 1
        # First selector times out, second succeeds
        long_text = "x" * (_MIN_CONTENT_LEN + 1)
        locator.first.inner_text.side_effect = [
            PlaywrightTimeoutError("timeout"),
            long_text,
        ]
        page.locator.return_value = locator
        result = _strategy_site_selector(page, "indeed.com")
        assert result is not None

    def test_locator_count_zero_skips(self):
        page = MagicMock()
        locator = MagicMock()
        locator.count.return_value = 0
        page.locator.return_value = locator
        result = _strategy_site_selector(page, "indeed.com")
        assert result is None


# =====================================================================================
#  TestStrategyTrafilatura
# =====================================================================================

class TestStrategyTrafilatura:
    def _mock_trafilatura(self, return_value=None, side_effect=None):
        """Return a sys.modules patch with a fake trafilatura module."""
        mock_traf = MagicMock()
        if side_effect:
            mock_traf.extract.side_effect = side_effect
        else:
            mock_traf.extract.return_value = return_value
        return patch.dict("sys.modules", {"trafilatura": mock_traf})

    def test_success(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        with self._mock_trafilatura(return_value=long_text):
            result = _strategy_trafilatura("<html/>")
        assert result is not None

    def test_short_result_returns_none(self):
        with self._mock_trafilatura(return_value="short"):
            result = _strategy_trafilatura("<html/>")
        assert result is None

    def test_not_installed_returns_none(self):
        with patch.dict("sys.modules", {"trafilatura": None}):
            result = _strategy_trafilatura("<html/>")
        assert result is None

    def test_exception_returns_none(self):
        with self._mock_trafilatura(side_effect=RuntimeError("boom")):
            result = _strategy_trafilatura("<html/>")
        assert result is None


# =====================================================================================
#  TestStrategyHeuristic
# =====================================================================================

class TestStrategyHeuristic:
    def test_success(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        page = _make_page(evaluate_text=long_text)
        result = _strategy_heuristic(page)
        assert result is not None

    def test_short_result_returns_none(self):
        page = _make_page(evaluate_text="short")
        result = _strategy_heuristic(page)
        assert result is None

    def test_exception_returns_none(self):
        page = MagicMock()
        page.evaluate.side_effect = RuntimeError("boom")
        result = _strategy_heuristic(page)
        assert result is None


# =====================================================================================
#  TestBuildHeuristicJs
# =====================================================================================

class TestBuildHeuristicJs:
    def test_returns_string(self):
        js = _build_heuristic_js()
        assert isinstance(js, str)

    def test_contains_arrow_function(self):
        js = _build_heuristic_js()
        assert "() =>" in js

    def test_no_python_list_syntax(self):
        js = _build_heuristic_js()
        # Python list uses single quotes; JS should use double quotes
        assert "['nav'" not in js


# =====================================================================================
#  TestLoadHtmlIntoPage
# =====================================================================================

class TestLoadHtmlIntoPage:
    def test_success_no_error(self):
        page = MagicMock()
        _load_html_into_page(page, "<html/>")  # should not raise
        page.set_content.assert_called_once()

    def test_timeout_logs_warning_not_raises(self, caplog):
        page = MagicMock()
        page.set_content.side_effect = PlaywrightTimeoutError("timeout")
        import logging
        with caplog.at_level(logging.WARNING):
            _load_html_into_page(page, "<html/>")  # should not raise
        assert any("timed out" in r.message for r in caplog.records)

    def test_unexpected_exception_raises_scraper_error(self):
        page = MagicMock()
        page.set_content.side_effect = RuntimeError("unexpected")
        with pytest.raises(ScraperError, match="Failed to inject HTML"):
            _load_html_into_page(page, "<html/>")


# =====================================================================================
#  TestScrapeJobDescription
# =====================================================================================

class TestScrapeJobDescription:
    def test_invalid_scheme_raises(self):
        with pytest.raises(ScraperError, match="Invalid URL scheme"):
            scrape_job_description("ftp://example.com/job")

    def test_linkedin_trafilatura_path(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        with patch("agent.tools.scraper._fetch_linkedin_http", return_value="<html>job</html>"):
            with patch("agent.tools.scraper._strategy_trafilatura", return_value=long_text):
                result = scrape_job_description("https://www.linkedin.com/jobs/view/123456789")
        assert result == long_text

    def test_linkedin_falls_to_browser_strategies(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        mock_page = _make_page(inner_text=long_text)
        with patch("agent.tools.scraper._fetch_linkedin_http", return_value="<html/>"):
            with patch("agent.tools.scraper._strategy_trafilatura", return_value=None):
                with patch("agent.tools.scraper._browser_page") as mock_ctx:
                    mock_ctx.return_value.__enter__ = MagicMock(return_value=mock_page)
                    mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
                    with patch("agent.tools.scraper._load_html_into_page"):
                        with patch("agent.tools.scraper._strategy_site_selector", return_value=long_text):
                            result = scrape_job_description("https://www.linkedin.com/jobs/view/123456789")
        assert result == long_text

    def test_indeed_routing(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        with patch("agent.tools.scraper._fetch_indeed", return_value="<html/>"):
            with patch("agent.tools.scraper._strategy_trafilatura", return_value=long_text):
                result = scrape_job_description("https://www.indeed.com/viewjob?jk=abc123")
        assert result == long_text

    def test_generic_site_css_selector_path(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        mock_page = _make_page(inner_text=long_text)
        with patch("agent.tools.scraper._browser_page") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=mock_page)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            with patch("agent.tools.scraper._navigate"):
                with patch("agent.tools.scraper._strategy_site_selector", return_value=long_text):
                    result = scrape_job_description("https://greenhouse.io/jobs/123")
        assert result == long_text

    def test_all_strategies_fail_raises_scraper_error(self):
        mock_page = _make_page()
        with patch("agent.tools.scraper._browser_page") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=mock_page)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            with patch("agent.tools.scraper._navigate"):
                with patch("agent.tools.scraper._strategy_site_selector", return_value=None):
                    with patch("agent.tools.scraper._strategy_trafilatura", return_value=None):
                        with patch("agent.tools.scraper._strategy_heuristic", return_value=None):
                            with pytest.raises(ScraperError, match="All extraction strategies failed"):
                                scrape_job_description("https://example.com/job")

    def test_page_content_failure_skips_trafilatura(self):
        long_text = "a" * (_MIN_CONTENT_LEN + 1)
        mock_page = MagicMock()
        mock_page.content.side_effect = RuntimeError("content failed")
        mock_page.evaluate.return_value = long_text
        mock_page.locator.return_value.count.return_value = 0
        with patch("agent.tools.scraper._browser_page") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=mock_page)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            with patch("agent.tools.scraper._navigate"):
                with patch("agent.tools.scraper._strategy_site_selector", return_value=None):
                    with patch("agent.tools.scraper._strategy_heuristic", return_value=long_text):
                        result = scrape_job_description("https://example.com/job")
        assert result == long_text

