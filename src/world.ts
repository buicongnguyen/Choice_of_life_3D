import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Stage } from "./lighting";
import { modelURL } from "./asset-url";
import { graphicsProfile, type GraphicsQuality } from "./graphics";
import { chapters, people, kiteColours, workplaceVariant, pierState, personName, interest, type Look, type Env } from "./content";
import { castOf, momentsOf, canTalk, record, canLeave, canStartActivity, HAIR_STYLES, SKINS, COLOURS, SPAWN, type Life, type Identity } from "./core";
import { activeColliders, clearSegment, findPath, free, recoverPosition, withinPickup, approach, navigation, type Collider, type SceneLayout } from "./navigation";

export type PlaceKind = "person" | "discovery" | "activity" | "hunt" | "exit";
export type Place = { id: string; kind: PlaceKind; label: string; x: number; z: number; index: number; who?: string; status?: "main" | "side" | "guest" | "idle" };
type Actor = {
  who: string;
  root: T.Group;
  body?: T.Object3D;
  head?: T.Object3D;
  eyes?: T.Object3D;
  mouthOpen?: T.Object3D;
  mouthSmile?: T.Object3D;
  limbs: (T.Object3D | undefined)[];
  facing: number;
  blink: number;
  wave: number;
  waved: boolean;
  talk: number;
  baby: boolean;
  bodyY: number;
  height: number;
};
type Point = { place: Place; root: T.Group; marker?: T.Sprite; label?: T.Sprite; spin?: T.Object3D; ring?: T.Mesh };

const DIR = new T.Vector3(10, 14, 18).normalize();
const STAT_COLOURS = { health: 0xff6a6a, joy: 0xffc234, savings: 0x2ed3b0 } as const;
const RECOLOUR = ["Skin", "Hair", "Top", "Bottom", "Shoes", "Accent", "Kite"];

export function playerLook(id: Identity, chapter: number, l?: Life): Look {
  const skin = SKINS[id.skin] ?? SKINS[0];
  const hair = chapter >= 10 ? "dcd8e0" : chapter >= 9 ? "8f8781" : ["7a4a26", "6a3f22", "3a2418", "2e1d14", "1d1414", "16110f"][id.skin] ?? "3a2418";
  const top = COLOURS[id.colour] ?? COLOURS[0];
  const kind = chapter === 0 ? "baby" : chapter <= 3 ? "kid" : chapter >= 10 ? "elder" : "adult";
  const acc: string[] = [];
  if (chapter === 4) acc.push("bag");
  if (l && chapter >= 6 && chapter <= 9) {
    const i = interest(l);
    acc.push(i === "care" ? "stethoscope" : i === "build" ? "apron" : "bag");
    if (chapter === 6) acc.push("badge");
  }
  if (chapter >= 10) acc.push("glasses");
  return { kind, skin, hair, style: chapter === 0 ? "curl" : HAIR_STYLES[id.hair] ?? "short", top, bottom: chapter >= 10 ? "4f5a74" : "213a8f", shoes: "fff6e8", accent: "ffc234", acc, scale: chapter === 4 ? 0.93 : 1 };
}

export class World {
  readonly renderer: T.WebGLRenderer;
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(30, 1, 0.5, 400);
  readonly playerPosition = new T.Vector3(SPAWN.x, 0, SPAWN.z);
  private loader = new GLTFLoader();
  private models = new Map<string, Promise<T.Group>>();
  private layouts: Record<string, SceneLayout> = {};
  private stage: Stage;
  private composer?: EffectComposer;
  private bloom?: UnrealBloomPass;
  private sceneRoot = new T.Group();
  private cast = new T.Group();
  private fx = new T.Group();
  private player?: Actor;
  private actors: Actor[] = [];
  private points: Point[] = [];
  private colliders: Collider[] = [];
  private layout?: SceneLayout;
  private state?: Life;
  private generation = 0;
  private target: T.Vector3[] = [];
  private pending: string | null = null;
  private raycaster = new T.Raycaster();
  private ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private clock = 0;
  private accumulator = 0;
  private last = 0;
  private lastPaint = 0;
  private frame = 0;
  private keys = new Set<string>();
  private touch = { x: 0, y: 0 };
  private walking = false;
  private gait = 0;
  private press?: { id: number; x: number; y: number };
  private observer: ResizeObserver;
  private anims: { obj: T.Object3D; kind: string; base: T.Euler; baseY: number; seed: number }[] = [];
  private weather?: { obj: T.Points | T.LineSegments; kind: string; speeds: Float32Array };
  private waterTime = { value: 0 };
  private camTarget = new T.Vector3();
  private camDist = 18;
  private camGoalDist = 18;
  private intro = 0;
  private focusPoint?: T.Vector3;
  private conversation: string | null = null;
  private lastNearby = "";
  private timeToSave = 0;
  private hover = "";
  private graphics;
  private titleMode = false;
  private titleKite?: T.Object3D;
  private release?: T.Object3D;
  active = false;
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  speed = 2.8;
  onInteract: (place: Place) => void = () => {};
  onCollect: (place: Place) => void = () => {};
  onNearby: (place: Place | undefined) => void = () => {};
  onPosition: () => void = () => {};

  constructor(
    private host: HTMLElement,
    readonly quality: GraphicsQuality = "high",
  ) {
    this.graphics = graphicsProfile(quality, devicePixelRatio);
    this.renderer = new T.WebGLRenderer({ antialias: this.graphics.antialias, powerPreference: this.graphics.low ? "low-power" : "high-performance" });
    this.renderer.setPixelRatio(this.graphics.pixelRatio);
    this.renderer.info.autoReset = false;
    this.stage = new Stage(this.scene, this.renderer, this.graphics.low);
    // three r185 resolves its Draco decoder through import.meta.url, so Vite bundles it.
    this.loader.setDRACOLoader(new DRACOLoader());
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.scene.add(this.sceneRoot, this.cast, this.fx);
    if (this.graphics.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      // Threshold above lit albedo (~1.0) so only emissive lamps, windows and string lights glow.
      this.bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.35, 0.5, 1.35);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.pointerDown);
    el.addEventListener("pointerup", this.pointerUp);
    el.addEventListener("pointercancel", this.pointerCancel);
    el.addEventListener("pointermove", this.pointerMove);
    this.frame = requestAnimationFrame(this.tick);
  }

  async init() {
    const response = await fetch(modelURL("layout.json"));
    if (!response.ok) throw new Error("The map of Kitehaven could not be loaded.");
    this.layouts = await response.json();
    await Promise.all(["props", "adult", "kid", "baby", "elder"].map((n) => this.load(n)));
  }

  // -------------------------------------------------------------------------
  // assets
  // -------------------------------------------------------------------------
  private load(name: string) {
    if (!this.models.has(name))
      this.models.set(
        name,
        this.loader
          .loadAsync(modelURL(`${this.graphics.modelFolder}${name}.glb`))
          .then((g) => {
            const converted = new Map<T.Material, T.Material>();
            g.scene.traverse((o) => {
              if (!(o instanceof T.Mesh)) return;
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              const next = mats.map((m) => this.prepareMaterial(m, converted));
              o.material = Array.isArray(o.material) ? next : next[0];
              const name = (next[0] as T.Material).name;
              o.castShadow = this.graphics.shadows && !/^(Glass|Water|Beam)/.test(name);
              o.receiveShadow = this.graphics.shadows && !/^(Beam)/.test(name);
            });
            return g.scene;
          })
          .catch((e) => {
            this.models.delete(name);
            throw e;
          }),
      );
    return this.models.get(name)!;
  }

  private prepareMaterial(m: T.Material, converted: Map<T.Material, T.Material>): T.Material {
    if (converted.has(m)) return converted.get(m)!;
    let out = m;
    if (m instanceof T.MeshStandardMaterial) {
      if (m.name === "Beam") {
        m.blending = T.AdditiveBlending;
        m.depthWrite = false;
        m.side = T.DoubleSide;
        m.transparent = true;
      }
      if (m.name === "Glass") m.depthWrite = false;
      // Eye highlights stay bright but under the bloom threshold; lamps and windows glow.
      if (m.name === "Glow_white") m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.85);
      if (m.name === "Water" && !this.graphics.low) {
        m.roughness = 0.06;
        m.metalness = 0.05;
        const time = this.waterTime;
        m.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = time;
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nuniform float uTime;")
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvec4 wpW = modelMatrix * vec4(position, 1.0);\ntransformed.y += sin(wpW.x * 0.8 + uTime * 1.2) * 0.05 + cos(wpW.z * 0.65 + uTime * 0.9) * 0.05;",
            );
        };
      }
      if (this.graphics.low) {
        const simple = new T.MeshLambertMaterial({
          color: m.color,
          emissive: m.emissive,
          emissiveIntensity: m.emissiveIntensity,
          vertexColors: m.vertexColors,
          transparent: m.transparent,
          opacity: m.opacity,
          side: m.side,
          blending: m.blending,
          depthWrite: m.depthWrite,
        });
        simple.name = m.name;
        m.dispose();
        out = simple;
      }
    }
    converted.set(m, out);
    return out;
  }

  private clone(model: T.Object3D) {
    return model.clone(true);
  }

  /** Clone a character and dress it: recolour, choose hair/accessories. */
  private makeActor(model: T.Group, look: Look, who: string, kiteHex?: string): Actor {
    const root = this.clone(model) as T.Group;
    const colours: Record<string, string> = { Skin: look.skin, Hair: look.hair, Top: look.top, Bottom: look.bottom, Shoes: look.shoes, Accent: look.accent, Kite: kiteHex ?? "ee3b3b" };
    const cache = new Map<T.Material, T.Material>();
    root.traverse((o) => {
      // Only the group nodes toggle (their meshes are named Hair_bob_Hair etc. and inherit visibility).
      if (/^Hair_[a-z]+$/.test(o.name)) o.visible = o.name === `Hair_${look.style}`;
      if (/^Acc_[a-z]+$/.test(o.name)) o.visible = look.acc.includes(o.name.slice(4));
      if (o.name === "Mouth_open") o.visible = false;
      if (o instanceof T.Mesh) {
        const m = o.material as T.MeshStandardMaterial;
        if (RECOLOUR.includes(m.name)) {
          if (!cache.has(m)) {
            const c = m.clone();
            c.userData.owned = true;
            (c as T.MeshStandardMaterial).color.set(`#${colours[m.name]}`);
            cache.set(m, c);
          }
          o.material = cache.get(m)!;
        }
      }
    });
    const s = look.scale ?? 1;
    root.scale.setScalar(s);
    const get = (n: string) => root.getObjectByName(n);
    const body = get("Body");
    return {
      who,
      root,
      body,
      head: get("Head"),
      eyes: get("Eyes"),
      mouthOpen: get("Mouth_open"),
      mouthSmile: get("Mouth_smile"),
      limbs: ["ArmL", "ArmR", "LegL", "LegR"].map(get),
      facing: 0,
      blink: 1 + Math.random() * 3,
      wave: 0,
      waved: false,
      talk: 0,
      baby: look.kind === "baby",
      bodyY: body?.position.y ?? 0,
      height: ({ baby: 0.95, kid: 1.35, adult: 1.62, elder: 1.56 } as const)[look.kind] * s,
    };
  }

  private releaseGroup(group: T.Group) {
    group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Sprite || o instanceof T.Points || o instanceof T.LineSegments) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m.userData.owned || m instanceof T.SpriteMaterial || o instanceof T.Points || o instanceof T.LineSegments) {
            (m as T.SpriteMaterial).map?.dispose();
            m.dispose();
          }
        }
        if (o.userData.ownedGeometry) o.geometry?.dispose();
      }
    });
    group.clear();
  }

  // -------------------------------------------------------------------------
  // building a chapter
  // -------------------------------------------------------------------------
  private kiteHex(l?: Life) {
    return kiteColours[l?.facts.kite ?? "red"]?.hex ?? "ee3b3b";
  }

  async show(state: Life) {
    const ticket = ++this.generation;
    this.titleMode = false;
    this.active = false;
    this.clearInput();
    const chapter = chapters[state.chapter];
    const layout = this.layouts[chapter.scene];
    if (!layout) throw new Error(`Missing layout for ${chapter.scene}`);
    const cast = castOf(state);
    const looks = cast.map(([who]) => people[who].look(state.chapter, state));
    const pLook = playerLook(state.identity, state.chapter, state);
    const kinds = new Set([pLook.kind, ...looks.map((l) => l.kind)]);
    const [scenery, props, harbour] = await Promise.all([this.load(chapter.scene), this.load("props"), layout.backdrop ? this.load("harbour") : Promise.resolve(undefined), ...[...kinds].map((k) => this.load(k))]);
    const bodies: Record<string, T.Group> = {};
    for (const k of kinds) bodies[k] = await this.load(k);
    if (ticket !== this.generation) return;
    this.reset();
    this.state = state;
    this.layout = layout;
    this.stage.apply(chapter.env);
    if (this.bloom) this.bloom.strength = this.stage.preset.bloom;
    // scenery and its variants
    const variant = chapter.scene === "workplace" ? workplaceVariant(state) : undefined;
    const sceneObj = this.clone(scenery);
    sceneObj.traverse((o) => {
      if (/^Var_[a-z]+$/.test(o.name)) o.visible = o.name === `Var_${variant}`;
    });
    this.sceneRoot.add(sceneObj);
    this.collectAnims(sceneObj);
    this.colliders = activeColliders(layout, variant);
    if (layout.backdrop && harbour) this.addBackdrop(harbour, layout.backdrop, state);
    this.addSea(chapter.scene, layout);
    // the player
    this.player = this.makeActor(bodies[pLook.kind], pLook, "you");
    const spawn = layout.anchors.spawn;
    const start = state.position.x === SPAWN.x && state.position.z === SPAWN.z ? { x: spawn.x, z: spawn.z } : state.position;
    const p = recoverPosition(start, this.colliders, spawn);
    this.playerPosition.set(p.x, 0, p.z);
    this.player.root.position.copy(this.playerPosition);
    this.player.root.rotation.y = spawn.facing ?? Math.PI;
    this.cast.add(this.player.root);
    const ring = new T.Mesh(new T.RingGeometry(0.36, 0.44, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
    ring.material.userData.owned = true;
    ring.userData.ownedGeometry = true;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    this.player.root.add(ring);
    // the people
    cast.forEach(([who, slot], i) => {
      const a = layout.anchors[`npc${slot}`];
      if (!a) return;
      const actor = this.makeActor(bodies[looks[i].kind], looks[i], who);
      actor.root.position.set(a.x, 0, a.z);
      actor.facing = a.facing;
      actor.root.rotation.y = a.facing;
      this.cast.add(actor.root);
      this.actors.push(actor);
    });
    this.buildPoints(props);
    this.addWeather(chapter.env);
    this.camTarget.copy(this.followTarget());
    this.intro = this.reducedMotion ? 0 : 1;
    this.resize();
    this.render();
    // Warm the next chapter's scenery on fast connections.
    const next = chapters[state.chapter + 1];
    if (next && !this.graphics.low) void this.load(next.scene).catch(() => {});
  }

  /** Title screen: the festival pier with your avatar and a kite in the sky. */
  async showTitle(identity: Identity) {
    const ticket = ++this.generation;
    const [scenery, props, adult, harbour] = await Promise.all([this.load("pier"), this.load("props"), this.load("adult"), this.load("harbour")]);
    if (ticket !== this.generation) return;
    this.reset();
    this.state = undefined;
    this.titleMode = true;
    this.stage.apply("festival");
    if (this.bloom) this.bloom.strength = 0.25;
    const s = this.clone(scenery);
    this.sceneRoot.add(s);
    this.collectAnims(s);
    this.addBackdrop(harbour, this.layouts.pier?.backdrop ?? { x: -12, y: -5, z: -30, s: 1.4, variant: "old" });
    this.addSea("pier", this.layouts.pier);
    this.player = this.makeActor(adult, playerLook(identity, 6), "you");
    this.player.root.position.set(-1.2, 0, 3.3);
    this.player.root.rotation.y = 0.55;
    this.cast.add(this.player.root);
    const kite = props.getObjectByName("Prop_kite");
    if (kite) {
      const k = this.clone(kite);
      this.recolourKite(k, this.kiteHex());
      k.scale.setScalar(2.2);
      k.position.set(-4.2, 5.4, 0.2);
      this.fx.add(k);
      this.titleKite = k;
    }
    this.addWeather("festival");
    this.camTarget.set(-3.4, 1.9, 2.6);
    this.camDist = this.camGoalDist = 12;
    this.intro = 0;
    this.resize();
    this.render();
  }

  /** Update the title avatar live while the player customises. */
  async dressTitle(identity: Identity) {
    if (!this.titleMode || !this.player) return;
    const adult = await this.load("adult");
    const pos = this.player.root.position.clone();
    const rot = this.player.root.rotation.y;
    this.releaseActor(this.player);
    this.player = this.makeActor(adult, playerLook(identity, 6), "you");
    this.player.root.position.copy(pos);
    this.player.root.rotation.y = rot;
    this.cast.add(this.player.root);
  }

  private releaseActor(a: Actor) {
    a.root.traverse((o) => {
      if (o instanceof T.Mesh && (o.material as T.Material).userData.owned) (o.material as T.Material).dispose();
    });
    a.root.removeFromParent();
  }

  private recolourKite(obj: T.Object3D, hex: string) {
    obj.traverse((o) => {
      if (o instanceof T.Mesh && (o.material as T.Material).name === "Kite") {
        const m = (o.material as T.MeshStandardMaterial).clone();
        m.userData.owned = true;
        m.color.set(`#${hex}`);
        o.material = m;
      }
    });
  }

  private reset() {
    this.releaseGroup(this.sceneRoot);
    this.releaseGroup(this.cast);
    this.releaseGroup(this.fx);
    this.points = [];
    this.actors = [];
    this.anims = [];
    this.weather = undefined;
    this.focusPoint = undefined;
    this.conversation = null;
    this.titleKite = undefined;
    this.release = undefined;
    this.target = [];
    this.pending = null;
    this.lastNearby = "";
  }

  private collectAnims(root: T.Object3D) {
    let seed = 0;
    root.traverse((o) => {
      const m = /^(Spin|Sway|Bob|Flag)_/.exec(o.name);
      if (m) this.anims.push({ obj: o, kind: m[1], base: o.rotation.clone(), baseY: o.position.y, seed: seed++ });
    });
  }

  private addBackdrop(harbour: T.Group, b: NonNullable<SceneLayout["backdrop"]>, l?: Life) {
    const h = this.clone(harbour);
    const state = b.variant === "dynamic" && l ? pierState(l) : b.variant;
    const show: Record<string, boolean> = {
      Pier_old: state === "old",
      Pier_ruined: state === "ruined",
      Pier_restored: state === "restored" || state === "shared",
      Marina: state === "marina" || state === "shared",
    };
    h.traverse((o) => {
      if (o.name in show) o.visible = show[o.name];
    });
    h.position.set(b.x, b.y, b.z);
    h.rotation.y = b.rot ?? 0;
    h.scale.setScalar(b.s);
    this.sceneRoot.add(h);
  }

  private addSea(scene: string, layout?: SceneLayout) {
    const level = scene === "pier" ? -1.3 : scene === "storm" ? -0.9 : layout?.backdrop ? layout.backdrop.y - 0.9 * layout.backdrop.s : null;
    if (level === null) return;
    const night = scene === "storm";
    const geo = new T.PlaneGeometry(420, 420, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new T.MeshStandardMaterial({ color: night ? 0x08213f : 0x159ad6, roughness: 0.12, metalness: 0.05 });
    mat.userData.owned = true;
    const sea = new T.Mesh(geo, mat);
    sea.userData.ownedGeometry = true;
    sea.position.y = level - 0.03;
    sea.receiveShadow = false;
    this.sceneRoot.add(sea);
  }

  private addWeather(env: Env) {
    const kind = this.stage.preset.weather;
    if (!kind || this.graphics.low || this.reducedMotion) return;
    if (kind === "rain") {
      const n = 900;
      const pos = new Float32Array(n * 6);
      const speeds = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * 26,
          y = Math.random() * 14,
          z = (Math.random() - 0.5) * 22;
        pos.set([x, y, z, x - 0.08, y - 0.5, z - 0.03], i * 6);
        speeds[i] = 14 + Math.random() * 6;
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(pos, 3));
      const obj = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.45 }));
      obj.userData.ownedGeometry = true;
      this.fx.add(obj);
      this.weather = { obj, kind, speeds };
      return;
    }
    const n = kind === "confetti" ? 260 : kind === "petals" ? 120 : 90;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    const palette = kind === "confetti" ? [0xee3b3b, 0xffc234, 0x2f7de1, 0x5fe0b7, 0xff5f8f] : kind === "petals" ? [0xff9fb8, 0xffffff, 0xffd0dc] : [0xffe2a0, 0xfff4cf];
    const c = new T.Color();
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 22, Math.random() * 9, (Math.random() - 0.5) * 16], i * 3);
      c.setHex(palette[i % palette.length]);
      col.set([c.r, c.g, c.b], i * 3);
      speeds[i] = 0.3 + Math.random() * 0.8;
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    const mat = new T.PointsMaterial({ size: kind === "motes" ? 0.09 : 0.12, vertexColors: true, transparent: true, opacity: kind === "motes" ? 0.8 : 0.95, depthWrite: false, blending: kind === "motes" ? T.AdditiveBlending : T.NormalBlending });
    const obj = new T.Points(g, mat);
    obj.userData.ownedGeometry = true;
    this.fx.add(obj);
    this.weather = { obj, kind, speeds };
    void env;
  }

  // -------------------------------------------------------------------------
  // interactive points
  // -------------------------------------------------------------------------
  private propsModel?: T.Group;
  private buildPoints(props: T.Group) {
    this.propsModel = props;
    this.refreshPoints();
  }

  private prop(name: string) {
    const src = this.propsModel?.getObjectByName(`Prop_${name}`);
    const obj = src ? this.clone(src) : new T.Group();
    obj.position.set(0, 0, 0);
    return obj;
  }

  private refreshPoints() {
    const l = this.state;
    const layout = this.layout;
    if (!l || !layout) return;
    for (const p of this.points) {
      p.root.removeFromParent();
      this.releaseGroup(p.root);
    }
    this.points = [];
    const chapter = chapters[l.chapter];
    // people
    const moments = momentsOf(l);
    for (const actor of this.actors) {
      const avail = moments.filter((m) => (m.who === actor.who || (m.who === "partner" && l.facts.partner?.toLowerCase() === actor.who)) && canTalk(l, m));
      const guest = (chapter.guests ?? []).includes(actor.who) && !l.meetings.includes(actor.who);
      const status = avail.some((m) => m.kind === "main") ? "main" : guest ? "guest" : avail.length ? "side" : "idle";
      const place: Place = { id: `person:${actor.who}`, kind: "person", label: personName(actor.who, l), x: actor.root.position.x, z: actor.root.position.z, index: 0, who: actor.who, status };
      const root = new T.Group();
      root.position.copy(actor.root.position);
      const point: Point = { place, root };
      if (status !== "idle") {
        point.marker = this.badge(status === "main" ? "!" : status === "guest" ? "?" : "…", status === "main" ? "#ffc234" : status === "guest" ? "#ff5f8f" : "#2f7de1");
        point.marker.position.y = this.headHeight(actor) + 0.45;
        root.add(point.marker);
      }
      point.label = this.chip(place.label, status === "main" ? "#ffc234" : "#ffffff");
      point.label.position.y = this.headHeight(actor) + (point.marker ? 0.98 : 0.42);
      point.label.visible = false;
      root.add(point.label);
      this.fx.add(root);
      this.points.push(point);
    }
    // the "you" main moment in the final chapter happens at the kite spot
    const selfMain = moments.find((m) => m.who === "you" && canTalk(l, m));
    if (selfMain) this.addSpot({ id: "self", kind: "person", label: chapter.moments.find((m) => m.who === "you") ? "Fly the last kite" : "", x: layout.anchors.act.x, z: layout.anchors.act.z, index: 0, who: "you", status: "main" }, "kite", 0xffc234, true);
    // discoveries
    chapter.finds.forEach((d, i) => {
      if (l.found.includes(`${l.chapter}:${i}`)) return;
      const a = layout.anchors[`find${i}`];
      if (!a) return;
      this.addSpot({ id: `find:${i}`, kind: "discovery", label: d.name, x: a.x, z: a.z, index: i }, d.prop, STAT_COLOURS[d.stat], false);
    });
    // the activity
    const r = record(l);
    const act = chapter.activity;
    // An activity that was started but not finished (plan or kite) can be reopened.
    if ((!r.started && canStartActivity(l)) || (r.started && !r.complete && act.kind !== "hunt")) {
      const a = layout.anchors.act;
      const at = selfMain ? { x: a.x + 1.4, z: a.z - 0.4 } : a;
      this.addSpot({ id: "activity", kind: "activity", label: typeof act.title === "string" ? act.title : act.title(l), x: at.x, z: at.z, index: 0 }, act.icon, 0x2ed3b0, true);
    }
    if (r.started && !r.complete && act.kind === "hunt") {
      act.items!.forEach((item, i) => {
        if (r.found.includes(i)) return;
        const a = layout.anchors[`hunt${i}`];
        if (a) this.addSpot({ id: `hunt:${i}`, kind: "hunt", label: item.name, x: a.x, z: a.z, index: i }, item.prop, 0xffc234, true, true);
      });
    }
    // the way on
    if (canLeave(l)) {
      const e = layout.anchors.exit;
      const root = new T.Group();
      root.position.set(e.x, 0, e.z);
      const gate = this.prop("gate");
      gate.rotation.y = Math.atan2(-e.x, -e.z);
      root.add(gate);
      const ring = this.ringMesh(0xffc234, 0.95);
      root.add(ring);
      const place: Place = { id: "exit", kind: "exit", label: l.chapter === chapters.length - 1 ? "Your story" : "Next chapter", x: e.x, z: e.z, index: 0 };
      const label = this.chip(`${place.label} →`, "#ffc234");
      label.position.y = 3.0;
      root.add(label);
      this.fx.add(root);
      this.points.push({ place, root, label, ring });
    }
    for (const p of this.points) p.root.traverse((o) => (o.userData.place = p.place.id));
  }

  private headHeight(a: Actor) {
    return a.height;
  }

  private addSpot(place: Place, propName: string, color: number, label: boolean, beacon = false) {
    const root = new T.Group();
    root.position.set(place.x, 0, place.z);
    const spin = new T.Group();
    const obj = this.prop(propName);
    if (propName === "kite") this.recolourKite(obj, this.kiteHex(this.state));
    obj.scale.setScalar(place.kind === "activity" || place.id === "self" ? 1.0 : 0.85);
    spin.add(obj);
    spin.position.y = 0.35;
    root.add(spin);
    const ring = this.ringMesh(color, place.kind === "discovery" ? 0.42 : 0.6);
    root.add(ring);
    if (beacon) {
      const g = new T.CylinderGeometry(0.16, 0.34, 5, 16, 1, true);
      const m = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      m.userData.owned = true;
      const beam = new T.Mesh(g, m);
      beam.userData.ownedGeometry = true;
      beam.position.y = 2.5;
      root.add(beam);
    }
    const point: Point = { place, root, spin, ring };
    point.label = this.chip(place.kind === "activity" ? `✦ ${place.label}` : place.label, place.kind === "activity" ? "#2ed3b0" : "#ffffff");
    point.label.position.y = place.kind === "activity" || place.id === "self" ? 2.3 : 1.4;
    point.label.visible = label && (place.kind === "activity" || place.id === "self");
    root.add(point.label);
    if (place.kind === "activity" || place.id === "self") {
      point.marker = this.badge(place.id === "self" ? "!" : "✦", place.id === "self" ? "#ffc234" : "#2ed3b0");
      point.marker.position.y = 1.8;
      root.add(point.marker);
    }
    this.fx.add(root);
    this.points.push(point);
  }

  private ringMesh(color: number, r: number) {
    const ring = new T.Mesh(new T.RingGeometry(r * 0.82, r, 48), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }));
    ring.material.userData.owned = true;
    ring.userData.ownedGeometry = true;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    return ring;
  }

  private badge(symbol: string, color: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(20,24,52,0.35)";
    g.beginPath();
    g.arc(64, 70, 50, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(64, 62, 50, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = "#ffffff";
    g.stroke();
    g.fillStyle = color === "#ffc234" || color === "#2ed3b0" ? "#1d2340" : "#ffffff";
    g.font = "900 72px DM Sans, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(symbol, 64, 66);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, toneMapped: false }));
    s.scale.set(0.62, 0.62, 1);
    s.renderOrder = 12;
    return s;
  }

  private chip(textValue: string, accent: string) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 104;
    const g = c.getContext("2d")!;
    g.font = "700 44px DM Sans, system-ui, sans-serif";
    const w = Math.min(496, g.measureText(textValue).width + 76);
    const x = (512 - w) / 2;
    g.fillStyle = "rgba(20,24,52,0.3)";
    g.beginPath();
    g.roundRect(x, 16, w, 80, 40);
    g.fill();
    g.fillStyle = "#1d2340";
    g.beginPath();
    g.roundRect(x, 8, w, 80, 40);
    g.fill();
    g.fillStyle = accent;
    g.beginPath();
    g.arc(x + 34, 48, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(textValue, x + 54, 50, w - 70);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, toneMapped: false }));
    s.scale.set(2.3, 0.47, 1);
    s.renderOrder = 11;
    return s;
  }

  update(state: Life) {
    this.state = state;
    this.refreshPoints();
  }

  places() {
    return this.points.map((p) => p.place);
  }

  nearest() {
    let result: Place | undefined,
      best: number = navigation.reach;
    for (const { place } of this.points) {
      if (place.kind === "discovery" || place.kind === "hunt") continue;
      if (place.kind === "person" && place.status === "idle" && place.who === "you") continue;
      const d = Math.hypot(place.x - this.playerPosition.x, place.z - this.playerPosition.z);
      const reach = place.kind === "person" ? best : best * 1.1;
      if (d < reach && this.reachable(place)) {
        result = place;
        best = d;
      }
    }
    return result;
  }

  private reachable(place: Place) {
    const to = approach(place, this.playerPosition, this.colliders);
    return !!to && (clearSegment(this.playerPosition, to, this.colliders) || Math.hypot(to.x - this.playerPosition.x, to.z - this.playerPosition.z) < 0.4);
  }

  interact() {
    const p = this.nearest();
    if (this.active && p) {
      this.target = [];
      this.pending = null;
      this.onInteract(p);
    }
  }

  key(key: string, down: boolean) {
    if (down) {
      this.keys.add(key);
      this.target = [];
      this.pending = null;
    } else this.keys.delete(key);
  }
  pad(x: number, y: number) {
    this.touch = { x, y };
    if (x || y) {
      this.target = [];
      this.pending = null;
    }
  }
  clearInput() {
    this.keys.clear();
    this.touch = { x: 0, y: 0 };
    this.target = [];
    this.pending = null;
    this.walking = false;
    this.press = undefined;
  }

  private path(x: number, z: number) {
    return findPath(this.playerPosition, { x, z }, this.colliders).map((p) => new T.Vector3(p.x, 0, p.z));
  }

  go(id: string) {
    const p = this.points.find((q) => q.place.id === id)?.place;
    if (!p) return false;
    const to = approach(p, this.playerPosition, this.colliders);
    if (!to) return false;
    // Stop just short of people so you face them instead of standing inside them.
    let goal = to;
    if (p.kind === "person") {
      const dx = this.playerPosition.x - p.x,
        dz = this.playerPosition.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const near = { x: p.x + (dx / len) * 0.95, z: p.z + (dz / len) * 0.95 };
      if (free(near, this.colliders)) goal = near;
    }
    this.target = this.path(goal.x, goal.z);
    const reachable = this.target.length > 0 || Math.hypot(goal.x - this.playerPosition.x, goal.z - this.playerPosition.z) < 0.3;
    // Collectables are picked up by walking onto them, so their walk runs all the way.
    this.pending = reachable && p.kind !== "discovery" && p.kind !== "hunt" ? id : null;
    return reachable;
  }

  private pointerDown = (event: PointerEvent) => {
    if (!this.active || event.button !== 0 || this.press) return;
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };
  private pointerUp = (event: PointerEvent) => {
    const press = this.press;
    if (!press || press.id !== event.pointerId) return;
    this.press = undefined;
    if (this.active && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 12) this.tap(event.clientX, event.clientY);
  };
  private pointerCancel = () => {
    this.press = undefined;
  };
  private pointerMove = (event: PointerEvent) => {
    if (!this.active || event.pointerType !== "mouse") return;
    const hit = this.pick(event.clientX, event.clientY);
    this.hover = hit ?? "";
    this.renderer.domElement.style.cursor = hit ? "pointer" : "";
  };

  private ray(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, (-(y - rect.top) / rect.height) * 2 + 1), this.camera);
  }

  private pick(x: number, y: number): string | undefined {
    this.ray(x, y);
    const hits = this.raycaster.intersectObjects([...this.cast.children, ...this.fx.children], true);
    for (const h of hits) {
      let o: T.Object3D | null = h.object;
      while (o) {
        if (o.userData.place) return o.userData.place;
        const actor = this.actors.find((a) => a.root === o);
        if (actor) return `person:${actor.who}`;
        o = o.parent;
      }
    }
    return undefined;
  }

  private tap(x: number, y: number) {
    const id = this.pick(x, y);
    if (id && this.points.some((p) => p.place.id === id)) {
      this.go(id);
      return;
    }
    this.ray(x, y);
    const position = new T.Vector3();
    if (this.raycaster.ray.intersectPlane(this.ground, position)) {
      const to = approach({ x: position.x, z: position.z }, this.playerPosition, this.colliders);
      if (to) {
        this.target = this.path(to.x, to.z);
        this.pending = null;
      }
    }
  }

  // -------------------------------------------------------------------------
  // camera and framing
  // -------------------------------------------------------------------------
  private followTarget() {
    const w = this.host.clientWidth || 1,
      h = this.host.clientHeight || 1;
    const portrait = w / h < 0.9;
    const x = Math.max(portrait ? -4.4 : -3.2, Math.min(portrait ? 4.4 : 3.2, this.playerPosition.x));
    const z = Math.max(-2.6, Math.min(2.4, this.playerPosition.z));
    return new T.Vector3(x, 0.9, z);
  }

  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.75 ? 44 : aspect < 1.2 ? 36 : 30;
    // Shift the picture up by half the covered strip so the subject sits in the open space.
    if (this.inset > 0 && this.focusPoint) this.camera.setViewOffset(w, h, 0, Math.min(this.inset * 0.5, h * 0.3), w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    const base = aspect < 0.75 ? 20 : aspect < 1.2 ? 18 : 16.5;
    this.camGoalDist = this.titleMode ? (aspect < 0.9 ? 18 : 12) : this.focusPoint ? base * 0.52 : base;
    if (!this.titleMode && !this.focusPoint && this.intro === 0 && Math.abs(this.camDist - this.camGoalDist) > 8) this.camDist = this.camGoalDist;
    this.placeCamera();
    this.render();
  }

  private placeCamera() {
    const d = this.camDist * (1 + this.intro * 0.55);
    this.camera.position.copy(this.camTarget).addScaledVector(DIR, d);
    if (this.titleMode) {
      const a = Math.sin(this.clock * 0.08) * 0.25;
      const dir = new T.Vector3(Math.sin(a + 0.51) * 0.8, 0.5, Math.cos(a + 0.51) * 0.8).normalize();
      this.camera.position.copy(this.camTarget).addScaledVector(dir, d);
    }
    this.camera.lookAt(this.camTarget);
  }

  focus(id: string | null) {
    this.conversation = id;
    const p = this.points.find((q) => q.place.id === id);
    const actor = p?.place.who ? this.actors.find((a) => a.who === p.place.who) : undefined;
    if (p) {
      const at = actor ? actor.root.position : p.root.position;
      this.focusPoint = at.clone().lerp(this.playerPosition, 0.5).add(new T.Vector3(0, 0.8, 0));
      if (actor) actor.talk = this.reducedMotion ? 0 : 2.2;
      if (this.player && p.place.who !== "you") this.player.root.rotation.y = Math.atan2(at.x - this.playerPosition.x, at.z - this.playerPosition.z);
    } else this.focusPoint = undefined;
    for (const q of this.points) {
      if (q.marker) q.marker.visible = !id;
    }
    this.resize();
  }

  /** Let the person you're talking to react (nod + mouth) after a choice. */
  acknowledge() {
    const p = this.points.find((q) => q.place.id === this.conversation);
    const actor = p?.place.who ? this.actors.find((a) => a.who === p.place.who) : undefined;
    if (actor && !this.reducedMotion) actor.talk = 1.8;
  }

  /** The final release: your kite climbs into the sunset. */
  releaseKite() {
    if (!this.state || !this.player) return;
    const k = this.prop("kite");
    this.recolourKite(k, this.kiteHex(this.state));
    k.scale.setScalar(1.6);
    k.position.copy(this.playerPosition).add(new T.Vector3(0.4, 1.6, -0.4));
    this.fx.add(k);
    this.release = k;
  }

  // -------------------------------------------------------------------------
  // simulation
  // -------------------------------------------------------------------------
  private step(dt: number) {
    this.clock += dt;
    this.waterTime.value = this.clock;
    if (!this.active || !this.player) return;
    const sx =
      this.touch.x + (this.keys.has("d") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("a") || this.keys.has("ArrowLeft") ? 1 : 0);
    const sy = this.touch.y + (this.keys.has("s") || this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("w") || this.keys.has("ArrowUp") ? 1 : 0);
    const direction = new T.Vector3(sx * 0.874 + sy * 0.486, 0, -sx * 0.486 + sy * 0.874);
    let routeDistance = Infinity;
    if (direction.lengthSq() === 0 && this.target.length) {
      direction.subVectors(this.target[0], this.playerPosition);
      direction.y = 0;
      routeDistance = direction.length();
      if (routeDistance < 0.02) {
        this.target.shift();
        direction.set(0, 0, 0);
      }
    }
    const beforeX = this.playerPosition.x,
      beforeZ = this.playerPosition.z;
    if (direction.lengthSq() > 1e-6) {
      direction.normalize();
      const speed = this.player.baby ? this.speed * 0.72 : this.speed;
      const amount = Math.min(speed * dt, routeDistance);
      const x = this.playerPosition.x + direction.x * amount,
        z = this.playerPosition.z + direction.z * amount;
      if (clearSegment(this.playerPosition, { x, z }, this.colliders)) {
        this.playerPosition.x = x;
        this.playerPosition.z = z;
      } else {
        if (clearSegment(this.playerPosition, { x, z: this.playerPosition.z }, this.colliders)) this.playerPosition.x = x;
        if (clearSegment(this.playerPosition, { x: this.playerPosition.x, z }, this.colliders)) this.playerPosition.z = z;
      }
      const angle = Math.atan2(direction.x, direction.z),
        current = this.player.root.rotation.y;
      this.player.root.rotation.y = current + Math.atan2(Math.sin(angle - current), Math.cos(angle - current)) * Math.min(1, dt * 12);
    }
    const traveled = Math.hypot(this.playerPosition.x - beforeX, this.playerPosition.z - beforeZ);
    this.walking = traveled > 1e-5;
    this.gait += (traveled * 5.2) / (this.player.baby ? 0.6 : 1);
    this.player.root.position.copy(this.playerPosition);
    // Collectables pick themselves up; people, activities and exits need a decision.
    for (const p of [...this.points]) {
      if ((p.place.kind === "discovery" || p.place.kind === "hunt") && withinPickup(this.playerPosition, p.place, this.colliders)) {
        this.onCollect(p.place);
        if (this.pending === p.place.id) {
          this.pending = null;
          this.target = [];
        }
      }
    }
    if (this.pending) {
      const place = this.points.find((p) => p.place.id === this.pending)?.place;
      if (place && Math.hypot(place.x - this.playerPosition.x, place.z - this.playerPosition.z) < navigation.arrival + (place.kind === "person" ? 0.1 : 0.2)) {
        const id = this.pending;
        this.pending = null;
        this.target = [];
        const p = this.points.find((q) => q.place.id === id);
        if (p) this.onInteract(p.place);
      } else if (!this.target.length) this.pending = null;
    }
    if (!this.active) return;
    const nearest = this.nearest();
    if ((nearest?.id ?? "") !== this.lastNearby) {
      this.lastNearby = nearest?.id ?? "";
      this.onNearby(nearest);
    }
    this.timeToSave += dt;
    if (this.timeToSave > 3) {
      this.timeToSave = 0;
      this.onPosition();
    }
  }

  private animateActor(a: Actor, moving: boolean, t: number, dt: number) {
    const swing = moving ? Math.sin(this.gait) : 0;
    const [armL, armR, legL, legR] = a.limbs;
    if (a.baby) {
      if (armL) armL.rotation.x = moving ? swing * 0.5 : 0;
      if (armR) armR.rotation.x = moving ? -swing * 0.5 : 0;
      if (legL) legL.rotation.x = moving ? -swing * 0.25 : 0;
      if (legR) legR.rotation.x = moving ? swing * 0.25 : 0;
    } else {
      if (legL) legL.rotation.x = swing * 0.55;
      if (legR) legR.rotation.x = -swing * 0.55;
      if (armL) armL.rotation.x = -swing * 0.5;
      if (armR && a.wave <= 0) armR.rotation.x = swing * 0.5;
    }
    if (a.body) {
      a.body.position.y = a.bodyY + (moving ? Math.abs(Math.sin(this.gait)) * 0.045 : Math.sin(t * 2.1) * 0.006);
      a.body.rotation.x = moving ? 0.06 : 0;
    }
    if (a.head && !this.reducedMotion) a.head.rotation.z = Math.sin(t * 1.3) * 0.03;
    // blink
    a.blink -= dt;
    if (a.eyes) a.eyes.scale.y = a.blink < 0.12 && a.blink > 0 ? 0.12 : 1;
    if (a.blink <= 0) a.blink = 2.2 + Math.random() * 3.5;
    // wave
    if (armR && a.wave > 0) {
      a.wave -= dt;
      armR.rotation.x = 0;
      armR.rotation.z = (a.root.scale.x > 0 ? 1 : 1) * (2.6 + Math.sin(t * 14) * 0.35) * Math.min(1, a.wave * 3);
      if (a.wave <= 0) armR.rotation.z = 0;
    }
    // talking
    if (a.talk > 0) {
      a.talk -= dt;
      const open = Math.sin(t * 22) > 0.1 && a.talk > 0.2;
      if (a.mouthOpen) a.mouthOpen.visible = open;
      if (a.mouthSmile) a.mouthSmile.visible = !open;
      if (a.head) a.head.rotation.x = Math.sin(t * 7) * 0.05;
    } else {
      if (a.mouthOpen) a.mouthOpen.visible = false;
      if (a.mouthSmile) a.mouthSmile.visible = true;
      if (a.head) a.head.rotation.x = 0;
    }
  }

  private tick = (ms: number) => {
    const dt = Math.min((ms - this.last) / 1000 || 0, 0.08);
    this.last = ms;
    this.accumulator = Math.min(this.accumulator + dt, 0.1);
    while (this.accumulator >= 1 / 60) {
      this.step(1 / 60);
      this.accumulator -= 1 / 60;
    }
    const interval = 1000 / this.graphics.maxFPS;
    const elapsed = ms - this.lastPaint;
    if (elapsed < interval - 0.5 || document.hidden) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    this.lastPaint = ms - (Math.max(0, elapsed - interval) % interval);
    const adt = Math.min(elapsed / 1000, 0.08);
    const t = this.clock;
    if (this.player) this.animateActor(this.player, this.active && this.walking, t, adt);
    for (const a of this.actors) {
      const dx = this.playerPosition.x - a.root.position.x,
        dz = this.playerPosition.z - a.root.position.z;
      const dist = Math.hypot(dx, dz);
      const want = dist < 3.2 && !this.titleMode ? Math.atan2(dx, dz) : a.facing;
      const cur = a.root.rotation.y;
      a.root.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, adt * 4);
      const point = this.points.find((p) => p.place.who === a.who);
      if (!a.waved && dist < 3 && point?.place.status && point.place.status !== "idle" && !this.reducedMotion) {
        a.waved = true;
        a.wave = 1.4;
      }
      this.animateActor(a, false, t + a.who.length, adt);
    }
    // scene animation nodes
    if (!this.reducedMotion)
      for (const n of this.anims) {
        const s = n.seed * 1.7;
        if (n.kind === "Spin") n.obj.rotation.y = n.base.y + t * (n.obj.name.includes("beam") ? 0.7 : 0.35);
        else if (n.kind === "Sway") {
          n.obj.rotation.z = n.base.z + Math.sin(t * 0.9 + s) * 0.12;
          n.obj.rotation.x = n.base.x + Math.sin(t * 0.7 + s * 0.5) * 0.06;
          n.obj.position.y = n.baseY + Math.sin(t * 0.8 + s) * 0.12;
        } else if (n.kind === "Bob") {
          const storm = this.state?.chapter === 4 ? 3 : 1;
          n.obj.position.y = n.baseY + Math.sin(t * 1.1 * storm + s) * 0.06 * storm;
          n.obj.rotation.z = n.base.z + Math.sin(t * 0.9 * storm + s) * 0.04 * storm;
        }
      }
    // interactive points
    let showLabel: string | undefined = this.hover || this.lastNearby;
    if (this.conversation) showLabel = undefined;
    for (const p of this.points) {
      if (p.spin && !this.reducedMotion) {
        p.spin.rotation.y = t * 1.2 + p.place.index;
        p.spin.position.y = 0.38 + Math.sin(t * 2.2 + p.place.index) * 0.07;
      }
      if (p.marker && !this.reducedMotion) p.marker.position.y += Math.sin(t * 3 + p.place.index) * 0.0025;
      if (p.ring) (p.ring.material as T.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3 + p.place.index) * 0.3;
      if (p.label) p.label.visible = !this.conversation && (p.place.id === showLabel || (p.place.kind === "activity" && !this.lastNearby) || p.place.kind === "exit");
    }
    // weather
    if (this.weather) {
      const pos = this.weather.obj.geometry.getAttribute("position") as T.BufferAttribute;
      const arr = pos.array as Float32Array;
      const cx = this.camTarget.x,
        cz = this.camTarget.z;
      if (this.weather.kind === "rain") {
        for (let i = 0; i < this.weather.speeds.length; i++) {
          const k = i * 6;
          const dy = this.weather.speeds[i] * adt;
          arr[k + 1] -= dy;
          arr[k + 4] -= dy;
          if (arr[k + 1] < -1) {
            const x = cx + (Math.random() - 0.5) * 26,
              z = cz + (Math.random() - 0.5) * 22,
              y = 12 + Math.random() * 3;
            arr.set([x, y, z, x - 0.08, y - 0.5, z - 0.03], k);
          }
        }
      } else {
        const up = this.weather.kind === "motes";
        for (let i = 0; i < this.weather.speeds.length; i++) {
          const k = i * 3;
          const sp = this.weather.speeds[i];
          arr[k + 1] += (up ? 0.12 : -sp * 0.9) * adt;
          arr[k] += Math.sin(t * sp + i) * 0.3 * adt;
          if (arr[k + 1] < -0.5 || arr[k + 1] > 9) {
            arr[k] = cx + (Math.random() - 0.5) * 22;
            arr[k + 1] = up ? 0 : 8 + Math.random() * 2;
            arr[k + 2] = cz + (Math.random() - 0.5) * 16;
          }
        }
      }
      pos.needsUpdate = true;
    }
    if (this.titleKite && !this.reducedMotion) {
      this.titleKite.rotation.z = Math.sin(t * 0.8) * 0.2;
      this.titleKite.position.y = 5.4 + Math.sin(t * 0.6) * 0.3;
    }
    if (this.release) {
      this.release.position.y += adt * 1.6;
      this.release.position.x -= adt * 0.7;
      this.release.position.z -= adt * 0.9;
      this.release.rotation.z = Math.sin(t * 2) * 0.3;
    }
    // camera
    if (!this.titleMode) {
      const goal = this.focusPoint ?? this.followTarget();
      this.camTarget.lerp(goal, 1 - Math.exp(-adt * (this.focusPoint ? 5 : 3.2)));
      this.intro = Math.max(0, this.intro - adt * 0.45);
    }
    this.camDist += (this.camGoalDist - this.camDist) * (1 - Math.exp(-adt * 4));
    this.placeCamera();
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private render() {
    this.renderer.info.reset();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** Pixels at the bottom of the view covered by a dialog; the framing shifts above it. */
  private inset = 0;
  setInset(px: number) {
    if (Math.abs(px - this.inset) < 2) return;
    this.inset = px;
    this.resize();
  }

  diagnostics() {
    return {
      quality: this.quality,
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
      bloom: !!this.composer,
      maxFPS: this.graphics.maxFPS,
      buffer: { width: this.renderer.domElement.width, height: this.renderer.domElement.height },
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      position: { x: this.playerPosition.x, z: this.playerPosition.z },
      models: [...this.models.keys()],
      actors: this.actors.map((a) => a.who),
      points: this.points.map((p) => p.place.id),
      walking: this.walking,
      routePoints: this.target.length,
      titleMode: this.titleMode,
    };
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.pointerDown);
    el.removeEventListener("pointerup", this.pointerUp);
    el.removeEventListener("pointercancel", this.pointerCancel);
    el.removeEventListener("pointermove", this.pointerMove);
    this.reset();
    this.stage.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
