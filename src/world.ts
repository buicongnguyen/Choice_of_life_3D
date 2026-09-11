import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { lightWorld } from "./lighting";
import { modelURL } from "./asset-url";
import { graphicsProfile, type GraphicsQuality } from "./graphics";
import { chapters, careerFor } from "./content";
import { resolved, chapterDone, type Life } from "./core";
import { activity, guestNames, keepsakes, record } from "./journey";
import {
  free,
  clearSegment,
  findPath,
  recoverPosition,
  surfaceHeight,
  navigation,
  type Collider,
} from "./navigation";

export type Place = {
  id: string;
  label: string;
  x: number;
  z: number;
  kind: "person" | "discovery" | "exit" | "activity" | "guest" | "companion";
  index: number;
};
type Actor = {
  root: T.Group;
  limbs: (T.Object3D | undefined)[];
  head: T.Object3D | undefined;
  scale: number;
};
const palette = { health: 0xdc8b79, happiness: 0xe7b75a, money: 0x77aba0 };
const material = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.8 });
const props = [
  ["blanket", "rattle", "coins"],
  ["apple", "boat", "coins"],
  ["apple", "book", "coins"],
  ["ball", "letter", "coins"],
  ["apple", "letter", "coins"],
  ["plant", "book", "coins"],
  ["apple", "letter", "coins"],
  ["plant", "book", "coins"],
  ["blanket", "letter", "book"],
  ["apple", "letter", "coins"],
  ["plant", "book", "coins"],
  ["plant", "tin", "coins"],
];

export class World {
  readonly renderer: T.WebGLRenderer;
  readonly scene = new T.Scene();
  readonly camera = new T.OrthographicCamera(-10, 10, 7, -7, 0.1, 100);
  readonly playerPosition = new T.Vector3(0, 0.16, 2.6);
  private loader = new GLTFLoader();
  private models = new Map<string, Promise<T.Group>>();
  private room = new T.Group();
  private cast = new T.Group();
  private fx = new T.Group();
  private player?: Actor;
  private actors: Actor[] = [];
  private points: { place: Place; root: T.Group; marker: T.Sprite }[] = [];
  private colliders: Collider[] = [];
  private bounds: Record<string, Collider[]> = {};
  private state?: Life;
  private generation = 0;
  private target: T.Vector3[] = [];
  private pending: string | null = null;
  private raycaster = new T.Raycaster();
  private ground = new T.Plane(new T.Vector3(0, 1, 0), -0.16);
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
  private obstacle?: T.Mesh;
  private sparkle?: T.Points;
  private observer: ResizeObserver;
  active = false;
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  speed = 2.6;
  onInteract: (id: string) => void = () => {};
  onNearby: (place: Place | undefined) => void = () => {};
  onHazard: () => void = () => {};
  onPosition: () => void = () => {};
  private lastNearby = "";
  private timeToSave = 0;
  private releaseLighting: () => void;
  private focusPoint?: T.Vector3;
  private conversationId: string | null = null;
  private acknowledgement = 0;
  closeups = true;

  private graphics;
  constructor(
    private host: HTMLElement,
    readonly quality: GraphicsQuality = "high",
  ) {
    this.graphics = graphicsProfile(quality, devicePixelRatio);
    this.renderer = new T.WebGLRenderer({
      antialias: this.graphics.antialias,
      alpha: true,
      powerPreference: this.graphics.low ? "low-power" : "high-performance",
    });
    this.renderer.setPixelRatio(this.graphics.pixelRatio);
    this.releaseLighting = lightWorld(
      this.scene,
      this.renderer,
      this.graphics.low,
    );
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.camera.position.set(10, 14, 18);
    this.camera.lookAt(0, 0.2, 0);
    const under = new T.Mesh(
      new T.CircleGeometry(11, 64),
      new T.MeshBasicMaterial({
        color: 0x79988b,
        transparent: true,
        opacity: 0.12,
      }),
    );
    under.rotation.x = -Math.PI / 2;
    under.position.y = -0.71;
    this.scene.add(under);
    this.scene.add(this.room, this.cast, this.fx);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener(
      "pointercancel",
      this.pointerCancel,
    );
    this.frame = requestAnimationFrame(this.tick);
  }
  async init() {
    const response = await fetch(modelURL("colliders.json"));
    if (!response.ok) throw new Error("The world map could not be loaded.");
    this.bounds = await response.json();
    await Promise.all(
      ["male", "female", "baby", "cat", "home"].map((n) => this.load(n)),
    );
  }
  private load(name: string) {
    if (!this.models.has(name))
      this.models.set(
        name,
        this.loader
          .loadAsync(modelURL(`${this.graphics.modelFolder}${name}.glb`))
          .then((g) => {
            if (this.graphics.low) {
              // Share lightweight source materials; actor instances clone before tinting.
              const converted = new Map<T.Material, T.Material>();
              const simplify = (m: T.Material) => {
                if (!converted.has(m) && m instanceof T.MeshStandardMaterial) {
                  const simple = new T.MeshLambertMaterial({
                    color: m.color,
                    emissive: m.emissive,
                    side: m.side,
                    transparent: m.transparent,
                    opacity: m.opacity,
                    alphaTest: m.alphaTest,
                  });
                  simple.name = m.name;
                  converted.set(m, simple);
                }
                return converted.get(m) ?? m;
              };
              g.scene.traverse((o) => {
                if (o instanceof T.Mesh)
                  o.material = Array.isArray(o.material)
                    ? o.material.map(simplify)
                    : simplify(o.material);
              });
              for (const original of converted.keys()) original.dispose();
            }
            return g.scene;
          })
          .catch((e) => {
            this.models.delete(name);
            throw e;
          }),
      );
    return this.models.get(name)!;
  }
  private clone(model: T.Group) {
    const root = model.clone(true);
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.castShadow = this.graphics.shadows;
        o.receiveShadow = this.graphics.shadows;
        if (Array.isArray(o.material))
          o.material = o.material.map((m) => m.clone());
        else o.material = o.material.clone();
      }
    });
    return root;
  }
  private makeActor(
    model: T.Group,
    scale: number,
    color: number,
    skin: number,
    hair: number,
  ): Actor {
    const root = this.clone(model);
    root.scale.setScalar(scale);
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (
            m instanceof T.MeshStandardMaterial ||
            m instanceof T.MeshLambertMaterial
          ) {
            if (m.name.startsWith("teal")) m.color.set(color);
            if (m.name.startsWith("skin")) m.color.set(skin);
            if (m.name.startsWith("hair")) {
              m.color.set(hair);
              if (m.name.startsWith("hair_glint"))
                m.color.lerp(new T.Color(0xc0a17d), 0.22);
            }
          }
        }
      }
    });
    if (this.graphics.low) {
      // A cheap contact patch grounds characters without rendering shadow maps.
      const contact = new T.Mesh(
        new T.CircleGeometry(0.32, 16),
        new T.MeshBasicMaterial({
          color: 0x304a3d,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      contact.rotation.x = -Math.PI / 2;
      contact.position.y = 0.015;
      contact.userData.ownedGeometry = true;
      root.add(contact);
    }
    return {
      root,
      limbs: ["ArmL", "ArmR", "LegL", "LegR"].map((n) =>
        root.getObjectByName(n),
      ),
      head: root.getObjectByName("Head"),
      scale,
    };
  }
  private release(group: T.Group) {
    group.traverse((o) => {
      if (
        o instanceof T.Mesh ||
        o instanceof T.Sprite ||
        o instanceof T.Points
      ) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m instanceof T.SpriteMaterial) m.map?.dispose();
          m.dispose();
        }
        if (o.userData.ownedGeometry) o.geometry?.dispose();
      }
    });
    group.clear();
  }
  async show(state: Life) {
    const ticket = ++this.generation;
    this.active = false;
    this.clearInput();
    this.target = [];
    this.pending = null;
    const chapter = chapters[state.chapter];
    const [scenery, body, male, female, cat, ...items] = await Promise.all([
      this.load(chapter.scene),
      this.load(state.chapter === 0 ? "baby" : state.identity.gender),
      this.load("male"),
      this.load("female"),
      this.load("cat"),
      ...props[state.chapter].map((n) => this.load(n)),
      ...["tin", "boat", "book", "plant"].map((n) => this.load(n)),
    ]);
    if (ticket !== this.generation) return;
    this.release(this.room);
    this.release(this.cast);
    this.release(this.fx);
    this.points = [];
    this.actors = [];
    this.obstacle = undefined;
    this.sparkle = undefined;
    this.focusPoint = undefined;
    this.conversationId = null;
    this.room.add(this.clone(scenery));
    this.colliders = this.bounds[chapter.scene] ?? [];
    this.state = state;
    const skins = [0xe4ad7d, 0xf1c6a1, 0xab7050, 0x754933];
    let shirt = 0x4a9990;
    if (state.chapter >= 6) {
      shirt =
        state.facts.field === "care"
          ? 0xf4eee2
          : state.facts.field === "technology"
            ? 0x578ba8
            : 0xc48d70;
    }
    this.player = this.makeActor(
      body,
      chapter.scale,
      shirt,
      skins[state.identity.skin],
      state.chapter >= 10 ? 0xd5d5cd : 0x47332d,
    );
    const position = recoverPosition(state.position, this.colliders);
    this.gait = 0;
    this.playerPosition.set(
      position.x,
      this.surface(position.x, position.z) - 0.03 * chapter.scale,
      position.z,
    );
    this.player.root.position.copy(this.playerPosition);
    this.cast.add(this.player.root);
    if (state.chapter >= 6 && state.chapter <= 9)
      this.accessory(this.player.root, careerFor(state.facts));
    const ring = new T.Mesh(
      new T.RingGeometry(0.34, 0.41, 36),
      new T.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.userData.ownedGeometry = true;
    this.player.root.add(ring);
    chapter.encounters.forEach((enc, i) => {
      const isPeer =
        ["Rowan", "Maya"].includes(enc.person) && state.chapter < 5;
      const scale = isPeer ? chapter.scale : state.chapter >= 10 ? 0.96 : 1;
      const adult =
        state.chapter >= 10 ||
        ((enc.person === "Mum" || enc.person === "Dad") && state.chapter >= 7);
      const identityHash = [...enc.person].reduce(
        (n, c) => n + c.charCodeAt(0),
        0,
      );
      const actor = this.makeActor(
        enc.gender === "female" ? female : male,
        scale,
        enc.color,
        [0xe4ad7d, 0xc18c65, 0xf1c6a1, 0xab7050][identityHash % 4],
        adult ? 0xd2d0c7 : [0x4e372d, 0x614737, 0x2d2928][identityHash % 3],
      );
      const x = i === 0 ? -2.2 : 2.2,
        z = i === 0 ? -0.7 : -1.25;
      actor.root.position.set(x, this.surface(x, z) - 0.03 * scale, z);
      actor.root.rotation.y = i === 0 ? 0.5 : -0.3;
      this.cast.add(actor.root);
      this.actors.push(actor);
      this.addPoint(
        {
          id: `person:${i}`,
          label: enc.person,
          x,
          z,
          kind: "person",
          index: i,
        },
        actor.root,
        2.8 * scale,
      );
    });
    if (state.chapter === 7) {
      const names = guestNames;
      const colors = [0x7499bb, 0xb98298, 0xe4b451];
      names.forEach((name, i) => {
        const a = this.makeActor(
          state.identity.gender === "male" ? female : male,
          0.91,
          colors[i],
          skins[(state.identity.skin + i + 1) % 4],
          [0x4c3329, 0x332829, 0x965c36][i],
        );
        a.root.position.set(
          -2 + i * 2,
          this.surface(-2 + i * 2, 2.8) - 0.03 * 0.91,
          2.8,
        );
        a.root.rotation.y = Math.PI;
        this.cast.add(a.root);
        this.actors.push(a);
        this.addPoint(
          {
            id: `guest:${i}`,
            label: name,
            x: -2 + i * 2,
            z: 2.8,
            kind: "guest",
            index: i,
          },
          a.root,
          2.8,
        );
      });
    }
    if (state.chapter >= 8 && state.facts.home === "partnered") {
      const i = guestNames.indexOf(state.facts.partner);
      if (i >= 0) {
        const spouse = this.makeActor(
          state.identity.gender === "male" ? female : male,
          state.chapter >= 10 ? 0.95 : 0.91,
          [0x7499bb, 0xb98298, 0xe4b451][i],
          skins[(state.identity.skin + i + 1) % 4],
          state.chapter >= 10 ? 0xd2d0c7 : [0x4c3329, 0x332829, 0x965c36][i],
        );
        spouse.root.position.set(
          3.3,
          this.surface(3.3, 2.6) - 0.03 * spouse.scale,
          2.6,
        );
        this.cast.add(spouse.root);
        this.actors.push(spouse);
        this.addPoint(
          {
            id: "companion:0",
            label: state.facts.partner,
            x: 3.3,
            z: 2.6,
            kind: "companion",
            index: 0,
          },
          spouse.root,
          2.8,
        );
      }
    }
    const coords = [
      [-3.1, 0.9],
      [0, 1.6],
      [3.3, 0.6],
    ];
    chapter.discoveries.forEach((label, i) => {
      const root = new T.Group();
      const [x, z] = coords[i];
      root.position.set(x, this.surface(x, z), z);
      const color = Object.values(palette)[i];
      const gem = this.clone(items[i]);
      gem.position.y = 0.18;
      root.add(gem);
      const halo = new T.Mesh(
        new T.RingGeometry(0.31, 0.35, 32),
        new T.MeshBasicMaterial({ color, side: T.DoubleSide }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.035;
      halo.userData.ownedGeometry = true;
      root.add(halo);
      this.fx.add(root);
      this.addPoint(
        {
          id: i === 1 ? "activity:0" : `discovery:${i}`,
          label: i === 1 ? activity(state).title : label,
          x,
          z,
          kind: i === 1 ? "activity" : "discovery",
          index: i,
        },
        root,
        1.05,
      );
    });
    const exit = new T.Group();
    exit.position.set(5.2, this.surface(5.2, -0.3), -0.3);
    const arch = new T.Mesh(
      new T.TorusGeometry(0.53, 0.06, 8, 32, Math.PI),
      material(0xe9b74f),
    );
    arch.position.y = 0.9;
    arch.userData.ownedGeometry = true;
    exit.add(arch);
    for (const x of [-0.53, 0.53]) {
      const post = new T.Mesh(
        new T.CylinderGeometry(0.06, 0.06, 0.9, 8),
        material(0xe9b74f),
      );
      post.position.set(x, 0.45, 0);
      post.userData.ownedGeometry = true;
      exit.add(post);
    }
    this.fx.add(exit);
    this.addPoint(
      {
        id: "exit",
        label: state.chapter === 11 ? "Your story" : "Next chapter",
        x: 5.2,
        z: -0.3,
        kind: "exit",
        index: 0,
      },
      exit,
      1.8,
    );
    // Legacy hazard records remain readable, without a repeated unrelated puddle.
    const treasures = keepsakes(state).slice(-3);
    if (treasures.length) {
      const shelf = new T.Group();
      shelf.position.set(0, 2.6, -4.4);
      const board = new T.Mesh(
        new T.BoxGeometry(3.3, 0.12, 0.6),
        material(0x936f4b),
      );
      board.userData.ownedGeometry = true;
      shelf.add(board);
      treasures.forEach((treasure, i) => {
        const index = ["tin", "boat", "book", "plant"].indexOf(treasure.icon);
        const prop = this.clone(items[3 + (index < 0 ? 2 : index)]);
        prop.scale.setScalar(0.45);
        prop.position.set((i - 1) * 1.05, 0.1, 0);
        shelf.add(prop);
      });
      const label = this.label("Your keepsake shelf", 0xfff7e6, 0x214d48);
      label.position.y = 1.05;
      shelf.add(label);
      this.fx.add(shelf);
    }
    if (state.chapter === 6 || state.chapter === 9) {
      const sign = this.label(
        state.facts.field === "care"
          ? "Community clinic"
          : state.facts.field === "technology"
            ? "Software studio"
            : "Neighbourhood business",
        0xfff7e6,
        0x214d48,
      );
      sign.position.set(0, 3.2, -3.8);
      this.fx.add(sign);
      const work = this.clone(items[state.facts.field === "care" ? 6 : 5]);
      work.position.set(-4.5, 1.25, -2.3);
      work.scale.setScalar(0.4);
      this.fx.add(work);
    }
    if (state.chapter > 0) {
      const pet = this.clone(cat);
      pet.scale.setScalar(0.7);
      pet.position.set(-3.4, this.surface(-3.4, -1.6), -1.6);
      pet.rotation.y = 0.8;
      this.cast.add(pet);
    }
    if (!this.graphics.low) {
      const positions = new Float32Array(30 * 3);
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = Math.sin(i * 5.7) * 6;
        positions[i + 1] = 0.8 + (i % 9) / 4;
        positions[i + 2] = Math.cos(i * 3.2) * 4;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
      this.sparkle = new T.Points(
        geometry,
        new T.PointsMaterial({
          color: 0xfff6cd,
          size: 0.035,
          transparent: true,
          opacity: 0.6,
        }),
      );
      this.sparkle.userData.ownedGeometry = true;
      this.fx.add(this.sparkle);
    }
    this.update(state);
    this.resize();
    this.renderer.render(this.scene, this.camera);
    const next = chapters[state.chapter + 1];
    if (next && !this.graphics.low) void this.load(next.scene).catch(() => {});
  }
  private accessory(root: T.Group, career: string) {
    if (/doctor|nurse|Care assistant/i.test(career)) {
      const loop = new T.Mesh(
        new T.TorusGeometry(0.14, 0.025, 6, 16, Math.PI),
        material(0x374953),
      );
      loop.position.set(0, 1.23, 0.245);
      loop.rotation.z = Math.PI;
      loop.userData.ownedGeometry = true;
      root.add(loop);
      const badge = new T.Mesh(
        new T.BoxGeometry(0.1, 0.14, 0.03),
        material(0xffffff),
      );
      badge.position.set(-0.18, 1.1, 0.25);
      badge.userData.ownedGeometry = true;
      root.add(badge);
    } else {
      const badge = new T.Mesh(
        new T.BoxGeometry(0.12, 0.17, 0.025),
        material(0xf8efdb),
      );
      badge.position.set(-0.15, 1.12, 0.255);
      badge.userData.ownedGeometry = true;
      root.add(badge);
    }
  }
  private label(text: string, bg: number, fg: number) {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 72;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = `#${bg.toString(16).padStart(6, "0")}`;
    ctx.beginPath();
    ctx.roundRect(2, 2, 316, 68, 30);
    ctx.fill();
    ctx.font = "600 27px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `#${fg.toString(16).padStart(6, "0")}`;
    ctx.fillText(text, 160, 36, 295);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        depthTest: false,
        toneMapped: false,
      }),
    );
    sprite.scale.set(1.9, 0.43, 1);
    sprite.renderOrder = 10;
    return sprite;
  }
  private addPoint(place: Place, root: T.Group, height: number) {
    const marker = this.label(
      ["person", "guest", "companion"].includes(place.kind)
        ? `${place.label} · talk`
        : place.kind === "activity"
          ? "✦ " + place.label
          : place.kind === "exit"
            ? place.label
            : ["♥ Health", "✦ Joy", "● Money"][place.index],
      place.kind === "person" ? 0xfff7e6 : 0x214d48,
      place.kind === "person" ? 0x214d48 : 0xfff7e6,
    );
    marker.position.y = height;
    root.add(marker);
    root.traverse((o) => (o.userData.place = place.id));
    this.points.push({ place, root, marker });
  }
  update(state: Life) {
    this.state = state;
    for (const { place, root, marker } of this.points) {
      if (place.kind === "discovery")
        root.visible = !state.discoveries.includes(
          `${state.chapter}:${place.index}`,
        );
      if (place.kind === "person")
        marker.material.opacity = resolved(state, place.index) ? 0.45 : 1;
      if (place.kind === "activity") {
        marker.material.opacity = record(state).complete ? 0.5 : 1;
      }
      if (place.kind === "guest")
        marker.material.opacity = state.meetings.includes(place.label)
          ? 0.65
          : 1;
      if (place.kind === "exit") {
        root.visible = chapterDone(state);
      }
    }
    if (this.obstacle)
      this.obstacle.visible = !state.hazards.includes(state.chapter);
  }
  places() {
    return this.points
      .filter(
        (p) =>
          p.root.visible &&
          (p.place.kind !== "activity" ||
            !this.state ||
            !record(this.state).complete) &&
          (p.place.kind !== "person" ||
            !this.state ||
            !resolved(this.state, p.place.index)),
      )
      .map((p) => p.place);
  }
  nearest() {
    let result: Place | undefined,
      distance: number = navigation.reach;
    for (const place of this.places()) {
      const d = Math.hypot(
        place.x - this.playerPosition.x,
        place.z - this.playerPosition.z,
      );
      if (
        d < distance &&
        clearSegment(this.playerPosition, place, this.colliders)
      ) {
        result = place;
        distance = d;
      }
    }
    return result;
  }
  interact() {
    const p = this.nearest();
    if (this.active && p) {
      this.target = [];
      this.pending = null;
      this.onInteract(p.id);
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
  private surface(x: number, z: number) {
    const scene = this.state ? chapters[this.state.chapter].scene : "home";
    return surfaceHeight(scene, x, z);
  }
  private free(x: number, z: number) {
    return free({ x, z }, this.colliders);
  }
  private path(x: number, z: number) {
    return findPath(this.playerPosition, { x, z }, this.colliders).map(
      (p) => new T.Vector3(p.x, 0, p.z),
    );
  }
  go(id: string) {
    const p = this.places().find((p) => p.id === id);
    if (!p) return false;
    this.target = this.path(p.x, p.z);
    const reachable = this.target.length > 0;
    this.pending = reachable ? id : null;
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
    if (
      this.active &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 10
    )
      this.tap(event.clientX, event.clientY);
  };
  private pointerCancel = () => {
    this.press = undefined;
  };
  private tap(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new T.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        (-(y - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hits = this.raycaster.intersectObjects(
      [...this.cast.children, ...this.fx.children],
      true,
    );
    const hit = hits.find(
      (h) =>
        h.object.userData.place &&
        this.places().some((p) => p.id === h.object.userData.place),
    );
    if (hit) {
      this.go(hit.object.userData.place);
      return;
    }
    const position = new T.Vector3();
    if (
      this.raycaster.ray.intersectPlane(this.ground, position) &&
      this.free(position.x, position.z)
    ) {
      this.target = this.path(position.x, position.z);
      this.pending = null;
    }
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const focused = this.focusPoint && this.closeups;
    const span = focused
      ? Math.max(5.7, 7.5 / aspect)
      : Math.max(10.8, 17.8 / aspect);
    const center = focused ? this.focusPoint! : new T.Vector3(0, 0.2, 0);
    this.camera.position.copy(center).add(new T.Vector3(10, 14, 18));
    this.camera.lookAt(center);
    this.camera.left = (-span * aspect) / 2;
    this.camera.right = (span * aspect) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
    // Resizing clears the drawing buffer. Repaint immediately so the 30 FPS cap
    // cannot leave empty frames between layout/rotation updates.
    this.renderer.render(this.scene, this.camera);
  }
  focus(id: string | null) {
    if (id !== this.conversationId) {
      this.acknowledgement = 0;
      for (const actor of this.actors)
        if (actor.head) actor.head.rotation.x = 0;
    }
    this.conversationId = id;
    // The dialogue already identifies the subject; labels should not cover faces in the close-up.
    for (const point of this.points) point.marker.visible = !id;
    const point = this.points.find((p) => p.place.id === id);
    this.focusPoint = point
      ? point.root.position
          .clone()
          .lerp(this.playerPosition, 0.5)
          .add(new T.Vector3(0, 1, 0))
      : undefined;
    this.resize();
  }
  acknowledge() {
    this.acknowledgement = this.reducedMotion ? 0 : 1.5;
  }
  private step(dt: number) {
    if (!this.active || !this.player) return;
    this.clock += dt;
    let sx =
      this.touch.x +
      (this.keys.has("d") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("ArrowLeft") ? 1 : 0);
    let sy =
      this.touch.y +
      (this.keys.has("s") || this.keys.has("ArrowDown") ? 1 : 0) -
      (this.keys.has("w") || this.keys.has("ArrowUp") ? 1 : 0);
    const direction = new T.Vector3(
      sx * 0.874 + sy * 0.486,
      0,
      -sx * 0.486 + sy * 0.874,
    );
    let routeDistance = Infinity;
    if (direction.lengthSq() === 0 && this.target.length) {
      direction.subVectors(this.target[0], this.playerPosition);
      direction.y = 0;
      routeDistance = direction.length();
      if (routeDistance < 0.001) {
        this.target.shift();
        direction.set(0, 0, 0);
      }
    }
    const beforeX = this.playerPosition.x,
      beforeZ = this.playerPosition.z;
    if (direction.lengthSq() > 0.000001) {
      direction.normalize();
      const amount = Math.min(this.speed * dt, routeDistance);
      const x = this.playerPosition.x + direction.x * amount,
        z = this.playerPosition.z + direction.z * amount;
      if (clearSegment(this.playerPosition, { x, z }, this.colliders)) {
        this.playerPosition.x = x;
        this.playerPosition.z = z;
      } else {
        if (
          clearSegment(
            this.playerPosition,
            { x, z: this.playerPosition.z },
            this.colliders,
          )
        )
          this.playerPosition.x = x;
        if (
          clearSegment(
            this.playerPosition,
            { x: this.playerPosition.x, z },
            this.colliders,
          )
        )
          this.playerPosition.z = z;
      }
      const angle = Math.atan2(direction.x, direction.z),
        current = this.player.root.rotation.y;
      this.player.root.rotation.y =
        current +
        Math.atan2(Math.sin(angle - current), Math.cos(angle - current)) *
          Math.min(1, dt * 14);
    }
    const traveled = Math.hypot(
      this.playerPosition.x - beforeX,
      this.playerPosition.z - beforeZ,
    );
    this.walking = traveled > 0.00001;
    this.gait += (traveled * 4) / this.player.scale;
    this.playerPosition.y =
      this.surface(this.playerPosition.x, this.playerPosition.z) -
      0.03 * this.player.scale;
    this.player.root.position.copy(this.playerPosition);
    if (this.pending) {
      const place = this.places().find((p) => p.id === this.pending);
      if (
        place &&
        Math.hypot(
          place.x - this.playerPosition.x,
          place.z - this.playerPosition.z,
        ) < navigation.arrival &&
        clearSegment(this.playerPosition, place, this.colliders)
      ) {
        const id = this.pending;
        this.pending = null;
        this.target = [];
        this.onInteract(id);
      } else if (!this.target.length) this.pending = null;
    }
    if (!this.active) return;
    const nearest = this.nearest();
    if ((nearest?.id ?? "") !== this.lastNearby) {
      this.lastNearby = nearest?.id ?? "";
      this.onNearby(nearest);
    }
    if (this.obstacle?.visible) {
      this.obstacle.position.x = Math.sin(this.clock * 0.5) * 1.7;
      this.obstacle.position.y =
        this.surface(this.obstacle.position.x, this.obstacle.position.z) +
        0.035;
      if (this.playerPosition.distanceTo(this.obstacle.position) < 0.57)
        this.onHazard();
    }
    this.timeToSave += dt;
    if (this.timeToSave > 3) {
      this.timeToSave = 0;
      this.onPosition();
    }
  }
  private animate(actor: Actor, moving: boolean, time: number) {
    const baby = actor === this.player && this.state?.chapter === 0;
    const swing = moving ? Math.sin(this.gait) * (baby ? 0.14 : 0.38) : 0;
    actor.limbs.forEach((limb, i) => {
      if (limb)
        limb.rotation.x =
          baby && i >= 2 ? 0 : (i === 0 || i === 3 ? 1 : -1) * swing;
    });
    if (actor.head)
      actor.head.rotation.z = this.reducedMotion
        ? 0
        : Math.sin(time * 1.5) * 0.025;
  }
  private tick = (ms: number) => {
    const dt = Math.min((ms - this.last) / 1000 || 0, 0.08);
    this.last = ms;
    this.accumulator = Math.min(this.accumulator + dt, 0.1);
    while (this.accumulator >= 1 / 60) {
      this.step(1 / 60);
      this.accumulator -= 1 / 60;
    }
    // Keep input/navigation simulation at 60 Hz; only painting is quality-limited.
    const interval = 1000 / this.graphics.maxFPS;
    const elapsed = ms - this.lastPaint;
    if (elapsed < interval - 0.5) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    this.lastPaint = ms - (Math.max(0, elapsed - interval) % interval);
    const animationDt = Math.min(elapsed / 1000, 0.08);
    if (this.player)
      this.animate(this.player, this.active && this.walking, this.clock);
    for (let i = 0; i < this.actors.length; i++)
      this.animate(this.actors[i], false, this.clock + i);
    if (this.acknowledgement > 0 && !document.hidden) {
      this.acknowledgement = Math.max(0, this.acknowledgement - animationDt);
      const point = this.points.find((p) => p.place.id === this.conversationId);
      const actor = this.actors.find((a) => a.root === point?.root);
      if (actor?.head && !this.reducedMotion)
        actor.head.rotation.x = Math.sin(this.acknowledgement * 5) * 0.08;
    } else {
      for (const actor of this.actors)
        if (actor.head) actor.head.rotation.x = 0;
    }
    if (this.active && !this.reducedMotion) {
      for (const p of this.points)
        if (p.place.kind === "discovery") {
          p.root.children[0].rotation.y =
            Math.sin(this.clock * 0.7 + p.place.index) * 0.18;
          p.root.children[0].position.y =
            0.18 + Math.sin(this.clock * 2 + p.place.index) * 0.025;
        }
      if (this.sparkle)
        this.sparkle.rotation.y = Math.sin(this.clock * 0.05) * 0.07;
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };
  diagnostics() {
    return {
      quality: this.quality,
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
      maxFPS: this.graphics.maxFPS,
      buffer: {
        width: this.renderer.domElement.width,
        height: this.renderer.domElement.height,
      },
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      position: { x: this.playerPosition.x, z: this.playerPosition.z },
      models: [...this.models.keys()],
      playerVisible: !!this.player?.root.visible,
      scale: this.player?.scale,
      walking: this.walking,
      routePoints: this.target.length,
    };
  }
  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    this.renderer.domElement.removeEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.pointerCancel,
    );
    this.release(this.room);
    this.release(this.cast);
    this.release(this.fx);
    this.releaseLighting();
    this.renderer.dispose();
  }
}
