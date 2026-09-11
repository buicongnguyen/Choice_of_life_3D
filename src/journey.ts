import { chapters, careerFor, type Encounter, type Scores } from "./content";
import type { Life } from "./core";

export type ActivityRecord = { actions: string[]; complete: boolean };
export type TaskAction = { id: string; label: string; detail: string };
export type Activity = {
  title: string;
  intro: string;
  kind: "sequence" | "search" | "planner";
  actions: TaskAction[];
  keepsake: string;
  icon: string;
};
const a = (id: string, label: string, detail: string): TaskAction => ({
  id,
  label,
  detail,
});
const sequence = (
  title: string,
  intro: string,
  keepsake: string,
  icon: string,
  actions: TaskAction[],
): Activity => ({ title, intro, keepsake, icon, actions, kind: "sequence" });
export const guestNames = ["Avery", "Quinn", "Morgan"];
export const guestLines = [
  "“I start too many projects,” Avery admits, holding a crooked picnic sign. “Would you help me finish one? I like quiet evenings, but I need someone who will tell me when I am overthinking.”",
  "“I promised to organise this picnic, and forgot to eat,” Quinn laughs. “Community matters to me. I am learning that looking after everyone includes looking after myself.”",
  "“I nearly missed the picnic for a train to the coast,” Morgan says. “I love new places. I would like someone to share them with—but I am learning how to stay, too.”",
];
export function record(s: Life, chapter = s.chapter): ActivityRecord {
  return s.activities?.[String(chapter)] ?? { actions: [], complete: false };
}
export function boatEnding(s: Life): string {
  const r = record(s, 1);
  if (!r.complete)
    return "Rowan eventually found the boat with his family. Today he invites you to give it a new story together.";
  if (r.actions.includes("repair"))
    return "The mast still wears the careful repair you and Rowan made together.";
  if (r.actions.includes("dad"))
    return "Dad's repair has lasted all these years; Rowan remembers watching beside you.";
  return "Rowan remembers the toy you lent him while his boat was being fixed. The kindness mattered more than the repair.";
}
export function scholarship(s: Life) {
  return (
    s.facts.grade === "excellent" ||
    (record(s, 4).complete &&
      record(s, 4).actions.filter((x) => x === "study").length >= 2)
  );
}
export function activity(s: Life): Activity {
  const field = s.facts.field;
  const tasks: Activity[] = [
    sequence(
      "A little game with Mum",
      "Follow Mum's gentle cues. There is no timer: tap or use the keyboard when you are ready.",
      "First play ribbon",
      "rattle",
      [
        a(
          "listen",
          "Listen to the rattle",
          "Mum shakes it once, then waits for your attention.",
        ),
        a(
          "reach",
          "Reach for the soft ribbon",
          "Your hand finds the ribbon. Mum lets you lead.",
        ),
        a(
          "share",
          "Offer it back to Mum",
          "She laughs. You have invented your first game together.",
        ),
      ],
    ),
    {
      title: "Rowan's missing boat",
      intro:
        "Rowan last sailed his boat near the rug. Look around, then decide what to do with what you find.",
      kind: "search",
      keepsake: "Rowan's boat",
      icon: "boat",
      actions: [
        a(
          "sofa",
          "Look beside the sofa",
          "A cushion and a trail of toy blocks. No boat here.",
        ),
        a(
          "crib",
          "Check the cot blanket",
          "Just a wooden ring. Rowan remembers carrying a basket next.",
        ),
        a(
          "basket",
          "Look in the toy basket",
          "There it is! The hull is safe, but the little mast has snapped.",
        ),
        a(
          "repair",
          "Repair it together",
          "Hold the mast while Rowan wraps it. A crooked repair, proudly made together.",
        ),
        a(
          "dad",
          "Ask Dad to show you",
          "Dad shows you both how to brace the mast. Asking for help becomes part of the story.",
        ),
        a(
          "lend",
          "Lend Rowan your toy",
          "Rowan can play while the boat waits for a grown-up's repair. You did not have to fix everything yourself.",
        ),
      ],
    },
    sequence(
      "Make the class exhibition",
      "Maya wants every project to have a place. Build a small display together; a first attempt is enough.",
      "Exhibition card",
      "book",
      [
        a(
          "prepare",
          "Clear a space",
          "Maya moves the books while you make room for everyone's work.",
        ),
        a(
          "make",
          "Build the display",
          "A wobbling corner needs another fold. You try again together.",
        ),
        a(
          "invite",
          "Invite the class over",
          "Ms Lin asks how you made it, not whether it is perfect.",
        ),
      ],
    ),
    sequence(
      "One brave rehearsal",
      "Rowan taps a four-beat greeting. Follow the highlighted beat at your own pace: clap, tap, clap, wave.",
      "Club ticket",
      "letter",
      [
        a("clap1", "1 · Clap", "A small start. Rowan joins in."),
        a("tap", "2 · Tap", "You find a shared rhythm."),
        a("clap2", "3 · Clap again", "Someone by the door begins to copy you."),
        a("wave", "4 · Wave", "The rehearsal ends in laughter, not a score."),
      ],
    ),
    {
      title: "Three afternoons before exams",
      intro:
        "You cannot fit everything into one afternoon. Choose three blocks, in any order. Two study blocks unlock a supported tuition opportunity. Reading takes no time.",
      kind: "planner",
      keepsake: "Exam timetable",
      icon: "book",
      actions: [
        a(
          "study",
          "Study",
          "Preparation for a supported place; concentrated study costs energy.",
        ),
        a("work", "Paid shift", "Build a little security for the household."),
        a("friends", "See Rowan", "Protect a friendship as life changes."),
        a("rest", "Rest", "Recover before the next day."),
      ],
    },
    sequence(
      "Assemble your first portfolio",
      `Bring something of yourself to the next chapter. ${s.facts.club ? `Your ${s.facts.club} club gave you a starting point.` : "A small idea is enough to start."} ${record(s, 2).complete ? "Maya saved your exhibition card for the folder." : "You can include an unfinished first attempt."} ${record(s, 3).complete ? "Rowan suggests telling the story of your brave rehearsal." : ""}`,
      "Portfolio folder",
      "book",
      [
        a(
          "select",
          "Choose a piece of work",
          "Alex asks what you learned, rather than how impressive it looks.",
        ),
        a(
          "explain",
          "Explain one difficult moment",
          "You include the attempt that did not work, and what changed.",
        ),
        a(
          "share",
          "Share it with a mentor",
          "Noah offers an introduction for your first working day.",
        ),
      ],
    ),
    {
      title:
        field === "care"
          ? "A morning at the community clinic"
          : field === "technology"
            ? "The first software release"
            : "Your first neighbourhood orders",
      intro:
        field === "care"
          ? "A visitor needs directions, records need checking, and the team needs a break. Arrange three blocks; clinical decisions stay with qualified staff."
          : field === "technology"
            ? "A customer is waiting, a release needs checks, and the team is tired. Arrange three blocks for the day."
            : "Customers are arriving, orders need checking, and you have not stopped all morning. Arrange three work blocks.",
      kind: "planner",
      keepsake: "First work badge",
      icon: "letter",
      actions: [
        a(
          "service",
          field === "care"
            ? "Welcome a visitor"
            : field === "technology"
              ? "Build the requested feature"
              : "Serve an order",
          "Progress and income, at a cost to your energy.",
        ),
        a(
          "quality",
          field === "care"
            ? "Check the handover list"
            : field === "technology"
              ? "Review and test the release"
              : "Check the order details",
          "Careful work earns the team's trust.",
        ),
        a(
          "rest",
          "Take a team break",
          "Protect enough energy for the rest of the day.",
        ),
      ],
    },
    sequence(
      "A picnic worth staying for",
      "Three very different people have brought something to share. Help set the table, then meet them directly in the garden.",
      "Picnic invitation",
      "blanket",
      [
        a(
          "spread",
          "Spread the picnic cloth",
          "Avery helps you smooth the corners of a handmade cloth.",
        ),
        a(
          "share",
          "Set out something to share",
          "Quinn finally sits down when you save a place.",
        ),
        a(
          "listen",
          "Listen to a travel story",
          "Morgan forgets about the next train for a while.",
        ),
      ],
    ),
    {
      title: "A week with room for care",
      intro:
        "Mum wants help, but she also wants you to be all right. Plan three blocks. Paid support costs security; visits take energy; rest helps you stay present.",
      kind: "planner",
      keepsake: "Family care calendar",
      icon: "letter",
      actions: [
        a(
          "visit",
          "Visit Mum",
          "Time together, with a little less energy for work.",
        ),
        a(
          "support",
          "Arrange paid support",
          "Share the practical work; spend some security.",
        ),
        a("rest", "Protect a quiet evening", "Keep enough energy to carry on."),
      ],
    },
    sequence(
      "Leave a useful guide",
      "Leah has made a mistake and is afraid to mention it. Show her how people learn here.",
      "Mentoring booklet",
      "book",
      [
        a(
          "listen",
          "Listen before correcting",
          "Leah explains what went wrong without being interrupted.",
        ),
        a(
          "show",
          "Share your own first mistake",
          "Her shoulders drop. Experience did not make you infallible.",
        ),
        a(
          "write",
          "Write one practical next step",
          "You leave a guide she can pass to the next new colleague.",
        ),
      ],
    ),
    sequence(
      "A garden for the next season",
      `Jamie has saved you a small patch. ${s.facts.hobby === "nature" ? "You recognise the tiny creatures you watched as a child." : "You do not need to be an expert to begin."}`,
      "Garden marker",
      "plant",
      [
        a("soil", "Prepare the soil", "A neighbour shares a tool and a story."),
        a(
          "plant",
          "Plant the seedlings",
          "There is room for herbs and a flower for someone passing by.",
        ),
        a(
          "water",
          "Water and mark the bed",
          "Tomorrow's growth will belong to more people than you.",
        ),
      ],
    ),
    sequence(
      "Open the blue tin",
      "It cannot hold a whole life. Choose a place for a beginning, something you learned, and someone who mattered.",
      "The open blue tin",
      "tin",
      [
        a(
          "beginning",
          "Make room for the beginning",
          `Dad's ${s.facts.tin ?? "small treasure"} goes near the front.`,
        ),
        a(
          "learning",
          "Set out something you learned",
          record(s, 9).complete
            ? "Leah's well-thumbed guide sits beside the work badge."
            : "You make space for the work and ordinary skills that shaped your days.",
        ),
        a(
          "people",
          "Leave a place for people",
          s.facts.home === "partnered"
            ? `A place for ${s.facts.partner}, Rowan, and the people who stayed.`
            : "Friends, neighbours and family fill the spaces between the objects.",
        ),
      ],
    ),
  ];
  return tasks[s.chapter];
}
export function allowedActions(s: Life): TaskAction[] {
  const r = record(s),
    task = activity(s);
  if (s.complete || r.complete) return [];
  if (task.kind === "planner")
    return r.actions.length < 3
      ? task.actions
      : [a("finish", "Keep this plan", "Commit these three blocks.")];
  if (task.kind === "search")
    return r.actions.includes("basket")
      ? task.actions.slice(3)
      : task.actions.slice(0, 3).filter((x) => !r.actions.includes(x.id));
  return task.actions.slice(r.actions.length, r.actions.length + 1);
}
export function taskComplete(s: Life, actions: string[]) {
  const task = activity(s);
  return task.kind === "planner"
    ? actions.length === 4 && actions[3] === "finish"
    : task.kind === "search"
      ? actions.some((x) => ["repair", "dad", "lend"].includes(x))
      : actions.length === task.actions.length;
}
export function taskResult(s: Life): {
  text: string;
  effect: Partial<Scores>;
  tag: string;
} {
  const r = record(s),
    actions = r.actions,
    task = activity(s);
  const count = (id: string) => actions.filter((x) => x === id).length;
  if (s.chapter === 1)
    return {
      text: boatEnding(s),
      effect: { happiness: 2 },
      tag: actions.includes("repair")
        ? "Made together"
        : actions.includes("dad")
          ? "Asked for help"
          : "Shared a toy",
    };
  if (s.chapter === 4)
    return {
      text:
        count("study") >= 2
          ? "Your practice paper shows strong preparation. Alex can offer supported tuition when you reach the learning quarter."
          : count("friends")
            ? "You kept a place for friendship alongside your other commitments. Several routes into learning remain open."
            : "Your timetable reflects what your household needed. Training and work-based routes remain open.",
      effect: {
        health: count("rest") * 3 - count("study") * 2,
        happiness: count("friends") * 3,
        money: count("work") * 3,
      },
      tag: count("study") >= 2 ? "Supported tuition" : "Your own rhythm",
    };
  if (s.chapter === 6)
    return {
      text: count("quality")
        ? "Sam checks the work beside you. “You caught something I missed. Let's keep that habit.” Your careful handover will be remembered in midlife."
        : count("service") === 3
          ? "The work is done, but Sam notices how tired you are. “Next time, leave room for a handover and a break.”"
          : "Sam appreciates a day that leaves enough energy for tomorrow. You have begun to shape the team's rhythm.",
      effect: {
        health: count("rest") * 3 - count("service") * 2,
        happiness: count("quality"),
        money: count("service") * 3,
      },
      tag: count("quality") ? "Careful handover" : "A working rhythm",
    };
  if (s.chapter === 8)
    return {
      text:
        count("rest") && (count("support") || count("visit"))
          ? "Mum circles your quiet evening on the calendar. “Keep this one for yourself. I mean it.”"
          : "Mum thanks you, then asks you to check how the plan feels next week. A care plan can be changed.",
      effect: {
        health: count("rest") * 3 + count("support") - count("visit") * 2,
        happiness: count("visit") * 2,
        money: -count("support") * 4,
      },
      tag: count("rest") ? "Room for everyone" : "An intensive week",
    };
  return {
    text: task.actions.at(-1)!.detail,
    effect: { happiness: 1 },
    tag: task.keepsake,
  };
}
export function conversation(s: Life, index: number): Encounter {
  const base = chapters[s.chapter].encounters[index];
  const enc: Encounter = {
    ...base,
    options: base.options.map((o) => ({
      ...o,
      effect: Object.fromEntries(
        Object.entries(o.effect).map(([k, v]) => [
          k,
          v > 0 ? Math.ceil(v * 0.45) : v,
        ]),
      ),
    })),
  };
  const append = (text: string) => {
    const old = enc.context;
    enc.context = (f) => [old?.(f), text].filter(Boolean).join(" ");
  };
  if (s.chapter === 1 && index === 0) {
    enc.prompt = record(s).complete
      ? `Rowan turns the boat over in his hands. ${boatEnding(s)} “Will you come over again?”`
      : "“I lost my boat,” Rowan says. “I think the mast broke. Will you stay for a while?” The toy basket activity lets you look for it together.";
    enc.options[0] = {
      ...enc.options[0],
      label: "Promise to help each other",
      memory:
        "You promised Rowan that small problems did not have to be faced alone.",
    };
  }
  if (s.chapter === 3 && index === 0) append(boatEnding(s));
  if (s.chapter === 5 && index === 0 && scholarship(s)) {
    enc.options[0].effect.money = -4;
    enc.options[0].hint =
      "Supported tuition: costs 4 Money instead of 12. Your preparation opened this opportunity.";
    append(
      "Your preparation qualifies you for supported tuition. It is an opportunity, not an obligation to attend university.",
    );
  }
  if (s.chapter === 5 && index === 1) {
    append(
      `Your ${s.facts.project ?? "first"} project and ${s.facts.club ?? "school"} interests are useful starting points. The portfolio activity lets you show what you learned.`,
    );
    if (s.facts.club === "technology") {
      enc.options[1].effect.money = 5;
      enc.options[1].hint =
        "Your coding club experience earns a small equipment bursary on this route.";
    }
    if (s.facts.project === "stall") {
      enc.options[2].effect.money = 3;
      enc.options[2].hint =
        "Your class-stall experience helps you find a first customer.";
    }
    if (s.facts.hobby === "nature") {
      enc.options[0].effect.health = -1;
      enc.options[0].hint =
        "Your patient care of living things gives you a gentler start in care work.";
    }
  }
  if (s.chapter === 6 && index === 0) {
    enc.prompt =
      s.facts.field === "care"
        ? "“A visitor is anxious and our handover is unfinished,” Sam says. “What kind of colleague do you want to be?”"
        : s.facts.field === "technology"
          ? "“The release is due and the newest developer found a problem,” Sam says. “How shall we begin?”"
          : "“Our first customers are here, and one order is wrong,” Sam says. “How do you want to build this business?”";
    if (record(s, 5).complete)
      append(
        "Noah's introduction and your portfolio have given Sam something specific to ask you about.",
      );
  }
  if (s.chapter === 6 && index === 1 && s.facts.field === "care")
    enc.options[1].label = "Finish the handover and go";
  if (s.chapter === 7 && index === 0) {
    enc.prompt =
      "“Don't choose from my descriptions,” Jamie says. “Meet Avery, Quinn and Morgan yourself. Friendship is a good beginning; commitment is a separate decision.”";
    enc.options.forEach((o, i) => {
      o.hint = `${s.meetings?.includes(guestNames[i]) ? "You've spoken together." : "Meet this person in the garden first."} ${o.hint}`;
    });
  }
  if (s.chapter === 8) {
    if (index === 0 && record(s, 0).complete)
      append("Mum has kept the ribbon from your very first game together.");
    if (index === 1 && record(s, 6).complete)
      append(
        `Sam recalls your first working day: ${taskResult({ ...s, chapter: 6 }).tag.toLowerCase()}.`,
      );
  }
  if (s.chapter === 9 && index === 0) {
    append(
      s.facts.care === "network"
        ? "The rota you made for Mum taught you that support can be shared. Leah needs that lesson too."
        : `Your choice to ${s.facts.midlife === "time" ? "protect time" : s.facts.midlife === "promotion" ? "accept more responsibility" : "ask for flexibility"} has changed what you can offer today.`,
    );
    if (record(s, 8).complete)
      append(
        `The care calendar taught you something too: ${taskResult({ ...s, chapter: 8 }).tag.toLowerCase()}.`,
      );
  }
  if (s.chapter === 10 && index === 0)
    append(
      `Your ${s.facts.hobby ?? "childhood"} interests never entirely went away. After ${s.facts.later === "project" ? "the final project" : s.facts.later === "parttime" ? "part-time work" : "work in the community"}, you can make a new rhythm.`,
    );
  if (s.chapter === 10 && index === 1) append(boatEnding(s));
  if (s.chapter === 11 && index === 1)
    append(
      `${record(s, 9).complete ? "Leah has brought your guide, with notes from the next new colleague." : s.facts.school === "learning" ? "Maya brings the book you shared on her first school day." : s.facts.school === "teamwork" ? "Maya still remembers being invited into your first school game." : "Maya remembers the way you sat beside her on the first school day."} ${record(s, 10).complete ? "The bed you planted is already growing." : "There is still an empty bed someone could plant next spring."}`,
    );
  return enc;
}
export function canChoose(s: Life, encounter: number, option: number) {
  return (
    !(s.chapter === 7 && encounter === 0) ||
    s.meetings.includes(guestNames[option])
  );
}
export function responseFor(s: Life, encounter: number): string {
  const f = s.facts;
  const responses = [
    [
      "Mum waits for your next little gesture. For now, being understood is a whole adventure.",
      "Dad taps the blue tin. “We will leave room for the things you haven't found yet.”",
    ],
    [
      record(s, 1).complete
        ? boatEnding(s)
        : "“I'll look in the basket,” Rowan says. You can still join the search before leaving.",
      "Mum leaves the afternoon open. This interest can travel with you into school.",
    ],
    [
      "Maya moves her chair closer. “I thought everyone already knew someone.”",
      "Ms Lin leaves a place for your work. The exhibition activity is ready when you are.",
    ],
    [
      "Rowan has an idea for a first rehearsal—and promises not to laugh at the wrong notes.",
      "Dad writes your priority on the calendar. “Let's see if we can protect it.”",
    ],
    [
      "Ms Lin folds the timetable. “Your grades are not your whole future. Your preparation can still open doors.”",
      "Rowan looks relieved. “Good. I didn't want this to be the last ordinary afternoon.”",
    ],
    [
      scholarship(s)
        ? "Alex has written supported tuition beside your name. You can still choose a different route."
        : "Alex circles the next step. “You can keep learning after this decision, too.”",
      `Noah writes “${careerFor(f)}” on a practice badge. “The job is not the whole person. Remember that.”`,
    ],
    [
      "Sam rolls up a sleeve. “All right. Let's see what that looks like in the workday activity.”",
      f.boundary === "overtime"
        ? "“Another night, then,” Rowan says. He understands—but he had hoped to see you."
        : "Rowan puts another place at the table. Work is no longer the only thing on the calendar.",
    ],
    [
      `${f.partner} smiles at the invitation. Getting to know someone is a beginning, not an automatic marriage.`,
      "Dad nods. “A home is something people keep making. It needn't look like mine.”",
    ],
    [
      "“Thank you,” Mum says. “And tell me when the plan needs to change.”",
      "Sam takes the request seriously. Your next chapter will carry this decision with it.",
    ],
    [
      "Leah asks a second question. This time, she sounds less afraid to ask.",
      "Sam shuts the calendar. “Then let's make a way to finish well.”",
    ],
    [
      "Jamie saves a place for you. A quieter calendar can still contain a beginning.",
      boatEnding(s),
    ],
    [
      "Rowan lets the silence last. Some memories do not need another explanation.",
      "Maya leaves the tin open. There is room for someone else's first treasure.",
    ],
  ];
  return responses[s.chapter][encounter];
}
export const objectives = [
  "Begin a game with Mum; choose Dad's first treasure",
  "Help Rowan with the missing boat",
  "Make room for Maya and a first project",
  "Find an interest worth making time for",
  "Plan the afternoons before your exams",
  "Choose a learning route and show your work",
  "Find your rhythm on the first working day",
  "Meet the guests; decide what home means",
  "Make room for care without carrying it alone",
  "Help Leah take her first confident step",
  "Make something that can keep growing",
  "Open the tin and decide what travels onward",
];
export function keepsakes(s: Life) {
  const cards: {
    chapter: number;
    title: string;
    text: string;
    icon: string;
  }[] = [];
  if (s.facts.tin)
    cards.push({
      chapter: 0,
      title: `Dad's ${s.facts.tin}`,
      text: "The first small treasure in the blue tin.",
      icon: "tin",
    });
  for (let chapter = 0; chapter <= s.chapter; chapter++) {
    if (!record(s, chapter).complete) continue;
    const life = { ...s, chapter },
      task = activity(life);
    cards.push({
      chapter,
      title: task.keepsake,
      text: taskResult(life).text,
      icon: task.icon,
    });
  }
  return cards;
}
