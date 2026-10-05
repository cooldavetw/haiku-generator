import { z } from "zod";

export const scenes = {
  "mountain.svg": "Mount Fuji reflected in a still lake",
  "ocean.svg": "Gentle waves under a rising sun",
  "spring.svg": "Cherry blossoms beside a garden path",
} as const;

export const backgrounds = {
  mist: "linear-gradient(135deg, #f7faf7, #e5eeec)",
  dawn: "linear-gradient(135deg, #fff8ef, #f5e4dc)",
  blossom: "linear-gradient(135deg, #fff7f8, #f1e5ee)",
} as const;

export const haikuSchema = z.object({
  japanese: z.array(z.string().trim().min(1).max(120)).length(3)
    .describe("Exactly three Japanese haiku lines, aiming for 5-7-5 morae"),
  english: z.array(z.string().trim().min(1).max(200)).length(3)
    .describe("Exactly three English translation lines corresponding to the Japanese"),
  image_name: z.enum(["mountain.svg", "ocean.svg", "spring.svg"]),
  background: z.enum(["mist", "dawn", "blossom"]),
});

export type Haiku = z.infer<typeof haikuSchema>;
export type SavedHaiku = Haiku & { id: string };

export const sampleHaiku: Haiku = {
  japanese: ["春風や", "小川の岸に", "花ひとつ"],
  english: ["A breeze of spring—", "along the little river's bank,", "a single flower."],
  image_name: "spring.svg",
  background: "blossom",
};

export function addHaiku(history: SavedHaiku[], haiku: Haiku, id: string): SavedHaiku[] {
  return [{ ...haikuSchema.parse(haiku), id }, ...history].slice(0, 50);
}
