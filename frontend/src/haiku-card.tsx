import { backgrounds, scenes, type SavedHaiku } from "./lib/haiku";

export function HaikuCard({ haiku }: { haiku: Partial<SavedHaiku> }) {
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
      {(haiku.illustration || scene) && (
        <div className="scene-frame">
          {haiku.illustration ? (
            <img className="scene" data-testid="haiku-illustration" src={haiku.illustration}
              alt="Illustration drawn for this haiku" width={800} height={360} />
          ) : (
            // Relative, so the image resolves under the prefix the app is served at.
            <img className="scene" data-testid="haiku-image" src={`images/${scene}`} alt={scenes[scene!]} width={800} height={360} />
          )}
          {haiku.painting && <p className="painting">Painting an illustration…</p>}
        </div>
      )}
    </article>
  );
}
