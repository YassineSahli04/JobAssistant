FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:${PATH}"

WORKDIR /app/Agent

RUN pip install --no-cache-dir --upgrade pip uv

COPY pyproject.toml uv.lock ./
# Install dependencies only (skip the project itself — src/ doesn't exist yet).
# Dev group is included so pytest / ruff / mypy are available inside the container.
RUN uv sync --frozen --no-install-project
RUN playwright install --with-deps chromium

# Copy source and install the project package (including dev group)
COPY . .
RUN uv sync --frozen

EXPOSE 8888

CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port", "8888", "--no-browser", "--allow-root"]
