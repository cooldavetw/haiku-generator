import assert from "node:assert/strict";
import test from "node:test";
import { getAgentUrl, getBackendStatus } from "../lib/backend";

test("readiness comes from FastAPI without a frontend model key", async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });
  t.mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(url.toString(), new URL("health", getAgentUrl()).toString());
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    return Response.json({ status: "ok", configured: true });
  });
  assert.equal(await getBackendStatus(), "ready");
});

test("distinguishes an unconfigured backend from an unavailable one", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: "ok", configured: false }));
  assert.equal(await getBackendStatus(), "unconfigured");
});

test("treats connection failures as unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  assert.equal(await getBackendStatus(), "unavailable");
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
    assert.equal(await getBackendStatus(), "unavailable");
  }
});
