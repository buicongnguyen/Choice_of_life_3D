/**
 * All sound is synthesised (no audio files): short chimes for events, a soft "voice" blip
 * per word as people talk (each person has their own pitch), and a gentle ambient bed —
 * surf, wind or rain — chosen by the chapter, and a music-box tune that grows up with you.
 * Everything is silent until sound is enabled.
 */
import type { Env } from "./content";

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let bed: { stop: () => void } | undefined;
let bedKey = "";
export let enabled = false;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  void ctx.resume();
  return ctx;
}

export function setEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    stopAmbience();
    setMusic(null);
  }
}

export function cue(kind: "soft" | "choice" | "find" | "chapter" | "done" | "heart" = "soft") {
  if (!enabled) return;
  try {
    const a = ac();
    const t = a.currentTime;
    const notes = { soft: [523.25, 659.25], choice: [392, 493.88, 587.33], find: [783.99, 1046.5], chapter: [392, 523.25, 659.25, 783.99], done: [523.25, 659.25, 783.99, 1046.5], heart: [659.25, 880] }[kind];
    notes.forEach((f, i) => {
      const o = a.createOscillator(),
        g = a.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.035, t + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5);
      o.connect(g);
      g.connect(master!);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.52);
    });
  } catch {}
}

/** A friendly murmur, not words: pitch comes from the speaker's name. */
export function voicePitch(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 190 + (h % 9) * 38;
}
export function blip(pitch: number) {
  if (!enabled) return;
  try {
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = "triangle";
    o.frequency.value = pitch * (0.92 + Math.random() * 0.16);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g);
    g.connect(master!);
    o.start(t);
    o.stop(t + 0.07);
  } catch {}
}

function noiseBuffer(a: AudioContext, seconds = 4) {
  const b = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // brown-ish noise: soft and low, like distant surf
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  return b;
}

function layer(a: AudioContext, type: BiquadFilterType, freq: number, gain: number, lfoRate: number, lfoDepth: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = gain;
  const lfo = a.createOscillator();
  lfo.frequency.value = lfoRate;
  const depth = a.createGain();
  depth.gain.value = lfoDepth;
  lfo.connect(depth);
  depth.connect(g.gain);
  src.connect(f);
  f.connect(g);
  g.connect(master!);
  src.start();
  lfo.start();
  return () => {
    const t = a.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.4);
    setTimeout(() => {
      src.stop();
      lfo.stop();
      g.disconnect();
    }, 1600);
  };
}

/** Surf for the harbour, wind on the clifftop, rain in the storm, a quiet room indoors. */
export function setAmbience(env: Env | null, scene = "") {
  const key = enabled && env ? `${env}:${scene}` : "";
  if (key === bedKey) return;
  stopAmbience();
  bedKey = key;
  if (!key || !env) return;
  try {
    const a = ac();
    const indoor = ["nursery", "workplace", "kitchen"].includes(scene);
    const stops: (() => void)[] = [];
    if (indoor) stops.push(layer(a, "lowpass", 260, 0.035, 0.05, 0.01));
    else {
      stops.push(layer(a, "lowpass", 480, env === "storm" ? 0.16 : 0.08, 0.09, env === "storm" ? 0.07 : 0.045));
      if (env === "storm") stops.push(layer(a, "highpass", 2400, 0.05, 0.3, 0.01));
      if (env === "dusk" || env === "dawn" || scene === "clifftop" || scene === "station") stops.push(layer(a, "bandpass", 900, 0.025, 0.13, 0.018));
    }
    bed = { stop: () => stops.forEach((s) => s()) };
  } catch {}
}
export function stopAmbience() {
  bed?.stop();
  bed = undefined;
  bedKey = "";
}

// ---------------------------------------------------------------------------
// music: the harbour song on a music box. One tune for a whole life; the arrangement
// grows with you (a lone music box for the baby, a bass line for the child, the festival
// band, minor and sparse in the storm, a warm low voice in old age, everyone at the end).
// ---------------------------------------------------------------------------
export let musicOn = true;
export type MusicStage = number | "title" | "end";

// [scale degree, beats] per bar, 3/4 time, 16 bars
const TUNE: [number, number][][] = [
  [[1, 2], [3, 1]], [[5, 2], [6, 1]], [[5, 1], [3, 1], [2, 1]], [[3, 3]],
  [[1, 2], [3, 1]], [[5, 2], [8, 1]], [[7, 1], [6, 1], [7, 1]], [[8, 3]],
  [[6, 2], [5, 1]], [[4, 2], [3, 1]], [[2, 1], [3, 1], [4, 1]], [[5, 3]],
  [[8, 2], [7, 1]], [[6, 1], [5, 1], [3, 1]], [[2, 2], [3, 1]], [[1, 3]],
];
const CHORDS = [1, 1, 5, 1, 1, 1, 5, 1, 4, 4, 5, 5, 1, 6, 5, 1];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

type Arrangement = { bpm: number; minor?: boolean; bass?: boolean; bell?: boolean; arp?: boolean; pad?: boolean; low?: boolean; sparkle?: boolean };
function arrangement(stage: MusicStage): Arrangement {
  if (stage === "title") return { bpm: 96, bass: true, bell: true };
  if (stage === "end") return { bpm: 86, bass: true, bell: true, arp: true, pad: true, sparkle: true };
  return (
    [
      { bpm: 84 },
      { bpm: 96, bass: true },
      { bpm: 104, bass: true, bell: true },
      { bpm: 120, bass: true, bell: true, arp: true },
      { bpm: 90, minor: true, bass: true, pad: true },
      { bpm: 100, bass: true, arp: true },
      { bpm: 108, bass: true, bell: true, arp: true },
      { bpm: 100, bass: true, bell: true, arp: true, pad: true },
      { bpm: 112, bass: true, arp: true, pad: true },
      { bpm: 94, bass: true, bell: true, pad: true },
      { bpm: 80, low: true, bass: true, pad: true },
      { bpm: 88, bass: true, bell: true, arp: true, pad: true, sparkle: true },
    ][stage] ?? { bpm: 96, bass: true }
  );
}

type Note = { at: number; f: number; dur: number; voice: "box" | "bass" | "bell" | "arp" | "pad" | "warm" };
const TONIC = 349.23; // F4
function freq(degree: number, scale: number[], octave = 0) {
  const d = degree - 1;
  const oct = Math.floor(d / 7) + octave;
  return TONIC * 2 ** ((scale[((d % 7) + 7) % 7] + 12 * oct) / 12);
}
/** Every note of one pass of the tune (16 bars, then 2 bars to breathe), in beats. */
export function score(stage: MusicStage): { notes: Note[]; beats: number } {
  const a = arrangement(stage);
  const scale = a.minor ? MINOR : MAJOR;
  const notes: Note[] = [];
  TUNE.forEach((bar, b) => {
    let beat = b * 3;
    const root = CHORDS[b];
    const chord = [root, root + 2, root + 4];
    for (const [deg, len] of bar) {
      notes.push({ at: beat, f: freq(deg, scale, a.low ? -1 : 0), dur: len, voice: a.low ? "warm" : "box" });
      if (a.sparkle && len >= 2) notes.push({ at: beat + 0.02, f: freq(deg, scale, 1), dur: len, voice: "bell" });
      beat += len;
    }
    if (a.bass) notes.push({ at: b * 3, f: freq(root, scale, -2), dur: 3, voice: "bass" });
    if (a.bell && b % 2 === 0) notes.push({ at: b * 3, f: freq(root + 4, scale, 1), dur: 2, voice: "bell" });
    if (a.arp) for (const k of [1, 2]) notes.push({ at: b * 3 + k, f: freq(chord[k], scale, -1), dur: 1, voice: "arp" });
    if (a.pad && b % 2 === 0) for (const d of chord) notes.push({ at: b * 3, f: freq(d, scale, -1), dur: 6, voice: "pad" });
  });
  if (a.pad) for (const d of [1, 3, 5]) notes.push({ at: 48, f: freq(d, scale, -1), dur: 6, voice: "pad" });
  return { notes: notes.sort((x, y) => x.at - y.at), beats: 54 };
}

let song: { timer: number; gain: GainNode; stage: string } | undefined;

function play(a: AudioContext, out: GainNode, n: Note, t: number, spb: number) {
  const o = a.createOscillator(),
    g = a.createGain();
  const len = n.dur * spb;
  const peak = { box: 0.05, warm: 0.05, bass: 0.045, bell: 0.022, arp: 0.018, pad: 0.012 }[n.voice];
  o.type = n.voice === "bass" || n.voice === "warm" ? "triangle" : "sine";
  o.frequency.value = n.f;
  if (n.voice === "pad") {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + len * 0.4);
    g.gain.linearRampToValueAtTime(0, t + len);
  } else {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(2.4, Math.max(0.5, len * 1.4)));
  }
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + Math.max(len, 2.5));
  if (n.voice === "box" || n.voice === "bell") {
    // the music-box "tine": a quiet partial far above the note
    const o2 = a.createOscillator(),
      g2 = a.createGain();
    o2.frequency.value = n.f * 4.2;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(peak * 0.25, t + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o2.connect(g2);
    g2.connect(out);
    o2.start(t);
    o2.stop(t + 0.4);
  }
}

export function setMusicOn(on: boolean) {
  musicOn = on;
  if (!on) setMusic(null);
}

/** Start (or switch) the tune for a stage of life; null fades it out. */
export function setMusic(stage: MusicStage | null) {
  const key = enabled && musicOn && stage !== null ? String(stage) : "";
  if (key === (song?.stage ?? "")) return;
  if (song) {
    const old = song;
    clearInterval(old.timer);
    try {
      old.gain.gain.setTargetAtTime(0, ctx!.currentTime, 0.35);
    } catch {}
    setTimeout(() => old.gain.disconnect(), 2200);
    song = undefined;
  }
  if (!key || stage === null) return;
  try {
    const a = ac();
    const gain = a.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, a.currentTime, 0.6);
    gain.connect(master!);
    const { notes, beats } = score(stage);
    const spb = 60 / arrangement(stage).bpm;
    let start = a.currentTime + 0.3;
    let i = 0;
    const tick = () => {
      const horizon = a.currentTime + 0.6;
      for (;;) {
        if (i >= notes.length) {
          i = 0;
          start += beats * spb;
        }
        const t = start + notes[i].at * spb;
        if (t > horizon) break;
        if (t >= a.currentTime - 0.05) play(a, gain, notes[i], t, spb);
        i++;
      }
    };
    tick();
    song = { timer: window.setInterval(tick, 200), gain, stage: key };
  } catch {}
}
