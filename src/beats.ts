/**
 * Long story text is shown in beats: short chunks read one at a time, like a spoken line.
 * Beats break only at sentence ends outside quotation marks, so speech is never cut in half.
 */
export const BEAT_WORDS = 34;
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Sentences, keeping any closing quote with its sentence and never splitting inside “…”. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "“") depth++;
    else if (c === "”") depth = Math.max(0, depth - 1);
    if (!/[.!?…]/.test(c)) continue;
    let j = i + 1;
    while (j < text.length && /[”’)]/.test(text[j])) {
      if (text[j] === "”") depth = Math.max(0, depth - 1);
      j++;
    }
    if (depth === 0 && (j >= text.length || text[j] === " ")) {
      out.push(text.slice(start, j).trim());
      start = j;
      i = j - 1;
    }
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

/** Pack sentences into beats of at most `max` words (a single long sentence stays whole). */
export function beats(text: string, max = BEAT_WORDS): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of sentences(text)) {
    if (cur && words(cur) + words(s) > max) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  // Don't leave a dangling scrap: fold a very short last beat into the previous one.
  if (out.length > 1 && words(out[out.length - 1]) < 6 && words(out[out.length - 2]) + words(out[out.length - 1]) <= max + 8) {
    const last = out.pop()!;
    out[out.length - 1] += ` ${last}`;
  }
  return out;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Word spans for the fade-in reveal; words inside quotes are marked as spoken. */
export function wordsHTML(text: string) {
  let depth = 0;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const opens = w.includes("“");
      const spoken = depth > 0 || opens;
      for (const c of w) {
        if (c === "“") depth++;
        else if (c === "”") depth = Math.max(0, depth - 1);
      }
      return `<span class="w${spoken ? " q" : ""}" style="--i:${i}">${escape(w)}</span>`;
    })
    .join(" ");
}

export const wordCount = words;
