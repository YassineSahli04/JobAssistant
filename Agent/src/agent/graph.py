"""Resume Scorer Agent — LangGraph pipeline.

Workflow:
    fetch_resume -> scrape_job -> route_request_type -> run_scorer | tailor_answer

    1. fetch_resume   : Fetches the user's resume text from the backend API.
    2. scrape_job     : Fetches and cleans the job info from the given URL.
    3. route          : Branches on RequestType — score goes to run_scorer, question to tailor_answer.
    4. run_scorer     : Scores the resume against the job description.
    4. tailor_answer  : Answers the user's question using the resume and job description.
"""

from __future__ import annotations

from dotenv import find_dotenv, load_dotenv
from langgraph.graph import StateGraph

load_dotenv(find_dotenv())
load_dotenv(find_dotenv(".env.local"), override=True)

from agent.route import route_request_type
from agent.node import fetch_resume, scrape_job, run_scorer, tailor_answer
from agent.state import State


# ── Graph ─────────────────────────────────────────────────────────────────────


def create_graph(checkpointer=None):
    """Build and compile the graph.

    Pass a checkpointer for standalone use (e.g. server.py).
    Omit it when running under LangGraph API, which manages persistence itself.
    """
    builder = StateGraph(State)

    builder.add_node("fetch_resume", fetch_resume)
    builder.add_node("scrape_job", scrape_job)
    builder.add_node("run_scorer", run_scorer)
    builder.add_node("tailor_answer", tailor_answer)

    builder.add_edge("__start__", "fetch_resume")
    builder.add_edge("fetch_resume", "scrape_job")
    builder.add_conditional_edges(
        "scrape_job",
        route_request_type,
        {
            "score_resume": "run_scorer",
            "tailored_answer": "tailor_answer"
        })

    return builder.compile(name="Resume Scorer", checkpointer=checkpointer)


# LangGraph API entry point — no checkpointer (platform handles persistence)
graph = create_graph()