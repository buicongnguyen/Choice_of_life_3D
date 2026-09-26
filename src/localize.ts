/**
 * Translations. Every piece of story text has a stable path (see contentPaths); a language
 * file (src/lang/vi.ts, src/lang/ko.ts) supplies a string or a function for each path,
 * the whole lexicon, and the interface dictionary. applyOverlay() swaps them in at start-up;
 * the game logic (ids, effects, facts, gates) never changes with the language.
 */
import { chapters, people, lexicon, type Activity, type KiteGrade, type Lexicon, type Moment, type Option } from "./content";
import type { Life } from "./core";
import { setUI, type UIKey } from "./i18n";

type Fn = (l: Life) => string;
type CtxFn = (l: Life) => string | undefined;
type ResultFn = (l: Life, r: { plan?: string[]; grade?: KiteGrade }) => string;
export type OverlayText = string | Fn | CtxFn | ResultFn;
export interface Overlay {
  code: "vi" | "ko";
  ui: Partial<Record<UIKey, string>>;
  lexicon: Lexicon;
  text: Record<string, OverlayText>;
}

export type PathEntry = { path: string; kind: "text" | "context" | "result"; get: () => unknown; set: (v: OverlayText) => void };

/** Every translatable story field, in reading order. */
export function contentPaths(): PathEntry[] {
  const out: PathEntry[] = [];
  const field = <T extends object>(path: string, obj: T, key: keyof T, kind: PathEntry["kind"] = "text") =>
    out.push({ path, kind, get: () => obj[key], set: (v) => ((obj as Record<string, unknown>)[key as string] = v) });
  chapters.forEach((ch, c) => {
    const n = c + 1;
    field(`ch${n}.title`, ch, "title");
    field(`ch${n}.place`, ch, "place");
    field(`ch${n}.intro`, ch, "intro");
    field(`ch${n}.objective`, ch, "objective");
    ch.moments.forEach((m: Moment) => {
      field(`${m.id}.title`, m, "title");
      field(`${m.id}.prompt`, m, "prompt");
      if (m.context) field(`${m.id}.context`, m, "context", "context");
      m.options.forEach((o: Option, k) => {
        field(`${m.id}.o${k}.label`, o, "label");
        field(`${m.id}.o${k}.hint`, o, "hint");
        field(`${m.id}.o${k}.reply`, o, "reply");
        field(`${m.id}.o${k}.memory`, o, "memory");
        if (o.need) field(`${m.id}.o${k}.why`, o.need, "why");
      });
    });
    const a: Activity = ch.activity;
    field(`${a.id}.title`, a, "title");
    field(`${a.id}.intro`, a, "intro");
    field(`${a.id}.keepsake`, a, "keepsake");
    a.items?.forEach((it, k) => {
      field(`${a.id}.i${k}.name`, it, "name");
      field(`${a.id}.i${k}.line`, it, "line");
    });
    a.blocks?.forEach((b) => {
      field(`${a.id}.b.${b.id}.label`, b, "label");
      field(`${a.id}.b.${b.id}.detail`, b, "detail");
    });
    // The activity result's text (its effects stay in English code).
    const original = a.result;
    out.push({
      path: `${a.id}.result`,
      kind: "result",
      get: () => original,
      set: (v) => {
        const fn = v as ResultFn;
        a.result = (l, r) => ({ ...original(l, r), text: typeof v === "string" ? v : fn(l, r) });
      },
    });
    ch.finds.forEach((d, k) => {
      field(`ch${n}.f${k}.name`, d, "name");
      field(`ch${n}.f${k}.line`, d, "line");
    });
  });
  for (const [who, p] of Object.entries(people)) {
    field(`p.${who}.name`, p, "name");
    field(`p.${who}.role`, p, "role");
    field(`p.${who}.bark`, p, "bark");
    if (p.meet) field(`p.${who}.meet`, p, "meet");
  }
  return out;
}

export function applyOverlay(ov: Overlay) {
  for (const e of contentPaths()) {
    const v = ov.text[e.path];
    if (v === undefined) continue;
    // role and bark are always functions in the English source; accept plain strings too.
    if ((e.path.endsWith(".role") || e.path.endsWith(".bark")) && typeof v === "string") e.set(() => v);
    else e.set(v);
  }
  Object.assign(lexicon, ov.lexicon);
  setUI(ov.code, ov.ui);
  if (typeof document !== "undefined") document.documentElement.lang = ov.code;
}
