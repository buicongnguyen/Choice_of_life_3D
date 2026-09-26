/**
 * Your kite: a colour chosen as a baby, a pattern and a second colour chosen in the
 * workshop. The same painter draws it in the workshop, the kite game, the share card and
 * (as a texture) on the 3D kite that flies over every outdoor chapter.
 */
import * as T from "three";
import { kiteColours } from "./content";
import { record, TRIM_COUNT, type Life } from "./core";

export const PATTERNS = ["plain", "stripes", "waves", "stars", "sunburst", "lighthouse", "hearts", "checks"] as const;
export type Pattern = (typeof PATTERNS)[number];
export const TRIMS = ["ffffff", "ffc234", "2f7de1", "ff5f8f", "5fe0b7", "1d2340"];
if (TRIMS.length !== TRIM_COUNT) throw new Error("TRIMS must match TRIM_COUNT");

/** Patterns are earned by what you actually did. */
export function unlocked(l: Life, p: Pattern): boolean {
  switch (p) {
    case "plain":
      return true;
    case "stripes":
      return record(l, 0).complete;
    case "waves":
      return record(l, 1).complete;
    case "stars":
      return record(l, 2).complete;
    case "sunburst":
      return record(l, 3).complete || l.facts.race === "won";
    case "lighthouse":
      return l.facts.nanaNight === "yes" || record(l, 4).complete;
    case "hearts":
      return Object.values(l.bonds).some((b) => b >= 5);
    case "checks":
      return record(l, 7).complete;
  }
}

export const isPattern = (p: string): p is Pattern => (PATTERNS as readonly string[]).includes(p);
export type KiteLook = { pattern: Pattern; main: string; trim: string };

/** What your kite looks like now (a pattern you haven't earned shows as plain). */
export function kiteLook(l: Life): KiteLook {
  const p = l.style.pattern;
  return lookOf(l.facts.kite ?? "red", isPattern(p) && unlocked(l, p) ? p : "plain", l.style.trim);
}
export function lookOf(kite: string, pattern: string, trim: number): KiteLook {
  return { pattern: isPattern(pattern) ? pattern : "plain", main: `#${kiteColours[kite]?.hex ?? "ee3b3b"}`, trim: `#${TRIMS[trim] ?? TRIMS[0]}` };
}

/** Paint the kite face into a square (the diamond is inscribed, top point at the top). */
export function paintKite(g: CanvasRenderingContext2D, size: number, pattern: Pattern, main: string, trim: string) {
  const s = size;
  g.save();
  g.clearRect(0, 0, s, s);
  g.beginPath();
  g.moveTo(s / 2, 0);
  g.lineTo(s * 0.84, s * 0.42);
  g.lineTo(s / 2, s);
  g.lineTo(s * 0.16, s * 0.42);
  g.closePath();
  g.clip();
  g.fillStyle = main;
  g.fillRect(0, 0, s, s);
  g.fillStyle = trim;
  g.strokeStyle = trim;
  const star = (x: number, y: number, r: number) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  const heart = (x: number, y: number, r: number) => {
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.5, y - r * 1.1, x, y - r * 0.35);
    g.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
    g.fill();
  };
  switch (pattern) {
    case "plain":
      // two lighter panels, so the kite reads as sewn cloth but stays its own bold colour
      g.globalAlpha = 0.3;
      g.fillRect(s / 2, 0, s / 2, s * 0.42);
      g.fillRect(0, s * 0.42, s / 2, s);
      break;
    case "stripes":
      for (let i = -2; i < 12; i += 2) {
        g.beginPath();
        g.moveTo(i * s * 0.1, 0);
        g.lineTo((i + 1) * s * 0.1, 0);
        g.lineTo((i + 1) * s * 0.1 + s * 0.5, s);
        g.lineTo(i * s * 0.1 + s * 0.5, s);
        g.fill();
      }
      break;
    case "waves":
      g.lineWidth = s * 0.05;
      for (let row = 0; row < 8; row++) {
        g.beginPath();
        for (let x = 0; x <= s; x += 4) g.lineTo(x, row * s * 0.14 + 10 + Math.sin(x / (s * 0.06)) * s * 0.03);
        g.stroke();
      }
      break;
    case "stars":
      star(s / 2, s * 0.34, s * 0.14);
      star(s * 0.36, s * 0.56, s * 0.07);
      star(s * 0.64, s * 0.56, s * 0.07);
      star(s / 2, s * 0.76, s * 0.08);
      star(s / 2, s * 0.12, s * 0.05);
      break;
    case "sunburst":
      for (let i = 0; i < 16; i += 2) {
        const a0 = (i / 16) * Math.PI * 2,
          a1 = ((i + 1) / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(s / 2, s * 0.42);
        g.lineTo(s / 2 + Math.cos(a0) * s, s * 0.42 + Math.sin(a0) * s);
        g.lineTo(s / 2 + Math.cos(a1) * s, s * 0.42 + Math.sin(a1) * s);
        g.fill();
      }
      g.fillStyle = main;
      g.beginPath();
      g.arc(s / 2, s * 0.42, s * 0.12, 0, Math.PI * 2);
      g.fill();
      break;
    case "lighthouse":
      g.fillRect(s * 0.44, s * 0.3, s * 0.12, s * 0.5);
      g.fillStyle = main;
      g.fillRect(s * 0.44, s * 0.42, s * 0.12, s * 0.06);
      g.fillRect(s * 0.44, s * 0.6, s * 0.12, s * 0.06);
      g.fillStyle = trim;
      g.beginPath();
      g.moveTo(s * 0.42, s * 0.3);
      g.lineTo(s / 2, s * 0.2);
      g.lineTo(s * 0.58, s * 0.3);
      g.fill();
      g.globalAlpha = 0.45;
      g.beginPath();
      g.moveTo(s / 2, s * 0.26);
      g.lineTo(s, s * 0.12);
      g.lineTo(s, s * 0.36);
      g.fill();
      g.beginPath();
      g.moveTo(s / 2, s * 0.26);
      g.lineTo(0, s * 0.12);
      g.lineTo(0, s * 0.36);
      g.fill();
      break;
    case "hearts":
      heart(s / 2, s * 0.4, s * 0.13);
      heart(s * 0.33, s * 0.6, s * 0.06);
      heart(s * 0.67, s * 0.6, s * 0.06);
      heart(s / 2, s * 0.78, s * 0.07);
      break;
    case "checks":
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if ((x + y) % 2) g.fillRect((x * s) / 10, (y * s) / 10, s / 10, s / 10);
      break;
  }
  g.restore();
  // spars
  g.strokeStyle = "rgba(90, 50, 25, 0.9)";
  g.lineWidth = Math.max(2, s * 0.02);
  g.beginPath();
  g.moveTo(s / 2, 0);
  g.lineTo(s / 2, s);
  g.moveTo(s * 0.16, s * 0.42);
  g.lineTo(s * 0.84, s * 0.42);
  g.stroke();
}

const textures = new Map<string, T.CanvasTexture>();
function texture(pattern: Pattern, main: string, trim: string) {
  const key = `${pattern}:${main}:${trim}`;
  if (!textures.has(key)) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    paintKite(c.getContext("2d")!, 256, pattern, main, trim);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return textures.get(key)!;
}

/** A 3D kite (face, bows, tail) using the painted texture. Pivot at the kite's centre. */
export function buildKite(look: KiteLook, size = 1) {
  const group = new T.Group();
  const shape = new T.Shape();
  shape.moveTo(0, 0.62);
  shape.lineTo(0.42, 0.1);
  shape.lineTo(0, -0.62);
  shape.lineTo(-0.42, 0.1);
  shape.closePath();
  const geo = new T.ShapeGeometry(shape);
  // Planar UVs matching the painter's square (x: -0.5..0.5 → 0..1, y: 0.62..-0.62 → 0..1).
  const pos = geo.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / 1.0 + 0.5;
    uv[i * 2 + 1] = (pos.getY(i) + 0.62) / 1.24;
  }
  geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
  const mat = new T.MeshStandardMaterial({ map: texture(look.pattern, look.main, look.trim), side: T.DoubleSide, roughness: 0.45 });
  mat.userData.owned = true;
  const face = new T.Mesh(geo, mat);
  face.userData.ownedGeometry = true;
  face.castShadow = true;
  group.add(face);
  // tail with bows
  const pts = Array.from({ length: 7 }, (_, i) => new T.Vector3(Math.sin(i * 0.9) * 0.1, -0.62 - i * 0.26, 0));
  const tail = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.012, 4), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  (tail.material as T.Material).userData.owned = true;
  tail.userData.ownedGeometry = true;
  group.add(tail);
  const bowColours = [0xffc234, 0x2f7de1, 0xff5f8f, 0x5fe0b7, 0xffffff, 0xee3b3b];
  pts.slice(1).forEach((p, i) => {
    const bow = new T.Mesh(new T.SphereGeometry(0.06, 10, 6), new T.MeshStandardMaterial({ color: bowColours[i % bowColours.length], roughness: 0.4 }));
    bow.scale.set(1.4, 0.7, 0.5);
    bow.position.copy(p);
    (bow.material as T.Material).userData.owned = true;
    bow.userData.ownedGeometry = true;
    group.add(bow);
  });
  group.scale.setScalar(size);
  group.userData.tail = tail;
  return group;
}

const thumbs = new Map<string, string>();
/** A painted kite as an image URL (for the workshop, the album and the share card). */
export function kiteImage(pattern: Pattern, main: string, trim: string, size = 96) {
  if (typeof document === "undefined") return "";
  const key = `${pattern}:${main}:${trim}:${size}`;
  if (!thumbs.has(key)) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    paintKite(c.getContext("2d")!, size, pattern, main, trim);
    thumbs.set(key, c.toDataURL());
  }
  return thumbs.get(key)!;
}
