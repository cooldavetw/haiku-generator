import assert from "node:assert/strict";
import test from "node:test";
import type { Message } from "@ag-ui/client";
import { answerToolCalls, haikuTool, HAIKU_TOOL, partialArgs } from "../src/lib/agent";
import { sampleHaiku, type Haiku } from "../src/lib/haiku";

function callMessage(id: string, args: string, name = HAIKU_TOOL): Message {
  return { id: `m-${id}`, role: "assistant", toolCalls: [{ id, type: "function", function: { name, arguments: args } }] };
}

test("the tool's JSON schema describes the haiku and omits the $schema key", () => {
  const schema = haikuTool.parameters as Record<string, any>;
  assert.equal(schema.$schema, undefined);
  assert.equal(schema.type, "object");
  assert.deepEqual([...schema.required].sort(), ["background", "english", "image_name", "japanese"]);
  assert.equal(schema.properties.japanese.minItems, 3);
  assert.equal(schema.properties.japanese.maxItems, 3);
  assert.deepEqual(schema.properties.image_name.enum, ["mountain.svg", "ocean.svg", "spring.svg"]);
});

test("a valid call is shown once and answered", () => {
  const shown: Haiku[] = [];
  const messages = [callMessage("c1", JSON.stringify(sampleHaiku))];
  const results = answerToolCalls(messages, (h) => shown.push(h), () => "r1");
  assert.deepEqual(shown, [sampleHaiku]);
  assert.deepEqual(results, [{ id: "r1", role: "tool", toolCallId: "c1", content: "Haiku displayed in the garden." }]);
  assert.deepEqual(answerToolCalls([...messages, ...results], (h) => shown.push(h)), []);
  assert.equal(shown.length, 1);
});

test("invalid arguments and unknown tools are answered with an error, not shown", () => {
  const shown: Haiku[] = [];
  const results = answerToolCalls([
    callMessage("bad", JSON.stringify({ ...sampleHaiku, japanese: ["one"] })),
    callMessage("broken", "{not json"),
    callMessage("other", "{}", "delete_everything"),
  ], (h) => shown.push(h));
  assert.equal(shown.length, 0);
  assert.deepEqual(results.map((r) => r.toolCallId), ["bad", "broken", "other"]);
  for (const result of results) assert.ok(result.error && result.content === result.error);
});

test("partial arguments tolerate incomplete streaming JSON", () => {
  assert.deepEqual(partialArgs('{"japanese": ["春'), {});
  assert.deepEqual(partialArgs("null"), {});
  assert.deepEqual(partialArgs('{"japanese": ["a"]}'), { japanese: ["a"] });
});
