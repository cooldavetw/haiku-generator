import json

import pytest
from fastapi.testclient import TestClient
from pydantic_ai import Agent
from pydantic_ai.models.function import FunctionModel

import main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    with TestClient(main.app) as client:
        yield client


def test_health_and_docs_work_without_credentials(client):
    assert client.get("/health").json() == {"status": "ok", "configured": False}
    assert client.get("/docs").status_code == 200
    assert "/agent" in client.get("/openapi.json").json()["paths"]


def test_missing_key_returns_actionable_error(client):
    response = client.post("/agent", json={})
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_health_never_exposes_key(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "private-test-key")
    response = client.get("/health")
    assert response.json()["configured"] is True
    assert "private-test-key" not in response.text


def test_agent_streams_a_response_and_rejects_bad_input(client, monkeypatch):
    async def stream_reply(messages, info):
        yield "A quiet garden."

    agent = Agent(FunctionModel(stream_function=stream_reply))
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(main, "get_agent", lambda: agent)
    invalid = client.post("/agent", json={})
    assert invalid.status_code in (400, 422)
    response = client.post("/agent", json={
        "threadId": "test-thread", "runId": "test-run", "state": {},
        "messages": [{"id": "message-1", "role": "user", "content": "Hello"}],
        "tools": [], "context": [], "forwardedProps": {},
    })
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    events = [json.loads(line[5:]) for line in response.text.splitlines() if line.startswith("data:")]
    assert events[0]["type"] == "RUN_STARTED"
    assert any(e["type"] == "TEXT_MESSAGE_CONTENT" and e["delta"] == "A quiet garden." for e in events)
    assert events[-1]["type"] == "RUN_FINISHED"


@pytest.fixture
def built(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text('<!doctype html><html><head><title>t</title></head></html>')
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    return tmp_path


@pytest.mark.parametrize("prefix", ["", "/fastapi-prod/7/api"])
def test_serves_page_with_base_for_its_prefix(built, prefix):
    client = TestClient(main.create_app(built), root_path=prefix)
    for path in ("/", "/index.html"):
        response = client.get(prefix + path)
        assert response.status_code == 200
        assert f'<head><base href="{prefix}/"><title>' in response.text
    assert client.get(prefix + "/assets/app.js").text == "console.log(1)"
    assert client.get(prefix + "/assets/missing.js").status_code == 404
    assert client.get(prefix + "/health").json()["status"] == "ok"


def test_api_routes_take_precedence_over_frontend_files(built):
    (built / "health").write_text("not the API")
    client = TestClient(main.create_app(built))
    assert client.get("/health").json()["status"] == "ok"
    assert client.post("/agent", json={}).status_code in (400, 422, 503)


def test_unbuilt_frontend_explains_itself_and_api_still_works(tmp_path):
    client = TestClient(main.create_app(tmp_path / "missing"))
    response = client.get("/")
    assert response.status_code == 503
    assert "npm run build" in response.json()["detail"]
    assert client.get("/health").status_code == 200


POEM = {"japanese": ["春風や", "小川の岸に", "花ひとつ"], "english": ["A breeze", "by the river", "one flower"]}


def test_illustration_needs_a_key(client):
    response = client.post("/illustration", json=POEM)
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_illustration_returns_the_drawn_image(client, monkeypatch):
    calls = []

    async def draw(japanese, english):
        calls.append((japanese, english))
        return b"image-bytes"

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(main.illustration, "draw", draw)
    response = client.post("/illustration", json={**POEM, "english": [" A breeze ", "by the river", "one flower"]})
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert response.content == b"image-bytes"
    assert calls == [(POEM["japanese"], POEM["english"])]


@pytest.mark.parametrize("poem", [
    {**POEM, "japanese": ["one", "two"]},
    {**POEM, "english": ["one", " ", "three"]},
    {**POEM, "english": ["x" * 201, "two", "three"]},
    {"japanese": POEM["japanese"]},
])
def test_illustration_rejects_malformed_poems(client, monkeypatch, poem):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    assert client.post("/illustration", json=poem).status_code == 422


def test_illustration_can_be_turned_off(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("HAIKU_IMAGE_MODEL", "")
    assert client.post("/illustration", json=POEM).status_code == 404


def test_image_model_failure_is_reported_without_crashing(client, monkeypatch):
    import httpx
    import openai

    async def draw(japanese, english):
        raise openai.APIConnectionError(request=httpx.Request("POST", "https://api.openai.com/v1/images"))

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(main.illustration, "draw", draw)
    response = client.post("/illustration", json=POEM)
    assert response.status_code == 502
    assert "image model failed" in response.json()["detail"]


def test_image_request_uses_default_model_and_poem(monkeypatch):
    import asyncio
    import base64
    import illustration

    sent = {}

    class Images:
        async def generate(self, **kwargs):
            sent.update(kwargs)
            return type("R", (), {"data": [type("D", (), {"b64_json": base64.b64encode(b"img").decode()})()]})()

    monkeypatch.delenv("HAIKU_IMAGE_MODEL", raising=False)
    monkeypatch.delenv("HAIKU_IMAGE_QUALITY", raising=False)
    monkeypatch.setattr(illustration, "get_client", lambda: type("C", (), {"images": Images()})())
    assert asyncio.run(illustration.draw(POEM["japanese"], POEM["english"])) == b"img"
    assert sent["model"] == "gpt-image-1-mini"
    assert sent["quality"] == "low"
    assert sent["output_format"] == "webp"
    assert "春風や (A breeze)" in sent["prompt"]
