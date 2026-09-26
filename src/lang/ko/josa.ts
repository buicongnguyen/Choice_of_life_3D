/**
 * Korean particles that change with the last sound of a word (받침), for names and words
 * that are only known at run time (partner names, careers, kite colours).
 */
const lastJong = (w: string) => {
  const s = w.trim();
  const c = s.charCodeAt(s.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0;
};
const pick = (w: string, withFinal: string, without: string) => w + (lastJong(w) ? withFinal : without);

/** 이/가 */
export const iga = (w: string) => pick(w, "이", "가");
/** 을/를 */
export const eul = (w: string) => pick(w, "을", "를");
/** 은/는 */
export const eun = (w: string) => pick(w, "은", "는");
/** 과/와 */
export const wa = (w: string) => pick(w, "과", "와");
/** 으로/로 (a word ending in ㄹ takes 로) */
export const ro = (w: string) => w + (lastJong(w) && lastJong(w) !== 8 ? "으로" : "로");
/** 이야/야 (copula, casual) */
export const ya = (w: string) => pick(w, "이야", "야");
/** 이라고/라고 (quoting a word) */
export const rago = (w: string) => pick(w, "이라고", "라고");
