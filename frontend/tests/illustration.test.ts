import assert from "node:assert/strict";
import test from "node:test";
import { requestIllustration } from "../src/lib/illustration";
import { sampleHaiku } from "../src/lib/haiku";

const BASE = "https://segma.example/fastapi-prod/7/api/";

test("posts the poem under the page's prefix and returns an object URL", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, `${BASE}illustration`);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(String(options.body)), { japanese: sampleHaiku.japanese, english: sampleHaiku.english });
    return new Response(new Blob(["img"], { type: "image/webp" }));
  });
  const url = await requestIllustration(sampleHaiku, BASE);
  assert.match(url ?? "", /^blob:/);
  URL.revokeObjectURL(url!);
});

test("keeps the local illustration when drawing is off, fails, or is unreachable", async (t) => {
  const responses = [
    () => Response.json({ detail: "off" }, { status: 404 }),
    () => Response.json({ detail: "failed" }, { status: 502 }),
    () => Response.json({ not: "an image" }),
    () => { throw new TypeError("fetch failed"); },
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!());
  for (let index = 0; index < 4; index++) {
    assert.equal(await requestIllustration(sampleHaiku, BASE), undefined);
  }
});
