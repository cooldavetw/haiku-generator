import type { Message, Tool, ToolMessage } from "@ag-ui/client";
import { z } from "zod";
import { haikuSchema, type Haiku } from "./haiku";

export const HAIKU_TOOL = "generate_haiku";

/** The frontend tool sent with every run; the browser executes it, not FastAPI. */
export const haikuTool: Tool = {
  name: HAIKU_TOOL,
  description: "Display a new Japanese haiku with its English translation in the garden.",
  parameters: (({ $schema: _, ...schema }) => schema)(z.toJSONSchema(haikuSchema)),
};

/** Best-effort arguments of a streaming or finished tool call, for previews. */
export function partialArgs(json: string): Partial<Haiku> {
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/**
 * Execute the haiku tool calls the agent left unanswered.
 *
 * Each call gets a tool message, so the next run's history pairs every call
 * with its result. A poem that fails validation is reported back as an error
 * instead of being shown.
 */
export function answerToolCalls(
  messages: readonly Message[],
  show: (haiku: Haiku) => void,
  newId: () => string = () => crypto.randomUUID(),
): ToolMessage[] {
  const answered = new Set(messages.flatMap((m) => (m.role === "tool" ? [m.toolCallId] : [])));
  const results: ToolMessage[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const call of message.toolCalls ?? []) {
      if (answered.has(call.id)) continue;
      let content: string;
      let error: string | undefined;
      if (call.function.name !== HAIKU_TOOL) {
        error = `Unknown tool ${call.function.name}.`;
        content = error;
      } else {
        const parsed = haikuSchema.safeParse(partialArgs(call.function.arguments));
        if (parsed.success) {
          show(parsed.data);
          content = "Haiku displayed in the garden.";
        } else {
          error = `The haiku was not displayed: ${z.prettifyError(parsed.error)}`;
          content = error;
        }
      }
      results.push({ id: newId(), role: "tool", toolCallId: call.id, content, ...(error ? { error } : {}) });
    }
  }
  return results;
}
