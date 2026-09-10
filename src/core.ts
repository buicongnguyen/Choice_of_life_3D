import { chapters, careerFor, type Scores, type Facts } from "./content";
export const SAVE_KEY = "choice-of-life-3d-v1";
export type Identity = {
  gender: "male" | "female";
  skin: number;
  name: string;
};
export type Memory = {
  id: string;
  chapter: number;
  title: string;
  text: string;
  effect: Scores;
};
export type Life = {
  version: 1;
  chapter: number;
  scores: Scores;
  facts: Facts;
  choices: Record<string, number>;
  discoveries: string[];
  hazards: number[];
  memories: Memory[];
  identity: Identity;
  position: { x: number; z: number };
  complete: boolean;
};
export const scoreKeys = ["health", "happiness", "money"] as const;
export function newLife(identity: Identity): Life {
  return {
    version: 1,
    chapter: 0,
    scores: { health: 65, happiness: 60, money: 45 },
    facts: {},
    choices: {},
    discoveries: [],
    hazards: [],
    memories: [],
    identity,
    position: { x: 0, z: 2.6 },
    complete: false,
  };
}
export const choiceId = (chapter: number, encounter: number) =>
  `${chapter}:${encounter}`;
export const resolved = (s: Life, i: number) =>
  Object.hasOwn(s.choices, choiceId(s.chapter, i));
export const chapterDone = (s: Life) =>
  chapters[s.chapter].encounters.every((_, i) => resolved(s, i));
function apply(s: Life, delta: Partial<Scores>): Scores {
  const actual = { health: 0, happiness: 0, money: 0 };
  for (const k of scoreKeys) {
    const before = s.scores[k];
    s.scores[k] = Math.max(0, Math.min(100, before + (delta[k] ?? 0)));
    actual[k] = s.scores[k] - before;
  }
  return actual;
}
export function choose(state: Life, encounter: number, option: number): Life {
  if (state.complete || resolved(state, encounter)) return state;
  const pick = chapters[state.chapter]?.encounters[encounter]?.options[option];
  if (!pick) return state;
  const s = structuredClone(state),
    id = choiceId(s.chapter, encounter);
  s.choices[id] = option;
  const effect = apply(s, pick.effect);
  if (pick.fact) s.facts[pick.fact[0]] = pick.fact[1];
  s.memories.push({
    id,
    chapter: s.chapter,
    title: pick.label,
    text: pick.memory,
    effect,
  });
  return s;
}
export function discover(state: Life, index: number): Life {
  const id = `${state.chapter}:${index}`;
  if (
    state.complete ||
    state.discoveries.includes(id) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > 2
  )
    return state;
  const s = structuredClone(state);
  s.discoveries.push(id);
  const key = scoreKeys[index];
  const effect = apply(s, { [key]: 4 });
  s.memories.push({
    id: `found:${id}`,
    chapter: s.chapter,
    title: chapters[s.chapter].discoveries[index],
    text: "You made a little time for something that mattered.",
    effect,
  });
  return s;
}
export function hazard(state: Life): Life {
  if (state.complete || state.hazards.includes(state.chapter)) return state;
  const s = structuredClone(state);
  s.hazards.push(s.chapter);
  apply(s, { health: -3 });
  return s;
}
export function advance(state: Life): Life {
  if (state.complete || !chapterDone(state)) return state;
  const s = structuredClone(state);
  s.position = { x: 0, z: 2.6 };
  if (s.chapter === chapters.length - 1) s.complete = true;
  else s.chapter++;
  return s;
}
export function biography(s: Life): string[] {
  const f = s.facts;
  return [
    `It began with ${f.beginning === "comfort" ? "a cuddle" : f.beginning === "curiosity" ? "a little melody" : "a quiet afternoon"} and a blue tin holding a ${f.tin ?? "small treasure"}.`,
    `You found your way into ${careerFor(f).toLowerCase()} work through ${f.education === "university" ? "university" : f.education === "training" ? "practical training" : "learning on the job"}. ${f.work === "ambitious" ? "You took on difficult things." : f.work === "supportive" ? "You made room for others." : "You looked for a rhythm you could sustain."}`,
    f.home === "partnered"
      ? `You built a home with ${f.partner}. Love lived in the ordinary days you shared.`
      : f.home === "community"
        ? "Your community became a home bigger than any building."
        : "Your independent life was full of friends and chosen family.",
    `Rowan remembered you across the years. ${f.reunion === "share" ? "The toy boat found another childhood." : "The old toy boat still had a story to tell."}`,
    f.gift === "knowledge"
      ? "You left knowledge and encouragement for the next person."
      : f.gift === "opportunity"
        ? "You gave someone else room to begin."
        : "You left the world with a little more room for belonging.",
  ];
}
export function parseLife(raw: string | null): Life | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const s = JSON.parse(raw) as Life;
    if (
      s.version !== 1 ||
      !Number.isInteger(s.chapter) ||
      s.chapter < 0 ||
      s.chapter >= chapters.length ||
      typeof s.complete !== "boolean"
    )
      return null;
    if (
      !s.scores ||
      scoreKeys.some(
        (k) =>
          !Number.isFinite(s.scores[k]) || s.scores[k] < 0 || s.scores[k] > 100,
      )
    )
      return null;
    if (
      !s.identity ||
      !["male", "female"].includes(s.identity.gender) ||
      !Number.isInteger(s.identity.skin) ||
      s.identity.skin < 0 ||
      s.identity.skin > 3 ||
      typeof s.identity.name !== "string" ||
      s.identity.name.length > 24
    )
      return null;
    if (
      !s.position ||
      !Number.isFinite(s.position.x) ||
      !Number.isFinite(s.position.z) ||
      Math.abs(s.position.x) > 6 ||
      Math.abs(s.position.z) > 4.3
    )
      return null;
    if (
      !s.choices ||
      typeof s.choices !== "object" ||
      Array.isArray(s.choices) ||
      Object.keys(s.choices).length > 24
    )
      return null;
    const expectedFacts: Facts = {};
    for (const [id, option] of Object.entries(s.choices)) {
      if (!/^\d+:\d+$/.test(id) || !Number.isInteger(option)) return null;
      const [ch, en] = id.split(":").map(Number);
      const pick = chapters[ch]?.encounters[en]?.options[option];
      if (!pick || ch > s.chapter) return null;
      if (pick.fact) expectedFacts[pick.fact[0]] = pick.fact[1];
    }
    for (let ch = 0; ch < s.chapter; ch++)
      if (
        chapters[ch].encounters.some(
          (_, i) => !Object.hasOwn(s.choices, choiceId(ch, i)),
        )
      )
        return null;
    if (s.complete && (s.chapter !== 11 || !chapterDone(s))) return null;
    if (
      !s.facts ||
      JSON.stringify(Object.entries(s.facts).sort()) !==
        JSON.stringify(Object.entries(expectedFacts).sort())
    )
      return null;
    if (
      !Array.isArray(s.discoveries) ||
      s.discoveries.length > 36 ||
      new Set(s.discoveries).size !== s.discoveries.length ||
      s.discoveries.some(
        (id) =>
          typeof id !== "string" ||
          !/^\d+:[0-2]$/.test(id) ||
          Number(id.split(":")[0]) > s.chapter,
      )
    )
      return null;
    if (
      !Array.isArray(s.hazards) ||
      s.hazards.length > 12 ||
      s.hazards.some((n) => !Number.isInteger(n) || n < 0 || n > s.chapter)
    )
      return null;
    if (
      !Array.isArray(s.memories) ||
      s.memories.length > 60 ||
      s.memories.some(
        (m) =>
          !m ||
          typeof m.text !== "string" ||
          m.text.length > 600 ||
          typeof m.title !== "string" ||
          m.title.length > 100 ||
          !Number.isInteger(m.chapter) ||
          m.chapter < 0 ||
          m.chapter > s.chapter,
      )
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
