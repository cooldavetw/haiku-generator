"use client";

import { useState } from "react";
import { CopilotKitProvider, CopilotSidebar, useConfigureSuggestions, useFrontendTool } from "@copilotkit/react-core/v2";
import { addHaiku, backgrounds, haikuSchema, sampleHaiku, scenes, type Haiku, type SavedHaiku } from "@/lib/haiku";
import type { BackendStatus } from "@/lib/backend";

export default function HaikuApp({ status }: { status: BackendStatus }) {
  if (status !== "ready") return <Garden configured={false} backendStatus={status} />;
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
      <ConnectedGarden />
    </CopilotKitProvider>
  );
}

function ConnectedGarden() {
  const [haikus, setHaikus] = useState<SavedHaiku[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useConfigureSuggestions({
    consumerAgentId: "tool_based_generative_ui",
    suggestions: [
      { title: "Nature", message: "Write me a haiku about nature." },
      { title: "Ocean", message: "Create a haiku about the ocean." },
      { title: "Spring", message: "Generate a haiku about spring." },
    ],
    available: "always",
  });

  useFrontendTool({
    agentId: "tool_based_generative_ui",
    name: "generate_haiku",
    description: "Display a new Japanese haiku with its English translation in the garden.",
    parameters: haikuSchema,
    followUp: false,
    handler: async (args) => {
      const haiku = haikuSchema.parse(args);
      const id = crypto.randomUUID();
      setHaikus((previous) => addHaiku(previous, haiku, id));
      setActiveIndex(0);
      return "Haiku displayed in the garden.";
    },
    render: ({ args }) => (
      <div className="tool-preview">
        {args.japanese?.length ? <HaikuCard haiku={args} /> : <p>Composing your haiku…</p>}
      </div>
    ),
  });

  return (
    <>
      <CopilotSidebar agentId="tool_based_generative_ui" defaultOpen={false}
        labels={{ modalHeaderTitle: "Your haiku companion" }} />
      <Garden configured haikus={haikus} activeIndex={activeIndex} onSelect={setActiveIndex} />
    </>
  );
}

function Garden({ configured, backendStatus, haikus = [], activeIndex = 0, onSelect }: {
  configured: boolean;
  backendStatus?: BackendStatus;
  haikus?: SavedHaiku[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const haiku = haikus[activeIndex] ?? sampleHaiku;
  return (
    <main className="garden">
      <header className="intro">
        <p className="eyebrow">A LITTLE SPACE FOR WONDER</p>
        <h1>Haiku Garden<span lang="ja">俳句の庭</span></h1>
        <p>Three lines. A fleeting moment. A world within.</p>
      </header>
      {!configured && (
        <aside className="setup" role="status">
          <strong>Your garden is ready to connect.</strong>
          {backendStatus === "unconfigured" ? (
            <p>Add <code>OPENAI_API_KEY</code> to <code>.env.local</code> in the repository root, restart FastAPI, and refresh this page. The poem below is a sample.</p>
          ) : (
            <p>Start the FastAPI service with <code>python main.py</code> from the repository root, then refresh this page. If it runs elsewhere, check <code>AGENT_URL</code> in <code>frontend/.env.local</code>. The poem below is a sample.</p>
          )}
        </aside>
      )}
      <section className="poem-gallery" aria-label="Haiku collection" data-testid="haiku-carousel">
        <div aria-live="polite" aria-atomic="true">
          <p className="poem-label">{haikus.length ? "YOUR COLLECTION" : "A MOMENT TO BEGIN"}</p>
          <HaikuCard haiku={haiku} />
        </div>
        {haikus.length > 1 && (
          <nav className="carousel-controls" aria-label="Browse haikus">
            <button aria-label="Previous haiku" disabled={activeIndex === 0} onClick={() => onSelect?.(activeIndex - 1)}>← Previous</button>
            <span>{activeIndex + 1} / {haikus.length}</span>
            <button aria-label="Next haiku" disabled={activeIndex === haikus.length - 1} onClick={() => onSelect?.(activeIndex + 1)}>Next →</button>
          </nav>
        )}
      </section>
      <footer>{configured ? "Open the chat in the corner and choose a subject that moves you." : "Japanese verse · English translations · Moments of stillness"}</footer>
    </main>
  );
}

function HaikuCard({ haiku }: { haiku: Partial<Haiku> }) {
  const scene = haiku.image_name && Object.hasOwn(scenes, haiku.image_name) ? haiku.image_name : undefined;
  const background = haiku.background && Object.hasOwn(backgrounds, haiku.background) ? backgrounds[haiku.background] : backgrounds.mist;
  return (
    <article className="haiku-card" style={{ background }} data-testid="haiku-card">
      <div className="haiku-lines">
        {haiku.japanese?.map((line, index) => (
          <div className="haiku-line" key={index}>
            <p lang="ja" className="japanese" data-testid="haiku-japanese-line">{line}</p>
            <p className="english" data-testid="haiku-english-line">{haiku.english?.[index]}</p>
          </div>
        ))}
      </div>
      {scene && <img className="scene" data-testid="haiku-image" src={`/images/${scene}`} alt={scenes[scene]} width={800} height={360} />}
    </article>
  );
}
