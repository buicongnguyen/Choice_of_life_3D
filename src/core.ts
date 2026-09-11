import { chapters, careerFor, type Scores, type Facts } from "./content";
import {
  activity,
  allowedActions,
  canChoose,
  conversation,
  guestNames,
  record,
  responseFor,
  taskComplete,
  taskResult,
  boatEnding,
  type ActivityRecord,
} from "./journey";
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
  activities: Record<string, ActivityRecord>;
  meetings: string[];
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
    activities: {},
    meetings: [],
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
  if (
    state.complete ||
    !Number.isInteger(encounter) ||
    !Number.isInteger(option) ||
    resolved(state, encounter)
  )
    return state;
  if (
    !chapters[state.chapter]?.encounters[encounter]?.options[option] ||
    !canChoose(state, encounter, option)
  )
    return state;
  const pick = conversation(state, encounter).options[option];
  const s = structuredClone(state),
    id = choiceId(s.chapter, encounter);
  s.choices[id] = option;
  const effect = apply(s, pick.effect);
  if (pick.fact) s.facts[pick.fact[0]] = pick.fact[1];
  s.memories.push({
    id,
    chapter: s.chapter,
    title: pick.label,
    text: `${pick.memory} ${responseFor(s, encounter)}`,
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
  const effect = apply(s, { [key]: 1 });
  s.memories.push({
    id: `found:${id}`,
    chapter: s.chapter,
    title: chapters[s.chapter].discoveries[index],
    text: `${chapters[s.chapter].discoveries[index]}: a small moment for ${index === 0 ? "your wellbeing" : index === 1 ? "a little joy" : "tomorrow's security"}.`,
    effect,
  });
  return s;
}
export function meet(state: Life, index: number): Life {
  const name = guestNames[index];
  if (
    state.complete ||
    state.chapter !== 7 ||
    !name ||
    state.meetings.includes(name)
  )
    return state;
  const s = structuredClone(state);
  s.meetings.push(name);
  return s;
}
export function perform(state: Life, action: string): Life {
  if (!allowedActions(state).some((a) => a.id === action)) return state;
  const s = structuredClone(state),
    previous = record(s);
  const actions = [...previous.actions, action];
  const complete = taskComplete(s, actions);
  s.activities[String(s.chapter)] = { actions, complete };
  if (complete) {
    const result = taskResult(s);
    s.memories.push({
      id: `activity:${s.chapter}`,
      chapter: s.chapter,
      title: activity(s).keepsake,
      text: result.text,
      effect: apply(s, result.effect),
    });
  }
  return s;
}
export function undoActivity(state: Life): Life {
  const r = record(state);
  if (
    state.complete ||
    r.complete ||
    activity(state).kind !== "planner" ||
    !r.actions.length
  )
    return state;
  const s = structuredClone(state);
  s.activities[String(s.chapter)].actions.pop();
  return s;
}
export function assistActivity(state: Life): Life {
  let s = state;
  // Bounded authored tasks; assistance uses exactly the same transition rules.
  for (let i = 0; i < 8 && !record(s).complete; i++) {
    const options = allowedActions(s);
    if (!options.length) break;
    const plan =
      s.chapter === 4
        ? ["study", "rest", "friends"]
        : s.chapter === 6
          ? ["service", "quality", "rest"]
          : ["visit", "support", "rest"];
    const preferred =
      activity(s).kind === "planner"
        ? plan[record(s).actions.length]
        : s.chapter === 1
          ? record(s).actions.includes("basket")
            ? "repair"
            : "basket"
          : "";
    s = perform(
      s,
      options.find((a) => a.id === preferred)?.id ?? options[0].id,
    );
  }
  return s;
}
export function hazard(state: Life): Life {
  if (
    state.complete ||
    state.chapter < 2 ||
    state.chapter > 9 ||
    state.hazards.includes(state.chapter)
  )
    return state;
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
    `Rowan remembered you across the years. ${boatEnding(s)} ${f.reunion === "share" ? "You passed it on to another childhood." : "You kept a place for an old friendship."}`,
    f.gift === "knowledge"
      ? "You left knowledge and encouragement for the next person."
      : f.gift === "opportunity"
        ? "You gave someone else room to begin."
        : "You left the world with a little more room for belonging.",
    `The ${f.project ?? "first"} school project and ${f.club ?? "school"} club gave your ${f.hobby ?? "childhood"} interests somewhere to grow. You learned to protect ${f.rhythm === "rest" ? "rest" : f.rhythm === "friends" ? "friendship" : "time to practise"}.`,
    `When Mum needed help, you ${f.care === "present" ? "made time to be there" : f.care === "support" ? "arranged skilled support" : "built a network of support"}. At work you ${f.midlife === "promotion" ? "accepted a promotion" : f.midlife === "time" ? "chose a lighter schedule" : "asked for flexibility"}. These choices shaped the busy middle of your life.`,
    `Your experience became ${f.legacy === "mentor" ? "time spent mentoring" : f.legacy === "builder" ? "a guide for others" : "connections between people"}. Retirement made room for ${f.retirement === "garden" ? "a garden" : f.retirement === "travel" ? "a long-imagined journey" : "a quiet creative routine"}.`,
    `Looking back, you chose to hold close ${f.meaning === "people" ? "the people who made room for you" : f.meaning === "work" ? "the things you helped make possible" : "the ordinary days"}. ${Object.values(s.activities).filter((r) => r.complete).length} hands-on moments found a place in your tin.`,
  ];
}
export function parseLife(raw: string | null): Life | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const s = JSON.parse(raw) as Life;
    // Additive migration preserves every existing score, choice and memory.
    if (s.activities === undefined) s.activities = {};
    if (s.meetings === undefined)
      s.meetings = guestNames.includes(s.facts?.partner)
        ? [s.facts.partner]
        : [];
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
      if (!/^(0|[1-9]\d*):(0|1)$/.test(id) || !Number.isInteger(option))
        return null;
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
      typeof s.facts !== "object" ||
      Array.isArray(s.facts) ||
      JSON.stringify(Object.entries(s.facts).sort()) !==
        JSON.stringify(Object.entries(expectedFacts).sort())
    )
      return null;
    if (
      !Array.isArray(s.meetings) ||
      new Set(s.meetings).size !== s.meetings.length ||
      s.meetings.some((name) => !guestNames.includes(name)) ||
      (s.chapter < 7 && s.meetings.length)
    )
      return null;
    if (
      !s.activities ||
      typeof s.activities !== "object" ||
      Array.isArray(s.activities) ||
      Object.keys(s.activities).length > 12
    )
      return null;
    for (const [key, progress] of Object.entries(s.activities)) {
      if (
        !/^(0|[1-9]\d*)$/.test(key) ||
        Number(key) > s.chapter ||
        !progress ||
        !Array.isArray(progress.actions) ||
        progress.actions.length > 6 ||
        typeof progress.complete !== "boolean"
      )
        return null;
      const replay = {
        ...s,
        chapter: Number(key),
        complete: false,
        activities: {
          ...s.activities,
          [key]: { actions: [] as string[], complete: false },
        },
      };
      for (const action of progress.actions) {
        if (!allowedActions(replay).some((a) => a.id === action)) return null;
        replay.activities[key].actions.push(action);
        replay.activities[key].complete = taskComplete(
          replay,
          replay.activities[key].actions,
        );
      }
      if (replay.activities[key].complete !== progress.complete) return null;
    }
    if (
      !Array.isArray(s.discoveries) ||
      s.discoveries.length > 36 ||
      new Set(s.discoveries).size !== s.discoveries.length ||
      s.discoveries.some(
        (id) =>
          typeof id !== "string" ||
          !/^(0|[1-9]\d*):[0-2]$/.test(id) ||
          Number(id.split(":")[0]) > s.chapter,
      )
    )
      return null;
    if (
      !Array.isArray(s.hazards) ||
      s.hazards.length > 12 ||
      new Set(s.hazards).size !== s.hazards.length ||
      s.hazards.some(
        (n) => !Number.isInteger(n) || n < 2 || n > 9 || n > s.chapter,
      )
    )
      return null;
    if (
      !Array.isArray(s.memories) ||
      s.memories.length !==
        Object.keys(s.choices).length +
          s.discoveries.length +
          Object.values(s.activities).filter((r) => r.complete).length ||
      s.memories.some(
        (m) =>
          !m ||
          typeof m.id !== "string" ||
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
    const memoryIds = new Set<string>();
    for (const memory of s.memories) {
      if (memoryIds.has(memory.id)) return null;
      memoryIds.add(memory.id);
      if (memory.id.startsWith("activity:")) {
        const key = memory.id.slice(9);
        if (key !== String(memory.chapter) || !s.activities[key]?.complete)
          return null;
        const nominal = taskResult({ ...s, chapter: memory.chapter }).effect;
        if (
          !memory.effect ||
          scoreKeys.some(
            (k) =>
              !Number.isFinite(memory.effect[k]) ||
              Math.abs(memory.effect[k]) > Math.abs(nominal[k] ?? 0) ||
              (memory.effect[k] !== 0 &&
                Math.sign(memory.effect[k]) !== Math.sign(nominal[k] ?? 0)),
          )
        )
          return null;
        continue;
      }
      const discovery = memory.id.startsWith("found:");
      const id = discovery ? memory.id.slice(6) : memory.id;
      if (
        discovery ? !s.discoveries.includes(id) : !Object.hasOwn(s.choices, id)
      )
        return null;
      const [chapter, index] = id.split(":").map(Number);
      if (memory.chapter !== chapter) return null;
      const nominal: Partial<Scores> = discovery
        ? { [scoreKeys[index]]: 4 }
        : chapters[chapter].encounters[index].options[s.choices[id]].effect;
      if (
        !memory.effect ||
        scoreKeys.some((key) => {
          const actual = memory.effect[key],
            expected = nominal[key] ?? 0;
          return (
            !Number.isFinite(actual) ||
            Math.abs(actual) > Math.abs(expected) ||
            (actual !== 0 && Math.sign(actual) !== Math.sign(expected))
          );
        })
      )
        return null;
    }
    return s;
  } catch {
    return null;
  }
}
