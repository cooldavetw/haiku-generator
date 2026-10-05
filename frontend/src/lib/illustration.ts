import { backendUrl } from "./backend";
import type { Haiku } from "./haiku";

/**
 * Ask FastAPI's image model for an illustration of the poem.
 *
 * Resolves to an object URL for the image, or undefined when illustrations
 * are off or drawing failed; the poem then keeps its local illustration.
 */
export async function requestIllustration(haiku: Haiku, base?: string): Promise<string | undefined> {
  try {
    const response = await fetch(backendUrl("illustration", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ japanese: haiku.japanese, english: haiku.english }),
    });
    if (!response.ok) return undefined;
    const image = await response.blob();
    return image.type.startsWith("image/") ? URL.createObjectURL(image) : undefined;
  } catch {
    return undefined;
  }
}
