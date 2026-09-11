import type { Life } from "./core";
import { record } from "./journey";

type Copy = { prompt: string; labels: [string, string, string] };
const c = (prompt: string, ...labels: Copy["labels"]): Copy => ({
  prompt,
  labels,
});

/** Presentation only: option order, facts, rewards and journal memories stay unchanged. */
const copy: [Copy, Copy][] = [
  [
    c("What would you like?", "A cuddle", "Listen to Mum", "Take a nap"),
    c(
      "What goes in your keepsake tin?",
      "A paper star",
      "A garden stone",
      "Your first coin",
    ),
  ],
  [
    c(
      "Rowan needs help. What will you do?",
      "Help each other",
      "Share your toys",
      "Ask Dad for help",
    ),
    c(
      "How will you spend the afternoon?",
      "Explore nature",
      "Make paper art",
      "Tidy your toys",
    ),
  ],
  [
    c(
      "Maya is alone. How will you say hello?",
      "Sit with her",
      "Invite her to play",
      "Share a book",
    ),
    c(
      "Pick a class project.",
      "Grow a garden",
      "Build an invention",
      "Run a class stall",
    ),
  ],
  [
    c(
      "Which club will you join?",
      "Music and art",
      "Sports team",
      "Coding club",
    ),
    c(
      "What matters most this week?",
      "Rest at home",
      "See friends",
      "Practise a skill",
    ),
  ],
  [
    c(
      "How will you prepare for exams?",
      "Study hard",
      "Balance study and rest",
      "Work and study",
    ),
    c(
      "How will you stay in touch?",
      "Meet every year",
      "Take a trip",
      "Write letters",
    ),
  ],
  [
    c(
      "Choose your next step.",
      "University",
      "Practical training",
      "Learn on the job",
    ),
    c(
      "What kind of work interests you?",
      "Care for people",
      "Technology",
      "Start a business",
    ),
  ],
  [
    c(
      "How will you start your first job?",
      "Take a challenge",
      "Learn steadily",
      "Help a colleague",
    ),
    c(
      "Rowan invites you out. What will you do?",
      "Work an extra shift",
      "Finish work and go",
      "Share a quiet meal",
    ),
  ],
  [
    c(
      "Meet each guest first. Who would you like to know better?",
      "Avery",
      "Quinn",
      "Morgan",
    ),
    c(
      "What kind of home do you want?",
      "Life with a partner",
      "Single, with close friends",
      "A shared community",
    ),
  ],
  [
    c(
      "Mum needs help. How will you support her?",
      "Take time off work",
      "Pay for support",
      "Share care with family",
    ),
    c(
      "Choose your work-life balance.",
      "Accept a promotion",
      "Work fewer hours",
      "Ask for flexible hours",
    ),
  ],
  [
    c(
      "Leah is worried. How will you help?",
      "Mentor her",
      "Write a team guide",
      "Find her a helper",
    ),
    c(
      "What comes next for your work?",
      "One big project",
      "Part-time work",
      "Help the community",
    ),
  ],
  [
    c(
      "How will you spend your free time?",
      "Grow food together",
      "Take a small trip",
      "Enjoy creative hobbies",
    ),
    c(
      "Rowan brings the old boat. What now?",
      "Retell the story",
      "Make a new memory",
      "Give it to a child",
    ),
  ],
  [
    c(
      "What will you treasure most?",
      "The people I loved",
      "What I learned",
      "The ordinary days",
    ),
    c(
      "What would you like to leave behind?",
      "A place to belong",
      "Knowledge to share",
      "A chance for someone",
    ),
  ],
];

export function choiceCopy(s: Life, index: number): Copy {
  const base = copy[s.chapter][index];
  if (s.chapter === 1 && index === 0 && record(s).complete)
    return {
      ...base,
      prompt: "Rowan wants to stay friends. What will you do?",
    };
  if (s.chapter === 6 && index === 0)
    return {
      ...base,
      prompt:
        s.facts.field === "care"
          ? "A visitor needs help and work is waiting. Where will you start?"
          : s.facts.field === "technology"
            ? "The release has a problem. How will you help?"
            : "An order is wrong. How will you help?",
    };
  if (s.chapter === 6 && index === 1 && s.facts.field === "care")
    return {
      ...base,
      labels: [base.labels[0], "Finish the handover", base.labels[2]],
    };
  return base;
}

/** The full response remains expandable and in the journal; never clip a sentence. */
export function responseSummary(text: string) {
  return text.match(/^.*?[.!?][”"]?(?=\s|$)/u)?.[0] ?? text;
}
