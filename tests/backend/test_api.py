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
