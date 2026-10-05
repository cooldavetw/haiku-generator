import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addHaiku, haikuSchema, sampleHaiku, scenes } from "../src/lib/haiku";

test("requires three nonempty lines in both languages", () => {
  for (const language of ["japanese", "english"] as const) {
    for (const lines of [[], ["one", "two"], ["one", "two", "three", "four"], ["one", " ", "three"]]) {
      assert.equal(haikuSchema.safeParse({ ...sampleHaiku, [language]: lines }).success, false);
    }
  }
  assert.equal(haikuSchema.safeParse(sampleHaiku).success, true);
});

test("rejects unlisted images and backgrounds", () => {
  assert.equal(haikuSchema.safeParse({ ...sampleHaiku, image_name: "../../private" }).success, false);
  assert.equal(haikuSchema.safeParse({ ...sampleHaiku, background: "url(https://example.com)" }).success, false);
});

test("new poems come first and poems with matching text are retained", () => {
  const first = addHaiku([], sampleHaiku, "first");
  const second = addHaiku(first, sampleHaiku, "second");
  assert.deepEqual(second.map((poem) => poem.id), ["second", "first"]);
  assert.equal(first.length, 1);
});

test("bounds session history to the most recent 50 poems", () => {
  let history = addHaiku([], sampleHaiku, "0");
  for (let index = 1; index < 60; index++) history = addHaiku(history, sampleHaiku, String(index));
  assert.equal(history.length, 50);
  assert.equal(history[0].id, "59");
  assert.equal(history[49].id, "10");
});

test("every allowed illustration exists locally", async () => {
  for (const name of Object.keys(scenes)) {
    const svg = await readFile(new URL(`../public/images/${name}`, import.meta.url), "utf8");
    assert.match(svg, /^<svg/);
  }
});
