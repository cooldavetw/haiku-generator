import { useEffect, useState } from "react";
import { randomUUID } from "@ag-ui/client";
import { Chat } from "./chat";
import { HaikuCard } from "./haiku-card";
import { getBackendStatus, type BackendStatus } from "./lib/backend";
import { addHaiku, sampleHaiku, type Haiku, type SavedHaiku } from "./lib/haiku";

export default function HaikuApp() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [haikus, setHaikus] = useState<SavedHaiku[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void getBackendStatus().then(setStatus);
  }, []);

  function show(haiku: Haiku) {
    setHaikus((previous) => addHaiku(previous, haiku, randomUUID()));
    setActiveIndex(0);
  }

  return (
    <>
      {status === "ready" && <Chat onHaiku={show} />}
      <Garden status={status} haikus={haikus} activeIndex={activeIndex} onSelect={setActiveIndex} />
    </>
  );
}

function Garden({ status, haikus, activeIndex, onSelect }: {
  status: BackendStatus;
  haikus: SavedHaiku[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const haiku = haikus[activeIndex] ?? sampleHaiku;
  return (
    <main className="garden">
      <header className="intro">
        <p className="eyebrow">A LITTLE SPACE FOR WONDER</p>
        <h1>Haiku Garden<span lang="ja">俳句の庭</span></h1>
        <p>Three lines. A fleeting moment. A world within.</p>
      </header>
      {(status === "unconfigured" || status === "unavailable") && (
        <aside className="setup" role="status">
          <strong>Your garden is ready to connect.</strong>
          {status === "unconfigured" ? (
            <p>Set <code>OPENAI_API_KEY</code> in the backend environment (locally, <code>.env.local</code> in the repository root), restart FastAPI, and refresh this page. The poem below is a sample.</p>
          ) : (
            <p>The FastAPI service is not responding. Start it with <code>python main.py</code> from the repository root, then refresh this page. The poem below is a sample.</p>
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
            <button aria-label="Previous haiku" disabled={activeIndex === 0} onClick={() => onSelect(activeIndex - 1)}>← Previous</button>
            <span>{activeIndex + 1} / {haikus.length}</span>
            <button aria-label="Next haiku" disabled={activeIndex === haikus.length - 1} onClick={() => onSelect(activeIndex + 1)}>Next →</button>
          </nav>
        )}
      </section>
      <footer>{status === "ready" ? "Open the chat in the corner and choose a subject that moves you." : "Japanese verse · English translations · Moments of stillness"}</footer>
    </main>
  );
}
