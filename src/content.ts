/**
 * Kitehaven — the story of one whole life in a bright harbour town.
 *
 * Structure per chapter: one main moment (required, free), several side moments and one
 * activity that each cost an hour of free time (usually two hours per chapter), and three
 * small discoveries that cost nothing. Facts set by choices are read back by later text,
 * options and the ending, so the town remembers what you did.
 */
import type { Life } from "./core";
import { u } from "./i18n";

export type Stat = "health" | "joy" | "savings";
export type BondKey = "family" | "rowan" | "maya" | "partner";
export type Effect = Partial<Record<Stat | BondKey, number>>;
export type Text = string | ((l: Life) => string);
export type Facts = Record<string, string>;
export interface Need {
  test: (l: Life) => boolean;
  why: string;
}
export interface Option {
  label: Text;
  hint: Text;
  effect: Effect | ((l: Life) => Effect);
  facts?: Facts | ((l: Life) => Facts);
  need?: Need;
  show?: (l: Life) => boolean;
  reply: Text;
  memory: Text;
}
export interface Moment {
  id: string;
  kind: "main" | "side";
  who: string;
  title: Text;
  prompt: Text;
  context?: (l: Life) => string | undefined;
  options: Option[];
  when?: (l: Life) => boolean;
}
export interface HuntItem {
  name: string;
  prop: string;
  line: string;
}
export interface PlanBlock {
  id: string;
  label: Text;
  detail: string;
  effect: Effect;
}
export type KiteGrade = "soar" | "steady" | "wobbly";
export interface Activity {
  id: string;
  kind: "hunt" | "kite" | "plan";
  who?: string;
  title: Text;
  intro: Text;
  keepsake: string;
  icon: string;
  items?: HuntItem[];
  blocks?: PlanBlock[];
  wind?: number;
  result: (l: Life, r: { plan?: string[]; grade?: KiteGrade }) => { effect: Effect; text: string; facts?: Facts };
}
export interface Discovery {
  name: string;
  prop: string;
  stat: Stat;
  line: string;
}
export type Env = "morning" | "afternoon" | "festival" | "storm" | "dawn" | "day" | "sunset" | "evening" | "overcast" | "golden" | "dusk";
export interface Chapter {
  title: string;
  age: string;
  place: string;
  scene: string;
  env: Env;
  intro: Text;
  objective: Text;
  free: number;
  cast: [string, number, ((l: Life) => boolean)?][];
  moments: Moment[];
  activity: Activity;
  finds: [Discovery, Discovery, Discovery];
  guests?: string[];
}
export type Kind = "baby" | "kid" | "adult" | "elder";
export interface Look {
  kind: Kind;
  skin: string;
  hair: string;
  style: string;
  top: string;
  bottom: string;
  shoes: string;
  accent: string;
  acc: string[];
  scale?: number;
}
export interface Person {
  name: string;
  role: (l: Life) => string;
  color: string;
  look: (chapter: number, l: Life) => Look;
  bark: (l: Life) => string;
  /** First meeting line for the guests on the roof. */
  meet?: string;
}

// ---------------------------------------------------------------------------
// helpers used by the text
// ---------------------------------------------------------------------------
export const text = (t: Text, l: Life) => (typeof t === "function" ? t(l) : t);
export const kiteColours: Record<string, { name: string; hex: string }> = {
  red: { name: "sunrise-red", hex: "ee3b3b" },
  blue: { name: "sea-glass blue", hex: "2fa6e8" },
  yellow: { name: "lemon-yellow", hex: "ffd12e" },
};
export const kiteName = (l: Life) => lexicon.kite[(l.facts.kite ?? "red") as KiteKey] ?? kiteColours[l.facts.kite ?? "red"].name;
export type KiteKey = "red" | "blue" | "yellow";
export function interest(l: Life): "build" | "draw" | "care" {
  const f = l.facts;
  if (f.interest === "build" || f.interest === "draw" || f.interest === "care") return f.interest;
  if (f.careSpark === "yes") return "care";
  return f.spark === "bold" ? "build" : f.spark === "steady" ? "care" : "draw";
}
export type CareerKey = `${"build" | "draw" | "care"}.${"city" | "home" | "sea"}`;
export function careerKey(l: Life, road = l.facts.road): CareerKey {
  return `${interest(l)}.${(road ?? "home") as "city" | "home" | "sea"}`;
}
export const career = (l: Life, road = l.facts.road) => lexicon.career[careerKey(l, road)];
export const aOrAn = (s: string) => `${/^[AEIOU]/i.test(s) ? "an" : "a"} ${s.toLowerCase()}`;
export const workplaceVariant = (l: Life) => ({ build: "workshop", draw: "studio", care: "clinic" })[interest(l)];
export const partnered = (l: Life) => !!l.facts.partner && l.facts.partner !== "none";
/** The partner's display name (localised); l.facts.partner stays the stable English key. */
export const partnerName = (l: Life) => (partnered(l) ? (people[l.facts.partner.toLowerCase()]?.name ?? l.facts.partner) : "");
export const partnerId = (l: Life) => (partnered(l) ? l.facts.partner.toLowerCase() : "");
export const pipIsYours = (l: Life) => partnered(l);
export const pipRole = (l: Life) => (pipIsYours(l) ? "your kid" : "Rowan's kid, and your godchild");
export const pierState = (l: Life) => (l.facts.pier as "restored" | "shared" | "marina" | undefined) ?? "ruined";
export type AllyKey = "rowan" | "maya" | "quinn" | "record" | "tobias" | "rally";
/** Who stands with you at the vote (keys; the lexicon names them in the current language). */
export function allyKeys(l: Life) {
  const list: AllyKey[] = [];
  if (l.bonds.rowan >= 3) list.push("rowan");
  if (l.facts.mayaPlan === "shared" || l.facts.mayaPlan === "kept") list.push("maya");
  if (l.facts.partner === "Quinn" && l.facts.dream === "backed") list.push("quinn");
  if (l.facts.voss && l.facts.voss !== "joined") list.push("record");
  if (l.facts.lunchbox === "stood") list.push("tobias");
  if (l.facts.rally === "yes") list.push("rally");
  return list;
}
export const allies = (l: Life) => allyKeys(l).map((k) => lexicon.ally[k]);

// ---------------------------------------------------------------------------
// the lexicon: words used by the rules, the journal and the ending. A translation
// replaces this object wholesale (see src/lang/*.ts), so keep every field here.
// ---------------------------------------------------------------------------
export type ArchetypeKey = "keeper" | "heart" | "wanderer" | "builder" | "friend" | "ordinary";
export const lexicon = {
  kite: { red: "sunrise-red", blue: "sea-glass blue", yellow: "lemon-yellow" } as Record<KiteKey, string>,
  career: {
    "build.city": "Structural engineer", "build.home": "Boatbuilder", "build.sea": "Ship's engineer",
    "draw.city": "Designer", "draw.home": "Kite-maker", "draw.sea": "Travelling illustrator",
    "care.city": "Doctor", "care.home": "Harbour nurse", "care.sea": "Coastguard medic",
  } as Record<CareerKey, string>,
  ally: {
    rowan: "Rowan's fishing co-op", maya: "Maya's drawings", quinn: "Councillor Quinn",
    record: "your own record", tobias: "Tobias's grudging respect", rally: "the neighbours you rallied",
  } as Record<AllyKey, string>,
  keepsake: {
    kiteTitle: (l: Life) => `Your ${kiteName(l)} kite`,
    kiteText: "Nana June's gift. It knew you forever.",
    medalTitle: "Junior race medal",
    medalText: "Heavy, real, and with your name on it.",
    rosetteTitle: "Rowan's rosette",
    rosetteText: "Third place. He gave it to you.",
    keyTitle: "The lighthouse key",
    keyText: "“Somebody should keep the light on.”",
  },
  archetype: {
    keeper: ["The Keeper of the Light", "The Old Pier stands, the lighthouse turns, and the town you loved is still the town you loved."],
    heart: ["The Heart of the House", "Every kitchen you ever stood in was full, and noisy, and yours."],
    wanderer: ["The Wanderer", "You saw the world, and the world kept sending you home."],
    builder: ["The Builder", "You built things that will outlast you — and learned, late, what they cost."],
    friend: ["The Friend", "Two people knew you your whole life, and chose you every single time."],
    ordinary: ["A Whole, Ordinary Life", "No monuments. Just a town full of people who are glad you were in it."],
  } as Record<ArchetypeKey, [string, string]>,
  /** The epilogue: one line per turning point, in the order of a life. */
  endingLines: (l: Life): string[] => {
    const f = l.facts;
    const lines: string[] = [];
    lines.push(`It began with a ${kiteName(l)} kite and a laugh every nine seconds.`);
    lines.push(
      f.boat === "truth"
        ? "You told the truth about a toy boat when you were four, and learned how fast trust can grow."
        : f.boat === "confessed"
          ? "You told Rowan the truth about his boat in the end. He had always known."
          : f.boat === "cat"
            ? "Somewhere, a cat was blamed for a boat it never took. It never forgave you."
            : "You carried a secret the size of a toy boat for your whole life.",
    );
    lines.push(
      f.lunchbox === "stood"
        ? "You stood up to Tobias Voss when it cost you something, and he never forgot it."
        : f.lunchbox === "teacher"
          ? "When Maya needed help, you went and fetched it."
          : "Once, on a playground, you looked at your shoes. You spent a long time making up for it.",
    );
    lines.push(
      f.storm === "saved"
        ? "On the night of the storm you went out onto the pontoon for Rowan."
        : f.storm === "pulled"
          ? "On the night of the storm you chose Rowan over the boat."
          : "On the night of the storm you chose your future. It turned out well; it also cost something.",
    );
    if (f.road) lines.push(`You became ${aOrAn(career(l))}${f.road === "city" ? " in the city" : f.road === "sea" ? " on the water" : " in Kitehaven"}.`);
    if (f.pier)
      lines.push(
        f.pier === "restored"
          ? "The Old Pier stands again, board by board, because you spoke for it."
          : f.pier === "shared"
            ? "The harbour has a marina and a pier now, side by side, because you gave Maya's idea a stage."
            : f.vote === "marina"
              ? "The marina gleams where the Old Pier stood. You backed it, and the town got its jobs."
              : "The marina gleams where the Old Pier stood. You fought for the pier and lost, and Rowan remembers that you tried.",
      );
    lines.push(partnered(l) ? `You built a life with ${partnerName(l)}${f.dream === "backed" ? ", and backed their dream all the way" : ""}.` : "Your friends were your family, and it was enough.");
    if (f.care) lines.push(f.care === "home" ? "When Mum needed you, you brought her home." : f.care === "shared" ? "When Mum needed you, you didn't do it alone." : "When Mum needed care, you paid for the best you could find, and visited on Sundays.");
    if (f.shop) lines.push(f.shop === "reopened" ? "Dad's kite shop has children's noses pressed to the window again." : f.shop === "given" ? "Pip runs the kite shop now, in a way you don't entirely understand." : "You sold the shop and sent a postcard home from every port.");
    lines.push(
      f.final === "rowan"
        ? "At the last festival, you held the string with Rowan."
        : f.final === "partner"
          ? `At the last festival, you held the string with ${partnerName(l)}.`
          : f.final === "pip"
            ? "At the last festival, you put the string in Pip's hands."
            : f.final === "maya"
              ? "At the last festival, Maya explained your kite to you, incorrectly."
              : "At the last festival, you opened your hands and let the kite fly.",
    );
    const st = l.stats;
    lines.push(
      st.health >= 60 ? "You were still walking the cliff path at the end, and pretending it was easy." : st.health >= 30 ? "Your body kept count of the storms and the overtime, and you learned to rest." : "You were frail at the end, and fiercely yourself.",
    );
    lines.push(st.joy >= 65 ? "Mostly, you were happy. You noticed it while it was happening, which is rarer than it sounds." : st.joy >= 40 ? "You had your share of grey days and your share of kites." : "Some years were hard to love. You carried them anyway.");
    return lines;
  },
};
export type Lexicon = typeof lexicon;

// ---------------------------------------------------------------------------
// the people of Kitehaven
// ---------------------------------------------------------------------------
const L = (kind: Kind, skin: string, hair: string, style: string, top: string, bottom: string, shoes: string, accent: string, acc: string[] = [], scale?: number): Look => ({
  kind, skin, hair, style, top, bottom, shoes, accent, acc, scale,
});
export const people: Record<string, Person> = {
  nana: {
    name: "Nana June",
    role: () => "Kept the lighthouse for forty years",
    color: "c49bff",
    look: () => L("elder", "e8b48c", "eeeaf2", "bun", "c49bff", "4f5a74", "7f4524", "ff8fb1", ["glasses", "scarf"]),
    bark: () => "“Hundred and twelve steps to the top of that lighthouse. I counted them every night for forty years.”",
  },
  mum: {
    name: "Mum",
    role: (l) => (l.chapter >= 8 ? "Still sharper than the crossword" : "Harbour nurse, permanently tired"),
    color: "ff6a4d",
    look: (c) =>
      c < 6
        ? L("adult", "c98a5e", "3a2418", "bob", "ff6a4d", "213a8f", "ffc234", "fff1d6")
        : L("elder", "c98a5e", "cfc9d6", "bob", "ff8f7a", "213a8f", "ffc234", "fff1d6", ["glasses"]),
    bark: () => "“Have you eaten? You look like you haven't eaten.”",
  },
  dad: {
    name: "Dad",
    role: () => "Makes kites by hand, sells them by stubbornness",
    color: "1fb8a8",
    look: (c) =>
      c < 5
        ? L("adult", "f0c09a", "b8542a", "short", "1fb8a8", "3b4256", "7f4524", "ffe14d", ["beard", "apron"])
        : L("elder", "f0c09a", "d8d4cc", "short", "1fb8a8", "3b4256", "7f4524", "ffe14d", ["beard", "apron", "glasses"]),
    bark: () => "“Paper, bamboo, glue and patience. The patience is the expensive bit.”",
  },
  rowan: {
    name: "Rowan",
    role: (l) => (l.chapter < 4 ? "The boy through the gap in the fence" : l.chapter < 9 ? "Fisherman, best friend, stubborn" : "Your oldest friend"),
    color: "ffc234",
    look: (c) =>
      c < 4
        ? L("kid", "8d5a3b", "1d1414", "curls", "ffc234", "213a8f", "ee3b3b", "ffffff")
        : c < 10
          ? L("adult", "8d5a3b", "1d1414", "curls", "ffc234", "213a8f", "ee3b3b", "ff6a4d", c >= 6 ? ["cap", "beard"] : ["cap"], c === 4 ? 0.93 : 1)
          : L("elder", "8d5a3b", "cfcfd4", "curls", "ffc234", "213a8f", "ee3b3b", "ff6a4d", ["cap", "beard"]),
    bark: (l) => (l.bonds.rowan >= 3 ? "“You. Good. I was about to do something stupid on my own.”" : "“Oh. Hello.” He looks as if he wants to say more, and doesn't."),
  },
  maya: {
    name: "Maya",
    role: (l) => (l.chapter < 5 ? "The new girl with the rocket lunchbox" : "Draws impossible buildings, then builds them"),
    color: "8c5cf0",
    look: (c) =>
      c < 4
        ? L("kid", "6b4028", "16110f", "pony", "8c5cf0", "5cc8ff", "ffffff", "ffe14d")
        : c < 10
          ? L("adult", "6b4028", "16110f", "bun", "7a55d6", "1d2340", "ffffff", "ffe14d", ["glasses"], c === 4 ? 0.93 : 1)
          : L("elder", "6b4028", "d9d4de", "bun", "7a55d6", "1d2340", "ffffff", "ffe14d", ["glasses", "scarf"]),
    bark: () => "“Everything people say can't work just hasn't been built properly yet.”",
  },
  lin: {
    name: "Ms Lin",
    role: () => "A teacher who notices",
    color: "1fa89c",
    look: () => L("adult", "f2c9a5", "1d1d24", "bob", "1fa89c", "fff1d6", "ee3b3b", "ffe14d", ["glasses", "skirt"]),
    bark: () => "“Take your time. A good question is worth a slow answer.”",
  },
  tobias: {
    name: "Tobias Voss",
    role: (l) => (l.chapter < 5 ? "Has never once been told no" : l.chapter < 9 ? "Heir to Voss Harbour Holdings" : "Runs Voss Harbour Holdings, reluctantly"),
    color: "213a8f",
    look: (c) =>
      c < 5
        ? L("kid", "f5d3b5", "e9c46a", "spiky", "ee3b3b", "3b4256", "1d2340", "ffffff")
        : c < 9
          ? L("adult", "f5d3b5", "e9c46a", "swoop", "213a8f", "213a8f", "1d2340", "ffffff", ["badge"])
          : L("elder", "f5d3b5", "d8d8dc", "swoop", "213a8f", "213a8f", "1d2340", "ffffff", ["badge", "glasses"]),
    bark: (l) => (l.facts.lunchbox === "stood" ? "“You're the one who wouldn't stay down.” It sounds almost like respect." : "He looks straight through you, the way he always has."),
  },
  sam: {
    name: "Sam",
    role: () => "Your boss, fair and exhausted",
    color: "ff9a2e",
    look: () => L("adult", "a86a45", "2a1c14", "short", "ff9a2e", "5b6378", "1d2340", "213a8f", ["badge"]),
    bark: () => "“Coffee first. Then we save the world. Then more coffee.”",
  },
  avery: {
    name: "Avery",
    role: () => "Woodworker who fixes what others throw away",
    color: "5fe0b7",
    look: (c) => L(c >= 10 ? "elder" : "adult", "e0a27a", c >= 10 ? "d4ccc4" : "5a3a2a", "long", "5fe0b7", "7f4524", "3b4256", "ffc234", ["apron"]),
    bark: () => "“There's nothing wrong with this chair. It just needs someone to believe in it.”",
    meet: "“I start too many projects,” Avery admits, holding a crooked picnic sign they're halfway through repainting. “I like quiet evenings and broken things that can be fixed. I need someone who'll tell me when I'm overthinking. Which is now. Sorry.”",
  },
  quinn: {
    name: "Quinn",
    role: () => "Runs the community garden; runs everything, really",
    color: "a6e22e",
    look: (c) => L(c >= 10 ? "elder" : "adult", "b77a4e", c >= 10 ? "cfc9d6" : "3a2418", "curls", "a6e22e", "213a8f", "ff6a4d", "ff5f8f", ["scarf"]),
    bark: () => "“I've signed you up for something. You'll love it. Probably.”",
    meet: "“I organised half this party and forgot to eat,” Quinn laughs, stealing one of your chips. “The community garden, the lifeboat raffle, the petition about the bins. I'm learning that looking after everyone has to include looking after me. Slowly.”",
  },
  morgan: {
    name: "Morgan",
    role: () => "A sailor with a boat and no plan B",
    color: "2f7de1",
    look: (c) => L(c >= 10 ? "elder" : "adult", "f2c29b", c >= 10 ? "e8e2da" : "e2913b", "swoop", "2f7de1", "fff1d6", "ee3b3b", "ffffff", ["cap"]),
    bark: () => "“Forty-one ports. I've got them written on the inside of my arm. Want to see?”",
    meet: "“I nearly missed this for a train to the coast,” Morgan says, sunburnt and grinning. “The boat's nearly ready. I love new places — I'd like someone to share them with. I'm also learning how to stay. I'm worse at that part.”",
  },
  pip: {
    name: "Pip",
    role: (l) => (pipIsYours(l) ? "Your kid" : "Your godchild — Rowan's kid"),
    color: "ff5f8f",
    look: (c) => (c <= 8 ? L("kid", "d99a6c", "5a3a2a", "bob", "ff5f8f", "5cc8ff", "ffc234", "ffffff") : L("adult", "d99a6c", "5a3a2a", "bob", "ff5f8f", "213a8f", "ffc234", "ffffff")),
    bark: () => "“Can I ask you something weird? It's for school. And also for me.”",
  },
};
/** "partner" in a moment resolves to whoever you chose on the roof. */
export const resolveWho = (who: string, l: Life) => (who === "partner" ? partnerId(l) : who);
export const personName = (who: string, l: Life) => (who === "you" ? u("dlg.you") : (people[resolveWho(who, l)]?.name ?? who));

const d = (name: string, prop: string, stat: Stat, line: string): Discovery => ({ name, prop, stat, line });
const o = (label: Text, hint: Text, effect: Option["effect"], reply: Text, memory: Text, extra: Partial<Option> = {}): Option => ({
  label, hint, effect, reply, memory, ...extra,
});

// ---------------------------------------------------------------------------
// the twelve chapters
// ---------------------------------------------------------------------------
export const chapters: Chapter[] = [
  // 1 -----------------------------------------------------------------------
  {
    title: "Under the Eaves",
    age: "0–2",
    place: "An attic nursery above the harbour",
    scene: "nursery",
    env: "morning",
    intro:
      "The first thing you ever learn is light. Every nine seconds the lighthouse beam sweeps across your ceiling, and every nine seconds you laugh as if it has never happened before.",
    objective: "Choose your first kite with Nana June",
    free: 2,
    cast: [["nana", 0], ["mum", 1], ["dad", 2]],
    moments: [
      {
        id: "c1.kite",
        kind: "main",
        who: "nana",
        title: "Your first kite",
        prompt:
          "Nana June kneels beside you with three paper kites, rustling like birds. “Every child in Kitehaven gets a first kite,” she says. “Pick one, and it will know you forever.”",
        options: [
          o("Sunrise red", "Bold and loud; first into the wind.", { joy: 6 },
            "You grab the red one with both fists and refuse to let go. Nana laughs until her glasses slip. “That one's going to argue with the weather.”",
            "Your first kite was sunrise-red, and you would not let go of it.", { facts: { kite: "red", spark: "bold" } }),
          o("Sea-glass blue", "Calm and patient; waits for the right gust.", { health: 6 },
            "You study all three for a long, serious moment, then touch the blue one gently, as if it might wake up. Nana nods. “A thinker. Good. The sky needs those.”",
            "You chose the sea-glass blue kite after a long, serious think.", { facts: { kite: "blue", spark: "steady" } }),
          o("Lemon yellow", "Bright and curious; goes wherever the wind is interesting.", { joy: 4, health: 2 },
            "You try to eat the yellow one. Then you try to wear it. Nana decides that counts as choosing. “Curious,” she says. “Heaven help your mother.”",
            "You chose the lemon-yellow kite, mostly by trying to eat it.", { facts: { kite: "yellow", spark: "curious" } }),
        ],
      },
      {
        id: "c1.mum",
        kind: "side",
        who: "mum",
        title: "The harbour song",
        prompt:
          "Mum has been awake since four. She's humming the harbour song under her breath — the one about the boats coming home — and swaying, because her body has forgotten how to stand still.",
        options: [
          o("Reach up for her", "Be held.", { family: 1, health: 3 },
            "You reach, she lifts, and for a while the whole world is the smell of her jumper and the hum in her chest. She stops being tired for exactly one verse.",
            "Mum sang you the harbour song until you both fell asleep."),
          o("Hum back", "Your first duet.", { family: 1, joy: 4 },
            "You make a noise that is almost a note. Mum freezes, laughs, then does it again to see if you will. You will. You do.",
            "You hummed back to Mum's lullaby: your very first song.", { facts: { voice: "yes" } }),
        ],
      },
      {
        id: "c1.dad",
        kind: "side",
        who: "dad",
        title: "The glue-pot workshop",
        prompt:
          "Dad smells of glue and bamboo. He's building kites for the summer festival on the landing because the shop is too cold, and he's given you a spare spool of string to chew.",
        options: [
          o("Watch his hands", "Learn by looking.", { family: 1, joy: 2 },
            "You watch his hands fold paper into wings. It's the first magic trick you ever see, and you'll spend years trying to learn it.",
            "You watched Dad turn paper into wings.", { facts: { maker: "yes" } }),
          o("Steal the spool and crawl for it", "Chaos is also a hobby.", { family: 1, joy: 4, health: 1 },
            "You crawl away with the spool at astonishing speed. Dad chases you across the rug shouting about string, and nobody gets any kites made at all.",
            "You stole Dad's string and started the first chase of your life."),
        ],
      },
    ],
    activity: {
      id: "a1.steps",
      kind: "hunt",
      who: "mum",
      title: "First steps",
      intro: "Wobble over to your three favourite things — the teddy, the building blocks and the shiny star — then bask in the applause.",
      keepsake: "First shoes",
      icon: "heart",
      items: [
        { name: "Teddy", prop: "teddy", line: "Teddy has been waiting all morning." },
        { name: "Building blocks", prop: "blocks", line: "You knock them over. Everyone cheers. Excellent." },
        { name: "The shiny star", prop: "star", line: "It catches the lighthouse beam every nine seconds." },
      ],
      result: () => ({
        effect: { health: 4, joy: 3, family: 1 },
        text: "Four steps, a wobble, a sit-down, three more steps. Mum is crying and pretending it's the onions. Dad has run out of film. You walked.",
      }),
    },
    finds: [
      d("Nana's knitted sock", "scarf", "health", "Too big for any foot you'll ever have. Warm anyway."),
      d("A sunbeam on the rug", "star", "joy", "You try to pick it up. It stays exactly where it is, glowing."),
      d("A penny under the cot", "coin", "savings", "Your first money. You try to eat it. Mum wins."),
    ],
  },
  // 2 -----------------------------------------------------------------------
  {
    title: "The Gap in the Fence",
    age: "3–5",
    place: "Two back gardens, one gap",
    scene: "gardens",
    env: "afternoon",
    intro:
      "There's a gap in the fence at the bottom of the garden exactly the size of a four-year-old. On the other side lives a boy called Rowan, who owns a real wooden boat his dad carved from driftwood — and who is currently crying.",
    objective: "Find out why Rowan is crying",
    free: 2,
    cast: [["rowan", 0], ["mum", 1], ["dad", 2], ["nana", 3]],
    moments: [
      {
        id: "c2.boat",
        kind: "main",
        who: "rowan",
        title: "The boat in the puddle",
        prompt:
          "Rowan's boat is gone. Yesterday, when he wasn't looking, you sailed it in the big puddle by the washing line — and left it there. Now the puddle has dried and the boat is nowhere. “Somebody took it,” Rowan sobs. “Did you see who?”",
        options: [
          o("Tell him the truth", "It was you. Say so.", { rowan: 1, joy: -3 },
            "“I took it to the puddle,” you say, and Rowan stares at you as if you've pushed him. He runs inside. Ten minutes later he's back through the gap. “Then you have to help me find it,” he says. That's how it starts.",
            "You told Rowan the truth about his boat, and he came back anyway.", { facts: { boat: "truth" } }),
          o("Say nothing and help him look", "Help. Keep the secret.", { rowan: 1 },
            "“I didn't see,” you say, and the words taste like pennies. You help him look all afternoon. He thanks you. That's the worst part.",
            "You helped Rowan search and kept a secret the size of a toy boat.", { facts: { boat: "secret" } }),
          o("Blame Mrs Pepper's cat", "That cat steals everything anyway.", { joy: 2 },
            "“It was Mrs Pepper's cat,” you say, very firmly. Rowan believes you completely, which somehow makes it worse. For a week, he hisses at the cat.",
            "You blamed Mrs Pepper's cat for the missing boat. The cat never forgave you.", { facts: { boat: "cat" } }),
        ],
      },
      {
        id: "c2.dad",
        kind: "side",
        who: "dad",
        title: "The first flight",
        prompt: (l) =>
          `Dad has rebuilt your ${kiteName(l)} kite — new tail, new string. The wind is perfect. Rowan is watching through the gap in the fence, trying to look as if he isn't.`,
        options: [
          o("Fly it with Dad", "Just the two of you and the wind.", { family: 1, joy: 4 },
            "Dad runs, you hold on, and the kite leaps up as if it has been waiting its whole life. He lets you hold the string alone for eleven seconds. You'll remember every one.",
            "You flew your first kite with Dad in the back garden."),
          o("Wave Rowan through the gap", "There's room on the string.", { rowan: 1, joy: 3 },
            "Rowan squeezes through the gap and grabs the string above your hands. Dad pretends not to notice the gap. He has always pretended not to notice the gap.",
            "You and Rowan flew your first kite together, four hands on one string.", { facts: { firstFlight: "shared" } }),
        ],
      },
      {
        id: "c2.mum",
        kind: "side",
        who: "mum",
        title: "The grazed knee",
        prompt: "You fell off the swing. There is blood, which is a new and terrible colour. Mum is here with a plaster and a biscuit, in that order.",
        options: [
          o("Be very brave about it", "Chin up.", { health: 4 },
            "You don't cry. Mum is impressed and a little worried. “Brave doesn't mean it doesn't hurt,” she says. “It means you're still here.”",
            "You were very brave about your grazed knee."),
          o("Cry properly", "Some days somebody needs to know.", { family: 1, joy: 3 },
            "You cry until the crying runs out, and she holds you the whole time. Then you have a second biscuit, for medical reasons.",
            "Mum held you until the crying ran out."),
        ],
      },
      {
        id: "c2.nana",
        kind: "side",
        who: "nana",
        title: "The lighthouse story",
        prompt:
          "Nana June is shelling peas on the back step and telling anyone who'll listen about the great storm of '61, when she kept the lighthouse lit for three nights with a bicycle and a car battery.",
        options: [
          o("Ask why she wasn't scared", "Grown-ups are never scared. Are they?", { family: 1, joy: 1 },
            "“Oh, I was terrified,” she says. “Scared is just weather on the inside. You keep the light on anyway.” You'll need that, one day.",
            "Nana told you that being scared is just weather on the inside.", { facts: { nanaStory: "yes" } }),
          o("Ask to see the lighthouse", "All the way to the top.", { family: 1, joy: 3 },
            "She promises to take you up the hundred and twelve steps when your legs are long enough. It's the first promise you ever collect.",
            "Nana promised to take you up the lighthouse one day.", { facts: { nanaStory: "yes" } }),
        ],
      },
    ],
    activity: {
      id: "a2.boat",
      kind: "hunt",
      who: "rowan",
      title: "Where did the boat go?",
      intro: "The boat came apart somewhere between the puddle and the washing line. Find the hull, the paper sail and the rigging string so you and Rowan can put it back together.",
      keepsake: "The crooked boat",
      icon: "toyboat",
      items: [
        { name: "The hull", prop: "toyboat", line: "Wedged under a flowerpot, perfectly dry and extremely guilty." },
        { name: "The paper sail", prop: "letter", line: "Flat as a pancake and only slightly chewed." },
        { name: "The rigging string", prop: "spool", line: "Tangled round the gnome, who says nothing." },
      ],
      result: () => ({
        effect: { rowan: 1, joy: 4 },
        text: "You rebuild the boat together on the back step. The mast goes on crooked. Rowan says it's better crooked. You'll both remember that.",
        facts: { boatFixed: "yes" },
      }),
    },
    finds: [
      d("Wild strawberries by the fence", "apple", "health", "Tiny, sour, perfect. You eat all of them."),
      d("A ladybird on a leaf", "heart", "joy", "Seven spots. You count them twice to be sure."),
      d("A coin in the sandpit", "coin", "savings", "Buried treasure. Well — buried twenty pence."),
    ],
  },
  // 3 -----------------------------------------------------------------------
  {
    title: "The Rocket Lunchbox",
    age: "6–9",
    place: "Harbour Primary, bright and loud",
    scene: "schoolyard",
    env: "morning",
    intro:
      "The new girl is called Maya. She has a lunchbox shaped like a rocket, a notebook full of impossible buildings, and nobody to sit with.",
    objective: "Something is happening by the bike shed",
    free: 2,
    cast: [["maya", 0], ["tobias", 1], ["lin", 2], ["rowan", 3]],
    moments: [
      {
        id: "c3.lunchbox",
        kind: "main",
        who: "maya",
        title: "The bike-shed roof",
        prompt:
          "Tobias Voss — whose dad owns half the harbour, and who has never once been told no — has thrown Maya's rocket lunchbox onto the bike-shed roof. Half the playground is watching. Maya is pretending she isn't about to cry, and doing it badly.",
        options: [
          o("Stand up to Tobias", "Somebody has to. It might cost you.", { maya: 2, health: -6, joy: 2 },
            "“Get it down,” you tell Tobias. He laughs and shoves you into the hopscotch. You get up. He shoves you again. You get up again. The fourth time, something in his face changes — and he climbs the shed and fetches it himself, furious and confused. Maya sits next to you at lunch. And the next day. And the next.",
            "You stood up to Tobias Voss for Maya, and had mud on your knees for a week.", { facts: { lunchbox: "stood" } }),
          o("Fetch Ms Lin", "Get a grown-up. Sensible, and slower.", { maya: 1, joy: 1 },
            "Ms Lin arrives like weather. The lunchbox comes down, Tobias goes to the office, and the crowd drifts away, disappointed. Maya says thank you in a very small voice. It's a start.",
            "You fetched Ms Lin when Tobias threw Maya's lunchbox onto the roof.", { facts: { lunchbox: "teacher" } }),
          o("Stay out of it", "It's not your fight. Is it?", { joy: -4 },
            "You look at your shoes until it's over. Rowan climbs the drainpipe and gets it down instead, and Maya looks at him as if he were a lighthouse. You tell yourself you were just about to. You weren't.",
            "You stayed out of it. Rowan climbed the drainpipe instead.", { facts: { lunchbox: "away", mayaRowan: "yes" } }),
        ],
      },
      {
        id: "c3.lin",
        kind: "side",
        who: "lin",
        title: "The science fair",
        prompt: "Ms Lin is signing people up for the science fair. “Pick something you'd happily think about for a whole month,” she says.",
        options: [
          o("Build a wind-meter", "Yoghurt pots, bent spoons, the actual wind.", { joy: 3 },
            "You and a yoghurt pot and four bent spoons measure the wind for a month. Ms Lin writes ENGINEER? on your report, with a question mark, like a door left open.",
            "Your science-fair wind-meter measured a whole month of weather.", { facts: { interest: "build" } }),
          o("Draw the whole harbour", "Every boat. Every roof.", { joy: 3 },
            "You draw every boat in the harbour badly, then less badly. Ms Lin pins the drawing up in the corridor, where it will stay for eleven years.",
            "You drew the whole harbour for the science fair.", { facts: { interest: "draw" } }),
          o("Look after the class rabbit", "Admiral has a cold.", { health: 2, joy: 1 },
            "The rabbit is called Admiral and he has a cold. You nurse him through it with a hot-water bottle and absolute seriousness. Ms Lin says you have a gift for noticing when something hurts.",
            "You nursed Admiral the class rabbit through his cold.", { facts: { interest: "care" } }),
        ],
      },
      {
        id: "c3.rowan",
        kind: "side",
        who: "rowan",
        title: "Conkers at the gate",
        prompt: "Rowan has a conker on a string that he swears has beaten forty-one other conkers. He needs a forty-second.",
        options: [
          o("Challenge him", "Your conker is small but full of spite.", { rowan: 1, joy: 3 },
            "Your conker explodes on the first hit. Rowan is so delighted that he gives you half of his, which is not how conkers work.",
            "Rowan's champion conker beat yours, and he gave you half anyway."),
          o("Tell him about the boat", "The secret's been getting heavier.", { rowan: 2, joy: 2 },
            "He goes quiet for a long time. Then: “I know. I saw you. I was waiting.” He's six. He's already better at this than you are.",
            "You finally told Rowan about his boat. He'd known all along.",
            { facts: { boat: "confessed" }, show: (l) => l.facts.boat === "secret" || l.facts.boat === "cat" }),
        ],
      },
      {
        id: "c3.maya",
        kind: "side",
        who: "maya",
        title: "Impossible buildings",
        when: (l) => l.bonds.maya >= 1,
        prompt: "Maya shows you her notebook: a tower made of boats, a bridge that folds up for whales, a pier with a lighthouse at both ends.",
        options: [
          o("Ask for the pier one", "Two lighthouses is greedy. You like it.", { maya: 1, joy: 2 },
            "She tears the page out and gives it to you, then immediately draws a better one. “When I'm grown up I'll fix the Old Pier,” she says. “Properly.”",
            "Maya gave you her drawing of a pier with two lighthouses.", { facts: { mayaDream: "heard" } }),
          o("Draw one with her", "A house for a lighthouse keeper's cat.", { maya: 1, joy: 3 },
            "You draw a house for a lighthouse keeper's cat. Maya adds plumbing. It's the start of a very long argument about plumbing.",
            "You and Maya designed a house for a lighthouse keeper's cat."),
        ],
      },
    ],
    activity: {
      id: "a3.trail",
      kind: "hunt",
      who: "lin",
      title: "Ms Lin's treasure trail",
      intro: "Ms Lin has hidden three clue cards around the playground. Find them all before the bell.",
      keepsake: "Gold star",
      icon: "star",
      items: [
        { name: "Clue one: a letter", prop: "letter", line: "“Look where the wind can't reach.”" },
        { name: "Clue two: a compass", prop: "compass", line: "“North is where the lighthouse isn't.”" },
        { name: "Clue three: the gold star", prop: "star", line: "The prize! Slightly sticky." },
      ],
      result: (l) => ({
        effect: { joy: 4, health: 2 },
        text: `You find all three clues, and the prize at the end: a gold-star sticker that will stay on your wardrobe until you are thirty.${l.bonds.maya >= 1 ? " Maya found the last clue first, and gave it to you." : ""}`,
      }),
    },
    finds: [
      d("A crunchy apple", "apple", "health", "Swapped for a biscuit. Good trade."),
      d("A drawing someone dropped", "drawing", "joy", "A stick figure flying a kite. It might be you."),
      d("Lost dinner money", "coin", "savings", "You hand in half of it. Well — most of it."),
    ],
  },
  // 4 -----------------------------------------------------------------------
  {
    title: "The Kite Festival",
    age: "10–14",
    place: "The Old Pier, on festival day",
    scene: "pier",
    env: "festival",
    intro: "Once a year, the whole of Kitehaven walks out onto the Old Pier and tries, all at once, to touch the sky. This year you're finally old enough for the junior race.",
    objective: "Get ready for the junior kite race",
    free: 2,
    cast: [["rowan", 0], ["dad", 1], ["maya", 2], ["nana", 3]],
    moments: [
      {
        id: "c4.race",
        kind: "main",
        who: "rowan",
        title: "One kite, two racers",
        context: (l) => (l.facts.firstFlight === "shared" ? "You've shared a string with him before: four hands on your first kite, in the back garden." : undefined),
        prompt: (l) =>
          `Ten minutes before the junior race, Rowan's kite snaps its spar on the railings. He built it for six weeks. He goes very quiet, the way he does when he's about to pretend he doesn't care. There's one kite between you now — yours, the ${kiteName(l)} one.`,
        options: [
          o("Give Rowan your kite", "Watch from the railings.", { rowan: 2, joy: 2 },
            "You push the string into his hands before you can change your mind. He flies it as if he's trying to thank you with the whole sky, and comes third. At the prize table he gives the rosette to you, and neither of you mentions it for forty years.",
            "You gave Rowan your kite at the festival. He came third and gave you the rosette.", { facts: { race: "gave" } }),
          o("Fly it together", "Two hands on one string. Probably against the rules.", { rowan: 1, joy: 5 },
            "Two hands on one string is definitely against the rules. The judges disqualify you before the first gust and then, because this is Kitehaven, give you a round of applause. You fly it for an hour afterwards, just the two of you.",
            "You and Rowan flew one kite together and were cheerfully disqualified.", { facts: { race: "together" } }),
          o("Race to win", "It's your kite. It's your race.", { joy: 8, savings: 6, rowan: -1 },
            "You win. The medal is heavy and real and has your name on it. Rowan claps longer than anyone and goes home early. Some wins cost exactly one friend's afternoon; you won't know the price until later.",
            "You won the junior kite race. Rowan went home early.", { facts: { race: "won" } }),
        ],
      },
      {
        id: "c4.dad",
        kind: "side",
        who: "dad",
        title: "The kite stall",
        prompt:
          "Dad's stall has sold four kites all day. The new shop on the square sells plastic ones for a third of the price. “Handmade's going out of fashion,” he says, lightly. He is not saying it lightly.",
        options: [
          o("Help him sell", "You're very loud when you want to be.", { savings: 4, family: 1 },
            "You shout about the kites until strangers buy one to make you stop. Six sold. Dad buys you chips with the profit and doesn't say anything, which is how he says everything.",
            "You helped Dad sell six kites at the festival."),
          o("Promise to run the shop one day", "Mean it.", { family: 1, joy: 1 },
            "“When I'm grown up, I'll run it,” you say. Dad laughs, and then he doesn't. “I'll hold you to that,” he says. He will.",
            "You promised Dad you'd keep the kite shop open one day.", { facts: { promiseShop: "yes" } }),
        ],
      },
      {
        id: "c4.nana",
        kind: "side",
        who: "nana",
        title: "A hundred and twelve steps",
        prompt: "Nana June is sitting at the foot of the lighthouse. She's slower this year and pretends it's the heat. “Hundred and twelve steps,” she says. “Your legs are long enough now.”",
        options: [
          o("Climb it with her", "However long it takes.", { family: 1, health: 2, joy: 3 },
            "It takes forty minutes. She stops every twenty steps to tell you a story so you won't notice she's resting. At the top, the whole town is laid out like a map of everyone you know.",
            "You climbed the lighthouse with Nana June, one story at a time.", { facts: { lighthouse: "climbed" } }),
          o("Sit with her in the shade", "The lighthouse isn't going anywhere.", { family: 1, health: 1 },
            "You sit together and eat an entire bag of cherries, spitting the stones into the sea. “Next year,” she says. There isn't a next year for the steps, but there are more cherries.",
            "You shared a bag of cherries with Nana June under the lighthouse."),
        ],
      },
      {
        id: "c4.maya",
        kind: "side",
        who: "maya",
        title: "The bridge kite",
        prompt: "Maya has built a kite shaped like a bridge. It does not fly. She doesn't seem to mind. “It's not for flying,” she says. “It's for proving a point.”",
        options: [
          o("Help her make it fly", "It just needs a better tail. And a miracle.", { maya: 1, joy: 3 },
            "It takes both of you, a spare spar and a lot of shouting, but the bridge flies for eleven glorious seconds. Maya writes the date in her notebook and underlines it three times.",
            "You helped Maya's bridge kite fly for eleven seconds.", { facts: { mayaKite: "flew" } }),
          o("Ask what point", "There's always a point with Maya.", { maya: 1, joy: 1 },
            "“That the things people say can't work usually just haven't been built properly yet.” She shows you her notebook: pier after pier after pier, each one stranger than the last.",
            "Maya told you she'd rebuild the Old Pier one day.", { facts: { mayaDream: "heard" } }),
        ],
      },
    ],
    activity: {
      id: "a4.sky",
      kind: "kite",
      who: "dad",
      title: "The festival sky",
      intro: "Take your kite to the end of the pier and keep it riding the wind. Hold to pull the string in, let go to let it out. Keep the line in the bright band.",
      keepsake: "Festival ribbon",
      icon: "kite",
      wind: 1,
      result: (_l, r) => ({
        effect: { joy: r.grade === "soar" ? 6 : r.grade === "steady" ? 4 : 2, health: 1 },
        text:
          r.grade === "soar"
            ? "Your kite rides the wind so high it becomes a speck, then a feeling. An old fisherman takes his hat off to it."
            : r.grade === "steady"
              ? "Your kite dips and rises and dips and rises, as if it's breathing. It's the best twenty minutes of your summer."
              : "Your kite spends as much time in the sea as in the sky. You laugh so hard you have to sit down. It still counts.",
      }),
    },
    finds: [
      d("A swim off the slipway", "shell", "health", "Freezing. Glorious. Your lips go blue."),
      d("A dropped festival ribbon", "scarf", "joy", "Red and gold. You tie it round your wrist."),
      d("A lucky coin in the planks", "coin", "savings", "Wedged between two boards since 1987, probably."),
    ],
  },
  // 5 -----------------------------------------------------------------------
  {
    title: "The Storm",
    age: "15–18",
    place: "The harbour, at midnight",
    scene: "storm",
    env: "storm",
    intro: "The exam timetable is pinned to the fridge. Then the sirens start, and at eleven o'clock at night the sea comes over the harbour wall.",
    objective: "Find Rowan on the harbour",
    free: 2,
    cast: [["rowan", 0], ["mum", 1], ["nana", 2], ["dad", 3]],
    moments: [
      {
        id: "c5.storm",
        kind: "main",
        who: "rowan",
        title: "The Marigold",
        prompt:
          "Rowan is on the pontoon in his dad's oilskins, trying to save the Marigold — the boat that feeds his whole family — while the ropes scream and the pontoon bucks like a horse. Your first exam is at nine in the morning. “Help me!” he shouts, or maybe “Go home!” The wind takes half of every word.",
        options: [
          o("Help him save the Marigold", "Dangerous, and you'll be wrecked for the exam.", { rowan: 2, health: -12 },
            "You get the second rope on as a wave takes your legs from under you. Rowan grabs your collar and doesn't let go. At dawn the Marigold is still there, battered and afloat, and so are you. You sit your exam in dry socks borrowed from Rowan's mum, and can't remember a single answer. You'd do it again.",
            "You helped Rowan save the Marigold on the night of the storm.",
            { facts: { storm: "saved", grade: "poor" }, need: { test: (l) => l.stats.health >= 35, why: "You're too worn out to be any use out there (needs 35 Health)." } }),
          o("Drag him off the pontoon", "Boats can be replaced. He can't.", { health: -4 },
            "“It's a boat!” you scream, and haul him back onto the quay just as the pontoon tears loose. The Marigold goes out with the tide. Rowan doesn't speak to you for a month. Then, one day, he does. “You were right,” he says. “I hate that you were right.”",
            "You dragged Rowan off the pontoon. The Marigold was lost; Rowan wasn't.", { facts: { storm: "pulled", grade: "fair" } }),
          o("Go home and study", "The coastguard's coming. Your future is at nine.", { rowan: -2, health: 2 },
            "You tell yourself the coastguard will come, and it does, eventually. The Marigold survives, just about; Rowan's dad breaks his arm getting to it. You get the best exam results in the school. Rowan sends a card to say well done. It's very polite, and that's how you know.",
            "You went home to study on the night of the storm, and got top marks.", { facts: { storm: "studied", grade: "excellent" } }),
        ],
      },
      {
        id: "c5.nana",
        kind: "side",
        who: "nana",
        title: "The last watch",
        context: (l) => (l.facts.nanaStory === "yes" ? "She told you once that scared is just weather on the inside. Tonight there's a lot of weather." : undefined),
        prompt: "Nana June is standing at the kite-shop door in her dressing gown, watching the lighthouse. It's the first big storm in sixty years she hasn't been up there. She looks very small.",
        options: [
          o("Sit with her until it passes", "The exam can wait an hour.", { family: 2 },
            "You sit on the step together while the beam goes round and round. She tells you the lighthouse story again, all of it — the bicycle, the car battery. Near dawn she presses something cold into your hand: the old lighthouse key. “Somebody should keep the light on,” she says.",
            "You sat with Nana June through the storm. She gave you the lighthouse key.", { facts: { nanaNight: "yes" } }),
          o("Walk her home through the rain", "Somewhere dry, with tea.", { family: 1, health: -1 },
            "You walk her home, arm in arm, both soaked, both laughing at the absurdity of it. She makes you drink tea so strong the spoon nearly stands up. “You're a good one,” she says, as if it's a secret.",
            "You walked Nana June home through the storm.", { facts: { nanaNight: "walked" } }),
        ],
      },
      {
        id: "c5.mum",
        kind: "side",
        who: "mum",
        title: "The first-aid tent",
        prompt: "Mum has set up a first-aid post in a tent that's trying to become a kite. There are three soaked fishermen and one very calm dog waiting.",
        options: [
          o("Hold the torch and help", "Blood again. Bigger this time.", { family: 1, health: -2, joy: 2 },
            "You hold the torch, pass the bandages and discover that you don't faint at blood. Mum watches you with an expression you won't understand for years: recognition.",
            "You helped Mum in the first-aid tent on the night of the storm.", { facts: { careSpark: "yes" } }),
          o("Make tea for everyone", "Kitehaven runs on tea.", { family: 1, joy: 3 },
            "You make forty-one cups of tea on a camping stove. The calm dog gets a biscuit. By two in the morning the tent smells of wet wool and sugar, and nobody is crying any more.",
            "You made forty-one cups of tea in the storm."),
        ],
      },
      {
        id: "c5.dad",
        kind: "side",
        who: "dad",
        title: "Boarding up",
        prompt: "Dad is nailing plywood over the shop window with a face like a closed door. The end of the pier has gone. The shop's insurance ran out in March.",
        options: [
          o("Help him board it up", "Hold, hammer, hold.", { family: 1, savings: 3 },
            "You hold the boards; he hammers. You don't talk. At the last nail he puts his hand on your head, the way he did when you were small, and leaves it there a moment too long.",
            "You helped Dad board up the kite shop in the storm."),
          o("Ask what happens now", "Somebody should.", { joy: -1 },
            "“Now?” He looks at the gap where the end of the pier used to be. “Now I find out whether a kite shop needs a pier.” It doesn't, it turns out. It needs customers.",
            "Dad wondered aloud whether a kite shop needs a pier."),
        ],
      },
    ],
    activity: {
      id: "a5.batten",
      kind: "hunt",
      who: "mum",
      title: "Batten down the harbour",
      intro: "Before the next big wave: find Nana's shutter key, light the shop's storm lantern, and rescue Mrs Pepper's cat.",
      keepsake: "Storm lantern",
      icon: "lantern",
      items: [
        { name: "Nana's shutter key", prop: "key", line: "Under the doormat, where it's been since 1974." },
        { name: "The storm lantern", prop: "lantern", line: "It lights first time. Small miracle." },
        { name: "Mrs Pepper's cat", prop: "cat", line: "Furious, soaked, and grateful in the way cats are grateful: not at all." },
      ],
      result: (l) => ({
        effect: { joy: 3, health: -2 },
        text: `By one in the morning the shop is shuttered, the lantern is lit in the window, and Mrs Pepper's cat is asleep inside your coat.${l.facts.boat === "cat" ? " You feel you owe the cat this one." : ""} Mum says you're soaked through and brilliant, in that order.`,
      }),
    },
    finds: [
      d("A dry jumper", "scarf", "health", "Somebody left it on a bollard. It's enormous. It's perfect."),
      d("The last chocolate bar", "heart", "joy", "Found in a coat pocket. Shared, mostly."),
      d("Your emergency fiver", "coin", "savings", "Still folded in your shoe from last summer."),
    ],
  },
  // 6 -----------------------------------------------------------------------
  {
    title: "The Last Train",
    age: "18–24",
    place: "Kitehaven station, above the town",
    scene: "station",
    env: "dawn",
    intro: (l) =>
      `Nana June died in the spring after the storm${l.facts.nanaNight === "yes" ? ", and her lighthouse key is on a string around your neck" : ". You never did get to sit with her that night"}. Now it's summer, and there are two envelopes on the kitchen table: one from the city, one from the harbour.`,
    objective: "Decide which road to take",
    free: 2,
    cast: [["dad", 0], ["rowan", 1], ["maya", 2], ["mum", 3]],
    moments: [
      {
        id: "c6.road",
        kind: "main",
        who: "dad",
        title: "The 7:14",
        prompt: (l) =>
          `The 7:14 to the city is waiting at the platform, humming as if it's impatient. Your ${l.facts.grade === "excellent" ? "scholarship letter" : "university offer"} is in one pocket; the harbour apprenticeship is in the other. ${l.facts.storm === "pulled" ? "Rowan crews on other people's boats now, and one of them leaves at eight." : "Rowan's boat leaves for the fishing grounds at eight."} Dad has carried your bag all the way up the hill and is pretending not to be out of breath.`,
        context: (l) => `Your love of ${interest(l) === "build" ? "building things" : interest(l) === "draw" ? "drawing things" : "looking after people"} goes wherever you go. The road decides what it becomes.`,
        options: [
          o("Take the train to the city", (l) => (l.facts.grade === "excellent" ? "Your scholarship covers the fees." : "A student loan: it will cost you."),
            (l) => (l.facts.grade === "excellent" ? { joy: 4, savings: -2, rowan: l.bonds.rowan >= 4 ? 0 : -1 } : { joy: 4, savings: -18, rowan: l.bonds.rowan >= 4 ? 0 : -1 }),
            (l) => `You get on the train. Dad presses his whole hand flat against the window, like he did when you were small. Kitehaven shrinks to a bright smudge between the cliffs, then to nothing. The city is enormous and indifferent and yours. You'll train as ${aOrAn(career(l, "city"))}.`,
            "You took the 7:14 to the city.", { facts: { road: "city" } }),
          o("Stay and learn a trade at home", "Apprentice pay; everyone you love within a mile.", { savings: 10, family: 1 },
            (l) => `You let the 7:14 go without you. Dad doesn't say anything; he just carries your bag back down the hill, which is how you know he's glad. The town stays small, and so does the pay, and some days that's exactly the right size. You'll train as ${aOrAn(career(l, "home"))}.`,
            "You stayed in Kitehaven and learned a trade.", { facts: { road: "home" } }),
          o("Sign on with Rowan's boat", "Wages, weather, the whole coastline.", { health: 6, savings: 6, rowan: 2 },
            (l) => `You run down the hill with your bag banging on your back and make the boat with ten seconds to spare. Rowan doesn't say anything. He just hands you a pair of gloves that are already your size. He bought them months ago, just in case. In time you'll become ${aOrAn(career(l, "sea"))}.`,
            "You ran down the hill and went to sea with Rowan.",
            { facts: { road: "sea" }, need: { test: (l) => l.bonds.rowan >= 3, why: "Rowan hasn't asked you to come (needs Rowan ♥3)." } }),
        ],
      },
      {
        id: "c6.rowan",
        kind: "side",
        who: "rowan",
        title: "Not getting on anything",
        prompt: (l) =>
          `${l.facts.storm === "saved" ? "Rowan's dad can't work the Marigold alone any more, so Rowan left school to crew for him." : l.facts.storm === "pulled" ? "Without the Marigold, Rowan has been crewing on other people's boats since he was sixteen." : "Rowan's dad never got the full use of his arm back. Rowan left school to fish for the family."} He's sitting on the platform bench, not getting on anything.`,
        options: [
          o("Promise to come back every festival", "Little fingers, like when you were six.", { rowan: 1, joy: 2 },
            "“Every festival,” you say. He holds out his little finger, as if you're six. You hook it. It's the most binding contract you'll ever sign.",
            "You promised Rowan you'd come back for every festival.", { facts: { promise: "festival" } }),
          o("Tell him he should get out too", "He's cleverer than any of them.", { rowan: -1, joy: 1 },
            "“Somebody has to stay,” he says, not angrily. “Somebody has to keep the light on.” He's quoting Nana June. He doesn't know he is.",
            "Rowan told you somebody has to stay and keep the light on."),
        ],
      },
      {
        id: "c6.maya",
        kind: "side",
        who: "maya",
        title: "Three suitcases and a tube",
        prompt: "Maya has a place studying architecture in the city. She has three suitcases and a cardboard tube of drawings she won't let anybody else carry.",
        options: [
          o("Carry the suitcases", "Not the tube. Never the tube.", { maya: 1, health: -1, joy: 2 },
            "You carry all three suitcases and she carries the tube like a baby. On the platform she hugs you so hard your ribs click. “Visit,” she says. “Or I'll draw you as a gargoyle.”",
            "You carried Maya's suitcases to the city train."),
          o("Ask to see inside the tube", "She's been hiding something.", { maya: 1, joy: 1 },
            "It's the Old Pier. Again. Better than ever now: old piles, new boards, a kite museum at the end. “One day,” she says, and rolls it up very carefully.",
            "Maya showed you her plans for the Old Pier on the station platform.", { facts: { mayaDream: "heard" } }),
        ],
      },
      {
        id: "c6.mum",
        kind: "side",
        who: "mum",
        title: "A foil parcel",
        prompt: "Mum is holding a foil parcel of sandwiches big enough to survive a siege.",
        options: [
          o("Hug her properly", "The long kind.", { family: 1, health: 2 },
            "You hug her properly, the long kind, and she smells of the harbour and the hospital and home. The sandwiches get squashed. Neither of you cares.",
            "You hugged Mum properly on the station platform."),
          o("Ask her to tell you something true", "Something to keep.", { family: 1, joy: 2 },
            "“You don't have to be brilliant,” she says. “You just have to come home sometimes.” You'll say the same thing to somebody else one day, word for word.",
            "Mum told you that you just have to come home sometimes.", { facts: { mumTruth: "yes" } }),
        ],
      },
    ],
    activity: {
      id: "a6.summer",
      kind: "plan",
      title: "The last summer",
      intro: "One summer left before everything changes. Spend three weeks of it however you like.",
      keepsake: "Summer ticket",
      icon: "ticket",
      blocks: [
        { id: "work", label: "Work at the chandlery", detail: "Wages, and blisters.", effect: { savings: 5, health: -1 } },
        { id: "friends", label: "Beach bonfires", detail: "Rowan, Maya, and the whole year.", effect: { joy: 4, rowan: 1 } },
        { id: "family", label: "Days with Mum and Dad", detail: "The shop, the kitchen, the long lunches.", effect: { family: 1, joy: 2 } },
        { id: "rest", label: "Do absolutely nothing", detail: "A radical act.", effect: { health: 4 } },
      ],
      result: (_l, r) => {
        const n = (id: string) => r.plan?.filter((x) => x === id).length ?? 0;
        return {
          effect: {},
          text:
            n("work") >= 2
              ? "You end the summer with blistered hands and a savings account that makes you feel like a grown-up. Almost."
              : n("friends") >= 2
                ? "The last bonfire burns down at four in the morning. Nobody wants to be the first to go home, so nobody does."
                : "It's the kind of summer you don't notice while it's happening, and remember for the rest of your life.",
        };
      },
    },
    finds: [
      d("A flask of coffee", "cupcake", "health", "Dad's. Strong enough to strip paint."),
      d("A postcard of the harbour", "photo", "joy", "The Old Pier, before the storm. You keep it."),
      d("Money in an old coat", "coin", "savings", "Ten pounds and a bus ticket from 2009."),
    ],
  },
  // 7 -----------------------------------------------------------------------
  {
    title: "First Badge",
    age: "25–32",
    place: "Your first real workplace",
    scene: "workplace",
    env: "day",
    intro: (l) =>
      `Your badge says ${career(l).toUpperCase()}. It's spelled right, which feels like a miracle. Through the window the Old Pier is still broken — and somebody has finally made an offer for it.`,
    objective: "Get through your first big week",
    free: 2,
    cast: [["sam", 0], ["rowan", 1], ["maya", 2], ["tobias", 3], ["dad", 4]],
    moments: [
      {
        id: "c7.voss",
        kind: "main",
        who: "sam",
        title: "Voss Marina",
        prompt: (l) =>
          `Sam drops a glossy folder on your desk: VOSS MARINA — THE FUTURE OF KITEHAVEN. “Voss wants to pull down what's left of the Old Pier and build a marina,” Sam says. “Yachts, a hotel, three hundred jobs. They've asked for you on the project, by name.” ${interest(l) === "build" ? "They want your structural drawings for the new sea wall." : interest(l) === "draw" ? "They want your designs on every poster in town." : "The marina clinic would be the best-equipped in the county, and they want you to run it."}`,
        context: (l) =>
          l.facts.lunchbox === "stood"
            ? "Across the room, Tobias Voss raises his coffee at you. “You're the one who wouldn't stay down,” he says. It sounds almost like respect."
            : "Across the room Tobias Voss — taller now, in a suit his father chose — doesn't seem to recognise you at all.",
        options: [
          o("Take the project", "Big money, big career. Rowan won't forgive you easily.", { savings: 18, joy: 2, rowan: -1 },
            "You say yes. The money is extraordinary. The work is interesting, which is worse. When Rowan hears, he doesn't call. His mum sends a Christmas card with nothing written in it.",
            "You joined the Voss Marina project.", { facts: { voss: "joined" } }),
          o("Take it — and fight for the pier from inside", "Less money, more arguments, a foot in the door.", { savings: 8, health: -4, joy: 1 },
            "You say yes, with conditions. Tobias raises an eyebrow. “You were always trouble,” he says, and you can't tell if it's a compliment. You spend a year slipping the Old Pier's railings into every drawing. Some of them survive the meetings.",
            "You joined the marina project to fight for the Old Pier from inside.", { facts: { voss: "inside" } }),
          o("Turn it down", "Keep your conscience. Lose the promotion.", { savings: -6, rowan: 1, joy: 2 },
            "You say no. Sam sighs like a slow puncture. The promotion goes to someone else. That weekend Rowan turns up at your door with two fish and a bottle of something terrible, and you drink it on the doorstep together.",
            "You turned down the marina project.", { facts: { voss: "refused" } }),
        ],
      },
      {
        id: "c7.dad",
        kind: "side",
        who: "dad",
        title: "A little heart thing",
        prompt: "Mum rang: Dad had “a little heart thing”, is absolutely fine, and is currently arguing with a nurse about kites. Now he's here, pretending he just happened to be passing.",
        options: [
          o("Take him to the shop for the weekend", "Glue, bamboo, the old radio.", { family: 2, savings: -3 },
            "You spend the weekend in the cold shop making a kite neither of you needs. He shows you the knot Nana taught him. He dies two years later, in his sleep, with a half-finished kite on the bench — and you know that knot.",
            "You spent a whole weekend making a kite with Dad.", { facts: { dadLast: "yes" } }),
          o("Take him for lunch and scold him", "Somebody has to.", { family: 1, joy: 2 },
            "You scold him over fish and chips. He agrees with everything and eats all your chips. He dies two years later, in his sleep; afterwards, you're glad about the chips.",
            "You scolded Dad about his heart over fish and chips."),
        ],
      },
      {
        id: "c7.rowan",
        kind: "side",
        who: "rowan",
        title: "SAVE THE OLD PIER",
        prompt: "Rowan has started a fishing co-op with four other crews: one leaky office above the chandlery and a hand-painted sign that reads SAVE THE OLD PIER.",
        options: [
          o("Go to the harbour meeting", "Plastic chairs and strong opinions.", { rowan: 1, joy: 2 },
            "Eleven people, one urn, forty biscuits. You don't say much, but you stay to stack the chairs, and Rowan notices. He always notices.",
            "You went to Rowan's harbour meeting and stacked the chairs."),
          o("Buy the co-op its first nets", "It'll cost you. It'll matter.", { rowan: 2, savings: -8 },
            "The nets arrive on a Tuesday. Rowan stands in the office looking at the invoice for a long time. “I'll pay you back,” he says. You both know he won't let you refuse, and you both know you'll lose the receipt.",
            "You bought Rowan's co-op its first set of nets.", { facts: { coop: "backed" }, need: { test: (l) => l.stats.savings >= 8, why: "You can't afford the nets yet (needs 8 Savings)." } }),
        ],
      },
      {
        id: "c7.maya",
        kind: "side",
        who: "maya",
        title: "Two suitcases, one hand",
        prompt: "Maya's back from the city with a real job at a real firm — and her firm has just been hired by Voss. She looks like someone carrying two suitcases in one hand.",
        options: [
          o("Ask her to keep the pier drawings safe", "Just in case.", { maya: 1, joy: 1 },
            "She opens her bag. The drawings are already there, in a plastic wallet, older and better. “I never go anywhere without them,” she says. “It's embarrassing.” It isn't.",
            "Maya promised to keep the Old Pier drawings safe.", { facts: { mayaPlan: "kept" } }),
          o("Tell her to take the money", "Rent is real.", { maya: -1, savings: 2 },
            "“You sound like my dad,” she says, and it isn't a compliment. She takes the money. She hates it. It takes her years to tell you.",
            "You told Maya to take the Voss money."),
        ],
      },
    ],
    activity: {
      id: "a7.week",
      kind: "plan",
      title: (l) => (interest(l) === "care" ? "Your first week on the ward" : interest(l) === "draw" ? "Your first week in the studio" : "Your first week in the workshop"),
      intro: "Three days, three blocks. The work won't do itself — and neither will the rest of you.",
      keepsake: "First work badge",
      icon: "photo",
      blocks: [
        { id: "graft", label: "Take the hard jobs", detail: "Impress everyone. Tire yourself out.", effect: { savings: 5, health: -2 } },
        { id: "care", label: "Do it properly", detail: "Check, double-check, learn.", effect: { savings: 2, joy: 2 } },
        { id: "team", label: "Help the new starter", detail: "Someone helped you once.", effect: { joy: 3 } },
        { id: "rest", label: "Go home on time", detail: "A revolutionary act.", effect: { health: 4 } },
      ],
      result: (_l, r) => ({
        effect: {},
        text:
          (r.plan?.filter((x) => x === "graft").length ?? 0) >= 2
            ? "Sam notices. Everyone notices. You sleep through Saturday and half of Sunday."
            : r.plan?.includes("rest")
              ? "You finish the week tired in the ordinary way, not the dangerous way. Sam calls that a skill."
              : "The new starter brings you a coffee on Friday, unprompted. It's the best review you get all year.",
      }),
    },
    finds: [
      d("A lunchtime swim", "shell", "health", "Freezing. You go back to work with salt in your hair."),
      d("A thank-you note", "letter", "joy", "Unsigned. You know whose handwriting it is."),
      d("Your first savings account", "coin", "savings", "Interest rate: tragic. Still."),
    ],
  },
  // 8 -----------------------------------------------------------------------
  {
    title: "Someone to Come Home To",
    age: "33–40",
    place: "The chandlery roof, at sunset",
    scene: "rooftop",
    env: "sunset",
    intro: (l) =>
      `Rowan is throwing a party on the chandlery roof, because he's turning thirty-something and because, he says, somebody in this family has to have fun.${l.facts.dadLast === "yes" ? " Dad's half-finished kite hangs over the stairs; Rowan asked if he could borrow it." : ""} Three people you haven't met are here, and one of them keeps looking at you.`,
    objective: "Meet the guests on the roof",
    free: 2,
    guests: ["avery", "quinn", "morgan"],
    cast: [["avery", 0], ["quinn", 1], ["morgan", 2], ["rowan", 3], ["maya", 4], ["mum", 5]],
    moments: [
      {
        id: "c8.heart",
        kind: "main",
        who: "rowan",
        title: "Anyone?",
        prompt: (l) =>
          `The string lights come on across the roof. Rowan finds you by the water tower with two plates of something burnt.${l.bonds.rowan < 2 ? " It's the first time you've really talked in years." : ""} “So,” he says, very casually, which is how he says everything important. “Anyone?”`,
        context: () => "Meet Avery, Quinn and Morgan on the roof first. Friendship is a good beginning; a life together is a separate decision.",
        options: [
          o("Avery", "Fixes what other people throw away.", { joy: 6, partner: 2 },
            "You and Avery leave the party at midnight to rescue a broken chair from a skip, which is the most romantic thing that has ever happened to you.",
            "You fell for Avery over a broken chair in a skip.", { facts: { partner: "Avery" }, need: { test: (l) => l.meetings.includes("avery"), why: "Talk to Avery first." } }),
          o("Quinn", "Runs the community garden. Probably running for council.", { joy: 6, partner: 2 },
            "Quinn talks you into volunteering for three things before the ice melts in your drink. You say yes to all of them. You'd say yes to anything, it turns out.",
            "You fell for Quinn and volunteered for three things in one evening.", { facts: { partner: "Quinn" }, need: { test: (l) => l.meetings.includes("quinn"), why: "Talk to Quinn first." } }),
          o("Morgan", "A sailor with a boat and no plan B.", { joy: 6, partner: 2 },
            "Morgan draws a route on a napkin: forty-one ports, one boat, no plan B. “Come with me,” Morgan says, as if it were a joke. It isn't.",
            "You fell for Morgan over a napkin map of forty-one ports.", { facts: { partner: "Morgan" }, need: { test: (l) => l.meetings.includes("morgan"), why: "Talk to Morgan first." } }),
          o("No one — and that's fine", "Your people are already on this roof.", { joy: 3, rowan: 1, maya: 1 },
            "“No one,” you say, and it's true, and it's fine. Rowan clinks his burnt plate against yours. “Good,” he says. “More chips for us.” The family you choose is still a family.",
            "You chose your friends as your family.", { facts: { partner: "none" } }),
        ],
      },
      {
        id: "c8.maya",
        kind: "side",
        who: "maya",
        title: "A shared harbour",
        context: (l) =>
          [l.facts.mayaDream === "heard" ? "It's the same pier she's been drawing since she was eight." : "", l.facts.mayaRowan === "yes" ? "She still calls Rowan “the drainpipe boy”." : ""].filter(Boolean).join(" ") || undefined,
        prompt: "Maya has quit the Voss job. She's sitting on the parapet with her old notebook and a new plan: the marina on the east side, the Old Pier restored on the west, a kite museum at the end. “Voss's marina and my pier could share the harbour,” she says. “If anybody would listen.”",
        options: [
          o("I'll listen. Show me everything.", "Every page. Every pile.", { maya: 2, joy: 2 },
            "She shows you everything, page by page, until the party has gone quiet around you. At the end she closes the notebook and says, very quietly, “You're the only one who ever asked to see all of it.”",
            "You looked at every page of Maya's shared-harbour plan.", { facts: { mayaPlan: "shared" } }),
          o("It'll never happen", "Somebody should be realistic.", { maya: -1 },
            "Her face closes like a book. “Probably not,” she says. She puts the notebook away and doesn't take it out again for a very long time.",
            "You told Maya her plan would never happen.", { facts: { mayaPlan: "doubted" } }),
        ],
      },
      {
        id: "c8.mum",
        kind: "side",
        who: "mum",
        title: "One more dance",
        prompt: "Mum has danced with everyone on the roof except you. She is not being subtle about it.",
        options: [
          o("Dance with Mum", "Badly, together.", { family: 1, joy: 4 },
            "You dance badly together to a song neither of you likes. She steers; she always steered. Halfway through she puts her head on your shoulder and says, “He'd have loved this.”",
            "You danced with Mum on the roof."),
          o("Ask her about Dad", "Just talk.", { family: 1, joy: 1 },
            "“He'd have complained about the music,” she says, “and stayed until the very end.” She tells you how they met — at the festival, over a tangled kite line — and you realise you'd never heard it.",
            "Mum told you how she and Dad met over a tangled kite line."),
        ],
      },
    ],
    activity: {
      id: "a8.party",
      kind: "hunt",
      who: "rowan",
      title: "Party errands",
      intro: "Rowan has lost the cake, the camera and the lanterns. At his own party. Find them before the candles go out.",
      keepsake: "Rooftop photo",
      icon: "camera",
      items: [
        { name: "The cake", prop: "cupcake", line: "Hidden behind a plant pot, for reasons." },
        { name: "The camera", prop: "camera", line: "Still has film in it from 2011." },
        { name: "The lanterns", prop: "lantern", line: "They were on the stairs the whole time." },
      ],
      result: () => ({
        effect: { joy: 4, rowan: 1 },
        text: "The cake arrives at the table with every candle still lit, which is a first. Someone takes a photo of everyone on the roof. It ends up on four different fridges.",
      }),
    },
    finds: [
      d("A glass of water between drinks", "cupcake", "health", "Future you says thank you."),
      d("One perfect song", "star", "joy", "You don't know the words. You sing anyway."),
      d("A tip from a friend", "coin", "savings", "“Pay into a pension,” says someone sensible. You actually do."),
    ],
  },
  // 9 -----------------------------------------------------------------------
  {
    title: "The Busy Middle",
    age: "41–50",
    place: "Your kitchen, every evening",
    scene: "kitchen",
    env: "evening",
    intro: (l) =>
      `Dad has been gone two years. Mum lives with you now, which means the kitchen is always full: of Mum, of ${partnered(l) ? partnerName(l) : "Rowan dropping in"}, of Pip — ${pipRole(l)} — of paperwork, and of the smell of something almost burning.`,
    objective: "Hold the house together",
    free: 2,
    cast: [["mum", 0], ["pip", 2], ["rowan", 3], ["avery", 1, (l) => l.facts.partner === "Avery"], ["quinn", 1, (l) => l.facts.partner === "Quinn"], ["morgan", 1, (l) => l.facts.partner === "Morgan"]],
    moments: [
      {
        id: "c9.care",
        kind: "main",
        who: "mum",
        title: "The gas was on again",
        context: (l) => (l.facts.mumTruth === "yes" ? "“You just have to come home sometimes,” she told you on the station platform. Now home is where she needs you." : undefined),
        prompt:
          "Mum left the gas on again. Nobody was hurt, but this afternoon the doctor said the word “dementia”, gently, twice. The same evening an email arrived from Sam: the promotion you've waited fifteen years for is yours, if you'll work in the city office full-time. Mum is at the table doing the crossword in pen, very carefully not listening.",
        options: [
          o("Take the promotion; pay for good care", "Security for everyone. Sundays for Mum.", { savings: 16, family: -1, health: -6 },
            "You take it. The care home is lovely: views of the harbour, and a nurse called Ade who does the crossword with her. You visit on Sundays. Some Sundays she knows you. The money is very good. You stop sleeping properly.",
            "You took the promotion and found Mum a good care home.", { facts: { care: "paid", peak: "yes" } }),
          o("Turn it down and care for her at home", "Hardest year. Maybe the best one.", { savings: -18, family: 2, health: -4, joy: 2 },
            "You turn it down and move Mum into the downstairs room. It's the hardest year of your life, and some of the best: she teaches Pip the harbour song, forgets it, and Pip teaches it back.",
            "You turned down the promotion and cared for Mum at home.",
            { facts: { care: "home" }, need: { test: (l) => l.stats.savings >= 20, why: "You can't afford to lose the income yet (needs 20 Savings)." } }),
          o("Share it — ask for help", "A rota on the fridge. Nobody does it all.", (l) => (partnered(l) && l.bonds.partner >= 3 ? { savings: -6, family: 1, partner: 1, joy: 3 } : { savings: -6, family: 1, rowan: 1, joy: 3 }),
            (l) => `You make a rota on the fridge: you, ${partnered(l) && l.bonds.partner >= 3 ? partnerName(l) : "Rowan"}, the neighbour with the dog, and Rowan's mum on Thursdays. Nobody does it all; everybody does something. Mum calls it “the committee” and pretends to hate it.`,
            "You shared Mum's care with the people who love her.",
            { facts: { care: "shared" }, need: { test: (l) => (partnered(l) && l.bonds.partner >= 3) || l.bonds.rowan >= 3, why: "You need someone close enough to share it with (Partner ♥3 or Rowan ♥3)." } }),
        ],
      },
      {
        id: "c9.partner",
        kind: "side",
        who: "partner",
        title: "Their dream",
        when: partnered,
        prompt: (l) =>
          l.facts.partner === "Avery"
            ? "Avery wants to open a repair workshop — mending things instead of binning them — and it would take most of your savings."
            : l.facts.partner === "Quinn"
              ? "Quinn is standing for the town council and needs you on doorsteps every evening for a month."
              : "Morgan's boat is finally ready. The round-the-world voyage leaves in spring — with you, or without you.",
        options: [
          o("Back their dream", "All the way in.", (l) => (l.facts.partner === "Avery" ? { partner: 2, savings: -12, joy: 3 } : l.facts.partner === "Quinn" ? { partner: 2, health: -4, joy: 3 } : { partner: 2, savings: -6, joy: 5 }),
            (l) =>
              l.facts.partner === "Avery"
                ? "The workshop opens in an old net loft. The first thing Avery mends is Pip's bike; the second is Mum's radio. People start bringing things from three towns away."
                : l.facts.partner === "Quinn"
                  ? "You knock on six hundred doors. Quinn wins by thirty-one votes and cries in the car park. Councillor Quinn. It suits them."
                  : "Morgan sails in spring with a promise to be home for the festival. You meet the boat in four ports, and it comes home weather-beaten and on time.",
            "You backed your partner's dream all the way.",
            { facts: { dream: "backed" }, need: { test: (l) => l.facts.partner !== "Avery" || l.stats.savings >= 12, why: "The workshop would need 12 Savings you don't have." } }),
          o("Ask them to wait", "Not now. Not with everything.", { partner: -1, savings: 2 },
            "They wait. They say they don't mind. It's true for a while, then less true, and neither of you notices the moment it stops being true.",
            "You asked your partner to put their dream on hold.", { facts: { dream: "waited" } }),
        ],
      },
      {
        id: "c9.rowan",
        kind: "side",
        who: "rowan",
        title: "The co-op's books",
        context: (l) => (l.facts.coop === "backed" ? "The nets you bought him years ago are still in use, patched twice." : undefined),
        prompt: "Rowan is at your kitchen table with the co-op's accounts and a face you haven't seen since the storm. Fuel prices, a bad season, the bank. “I'm not asking,” he says, which means he's asking.",
        options: [
          o("Lend him the money", "Friends before sense.", { rowan: 2, savings: -12 },
            "You write the cheque before he can argue. He pays you back in twenty-three instalments and one enormous crab.",
            "You lent Rowan's co-op the money to survive a bad season.", { facts: { loan: "yes" }, need: { test: (l) => l.stats.savings >= 12, why: "You don't have it to lend (needs 12 Savings)." } }),
          o("Go through the books with him", "Two heads. Many biscuits.", { rowan: 1, joy: 1 },
            "You go through every line until two in the morning and find eleven hundred pounds they didn't know they had. It isn't enough; it's a start.",
            "You went through Rowan's co-op books until two in the morning."),
        ],
      },
      {
        id: "c9.pip",
        kind: "side",
        who: "pip",
        title: "A person who keeps the light on",
        prompt: "Pip has a school project — “A Person Who Keeps the Light On” — and has chosen you. There's a list of questions in felt tip.",
        options: [
          o("Tell Pip about Nana June", "The bicycle. The car battery.", { family: 1, joy: 3 },
            "You tell Pip about Nana and the three nights of '61. Pip's eyes go enormous. The project gets full marks and a sticker. Nana would have been unbearable about it.",
            "You told Pip the story of Nana June and the lighthouse.", { facts: { pipStory: "nana" } }),
          o("Tell Pip about the storm", "Your night. Your choice.", { family: 1, joy: 2 },
            (l) =>
              `You tell Pip about the night of the storm, and what you chose. ${l.facts.storm === "studied" ? "Pip asks why you went home. You don't have a good answer, and you say so. That's the lesson, in the end." : "Pip writes it all down with their tongue sticking out."}`,
            "You told Pip about the night of the storm.", { facts: { pipStory: "storm" } }),
        ],
      },
    ],
    activity: {
      id: "a9.rush",
      kind: "hunt",
      who: "pip",
      title: "The morning rush",
      intro: "The school bus goes in five minutes. Find Mum's glasses, Pip's lunchbox and the car keys. Nobody knows where anything is. Nobody ever has.",
      keepsake: "Pip's drawing",
      icon: "drawing",
      items: [
        { name: "Mum's glasses", prop: "glasses", line: "On her head. Obviously." },
        { name: "Pip's lunchbox", prop: "lunchbox", line: "Rocket-shaped. A present from Aunty Maya." },
        { name: "The car keys", prop: "keys", line: "In the fridge. Nobody will admit to this." },
      ],
      result: () => ({
        effect: { joy: 3, health: -1 },
        text: "Everyone leaves the house with their shoes on the right feet. It's a miracle, nobody notices, and that's the job.",
      }),
    },
    finds: [
      d("Ten minutes of quiet", "cupcake", "health", "In the car, before going in. Engine off. Bliss."),
      d("A drawing on the fridge", "drawing", "joy", "It's you, flying a kite, with enormous hands."),
      d("A forgotten savings bond", "coin", "savings", "From Nana June, dated the day you were born."),
    ],
  },
  // 10 ----------------------------------------------------------------------
  {
    title: "The Vote",
    age: "51–60",
    place: "The town square, the day before the vote",
    scene: "square",
    env: "overcast",
    intro:
      "Tomorrow the town votes on the Old Pier: restore it at last, or let Voss build the marina. There are teal ribbons on half the doors and purple ones on the other half, and Mum — who remembers the first festival better than yesterday — has pinned one of each to her cardigan.",
    objective: "Win the town over — or don't",
    free: 2,
    cast: [["rowan", 0], ["maya", 1], ["tobias", 2], ["mum", 3], ["pip", 4]],
    moments: [
      {
        id: "c10.vote",
        kind: "main",
        who: "tobias",
        title: "What will you tell them?",
        prompt:
          "Tobias Voss — grey now, like you, and tired in a way his father never allowed himself to be — finds you by the stage before the meeting. “They'll listen to you,” he says. “Everyone in this town has a story about you. So what are you going to tell them?”",
        context: (l) => {
          const a = allies(l);
          return a.length ? `Around the square you count your allies: ${a.join(", ")}.` : "Around the square you count your allies, and come up short.";
        },
        options: [
          o("Speak for the Old Pier", (l) => `You have ${allies(l).length} of the 3 allies you'd need.`, (l) => (allies(l).length >= 3 ? { rowan: 1, joy: 8 } : { rowan: 1, joy: -4 }),
            (l) =>
              allies(l).length >= 3
                ? "The vote is closer than anyone expects, and then it isn't. The Old Pier will be rebuilt, board by board, on the old piles. Rowan lifts you off your feet in front of the whole town. Tobias shakes your hand. “Fair enough,” he says, and means it."
                : "You speak well. It isn't enough. The marina wins by two hundred votes, and the diggers come in the autumn. Rowan finds you afterwards. “You tried,” he says. “That's the bit I'll remember.”",
            (l) => (allies(l).length >= 3 ? "You spoke for the Old Pier, and the town listened." : "You spoke for the Old Pier. The marina won anyway."),
            { facts: (l) => ({ pier: allies(l).length >= 3 ? "restored" : "marina", vote: "pier" }) }),
          o("Propose Maya's shared harbour", (l) => `Marina and pier, side by side. You have ${allies(l).length} of the 2 allies you'd need.`, (l) => (allies(l).length >= 2 ? { maya: 2, joy: 8 } : { maya: 1, joy: -2 }),
            (l) =>
              allies(l).length >= 2
                ? "You unroll Maya's drawings across the stage: the marina on the east side, the Old Pier on the west, a kite museum at the end. There's a long silence. Then Tobias starts clapping. Maya cries, which she will deny for the rest of her life."
                : "You unroll Maya's drawings and the room goes politely quiet. It's too late for compromise; people have already chosen their ribbons. The marina wins. Maya rolls the drawings up very carefully, and you walk her home.",
            (l) => (allies(l).length >= 2 ? "You proposed Maya's shared harbour, and the town said yes." : "You proposed Maya's shared harbour. It came too late."),
            { facts: (l) => ({ pier: allies(l).length >= 2 ? "shared" : "marina", vote: "shared" }), need: { test: (l) => l.facts.mayaPlan === "shared" || l.bonds.maya >= 3, why: "You'd need Maya's plans and her trust (Maya ♥3)." } }),
          o("Back the marina", "The town needs the jobs.", { savings: 12, rowan: -2, joy: -2 },
            "“The town needs the jobs,” you say, and it does. The marina wins easily. Tobias buys everyone a drink. Rowan doesn't come to the pub. The next spring the yachts arrive, gleaming and enormous, and the kites have nowhere to fly from but the cliffs.",
            "You backed the marina.", { facts: { pier: "marina", vote: "marina" } }),
        ],
      },
      {
        id: "c10.rowan",
        kind: "side",
        who: "rowan",
        title: "Mending nets",
        prompt: "Rowan is on the harbour steps, mending a net he doesn't need to mend.",
        options: [
          o("Mend nets with him", "Your fingers still remember.", { rowan: 1, health: 2, joy: 2 },
            (l) => `You sit down beside him and pick up the other end. ${l.facts.road === "sea" ? "Your fingers remember every knot." : "He teaches you the knot again, patiently, for the ninth time in your life."} Neither of you mentions tomorrow.`,
            "You mended nets with Rowan the day before the vote."),
          o("Remind him of the promise", "Every festival.", { rowan: 2 },
            (l) => (l.facts.promise === "festival" ? "“Every festival,” you say. He looks up. “You kept it,” he says, surprised, as if he'd been counting — which he had." : "“We said we'd always have the festival,” you say. “You said,” he corrects you, gently. But he smiles."),
            "You reminded Rowan of your promise about the festival.", { show: (l) => l.bonds.rowan >= 2 }),
        ],
      },
      {
        id: "c10.maya",
        kind: "side",
        who: "maya",
        title: "A lighthouse in transit",
        context: (l) => (l.facts.mayaKite === "flew" ? "Taped inside the lid of the model box is a date, underlined three times: the day the bridge kite flew." : undefined),
        prompt: "Maya's model of the shared harbour has lost its lighthouse on the bus.",
        options: [
          o("Help her fix it", "Glue, patience, tiny tweezers.", { maya: 1, joy: 2 },
            "You rebuild the lighthouse from a cotton reel and a biro lid. It's better than the original. Maya says so, which is how you know she's nervous.",
            "You rebuilt the lighthouse on Maya's model with a cotton reel.", { facts: { mayaPlan: "shared" }, show: (l) => l.facts.mayaPlan !== "doubted" }),
          o("Tell her you were wrong about her plan", "Years late. Still true.", { maya: 2 },
            "“I said it would never happen,” you say. “I was wrong.” Maya looks at you for a long moment, then takes the notebook out of her bag. It's been there the whole time.",
            "You told Maya you'd been wrong about her plan.", { facts: { mayaPlan: "shared" }, show: (l) => l.facts.mayaPlan === "doubted" }),
        ],
      },
      {
        id: "c10.mum",
        kind: "side",
        who: "mum",
        title: "Both ribbons",
        context: (l) => (l.facts.voice === "yes" ? "She's humming the harbour song under her breath. You hummed it back to her before you could talk." : undefined),
        prompt: "Mum is wearing both ribbons. “I can't remember which one's ours,” she says. Then, suddenly clear: “Your Nana would have hated the marina. She'd have been very polite about it.”",
        options: [
          o("Hold her hand through the meeting", "However long it takes.", { family: 2 },
            (l) =>
              `She holds your hand all through the speeches and squeezes it at the good bits, even when she's lost track of what they are. She dies that winter, peacefully, ${l.facts.care === "paid" ? "in the home with the harbour view, with Ade doing the crossword beside her" : "in the downstairs room"}, with the harbour song on the radio.`,
            "You held Mum's hand through the town meeting.", { facts: { mumLast: "yes" } }),
          o("Take her for an ice cream instead", "Politics can wait. Ice cream can't.", { family: 1, joy: 3 },
            "You skip the speeches and get two ninety-nines. She gets hers all over both ribbons. “There,” she says, satisfied. “Now nobody can tell.” She dies that winter, peacefully, and you'll never eat a ninety-nine again without laughing.",
            "You took Mum for an ice cream instead of the meeting."),
        ],
      },
      {
        id: "c10.pip",
        kind: "side",
        who: "pip",
        title: "Stay or go",
        prompt: (l) => `Pip is twenty and wants to know what you think. “Should I leave Kitehaven, like ${l.facts.road === "city" ? "you did" : "you didn't"}?”`,
        options: [
          o("Go and see the world", "It'll still be here.", { family: 1, joy: 1 },
            "“Go,” you say. “It'll still be here. We'll still be here.” Pip goes, and sends postcards, and one of them is a kite festival on the other side of the world.",
            "You told Pip to go and see the world.", { facts: { pip: "left" } }),
          o("Stay, if you want to", "Small places aren't small.", { family: 1, joy: 1 },
            "“Stay if you want to,” you say. “Small places aren't small. They're just close up.” Pip stays, takes over the co-op's books, and is better at it than anyone.",
            "You told Pip that small places aren't small.", { facts: { pip: "stayed" } }),
        ],
      },
    ],
    activity: {
      id: "a10.rally",
      kind: "hunt",
      title: "Rally the town",
      intro: "Before the meeting: collect Mrs Pepper's signature, the fishermen's pledge and the school's petition. Every one of them is a vote — and an ally.",
      keepsake: "Teal ribbon",
      icon: "flower",
      items: [
        { name: "Mrs Pepper's signature", prop: "letter", line: "She's ninety-four. She signs with a flourish. She mentions the cat." },
        { name: "The fishermen's pledge", prop: "heart", line: "Eleven crews, one smudged thumbprint each." },
        { name: "The school petition", prop: "drawing", line: "Four hundred children. Several pictures of kites." },
      ],
      result: () => ({
        effect: { joy: 3, health: -1 },
        text: "By six o'clock you have the signatures, the pledge and the petition. Rowan reads the list twice. “That's half the town,” he says. “That's… that's the town.”",
        facts: { rally: "yes" },
      }),
    },
    finds: [
      d("Soup from the stall", "cupcake", "health", "Leek and potato. Restorative."),
      d("A teal ribbon on the ground", "flower", "joy", "You pin it on. Or you put it in your pocket, just in case."),
      d("A tax refund", "coin", "savings", "An actual one. You check twice."),
    ],
  },
  // 11 ----------------------------------------------------------------------
  {
    title: "Room to Breathe",
    age: "61–72",
    place: "Nana June's cottage, by the sea",
    scene: "cottage",
    env: "golden",
    intro: (l) =>
      `Mum left you Nana's cottage, a tin of buttons, and a letter you've read so many times the folds have gone soft. ${pierState(l) === "restored" ? "From the garden you can see the Old Pier, new boards gleaming on the old piles." : pierState(l) === "shared" ? "From the garden you can see both halves of the harbour: yachts on one side, kites on the other." : "From the garden you can see the marina, all white and glass, where the Old Pier used to be."}`,
    objective: "Decide what the rest of your life is for",
    free: 2,
    cast: [["pip", 3], ["rowan", 1], ["maya", 4], ["avery", 2, (l) => l.facts.partner === "Avery"], ["quinn", 2, (l) => l.facts.partner === "Quinn"], ["morgan", 2, (l) => l.facts.partner === "Morgan"]],
    moments: [
      {
        id: "c11.shop",
        kind: "main",
        who: "pip",
        title: "FOR THE KITE SHOP. IN CASE.",
        context: (l) => (l.facts.maker === "yes" ? "Your hands still remember watching Dad fold paper into wings." : undefined),
        prompt: "Pip has found the keys at the bottom of Mum's letter, taped to a note in her wobbly capitals: FOR THE KITE SHOP. IN CASE. The shop has been empty for twenty years. It still smells of glue.",
        options: [
          o("Reopen the kite shop", "Dad's workbench. Your hands.", { savings: -14, joy: 12 },
            (l) =>
              `You reopen the shop on a Saturday in April with eleven kites, a kettle and a hand-painted sign.${l.facts.promiseShop === "yes" ? " You kept the promise you made at the festival fifty years late; Dad would have said you were right on time." : ""} By summer, children are pressing their noses to the window again.`,
            "You reopened Dad's kite shop.", { facts: { shop: "reopened" }, need: { test: (l) => l.stats.savings >= 14, why: "You can't afford the rent and the paper (needs 14 Savings)." } }),
          o("Give the keys to Pip", "Let the next generation decide.", { family: 1, joy: 6 },
            "You put the keys in Pip's hand and close Pip's fingers over them. Pip turns the shop into something you don't entirely understand — kites, coffee, a workshop for kids on Saturdays — and it's perfect.",
            "You gave the kite-shop keys to Pip.", { facts: { shop: "given" } }),
          o("Sell it and finally travel", "Forty-one ports, at last.", (l) => (l.facts.partner === "Morgan" ? { savings: 18, joy: 10, partner: 2 } : { savings: 18, joy: 10, health: 2 }),
            (l) => `You sell the shop to a nice couple from the city and buy two round-the-world tickets${partnered(l) ? ` — one for ${partnerName(l)}` : " — one for Rowan, who refuses, then comes"}. You see glaciers, deserts, and a kite festival in a country whose name you can't pronounce, and you send a postcard home from every single port.`,
            "You sold the shop and travelled the world.", { facts: { shop: "sold" }, need: { test: (l) => l.stats.health >= 30, why: "You're not well enough for forty-one ports (needs 30 Health)." } }),
        ],
      },
      {
        id: "c11.rowan",
        kind: "side",
        who: "rowan",
        title: "The crooked boat",
        prompt: "Rowan comes through the garden gate with something wrapped in newspaper: a small wooden boat with a crooked mast, older than both your pensions.",
        context: (l) =>
          [
            l.facts.boat === "truth"
              ? "“Remember when you told me the truth about this?” he says. “I've never trusted anybody faster.”"
              : l.facts.boat === "confessed"
                ? "“Still crooked,” he says, fondly. “Still the best boat in Kitehaven.”"
                : "",
            l.facts.boatFixed === "yes" ? "The mast is still crooked, exactly the way you both fixed it on the back step." : "",
            l.facts.loan === "yes" ? "He paid back every penny of the co-op loan, in twenty-three instalments and one enormous crab." : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined,
        options: [
          o("Sail it in the bird bath", "Two old people and a toy boat.", { rowan: 1, joy: 4 },
            "You sail it across the bird bath and back, twice, while a robin watches with open contempt. It's the most fun either of you has had in years.",
            "You and Rowan sailed the old toy boat in the bird bath."),
          o("Finally tell him the truth", "Sixty years is long enough.", { rowan: 2, joy: 3 },
            "He laughs so hard he has to sit down on the wall. “I know,” he says. “I've known for sixty years. I was waiting to see if you'd ever tell me.”",
            "You finally told Rowan the truth about his boat. He'd known for sixty years.", { facts: { boat: "confessed" }, show: (l) => l.facts.boat === "secret" }),
          o("Apologise to the cat", "Well. To its memory.", { rowan: 2, joy: 4 },
            "“Mrs Pepper's cat,” Rowan says slowly. “I hissed at that cat for a week.” He laughs until he coughs. “You owe that cat an apology. It's been dead for fifty years.” You apologise to the bird bath, which is the best you can do.",
            "You confessed about Mrs Pepper's cat, sixty years late.", { facts: { boat: "confessed" }, show: (l) => l.facts.boat === "cat" }),
        ],
      },
      {
        id: "c11.partner",
        kind: "side",
        who: "partner",
        title: "An ordinary Tuesday",
        when: partnered,
        prompt: (l) => `It's an ordinary Tuesday. ${partnerName(l)} is in the garden, humming, doing something that doesn't need doing.`,
        options: [
          o("Dance in the garden", "Nobody's watching. Except the robin.", { partner: 1, joy: 4 },
            (l) => `You dance with ${partnerName(l)} between the cabbages to no music at all. Your knees complain; you ignore them. The robin leaves in disgust.`,
            "You danced in the garden on an ordinary Tuesday."),
          o("Plant something slow", "An apple tree you might not see fruit.", { partner: 1, health: 3 },
            "You plant an apple tree together. It'll take seven years to fruit. “Good,” you both say, at the same time.",
            "You planted a slow apple tree together."),
        ],
      },
      {
        id: "c11.maya",
        kind: "side",
        who: "maya",
        title: "Drawing the harbour",
        prompt: "Maya is sitting on your garden wall with a sketchbook, drawing the harbour. She's always drawing the harbour.",
        options: [
          o("Ask her to draw you", "It's only fair, after sixty years.", { maya: 1, joy: 3 },
            "She draws you in eleven minutes, frowning. It's the kindest picture anyone has ever made of you. She won't let you keep it; she gives you a better one the next week.",
            "Maya drew your portrait on the garden wall."),
          o("Sit and watch the sea with her", "No talking required.", { maya: 1, health: 2 },
            "You sit side by side and watch the tide come in. After an hour Maya says, “We did all right, didn't we?” You say yes. You mean it.",
            "You watched the tide come in with Maya."),
        ],
      },
    ],
    activity: {
      id: "a11.oldkite",
      kind: "kite",
      title: "Your first kite, again",
      intro: (l) => `You found your ${kiteName(l)} kite in the attic, patched and faded. It deserves one more flight. Hold to pull the string in; let go to let it out.`,
      keepsake: "Your first kite, mended",
      icon: "kite",
      wind: 0.8,
      result: (l, r) => ({
        effect: { joy: r.grade === "soar" ? 7 : 4, health: 1 },
        text:
          r.grade === "wobbly"
            ? `The old ${kiteName(l)} kite spends most of its flight in the apple tree. The child from next door retrieves it. You teach her to fly it instead, and that turns out to be the point.`
            : `The old ${kiteName(l)} kite goes up as if it remembers. You're seventy years old, standing in Nana's garden, and for eleven seconds you're one.`,
      }),
    },
    finds: [
      d("Fresh herbs from the bed", "seedling", "health", "Rosemary, mint, and something you've never identified."),
      d("A robin on the spade", "heart", "joy", "It judges your digging. Harshly."),
      d("A pension letter", "letter", "savings", "Good news, for once."),
    ],
  },
  // 12 ----------------------------------------------------------------------
  {
    title: "The Last Festival",
    age: "73+",
    place: "The clifftop above Kitehaven",
    scene: "clifftop",
    env: "dusk",
    intro:
      "The first festival you remember, you were carried. This one you walked up the cliff path yourself, slowly, stopping every twenty steps to tell a story so nobody would notice you were resting. Nana would have laughed. Everyone who ever held the string with you was invited. Some of them came.",
    objective: "Fly the last kite of the festival",
    free: 99,
    cast: [
      ["rowan", 0, (l) => l.bonds.rowan >= 3],
      ["avery", 1, (l) => l.facts.partner === "Avery" && l.bonds.partner >= 2],
      ["quinn", 1, (l) => l.facts.partner === "Quinn" && l.bonds.partner >= 2],
      ["morgan", 1, (l) => l.facts.partner === "Morgan" && l.bonds.partner >= 2],
      ["pip", 2, (l) => l.bonds.family >= 3],
      ["maya", 3, (l) => l.bonds.maya >= 3],
      ["tobias", 4, (l) => l.facts.lunchbox === "stood" && l.facts.pier !== "marina"],
    ],
    moments: [
      {
        id: "c12.last",
        kind: "main",
        who: "you",
        title: "Who holds the string?",
        prompt: (l) => `The wind is perfect. Your kite — the ${kiteName(l)} one, patched and re-patched — is straining at the string as if it has somewhere to be. Who holds it with you?`,
        context: (l) => (l.bonds.rowan < 3 ? "Rowan didn't come. There's a card on the bench in his handwriting: Couldn't manage the hill. Fly one for me." : undefined),
        options: [
          o("Rowan", "The boy through the gap in the fence.", { rowan: 1, joy: 6 },
            (l) =>
              `Rowan's hands are shaking and so are yours, so between you the string is perfectly steady. ${l.facts.promise === "festival" ? "“Every festival,” he says. You made every single one." : "“We missed a few,” he says. “Doesn't matter. We made this one.”"}`,
            "You held the last string with Rowan.", { facts: { final: "rowan" }, show: (l) => l.bonds.rowan >= 3 }),
          o((l) => partnerName(l) || "Your partner", "The person you came home to.", { partner: 1, joy: 6 },
            (l) => `${partnerName(l)} stands behind you and wraps both arms around yours, the way you've stood at a thousand sinks and stoves and windows. The kite goes up. Neither of you looks at it; you're looking at each other, like idiots, like the first night on the roof.`,
            "You held the last string with the person you came home to.", { facts: { final: "partner" }, show: (l) => partnered(l) && l.bonds.partner >= 2 }),
          o("Pip", "The next pair of hands.", { family: 1, joy: 6 },
            "You put the string in Pip's hands and your hands over Pip's, the way Nana did with you, the way Dad did. Pip doesn't need the help. You don't let go anyway.",
            "You held the last string with Pip.", { facts: { final: "pip" }, show: (l) => l.bonds.family >= 3 }),
          o("Maya", "Who built the impossible things.", { maya: 1, joy: 6 },
            "Maya grabs the string and starts explaining the aerodynamics of your kite, loudly and incorrectly. You let her. It flies anyway, the way the things she built always did.",
            "You held the last string with Maya.", { facts: { final: "maya" }, show: (l) => l.bonds.maya >= 3 }),
          o("Let it fly", "Open your hands.", { joy: 8 },
            (l) => `You let go. The kite goes up and up — a ${kiteName(l)} speck, then a wish, then nothing: just sky, and the lighthouse, and the whole of Kitehaven below, lit up like everyone you ever knew.`,
            "You let the last kite fly.", { facts: { final: "free" } }),
        ],
      },
      {
        id: "c12.rowan",
        kind: "side",
        who: "rowan",
        title: "The gap in the fence",
        when: (l) => l.bonds.rowan >= 3,
        prompt: "Rowan lowers himself onto the bench beside you with a noise like a deckchair. “Remember the gap in the fence?”",
        options: [
          o("“Every day.”", "True.", { rowan: 1 },
            "“Me too,” he says. You sit there for a while, two old people who used to be exactly the size of a gap in a fence.",
            "You and Rowan remembered the gap in the fence."),
        ],
      },
      {
        id: "c12.partner",
        kind: "side",
        who: "partner",
        title: "Still here",
        when: (l) => partnered(l) && l.bonds.partner >= 2,
        prompt: (l) => `${partnerName(l)} has brought a flask, two cups and a blanket you've owned for forty years.`,
        options: [
          o("“Thank you for staying.”", "Forty years of it.", { partner: 1 },
            (l) => `“Where else would I be?” says ${partnerName(l)}, and pours the tea.`,
            "You thanked your partner for staying."),
        ],
      },
      {
        id: "c12.pip",
        kind: "side",
        who: "pip",
        title: "What to keep",
        when: (l) => l.bonds.family >= 3,
        prompt: "Pip sits down in the grass by your feet, like when they were small. “What do I do with all of it?” Pip asks. “After?”",
        options: [
          o("“Keep the light on.”", "Nana's words. Yours now.", { family: 1 },
            "“That's it?” Pip says. “That's it,” you say. It's enough. It always was.",
            "You told Pip to keep the light on."),
        ],
      },
      {
        id: "c12.maya",
        kind: "side",
        who: "maya",
        title: "One more drawing",
        when: (l) => l.bonds.maya >= 3,
        prompt: "Maya is drawing the festival from the cliff edge, her sketchbook weighed down with stones.",
        options: [
          o("Look over her shoulder", "Just this once.", { maya: 1 },
            "She's drawn you into it: a small figure on the clifftop, holding a string that goes all the way up and out of the picture.",
            "Maya drew you into the last festival."),
        ],
      },
      {
        id: "c12.tobias",
        kind: "side",
        who: "tobias",
        title: "The one who said no",
        when: (l) => l.facts.lunchbox === "stood" && l.facts.pier !== "marina",
        prompt: "Tobias Voss has climbed the cliff path in expensive shoes that are now ruined. He's holding a small, rocket-shaped lunchbox.",
        options: [
          o("Ask about the lunchbox", "Surely not.", { joy: 4 },
            "“Maya gave it back to me, years ago,” he says. “Told me to keep it, to remember I was once a very small man.” He laughs. “You were the only one who ever told me no. I've been grateful for sixty years. It's exhausting.”",
            "Tobias Voss thanked you for the day you told him no."),
        ],
      },
    ],
    activity: {
      id: "a12.flight",
      kind: "kite",
      title: "One more flight",
      intro: "The wind off the cliff is strong and kind. Keep your kite in the bright band one more time.",
      keepsake: "The last ribbon",
      icon: "kite",
      wind: 1.1,
      result: (_l, r) => ({
        effect: { joy: r.grade === "soar" ? 6 : 4 },
        text: r.grade === "soar" ? "It flies higher than the lighthouse. Somebody in the crowd starts clapping, and then everyone does." : "It rides the wind the way you've ridden everything: a little wobbly, entirely yours.",
      }),
    },
    finds: [
      d("A cup of tea from a flask", "cupcake", "health", "Too sweet. Perfect."),
      d("A child's lost kite ribbon", "scarf", "joy", "You tie it back on for them. They'll never know who did."),
      d("Coins for the lifeboat tin", "coin", "savings", "You empty your pockets into it. Some things you don't keep."),
    ],
  },
];
