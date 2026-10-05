import assert from "node:assert/strict";
import test from "node:test";
import { backendUrl, getBackendStatus } from "../src/lib/backend";

const BASE = "https://segma.example/fastapi-prod/7/api/";

test("backend URLs stay under the prefix the page is served at", () => {
  assert.equal(backendUrl("agent", BASE), "https://segma.example/fastapi-prod/7/api/agent");
  assert.equal(backendUrl("health", "http://127.0.0.1:8000/"), "http://127.0.0.1:8000/health");
});

test("readiness comes from FastAPI's health endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, `${BASE}health`);
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    return Response.json({ status: "ok", configured: true });
  });
  assert.equal(await getBackendStatus(BASE), "ready");
});

test("distinguishes an unconfigured backend from an unavailable one", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: "ok", configured: false }));
  assert.equal(await getBackendStatus(BASE), "unconfigured");
});

test("treats connection failures as unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  assert.equal(await getBackendStatus(BASE), "unavailable");
});

test("rejects unhealthy or malformed health responses", async (t) => {
  const responses = [
    Response.json({ status: "ok", configured: true }, { status: 503 }),
    Response.json({ configured: true }),
    Response.json({ status: "ok", configured: "true" }),
    new Response("not json"),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  for (let index = 0; index < 4; index++) {
    assert.equal(await getBackendStatus(BASE), "unavailable");
  }
});
