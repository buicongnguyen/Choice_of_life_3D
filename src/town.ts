/**
 * The living town: which season each chapter falls in, who wanders the streets, and when
 * the sky fills with fireworks. Data only; world.ts draws it.
 */
export type Season = "spring" | "summer" | "autumn" | "winter";

/** One season per chapter, matching the story (festival summers, the winter before the voyage). */
export const SEASONS: Season[] = ["spring", "summer", "autumn", "summer", "autumn", "summer", "spring", "summer", "winter", "spring", "autumn", "summer"];
export const seasonOf = (chapter: number): Season => SEASONS[chapter] ?? "summer";


/** Townsfolk strolling through a scene: how many, and what ages. */
export const WALKERS: Record<string, ("kid" | "adult" | "elder")[]> = {
  gardens: ["adult"],
  schoolyard: ["kid", "kid", "adult"],
  pier: ["adult", "kid", "elder", "adult"],
  station: ["adult", "adult", "elder"],
  rooftop: ["adult", "adult"],
  square: ["adult", "elder", "kid", "adult"],
  cottage: ["elder"],
  clifftop: ["adult", "kid", "elder"],
};
export const TOWN_LINES = 12;

/** Chapters whose sky ends in fireworks (the rooftop party and the last festival). */
export const FIREWORKS = new Set([7, 11]);

/** Townsfolk clothes: bright, warm, never beige. */
export const TOWN_TOPS = ["ff7a45", "2f7de1", "ffc234", "1fb8a8", "ff5f8f", "8c5cf0", "ee3b3b", "5fb84a"];
