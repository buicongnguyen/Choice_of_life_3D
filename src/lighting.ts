import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Env } from "./content";

/** Time-of-day looks. Colours are vivid and warm; night keeps a deep blue sky and lets the lamps carry the colour. */
export type Preset = {
  sky: [string, string, string]; // top, middle, horizon
  sun: string;
  sunI: number;
  sunDir: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  fill: string;
  fillI: number;
  rim: string;
  rimI: number;
  exposure: number;
  fog: [number, number];
  envI: number;
  weather?: "rain" | "confetti" | "motes" | "petals";
  bloom: number;
};
export const presets: Record<Env, Preset> = {
  morning: { sky: ["#4aa8ff", "#8fd0ff", "#fff0cf"], sun: "#fff1d8", sunI: 3.3, sunDir: [-6, 12, 7], hemiSky: "#d8ecff", hemiGround: "#c49a6c", hemiI: 1.15, fill: "#b9d6ff", fillI: 0.55, rim: "#ffd9a8", rimI: 0.9, exposure: 1.02, fog: [45, 120], envI: 0.4, weather: "motes", bloom: 0.25 },
  afternoon: { sky: ["#2f96ff", "#7fcbff", "#fff3d2"], sun: "#ffefcf", sunI: 3.5, sunDir: [-7, 11, 5], hemiSky: "#d6ecff", hemiGround: "#9fbf6a", hemiI: 1.1, fill: "#bcd8ff", fillI: 0.55, rim: "#ffe0b0", rimI: 0.9, exposure: 1.02, fog: [50, 140], envI: 0.4, weather: "petals", bloom: 0.2 },
  festival: { sky: ["#1f8fff", "#6cc6ff", "#fff6d6"], sun: "#fff3da", sunI: 3.7, sunDir: [-5, 13, 6], hemiSky: "#dff0ff", hemiGround: "#d59a5a", hemiI: 1.15, fill: "#b4d4ff", fillI: 0.6, rim: "#ffe4b8", rimI: 1.0, exposure: 1.02, fog: [60, 170], envI: 0.45, weather: "confetti", bloom: 0.2 },
  storm: { sky: ["#02050f", "#061230", "#0c2350"], sun: "#7d98ff", sunI: 0.75, sunDir: [6, 12, -4], hemiSky: "#27407a", hemiGround: "#070b18", hemiI: 0.75, fill: "#3b5cb8", fillI: 0.4, rim: "#8fb0ff", rimI: 0.9, exposure: 1.12, fog: [24, 80], envI: 0.25, weather: "rain", bloom: 0.55 },
  dawn: { sky: ["#3c78ff", "#8fb8ff", "#ffc98f"], sun: "#ffd3a0", sunI: 3.0, sunDir: [-9, 7, -3], hemiSky: "#cfe0ff", hemiGround: "#b98d68", hemiI: 1.1, fill: "#aac6ff", fillI: 0.55, rim: "#ffc48a", rimI: 1.2, exposure: 1.02, fog: [40, 130], envI: 0.4, weather: "motes", bloom: 0.3 },
  day: { sky: ["#3aa0ff", "#86cdff", "#fff1d4"], sun: "#fff4e0", sunI: 3.1, sunDir: [-6, 12, 7], hemiSky: "#e3f1ff", hemiGround: "#c7a57a", hemiI: 1.2, fill: "#c2dcff", fillI: 0.55, rim: "#ffe2b5", rimI: 0.8, exposure: 1.02, fog: [50, 140], envI: 0.45, bloom: 0.2 },
  sunset: { sky: ["#2438a8", "#b04fa8", "#ff9848"], sun: "#ffb069", sunI: 3.0, sunDir: [-10, 6, -6], hemiSky: "#ffcfa8", hemiGround: "#6d4a6f", hemiI: 1.0, fill: "#7f8cff", fillI: 0.55, rim: "#ff9b54", rimI: 1.4, exposure: 1.04, fog: [40, 130], envI: 0.35, weather: "motes", bloom: 0.5 },
  evening: { sky: ["#101a52", "#2a3a8f", "#ff9a62"], sun: "#ffc68a", sunI: 2.4, sunDir: [-4, 10, 8], hemiSky: "#ffd6b0", hemiGround: "#5a4260", hemiI: 1.0, fill: "#6f86ff", fillI: 0.5, rim: "#ffb070", rimI: 1.0, exposure: 1.05, fog: [45, 130], envI: 0.35, bloom: 0.45 },
  overcast: { sky: ["#5f9bea", "#a8cdf2", "#fbf1df"], sun: "#fff4e4", sunI: 2.6, sunDir: [-4, 13, 6], hemiSky: "#e8f0ff", hemiGround: "#c2ad90", hemiI: 1.35, fill: "#cfe0ff", fillI: 0.6, rim: "#ffe6c4", rimI: 0.7, exposure: 1.03, fog: [45, 130], envI: 0.45, bloom: 0.2 },
  golden: { sky: ["#2f7fff", "#79c0ff", "#ffcf86"], sun: "#ffc97c", sunI: 3.2, sunDir: [-9, 8, 2], hemiSky: "#ffe6c0", hemiGround: "#9a8a58", hemiI: 1.05, fill: "#9ec0ff", fillI: 0.5, rim: "#ffb35c", rimI: 1.3, exposure: 1.03, fog: [45, 140], envI: 0.4, weather: "motes", bloom: 0.45 },
  dusk: { sky: ["#1e2c9c", "#8a4fb5", "#ffae5a"], sun: "#ffb566", sunI: 3.1, sunDir: [-11, 5, -5], hemiSky: "#ffd2a4", hemiGround: "#5f4a70", hemiI: 1.0, fill: "#7a8cff", fillI: 0.55, rim: "#ffa04f", rimI: 1.5, exposure: 1.05, fog: [45, 150], envI: 0.35, weather: "motes", bloom: 0.42 },
};

function skyTexture(p: Preset) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, p.sky[0]);
  grad.addColorStop(0.55, p.sky[1]);
  grad.addColorStop(1, p.sky[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/**
 * Presets are authored as relative art values; these factors map them to three.js physical
 * light units so a lit white floor lands near 1.0 in linear space. That keeps saturated
 * colour saturated through tone mapping and leaves bloom for lamps and windows only.
 */
const UNITS = { sun: 0.42, hemi: 0.55, fill: 0.45, rim: 0.5, env: 0.8, exposure: 0.98 };

/** Owns every light in the scene; switching chapter swaps the preset, not the objects. */
export class Stage {
  readonly sun = new T.DirectionalLight();
  readonly hemi = new T.HemisphereLight();
  readonly fill = new T.DirectionalLight();
  readonly rim = new T.DirectionalLight();
  private reflection?: T.WebGLRenderTarget;
  private sky?: T.Texture;
  preset: Preset = presets.morning;

  constructor(
    private scene: T.Scene,
    private renderer: T.WebGLRenderer,
    private low: boolean,
  ) {
    renderer.outputColorSpace = T.SRGBColorSpace;
    // Neutral keeps saturated toy colours saturated (ACES/AgX wash them out).
    renderer.toneMapping = T.NeutralToneMapping;
    renderer.shadowMap.enabled = !low;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    if (!low) {
      const studio = new RoomEnvironment();
      const gen = new T.PMREMGenerator(renderer);
      this.reflection = gen.fromScene(studio, 0.04);
      scene.environment = this.reflection.texture;
      studio.dispose();
      gen.dispose();
    }
    this.sun.castShadow = !low;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target, this.hemi, this.fill, this.rim);
    scene.fog = new T.Fog(0xffffff, 40, 120);
  }

  apply(env: Env) {
    const p = (this.preset = presets[env]);
    this.sky?.dispose();
    this.sky = skyTexture(p);
    this.scene.background = this.sky;
    const fog = this.scene.fog as T.Fog;
    fog.color.set(p.sky[2]);
    [fog.near, fog.far] = p.fog;
    this.sun.color.set(p.sun);
    this.sun.intensity = p.sunI * UNITS.sun * (this.low ? 0.9 : 1);
    this.sun.position.set(...p.sunDir).normalize().multiplyScalar(30);
    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.hemiI * UNITS.hemi * (this.low ? 1.3 : 1);
    this.fill.color.set(p.fill);
    this.fill.intensity = p.fillI * UNITS.fill;
    this.fill.position.set(8, 6, -6);
    this.rim.color.set(p.rim);
    this.rim.intensity = p.rimI * UNITS.rim;
    this.rim.position.set(-p.sunDir[0] * 0.2 - 6, 5, -10);
    this.scene.environmentIntensity = p.envI * UNITS.env;
    this.renderer.toneMappingExposure = p.exposure * UNITS.exposure;
  }

  dispose() {
    this.scene.remove(this.sun, this.sun.target, this.hemi, this.fill, this.rim);
    if (this.scene.environment === this.reflection?.texture) this.scene.environment = null;
    this.reflection?.dispose();
    this.sky?.dispose();
    this.sun.dispose();
  }
}
