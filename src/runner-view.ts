/**
 * The Life Run in 3D (docs/LIFE_RUN_PLAN.md). World owns the renderer, lights and characters;
 * this draws a Run from runner-core.ts behind a Subway Surfers chase camera. The runner stays
 * at the origin and the street scrolls towards the camera, so the sun's shadow box always
 * covers the action.
 */
import * as T from "three";
import { Run, RUN_LANES, CLEAR, GATE_AHEAD, gateX, type Item, type RunEvent, type RunPlan } from "./runner-core";

/** The slice of an Actor (world.ts) the run needs. */
export type RunActor = {
  root: T.Group;
  walk: { dist: number; vel: number; simVel?: boolean };
  wave: number;
  height: number;
  body?: T.Object3D;
};
export interface RunHost {
  root: T.Group;
  camera: T.PerspectiveCamera;
  animate(a: RunActor, moving: boolean, t: number, dt: number): void;
  reduced(): boolean;
  low: boolean;
  font(): string;
  spark(): T.Texture;
}

const TILE = 12;
const AHEAD = 96;
/** How fast legs cycle on screen: speed-true up to a natural running cadence, then the street does the rest. */
const LEG_CAP: Record<string, number> = { baby: 1.2, kid: 4.4, adult: 4.8, elder: 3.0 };
const POP: Record<string, number> = { coin: 0xffc234, spark: 0xfff07a, heart: 0xff5f8f, kite: 0x7fd6ff };

type Tile = { group: T.Group; base: number };
type Pop = { obj: T.Object3D; t: number; vy: number };
type Burst = { pts: T.Sprite[]; vel: T.Vector3[]; t: number };

export class RunView {
  readonly run: Run;
  private group = new T.Group();
  private tiles: Tile[] = [];
  private plaza: T.Object3D[] = [];
  private items = new Map<number, T.Object3D>();
  private pops: Pop[] = [];
  private bursts: Burst[] = [];
  private gates: T.Object3D[] = [];
  private ring: T.Mesh;
  private kite?: T.Object3D;
  private lean = 0;
  private shake = 0;
  private squash = 0;
  private camPos = new T.Vector3(0, 3.4, 7.4);
  private camLook = new T.Vector3(0, 1.2, -8);
  private portrait = false;
  paused = false;
  onEvent: (e: RunEvent) => void = () => {};

  constructor(
    private host: RunHost,
    plan: RunPlan,
    private kit: T.Object3D,
    private player: RunActor,
    private friends: Map<string, RunActor>,
    private body: string,
  ) {
    this.run = new Run(plan);
    host.root.add(this.group);
    // pickups glow a little so they read in shade and at a distance, as in the genre
    for (const [name, hex] of [["coin", 0x9a6200], ["spark", 0x8a7a00], ["heart", 0x7a1030]] as const)
      kit.getObjectByName(`Run_${name}`)?.traverse((o) => {
        const m = (o as T.Mesh).material as T.MeshStandardMaterial | undefined;
        if (m && "emissive" in m && !m.userData.runGlow) {
          m.emissive.setHex(hex);
          m.emissiveIntensity = 0.55;
          m.userData.runGlow = true;
        }
      });
    // the street: recycled tiles with their dressing
    const n = host.low ? 8 : 10;
    for (let i = 0; i < n; i++) {
      const g = new T.Group();
      g.add(this.piece(`track_${plan.theme}`));
      this.dress(g, i, plan.theme);
      this.group.add(g);
      this.tiles.push({ group: g, base: i * TILE });
    }
    for (const k of [0, 1]) {
      const p = this.piece("plaza");
      p.userData.base = plan.stop + 6 + k * TILE;
      this.plaza.push(p);
      this.group.add(p);
    }
    // the town gathered round the crossroads
    const back = this.piece("backdrop");
    back.userData.base = plan.stop + GATE_AHEAD + 7;
    this.plaza.push(back);
    this.group.add(back);
    // the crossroads: one gate per option, with its words painted on the sign
    plan.gates.forEach((g, i) => {
      const gate = this.piece("gate");
      gate.position.x = gateX(i, plan.gates.length);
      if (!g.open) gate.add(this.piece("gate_shut"));
      gate.add(this.sign(g.label, g.open));
      this.gates.push(gate);
      this.group.add(gate);
    });
    this.ring = new T.Mesh(new T.RingGeometry(0.85, 1.05, 40), new T.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.ring.visible = false;
    (this.ring.material as T.Material).userData.owned = true;
    this.ring.userData.ownedGeometry = true;
    this.group.add(this.ring);
    player.root.rotation.set(0, Math.PI, 0);
    host.root.add(player.root);
    for (const f of friends.values()) {
      f.root.visible = false;
      host.root.add(f.root);
    }
  }

  private piece(name: string) {
    const src = this.kit.getObjectByName(`Run_${name}`);
    const o = src ? src.clone(true) : new T.Group();
    o.position.set(0, 0, 0);
    return o;
  }

  /** Houses, trees, lamps and stalls along both sides of a tile, varied by its index. */
  private dress(g: T.Group, i: number, theme: string) {
    let s = (i * 2654435761) >>> 0;
    const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    for (const side of [-1, 1]) {
      const face = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const put = (name: string, x: number, z: number, rot = face) => {
        const o = this.piece(name);
        o.position.set(side * x, 0, z);
        o.rotation.y = rot;
        g.add(o);
      };
      if (theme === "town") {
        put(`house${Math.floor(r() * 4)}`, 7.9, -3.2);
        put(`house${Math.floor(r() * 4)}`, 7.9, 2.6);
        put("lamp", 4.5, 0);
        if (r() < 0.35 && !this.host.low) put("stall", 5.4, 5.2);
      } else if (theme === "pier") {
        put("lamp", 5.2, -2);
        if (r() < 0.5) put("boat", 10.5 + r() * 3, r() * 8 - 4, r() * 6);
        if (r() < 0.3 && !this.host.low) put("stall", 6.6, 3.5);
      } else {
        put("tree", 7 + r() * 2, -3 + r() * 1.5, r() * 6);
        if (r() < 0.7) put("tree", 8 + r() * 3, 3 + r() * 2, r() * 6);
        if (r() < 0.4) put(`house${Math.floor(r() * 4)}`, 12, 0);
      }
    }
    if (theme !== "garden" && i % 3 === 1) {
      const b = this.piece("bunting");
      g.add(b);
    }
  }

  /** The option's words on its gate (wrapped to two lines, in the page's font). */
  private sign(label: string, open: boolean) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 200;
    const g = c.getContext("2d")!;
    g.fillStyle = open ? "#fff6d6" : "#b8c0d8";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 54;
    const words = label.split(/\s+/);
    let lines: string[] = [];
    for (; size >= 28; size -= 4) {
      g.font = `700 ${size}px ${this.host.font()}`;
      lines = [];
      let line = "";
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (g.measureText(next).width > 470 && line) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      lines.push(line);
      if (lines.length <= 2 && lines.every((l) => g.measureText(l).width <= 480)) break;
    }
    lines.slice(0, 2).forEach((l, k, all) => g.fillText(l, 256, 100 + (k - (all.length - 1) / 2) * size * 1.1));
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new T.Mesh(new T.PlaneGeometry(2.2, 0.86), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    m.material.userData.owned = true;
    m.userData.ownedGeometry = true;
    m.position.set(0, 3.55, 0.06);
    return m;
  }

  input(cmd: "left" | "right" | "jump" | "slide" | "go", gate?: number) {
    if (this.paused) return;
    const ev = cmd === "go" && gate !== undefined ? this.run.go(gate) : this.run.input(cmd);
    this.handle(ev);
  }

  step(dt: number) {
    if (this.paused) return;
    this.handle(this.run.step(dt));
  }

  private handle(ev: RunEvent[]) {
    for (const e of ev) {
      if (e.type === "lane") this.lean = this.run.leanDir;
      if (e.type === "slide") this.squash = 1;
      if (e.type === "hit") this.shake = 0.5;
      if (e.type === "coin" || e.type === "spark" || e.type === "heart" || e.type === "kite") this.collect(e.item);
      if (e.type === "highfive") {
        const f = this.friends.get(e.who);
        if (f) f.wave = 1.2;
        this.player.wave = 0.8;
      }
      this.onEvent(e);
    }
  }

  private collect(it: Item) {
    const obj = this.items.get(it.id);
    if (obj) {
      this.items.delete(it.id);
      this.pops.push({ obj, t: 0, vy: 3 });
    }
    if (this.host.reduced() || this.host.low) return;
    // a little burst of sparks where it was
    const pts: T.Sprite[] = [];
    const vel: T.Vector3[] = [];
    for (let k = 0; k < 7; k++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: this.host.spark(), color: POP[it.kind] ?? 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      sp.scale.setScalar(0.35);
      sp.position.set(this.run.x, it.y, -0.2);
      const a = (k / 7) * Math.PI * 2;
      vel.push(new T.Vector3(Math.cos(a) * 2.2, 1.5 + Math.sin(a) * 2.2, 1.5));
      pts.push(sp);
      this.group.add(sp);
    }
    this.bursts.push({ pts, vel, t: 0 });
  }

  /** Where a track distance sits on screen: ahead of the runner is towards -z. */
  private zOf(dist: number) {
    return -(dist - this.run.d);
  }

  frame(t: number, dt: number) {
    const run = this.run;
    const d = run.d;
    // the street scrolls past; tiles beyond the crossroads give way to the plaza
    const span = this.tiles.length * TILE;
    for (const tile of this.tiles) {
      while (tile.base < d - TILE * 1.5) tile.base += span;
      tile.group.position.z = this.zOf(tile.base);
      tile.group.visible = tile.base < run.plan.stop - 2;
    }
    for (const p of this.plaza) {
      p.position.z = this.zOf(p.userData.base);
      p.visible = p.userData.base - d < AHEAD + TILE;
    }
    this.gates.forEach((g) => {
      g.position.z = this.zOf(run.gateZ);
      g.visible = run.gateZ - d < AHEAD + 10;
    });
    // items come into view, move with the street, and leave behind you
    for (const it of run.items) {
      const ahead = it.z - d;
      let obj = this.items.get(it.id);
      if (it.taken || ahead < -14 || ahead > AHEAD) {
        if (obj && !it.taken) {
          this.release(obj, it);
          this.items.delete(it.id);
        }
        continue;
      }
      if (!obj) {
        obj = this.spawn(it);
        this.items.set(it.id, obj);
      }
      const centre = it.kind === "cart" ? it.z + CLEAR.cart.depth / 2 : it.z;
      obj.position.set(RUN_LANES[it.lane], it.kind === "friend" || it.kind in CLEAR ? 0 : it.y, this.zOf(centre));
      if (it.kind === "coin" || it.kind === "spark" || it.kind === "heart" || it.kind === "kite") {
        if (!this.host.reduced()) obj.rotation.y = t * 3 + it.id;
        obj.position.y += Math.sin(t * 4 + it.id) * 0.06;
      }
      if (it.hit) obj.rotation.z = Math.sin(t * 30) * 0.05;
    }
    // removed obstacles (winded: the street clears) disappear
    for (const [id, obj] of this.items) {
      if (!run.items.some((i) => i.id === id)) {
        obj.removeFromParent();
        this.items.delete(id);
      }
    }
    for (const p of [...this.pops]) {
      p.t += dt;
      p.obj.position.y += p.vy * dt;
      p.obj.scale.setScalar(1 + p.t * 3);
      if (p.t > 0.22) {
        p.obj.removeFromParent();
        this.pops.splice(this.pops.indexOf(p), 1);
      }
    }
    for (const b of [...this.bursts]) {
      b.t += dt;
      b.pts.forEach((sp, k) => {
        sp.position.addScaledVector(b.vel[k], dt);
        (sp.material as T.SpriteMaterial).opacity = Math.max(0, 1 - b.t * 2.4);
      });
      if (b.t > 0.45) {
        for (const sp of b.pts) {
          sp.removeFromParent();
          sp.material.dispose();
        }
        this.bursts.splice(this.bursts.indexOf(b), 1);
      }
    }
    // the runner: lane, jump, slide, a lean into each lane change, and speed-true legs
    const p = this.player;
    const sliding = run.slide > 0 && !run.airborne;
    this.lean *= Math.exp(-dt * 7);
    this.squash = Math.max(0, this.squash - dt * 1.6);
    const s = p.root.scale.x || 1;
    p.root.position.set(run.x, run.y, 0);
    p.root.rotation.z = this.lean * 0.22;
    p.root.rotation.y = Math.PI - this.lean * 0.25;
    p.root.scale.y = s * (sliding ? 0.7 : 1);
    const legs = Math.min(run.speed, LEG_CAP[this.body] ?? 4.6);
    const grounded = !run.airborne && run.kite <= 0 && !sliding;
    if (grounded) p.walk.dist += legs * dt;
    p.walk.simVel = true;
    p.walk.vel = legs / s;
    this.host.animate(p, grounded && run.speed > 0.4, t, dt);
    // ducking: tucked forward and low, so from behind you see a back bent under the banner
    if (sliding && p.body) p.body.rotation.x = 0.85;
    // the kite lift: a kite overhead, its string to your hand
    if (run.kite > 0) {
      if (!this.kite) {
        this.kite = this.piece("kite");
        this.group.add(this.kite);
      }
      this.kite.position.set(run.x + 0.3, run.y + p.height + 1.4 + Math.sin(t * 3) * 0.1, -0.6);
      this.kite.rotation.z = Math.sin(t * 2.4) * 0.25;
    } else if (this.kite) {
      this.kite.removeFromParent();
      this.kite = undefined;
    }
    // friends wave as you come, high-five as you pass
    for (const it of run.items) {
      if (it.kind !== "friend" || !it.who) continue;
      const f = this.friends.get(it.who);
      if (!f) continue;
      const ahead = it.z - d;
      f.root.visible = ahead > -12 && ahead < AHEAD;
      if (!f.root.visible) continue;
      f.root.position.set(RUN_LANES[it.lane], 0, this.zOf(it.z));
      f.root.rotation.y = 0;
      if (ahead < 22 && ahead > 4 && f.wave <= 0 && !it.taken && !this.host.reduced()) f.wave = 1.4;
      f.walk.simVel = true;
      f.walk.vel = 0;
      this.host.animate(f, false, t + it.id, dt);
    }
    // the crossroads ring marks the gate you face
    this.ring.visible = run.phase === "crossroads";
    if (this.ring.visible) {
      this.ring.position.set(run.lanes[run.gate] ?? 0, 0.04, this.zOf(run.gateZ) + 0.6);
      (this.ring.material as T.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.3;
    }
    this.placeCamera(dt);
  }

  private spawn(it: Item): T.Object3D {
    if (it.kind === "friend" && it.who) {
      const f = this.friends.get(it.who);
      if (f) return f.root;
    }
    const o = this.piece(it.kind === "friend" ? "spark" : it.kind);
    this.group.add(o);
    return o;
  }

  private release(obj: T.Object3D, it: Item) {
    if (it.kind === "friend") obj.visible = false;
    else obj.removeFromParent();
  }

  private placeCamera(dt: number) {
    const run = this.run;
    const crossroads = run.phase !== "run";
    const back = this.portrait ? 8.6 : 7.2,
      up = this.portrait ? 4.0 : 3.3;
    // at the crossroads the question card covers the lower part of the screen: frame the gates above it
    const pos = crossroads ? new T.Vector3(run.x * 0.35, this.portrait ? 2.6 : 2.8, this.portrait ? 3.5 : 5.2) : new T.Vector3(run.x * 0.55, up + run.y * 0.6, back);
    const look = crossroads ? new T.Vector3(run.x * 0.35, this.portrait ? -4.2 : 0.9, -GATE_AHEAD) : new T.Vector3(run.x * 0.7, 1.15 + run.y * 0.55, -8);
    const k = 1 - Math.exp(-dt * (crossroads ? 2.5 : 9));
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    const cam = this.host.camera;
    cam.position.copy(this.camPos);
    if (this.shake > 0 && !this.host.reduced()) {
      this.shake = Math.max(0, this.shake - dt);
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.4;
    }
    cam.lookAt(this.camLook);
  }

  /** Subway Surfers frames wide and low; phones in portrait get more height. */
  resize(aspect: number) {
    this.portrait = aspect < 0.8;
    const cam = this.host.camera;
    cam.fov = aspect < 0.6 ? 74 : aspect < 0.8 ? 66 : aspect < 1.2 ? 60 : 54;
    cam.clearViewOffset();
  }

  dispose() {
    for (const b of this.bursts) for (const sp of b.pts) sp.material.dispose();
    this.player.root.removeFromParent();
    for (const f of this.friends.values()) f.root.removeFromParent();
    this.group.removeFromParent();
  }

  diagnostics() {
    const r = this.run;
    return { phase: r.phase, d: +r.d.toFixed(2), stop: r.plan.stop, lane: r.lane, x: +r.x.toFixed(2), y: +r.y.toFixed(2), sliding: r.slide > 0, kite: r.kite > 0, speed: +r.speed.toFixed(2), coins: r.coins, sparks: r.sparks, hearts: r.hearts, stumbles: r.stumbles, winded: r.winded, friends: r.friends, gate: r.gate, gates: r.plan.gates.length, items: r.items.length, paused: this.paused };
  }
}
