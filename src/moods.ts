/**
 * Faces. The person you're talking to wears a mood while they ask (from this table, by
 * moment id, so it never depends on the language) and another while they answer (from
 * what your choice did to them).
 */
import type { Effect } from "./content";

export type Mood = "neutral" | "happy" | "sad" | "surprised" | "worried" | "cross";
export const MOODS: Mood[] = ["neutral", "happy", "sad", "surprised", "worried", "cross"];

const ASKING: Record<string, Mood> = {
  "c1.kite": "happy",
  "c1.mum": "happy",
  "c1.dad": "happy",
  "c2.boat": "sad",
  "c2.dad": "happy",
  "c2.mum": "worried",
  "c2.nana": "happy",
  "c3.lunchbox": "worried",
  "c3.lin": "surprised",
  "c3.rowan": "happy",
  "c3.maya": "happy",
  "c4.race": "surprised",
  "c4.dad": "happy",
  "c4.nana": "happy",
  "c4.maya": "happy",
  "c5.storm": "worried",
  "c5.nana": "worried",
  "c5.mum": "worried",
  "c5.dad": "worried",
  "c6.road": "neutral",
  "c6.rowan": "sad",
  "c6.maya": "surprised",
  "c6.mum": "sad",
  "c7.voss": "happy",
  "c7.dad": "worried",
  "c7.rowan": "cross",
  "c7.maya": "happy",
  "c8.heart": "surprised",
  "c8.maya": "happy",
  "c8.mum": "happy",
  "c9.care": "worried",
  "c9.partner": "happy",
  "c9.rowan": "worried",
  "c9.pip": "neutral",
  "c10.vote": "neutral",
  "c10.rowan": "sad",
  "c10.maya": "happy",
  "c10.mum": "sad",
  "c10.pip": "worried",
  "c11.shop": "surprised",
  "c11.rowan": "happy",
  "c11.partner": "happy",
  "c11.maya": "happy",
  "c12.rowan": "happy",
  "c12.partner": "happy",
  "c12.pip": "neutral",
  "c12.maya": "happy",
  "c12.tobias": "sad",
};

export const askingMood = (id: string): Mood => ASKING[id] ?? "neutral";
export const MOOD_IDS = Object.keys(ASKING);

/** How the speaker takes your answer: warmth makes them smile, a cold choice lands. */
export function replyMood(e: Effect): Mood {
  const bonds = (["family", "rowan", "maya", "partner"] as const).reduce((n, b) => n + (e[b] ?? 0), 0);
  if (bonds < 0) return (e.joy ?? 0) < -3 ? "sad" : "cross";
  if (bonds >= 2 || (e.joy ?? 0) >= 4) return "happy";
  if (bonds > 0) return "happy";
  if ((e.joy ?? 0) < 0 || (e.health ?? 0) < 0) return "worried";
  return "neutral";
}
