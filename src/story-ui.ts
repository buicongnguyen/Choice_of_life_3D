import type { Life } from "./core";
import { responseSummary } from "./choice-copy";
import { chapters, type Scores } from "./content";
import {
  activity,
  allowedActions,
  record,
  taskResult,
  keepsakes,
  objectives,
} from "./journey";
export const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const esc = escapeHTML;
const button = (action: string, text: string, extra = "") =>
  `<button data-action="${action}" ${extra}>${text}</button>`;
const close = () =>
  button("close", "×", 'class="close" aria-label="Return to exploring"');
const heading = (eyebrow: string, title: string) =>
  `<div class="dialogue-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 tabindex="-1" id="story-panel-title">${esc(title)}</h2></div>${close()}</div>`;
const panel = (body: string, cls = "") =>
  `<section class="dialogue story-panel ${cls}" role="dialog" aria-modal="true" aria-labelledby="story-panel-title">${body}</section>`;
export function effectText(effect: Partial<Scores>) {
  return (
    Object.entries(effect)
      .filter(([, n]) => n !== 0)
      .map(
        ([k, n]) =>
          `${n! > 0 ? "+" : ""}${n} ${k === "money" ? "Money" : k === "health" ? "Health" : "Happiness"}`,
      )
      .join(" · ") || "A memory kept"
  );
}
export function activityPanel(s: Life) {
  const task = activity(s),
    r = record(s),
    allowed = allowedActions(s);
  const count =
    task.kind === "planner"
      ? 3
      : task.kind === "search"
        ? 2
        : task.actions.length;
  const completed =
    task.kind === "search"
      ? Number(r.actions.includes("basket")) + Number(r.complete)
      : Math.min(count, r.actions.length);
  const last = task.actions.find((a) => a.id === r.actions.at(-1));
  let board = "";
  if (task.kind === "planner") {
    board += `<div class="planner-slots" aria-label="Your three time blocks">${[0, 1, 2].map((i) => `<div class="time-slot ${r.actions[i] ? "filled" : ""}"><small>BLOCK ${i + 1}</small><strong>${esc(task.actions.find((a) => a.id === r.actions[i])?.label ?? "Open afternoon")}</strong></div>`).join("")}</div>`;
    const result = taskResult(s);
    board += `<p class="activity-feedback">Preview: ${esc(effectText(result.effect))}. Applied after 3 blocks.</p>`;
  } else {
    board += `<div class="task-progress" aria-label="Activity progress">${Array.from({ length: count }, (_, i) => `<span class="${i < completed ? "done" : ""}">${i < completed ? "✓" : i + 1}</span>`).join(" ")}</div>`;
    if (last)
      board += `<p class="activity-feedback" role="status">${esc(last.detail)}</p>`;
  }
  const actions = task.kind === "sequence" ? task.actions : allowed;
  board += `<div class="activity-actions ${task.kind}">${actions
    .map((a, i) => {
      const enabled = allowed.some((x) => x.id === a.id);
      return button(
        "task-step",
        `<span class="activity-token">${task.kind === "search" ? "⌕" : task.kind === "sequence" ? (i < r.actions.length ? "✓" : i + 1) : "+"}</span><span><strong>${esc(a.label)}</strong>${task.kind === "search" || task.kind === "sequence" ? "" : `<small>${esc(a.detail)}</small>`}</span>`,
        `data-step="${a.id}" ${enabled ? "" : "disabled"}`,
      );
    })
    .join("")}</div>`;
  return panel(
    heading(
      task.kind === "planner" ? "PLAN 3 BLOCKS" : "OPTIONAL ACTIVITY",
      task.title,
    ) +
      `<p class="prompt">${esc(task.kind === "planner" ? "Choose 3 blocks. You can repeat an option." : task.kind === "search" ? "Find the boat, then choose how to help." : "Follow the steps at your own pace.")}</p>${board}<div class="activity-tools">${task.kind === "planner" ? button("task-undo", "Undo", r.actions.length ? "" : "disabled") : ""}${button("task-assist", "Help me finish")}</div><details class="choice-details"><summary>More details</summary><p>${esc(task.intro)}</p><p>No timer. Each step saves.</p></details>`,
    "activity-panel",
  );
}
export function briefingPanel(s: Life) {
  const ch = chapters[s.chapter];
  return panel(
    heading(`CHAPTER ${s.chapter + 1} · AGE ${ch.age}`, ch.title) +
      `<p class="story-goal">${esc(objectives[s.chapter])}</p><div class="briefing-task"><span>OPTIONAL</span><strong>${esc(activity(s).title)}</strong><p>Use Explore to find it. Walk near items to collect them.</p></div><div class="activity-tools">${button("close", "Let's go →", 'class="primary"')}</div><details class="choice-details"><summary>The story so far</summary><p>${esc(ch.intro)}</p></details>`,
  );
}
export function responsePanel(
  title: string,
  text: string,
  effect: Partial<Scores> = {},
  note = "",
) {
  return panel(
    heading("SAVED TO YOUR STORY", title) +
      `<p class="prompt response-copy">${esc(responseSummary(text))}</p><p class="actual-effect">${esc(effectText(effect))}</p><div class="activity-tools">${button("close", "Continue →", 'class="primary"')}</div>${text !== responseSummary(text) || note ? `<details class="choice-details"><summary>More details</summary>${text !== responseSummary(text) ? `<p>${esc(text)}</p>` : ""}${note ? `<p>${esc(note)}</p>` : ""}</details>` : ""}`,
    "response-panel",
  );
}
const paths: Record<string, string> = {
  boat: "M8 31h48l-9 15H18z M31 31V6l20 22H31 M27 10L12 28h15",
  book: "M12 12h18q8-6 22 0v36q-14-6-22 0H12z M30 12v36 M17 20h8 M17 27h8",
  plant:
    "M23 34h20l-4 20H27z M33 34V14 M33 25Q10 27 15 10q18 0 18 15 M33 20Q52 23 51 8q-18 0-18 12",
  tin: "M10 22h44v29H10z M7 16h50v7H7z M28 33h8v8h-8z",
  letter: "M8 16h48v34H8z M8 17l24 20 24-20 M8 50l18-19 M56 50L38 31",
  rattle:
    "M26 34l-9 18 M13 48l10 6 M43 26a15 15 0 1 1-26-15 15 15 0 0 1 26 15 M18 15l22 12",
  blanket: "M10 12h44v39H10z M16 12v39 M45 12v39 M10 20h44 M10 43h44",
};
export function keepsakeCards(s: Life) {
  const cards = keepsakes(s);
  return `<div class="keepsake-grid">${cards.map((c) => `<article class="keepsake-card"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${paths[c.icon] ?? paths.book}"/></svg><small>CHAPTER ${c.chapter + 1}</small><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join("") || "<p>Your first treasure is waiting. Talk to Dad or try a hands-on activity.</p>"}</div>`;
}
export function chapterTimeline(s: Life) {
  return `<div class="life-timeline">${chapters
    .slice(0, s.chapter + 1)
    .map((ch, i) => {
      const memories = s.memories.filter(
        (m) => m.chapter === i && !m.id.startsWith("found:"),
      );
      return `<article><span class="eyebrow">${esc(ch.age)} · CHAPTER ${i + 1}</span><h3>${esc(ch.title)}</h3>${memories.map((m) => `<p><strong>${esc(m.title)}</strong> — ${esc(m.text)}</p>`).join("") || "<p>This page is still being written.</p>"}</article>`;
    })
    .join("")}</div>`;
}
