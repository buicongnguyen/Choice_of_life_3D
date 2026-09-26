/**
 * The album of lives: every finished life is kept on this device (its ending, its kite and
 * who came to the last festival), and every choice ever made is remembered so the journal's
 * Paths tab can show what other lives chose. Stored apart from the save, so beginning a new
 * life never forgets the old ones.
 */
import { chapters, type ArchetypeKey } from "./content";
import { endingKey, presentAtEnd, type Life } from "./core";

export const ALBUM_KEY = "choice-of-life-album";
export const ENDINGS: ArchetypeKey[] = ["keeper", "heart", "wanderer", "builder", "friend", "ordinary"];
const MAX_LIVES = 40;

export interface AlbumLife {
  /** Identity + log fingerprint, so finishing (or re-reading) the same life adds it once. */
  id: string;
  at: number;
  name: string;
  ending: ArchetypeKey;
  kite: string;
  pattern: string;
  trim: number;
  present: string[];
  colour: number;
}
export interface Album {
  v: 1;
  lives: AlbumLife[];
  /** moment id → option indices chosen in any life. */
  choices: Record<string, number[]>;
}

export const emptyAlbum = (): Album => ({ v: 1, lives: [], choices: {} });

function fingerprint(l: Life) {
  let h = 2166136261;
  const s = `${l.identity.name}|${l.identity.skin}${l.identity.hair}${l.identity.colour}|${l.log.join(",")}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const ENDING_SET = new Set<string>(ENDINGS);
const MOMENTS = new Map(chapters.flatMap((c) => c.moments.map((m) => [m.id, m.options.length] as const)));

/** Read an album, dropping anything malformed (it is user-editable storage). */
export function parseAlbum(raw: string | null): Album {
  const out = emptyAlbum();
  if (!raw || raw.length > 200000) return out;
  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return out;
    if (Array.isArray(d.lives))
      for (const x of d.lives.slice(-MAX_LIVES)) {
        if (!x || typeof x.id !== "string" || !ENDING_SET.has(x.ending) || typeof x.name !== "string") continue;
        out.lives.push({
          id: x.id.slice(0, 16),
          at: Number.isFinite(x.at) ? x.at : 0,
          name: x.name.slice(0, 24),
          ending: x.ending,
          kite: ["red", "blue", "yellow"].includes(x.kite) ? x.kite : "red",
          pattern: typeof x.pattern === "string" && /^[a-z]{1,16}$/.test(x.pattern) ? x.pattern : "plain",
          trim: Number.isInteger(x.trim) && x.trim >= 0 && x.trim < 6 ? x.trim : 0,
          present: Array.isArray(x.present) ? x.present.filter((w: unknown) => typeof w === "string" && /^[a-z]{1,12}$/.test(w)).slice(0, 8) : [],
          colour: Number.isInteger(x.colour) && x.colour >= 0 && x.colour < 6 ? x.colour : 0,
        });
      }
    if (d.choices && typeof d.choices === "object")
      for (const [id, list] of Object.entries(d.choices)) {
        const n = MOMENTS.get(id);
        if (!n || !Array.isArray(list)) continue;
        const ok = [...new Set(list.filter((i: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n))] as number[];
        if (ok.length) out.choices[id] = ok.sort((a, b) => a - b);
      }
  } catch {
    /* start fresh */
  }
  return out;
}

/** Remember every choice this life has made so far. Returns true when something new was learned. */
export function noteChoices(a: Album, l: Life) {
  let changed = false;
  for (const [id, i] of Object.entries(l.done)) {
    if (!MOMENTS.has(id)) continue;
    const list = (a.choices[id] ??= []);
    if (!list.includes(i)) {
      list.push(i);
      list.sort((x, y) => x - y);
      changed = true;
    }
  }
  return changed;
}

/** Add a finished life to the album (once). Returns true when it was new. */
export function keepLife(a: Album, l: Life, now = Date.now()) {
  if (!l.complete) return false;
  noteChoices(a, l);
  const id = fingerprint(l);
  if (a.lives.some((x) => x.id === id)) return false;
  a.lives.push({
    id,
    at: now,
    name: l.identity.name === "You" ? "" : l.identity.name,
    ending: endingKey(l),
    kite: l.facts.kite ?? "red",
    pattern: l.style.pattern,
    trim: l.style.trim,
    present: presentAtEnd(l),
    colour: l.identity.colour,
  });
  if (a.lives.length > MAX_LIVES) a.lives.splice(0, a.lives.length - MAX_LIVES);
  return true;
}

export const endingsFound = (a: Album) => new Set(a.lives.map((x) => x.ending));
