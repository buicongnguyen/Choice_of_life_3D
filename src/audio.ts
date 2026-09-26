/**
 * All sound is synthesised (no audio files): short chimes for events, a soft "voice" blip
 * per word as people talk (each person has their own pitch), and a gentle ambient bed —
 * surf, wind or rain — chosen by the chapter. Everything is silent until sound is enabled.
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
  if (!on) stopAmbience();
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
