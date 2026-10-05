"""Run with `python main.py` or `uvicorn main:app --reload`."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from pydantic_ai.ui.ag_ui import AGUIAdapter
from starlette.responses import Response

from agent import get_agent


# Resolve from this file, so starting Uvicorn from another directory is safe.
# Exported environment variables take precedence over the local file.
load_dotenv(Path(__file__).with_name(".env.local"))

app = FastAPI(title="Haiku Garden API", version="1.0.0")


@app.get("/health")
async def health() -> dict[str, str | bool]:
    """Liveness and configuration status; never returns credentials."""
    return {
        "status": "ok",
        "configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
    }


@app.post("/agent", response_class=Response)
async def run_agent(request: Request) -> Response:
    """Stream AG-UI events, including calls to the browser's generate_haiku tool."""
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="Set OPENAI_API_KEY in .env.local and restart the FastAPI service.",
        )
    return await AGUIAdapter.dispatch_request(request, agent=get_agent())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
