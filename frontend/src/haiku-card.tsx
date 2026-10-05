import { backgrounds, scenes, type Haiku } from "./lib/haiku";

export function HaikuCard({ haiku }: { haiku: Partial<Haiku> }) {
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
      {/* Relative, so the image resolves under the prefix the app is served at. */}
      {scene && <img className="scene" data-testid="haiku-image" src={`images/${scene}`} alt={scenes[scene]} width={800} height={360} />}
    </article>
  );
}
