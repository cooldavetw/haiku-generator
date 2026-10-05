import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { HttpAgent, type AssistantMessage, type Message } from "@ag-ui/client";
import { answerToolCalls, haikuTool, partialArgs } from "./lib/agent";
import { backendUrl } from "./lib/backend";
import type { Haiku } from "./lib/haiku";
import { HaikuCard } from "./haiku-card";

const suggestions = [
  { title: "Nature", message: "Write me a haiku about nature." },
  { title: "Ocean", message: "Create a haiku about the ocean." },
  { title: "Spring", message: "Generate a haiku about spring." },
];

/** One AG-UI conversation with FastAPI's /agent; poems go to `onHaiku`. */
function useHaikuChat(onHaiku: (haiku: Haiku) => void) {
  const [agent] = useState(() => new HttpAgent({ url: backendUrl("agent") }));
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const onHaikuRef = useRef(onHaiku);
  onHaikuRef.current = onHaiku;

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onMessagesChanged: ({ messages }) => setMessages([...messages]),
    });
    return unsubscribe;
  }, [agent]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || agent.isRunning) return;
    setError(undefined);
    setRunning(true);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    try {
      await agent.runAgent({ tools: [haikuTool] }, {
        onRunErrorEvent: ({ event }) => setError(event.message),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // The tool runs here, after the run ends; no follow-up run is needed.
      agent.addMessages(answerToolCalls(agent.messages, (haiku) => onHaikuRef.current(haiku)));
      setRunning(false);
    }
  }

  return { messages, running, error, send };
}

export function Chat({ onHaiku }: { onHaiku: (haiku: Haiku) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, running, error, send } = useHaikuChat(onHaiku);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages, error]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (running || !draft.trim()) return;
    void send(draft);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  if (!open) {
    return <button className="chat-toggle" aria-label="Open chat" onClick={() => setOpen(true)}>✎</button>;
  }

  const results = new Map(messages.flatMap((m) => (m.role === "tool" ? [[m.toolCallId, m] as const] : [])));
  return (
    <aside className="chat" aria-label="Haiku chat">
      <header>
        <h2>Your haiku companion</h2>
        <button aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
      </header>
      <div className="chat-log" aria-live="polite">
        {messages.map((message) => {
          if (message.role === "user") {
            return <p key={message.id} className="bubble user">{String(message.content)}</p>;
          }
          if (message.role !== "assistant") return null;
          const assistant = message as AssistantMessage;
          return (
            <div key={message.id}>
              {assistant.content && <p className="bubble assistant">{assistant.content}</p>}
              {assistant.toolCalls?.map((call) => {
                const result = results.get(call.id);
                if (result?.error) return <p key={call.id} className="bubble error">{result.error}</p>;
                const args = partialArgs(call.function.arguments);
                return (
                  <div key={call.id} className="tool-preview">
                    {args.japanese?.length ? <HaikuCard haiku={args} /> : <p>Composing your haiku…</p>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {running && messages.at(-1)?.role === "user" && <p className="bubble assistant pending">…</p>}
        {error && <p className="bubble error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>
      <div className="suggestions">
        {suggestions.map(({ title, message }) => (
          <button key={title} disabled={running} onClick={() => void send(message)}>{title}</button>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea aria-label="Message" rows={2} placeholder="Ask for a haiku…" value={draft}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} />
        <button type="submit" disabled={running || !draft.trim()}>Send</button>
      </form>
    </aside>
  );
}
