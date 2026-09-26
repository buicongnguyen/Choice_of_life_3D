/**
 * "What if?": the big choice of every chapter, what you picked, what you didn't, and what
 * other lives on this device picked. Built from the life itself (replay-safe) and the album.
 */
import { chapters, text } from "./content";
import { mainMoment, optionOpen, type Life } from "./core";
import type { Album } from "./album";

export type PathStatus = "chosen" | "other" | "open" | "locked" | "hidden";
export interface PathRow {
  chapter: number;
  id: string;
  title: string;
  reached: boolean;
  options: { label: string; status: PathStatus }[];
}

export function pathRows(l: Life, album: Album): PathRow[] {
  return chapters.map((ch, c) => {
    const m = ch.moments.find((x) => x.kind === "main")!;
    const reached = c < l.chapter || (c === l.chapter && Object.hasOwn(l.done, m.id)) || l.complete;
    const view = { ...l, chapter: c };
    const picked = l.done[m.id];
    const others = album.choices[m.id] ?? [];
    return {
      chapter: c,
      id: m.id,
      title: reached ? text(mainMoment(view).title, l) : "",
      reached,
      options: m.options.map((o, i) => {
        const label = text(o.label, l);
        if (picked === i) return { label, status: "chosen" as const };
        if (others.includes(i)) return { label, status: "other" as const };
        if (o.show && !o.show(l)) return { label, status: "hidden" as const };
        return { label, status: optionOpen(l, o) ? ("open" as const) : ("locked" as const) };
      }),
    };
  });
}

/** How many of the big choices' options any life on this device has taken. */
export function explored(album: Album, current?: Life) {
  let n = 0,
    total = 0;
  for (const ch of chapters) {
    const m = ch.moments.find((x) => x.kind === "main")!;
    total += m.options.length;
    const seen = new Set(album.choices[m.id] ?? []);
    if (current && Object.hasOwn(current.done, m.id)) seen.add(current.done[m.id]);
    n += seen.size;
  }
  return { n, total };
}
