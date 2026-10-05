"""Run with `python main.py` or `uvicorn main:app --reload`."""

import html
import os
from pathlib import Path
from typing import Annotated

import openai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field, StringConstraints
from pydantic_ai.ui.ag_ui import AGUIAdapter
from starlette.responses import Response

import illustration
from agent import get_agent


PROJECT_ROOT = Path(__file__).resolve().parent

# Resolve from this file, so starting Uvicorn from another directory is safe.
# Exported environment variables take precedence over the local file.
load_dotenv(PROJECT_ROOT / ".env.local")

Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class Poem(BaseModel):
    japanese: list[Line] = Field(min_length=3, max_length=3)
    english: list[Line] = Field(min_length=3, max_length=3)


def require_key() -> None:
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="Set OPENAI_API_KEY in the backend environment and restart the FastAPI service.",
        )


def create_app(frontend_dir: Path | None = None) -> FastAPI:
    build_dir = Path(frontend_dir) if frontend_dir is not None else PROJECT_ROOT / "frontend" / "dist"
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
        require_key()
        return await AGUIAdapter.dispatch_request(request, agent=get_agent())

    @app.post(
        "/illustration",
        response_class=Response,
        responses={200: {"content": {illustration.MEDIA_TYPE: {}}, "description": "The illustration."}},
    )
    async def illustrate(poem: Poem) -> Response:
        """Draw an illustration for a haiku with the configured image model."""
        require_key()
        if not illustration.image_model():
            raise HTTPException(status_code=404, detail="Illustrations are turned off: HAIKU_IMAGE_MODEL is empty.")
        try:
            image = await illustration.draw(poem.japanese, poem.english)
        except openai.APIError as e:
            raise HTTPException(status_code=502, detail=f"The image model failed: {e.message}") from e
        return Response(image, media_type=illustration.MEDIA_TYPE, headers={"Cache-Control": "no-store"})

    index = build_dir / "index.html"

    @app.get("/", include_in_schema=False)
    @app.get("/index.html", include_in_schema=False)
    async def frontend_index(request: Request) -> Response:
        """The page, with a <base> for the URL prefix the app is served under.

        The build uses relative URLs. The base makes them resolve inside the
        prefix even when the page is opened without a trailing slash.
        """
        if not index.is_file():
            return JSONResponse(
                status_code=503,
                content={"detail": "Frontend not built. Run npm ci and npm run build in frontend/, then refresh."},
            )
        base = html.escape(request.scope.get("root_path", "").rstrip("/") + "/", quote=True)
        page = index.read_text(encoding="utf-8").replace("<head>", f'<head><base href="{base}">', 1)
        return HTMLResponse(page, headers={"Cache-Control": "no-cache"})

    if build_dir.is_dir():
        # Static assets only: the app has no client-side routes needing a fallback.
        app.frontend("/", directory=build_dir, fallback=None)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
