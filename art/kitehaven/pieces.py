"""Reusable toy-diorama scenery. Every function authors in local space; wrap calls in
``with m.at(x, z, rot):`` to place them. Colliders are recorded in local space and the
kit converts them to world AABBs."""
import math
import random
from mathutils import Vector
from . import kit

TAU = math.tau


# ---------------------------------------------------------------------------
# ground
# ---------------------------------------------------------------------------
def rounded_rect(w, d, r, seg=5):
    pts = []
    for cx, cz, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def _clamp_rr(w, d, r):
    def f(x, z):
        cx = max(-w / 2 + r, min(w / 2 - r, x))
        cz = max(-d / 2 + r, min(d / 2 - r, z))
        dx, dz = x - cx, z - cz
        L = math.hypot(dx, dz)
        if L > r:
            return cx + dx / L * r, cz + dz / L * r
        return x, z
    return f


def noise(x, z, s=1.0, seed=0.0):
    """Cheap smooth value in [-1, 1] for painterly patches (no checkerboards)."""
    return (math.sin(x * 0.9 * s + seed) + math.sin(z * 1.1 * s + seed * 1.7) + math.sin((x + z) * 0.7 * s + seed * 0.3)
            + math.sin((x - z) * 1.3 * s + seed * 2.1)) / 4


def meadow(a="grass", b="grass2", s=1.0, seed=0.0, cut=0.22):
    def fn(x, z):
        return (b if noise(x, z, s, seed) > cut else a, 0.035)
    return fn


def pattern(m, fn):
    """fn(x, z) -> colour or (colour, jitter); used as a per-face colour callback."""
    def cb(f, M):
        c = M @ f.calc_center_median()
        out = fn(c.x, c.z)
        if isinstance(out, tuple) and len(out) == 2 and isinstance(out[1], (int, float)):
            return m.col(out[0], out[1])
        return m.col(out)
    return cb


def slab(m, w, d, top="grass", edge="grass_dark", layers=(("soil", 0.45), ("rock", 0.7)), r=0.8, step=0.35,
         jitter=0.07, top_fn=None, mat="Matte", lip=0.16):
    """Diorama base: a rounded 'cake' with a subdivided top (so AO has vertices)."""
    colors = pattern(m, top_fn) if top_fn else None
    m.grid((0, 0, 0), w, d, top, mat, step=step, jitter=jitter, colors=colors, shape=_clamp_rr(w, d, r))
    y = -0.005
    m.extrude(rounded_rect(w, d, r), y - lip, y, edge, "Matte", plane="xz", bevel=0.05)
    y -= lip
    inset = 0.0
    for color, h in layers:
        inset += 0.07
        m.extrude(rounded_rect(w - inset * 2, d - inset * 2, max(0.2, r - inset)), y - h, y, color, "Satin", plane="xz", bevel=0.06, jitter=0.05)
        y -= h
    return y


def water(m, x, z, w, d, near="sea", far="sea_deep", step=0.5, y=-0.25, part=None, shore=None):
    """Glossy water sheet; runtime animates any mesh using the Water material."""
    m.grid((x, y, z), w, d, near, "Water", step=step, ao=False)


def planks(m, x, z, w, d, colors=("plank", "plank2", "wood_light"), width=0.32, y=0.0, along="x", step=0.3, mat="Satin"):
    rr = random.Random(int(x * 13 + z * 7))
    table = {}

    def fn(px, pz):
        k = math.floor((pz if along == "x" else px) / width)
        seg = math.floor(((px if along == "x" else pz) + (k % 3) * 0.9) / 2.2)
        key = (k, seg)
        if key not in table:
            table[key] = kit.shade(colors[rr.randrange(len(colors))], rr.uniform(0.96, 1.04))
        return table[key]
    m.grid((x, y, z), w, d, colors[0], mat, step=min(step, width), colors=pattern(m, fn))
    # plank seams: darker thin strips give the floor its rhythm
    if not kit.LOW:
        n = int(d / width) if along == "x" else int(w / width)
        for i in range(1, n):
            if along == "x":
                zz = z - d / 2 + i * width
                m.box((x, y + 0.004, zz), (w, 0.006, 0.018), "wood_dark", "Matte", 0, ao=False)
            else:
                xx = x - w / 2 + i * width
                m.box((xx, y + 0.004, z), (0.018, 0.006, d), "wood_dark", "Matte", 0, ao=False)


def tiles(m, x, z, w, d, a="cream", b="mint", size=0.6, y=0.0, mat="Satin"):
    def fn(px, pz):
        return ((a if (math.floor(px / size) + math.floor(pz / size)) % 2 == 0 else b), 0.03)
    m.grid((x, y, z), w, d, a, mat, step=size / 2, colors=pattern(m, fn))


def cobbles(m, x, z, w, d, colors=("stone", "stone2", "cream"), size=0.45, y=0.0, weights=None):
    rr = random.Random(5)
    table = {}
    weights = weights or [1] * len(colors)

    def fn(px, pz):
        k = (math.floor(px / size + (math.floor(pz / size) % 2) * 0.5), math.floor(pz / size))
        if k not in table:
            table[k] = kit.shade(rr.choices(colors, weights)[0], rr.uniform(0.95, 1.05))
        return table[k]
    m.grid((x, y, z), w, d, colors[0], "Satin", step=size / 2, colors=pattern(m, fn))


# ---------------------------------------------------------------------------
# nature
# ---------------------------------------------------------------------------
def tree(m, x, z, s=1.0, leaf=("leaf", "leaf2"), trunk="trunk", kind="round", seed=0, solid=True):
    rr = random.Random(seed)
    with m.at(x, z, rr.uniform(0, TAU), s=s):
        if kind == "pine":
            m.cyl((0, 0, 0), 0.16, 0.7, trunk, "Satin", 10, 0.03, r2=0.12)
            for i, (rad, y, h) in enumerate(((0.95, 0.5, 1.0), (0.75, 1.1, 0.9), (0.52, 1.65, 0.85))):
                m.lathe([(0, y), (rad, y + 0.08), (rad * 0.85, y + 0.2), (0, y + h)], (0, 0, 0), leaf[i % 2], "Satin", 16, jitter=0.04)
        else:
            m.cyl((0, 0, 0), 0.17, 1.2, trunk, "Satin", 10, 0.04, r2=0.12)
            m.capsule((0, 0.8, 0), (0.35, 1.25, 0.1), 0.07, trunk, "Satin", 8)
            blobs = [((0, 1.75, 0), 0.82), ((0.5, 1.45, 0.25), 0.55), ((-0.45, 1.5, -0.15), 0.58), ((0.1, 2.3, -0.1), 0.5)]
            for i, (p, r) in enumerate(blobs):
                m.sphere(p, (r, r * 0.92, r), leaf[i % len(leaf)], "Satin", 18, 12, jitter=0.05)
    if solid:
        m.solid(x, z, 0.45 * s, 0.45 * s)


def bush(m, x, z, s=1.0, color="leaf", seed=0, flowers=None):
    rr = random.Random(seed)
    with m.at(x, z, s=s):
        for i in range(3):
            a = i * 2.1 + rr.random()
            m.sphere((math.cos(a) * 0.22, 0.28, math.sin(a) * 0.18), (0.38, 0.32, 0.36), color, "Satin", 14, 10, jitter=0.06)
        if flowers:
            for i in range(5):
                a = i * 1.3 + rr.random()
                m.sphere((math.cos(a) * 0.36, 0.42 + rr.random() * 0.15, math.sin(a) * 0.3), 0.07, flowers[i % len(flowers)], "Gloss", 8, 6, detail=True)


def flowers(m, x, z, w, d, colors=("red", "sun", "pink", "white"), n=12, seed=0, stem="leaf_dark"):
    rr = random.Random(seed)
    for i in range(n if not kit.LOW else n // 2):
        px, pz = x + rr.uniform(-w / 2, w / 2), z + rr.uniform(-d / 2, d / 2)
        h = rr.uniform(0.18, 0.34)
        m.cyl((px, 0, pz), 0.018, h, stem, "Matte", 5, 0)
        c = colors[i % len(colors)]
        for k in range(5 if not kit.LOW else 3):
            a = k * TAU / 5
            m.sphere((px + math.cos(a) * 0.05, h, pz + math.sin(a) * 0.05), (0.045, 0.02, 0.045), c, "Satin", 8, 5, detail=True)
        m.sphere((px, h + 0.01, pz), 0.03, "sun" if c != "sun" else "orange", "Gloss", 6, 4)


def rock(m, x, z, s=0.4, color="rock", seed=0, y=0.0):
    m.rock((x, y, z), (s, s * 0.75, s * 0.9), color, "Satin", seed=seed)


def grass_tufts(m, x, z, w, d, n=10, color="grass2", seed=0):
    rr = random.Random(seed)
    for i in range(n if not kit.LOW else 0):
        px, pz = x + rr.uniform(-w / 2, w / 2), z + rr.uniform(-d / 2, d / 2)
        for k in range(3):
            a = k * 2.1 + rr.random()
            m.capsule((px, 0, pz), (px + math.cos(a) * 0.06, 0.16 + rr.random() * 0.08, pz + math.sin(a) * 0.06), 0.02, color, "Satin", 5, r2=0.005)


# ---------------------------------------------------------------------------
# built things
# ---------------------------------------------------------------------------
def window(m, x, y, z, w, h, frame="white", glass="sky", glow=False, rot=0.0, shutters=None, depth=0.08, sill=True, cross=True):
    """Window on a wall whose outward normal is +z in local space."""
    with m.at(x, z, rot, y=y):
        m.box((0, 0, 0), (w + 0.12, h + 0.12, depth), frame, "Satin", 0.03)
        if glow:
            m.box((0, 0, depth / 2 + 0.002), (w - 0.04, h - 0.04, 0.02), "ffd88a", "Glow_warm", 0.0, ao=False)
        else:
            m.box((0, 0, depth / 2 + 0.002), (w - 0.04, h - 0.04, 0.02), glass, "Gloss", 0.0, ao=False)
            m.box((-w * 0.18, h * 0.15, depth / 2 + 0.014), (w * 0.12, h * 0.5, 0.005), "ffffff", "Gloss", 0.0, ao=False)
        if cross:
            m.box((0, 0, depth / 2 + 0.02), (0.05, h - 0.04, 0.03), frame, "Satin", 0.01)
            m.box((0, 0, depth / 2 + 0.02), (w - 0.04, 0.05, 0.03), frame, "Satin", 0.01)
        if sill:
            m.box((0, -h / 2 - 0.08, 0.06), (w + 0.25, 0.07, 0.2), frame, "Satin", 0.025)
        if shutters:
            for s in (-1, 1):
                m.box((s * (w / 2 + 0.2), 0, 0.02), (0.26, h + 0.06, 0.05), shutters, "Satin", 0.02)
                for k in range(3):
                    m.box((s * (w / 2 + 0.2), -h / 2 + (k + 0.5) * h / 3, 0.05), (0.2, 0.03, 0.02), kit.shade(shutters, 0.8), "Satin", 0.0, ao=False)


def door(m, x, z, w=0.8, h=1.5, color="red", frame="white", rot=0.0, knob="sun", glow=False, arch=True):
    with m.at(x, z, rot):
        m.box((0, h / 2, 0), (w + 0.16, h + 0.08, 0.1), frame, "Satin", 0.03)
        m.box((0, h / 2 - 0.02, 0.05), (w, h - 0.06, 0.06), color, "Gloss", 0.03)
        if arch:
            m.cyl((0, h - 0.04, 0.0), w / 2 + 0.08, 0.1, frame, "Satin", 20, 0.02, rot=(math.pi / 2, 0, 0))
            m.cyl((0, h - 0.04, 0.04), w / 2, 0.08, color if not glow else "ffd88a", "Gloss" if not glow else "Glow_warm", 20, 0.02, rot=(math.pi / 2, 0, 0))
        for k in range(2):
            m.box((0, h * (0.3 + k * 0.38), 0.085), (w * 0.72, h * 0.28, 0.02), kit.shade(color, 0.88), "Gloss", 0.01, ao=False)
        m.sphere((w * 0.32, h * 0.48, 0.1), 0.045, knob, "Metal", 10, 8)
        m.box((0, 0.03, 0.25), (w + 0.3, 0.06, 0.4), "stone", "Satin", 0.02)


def house(m, x, z, w, d, h, wall="wall_yellow", roof="roof_red", rot=0.0, door_color="blue", trim="white",
          windows=2, chimney=True, glow=False, floors=1, roof_h=None, solid=True, shutters=None, back=False):
    """Chunky cottage. Door faces +z (local). Roof overhangs generously."""
    roof_h = roof_h or w * 0.42
    with m.at(x, z, rot):
        m.box((0, h / 2, 0), (w, h, d), wall, "Satin", 0.07, jitter=0.0)
        m.box((0, 0.1, 0), (w + 0.08, 0.2, d + 0.08), kit.shade(wall, 0.78), "Satin", 0.04)
        # corner trims
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.box((sx * w / 2, h / 2, sz * d / 2), (0.14, h, 0.14), trim, "Satin", 0.03)
        # gable roof: two chunky slabs + ridge
        ov = 0.28
        half = w / 2 + ov
        ang = math.atan2(roof_h, w / 2)
        L = math.hypot(half, roof_h * half / (w / 2))
        for s in (-1, 1):
            cx = s * half / 2
            cy = h + roof_h * 0.5 - 0.02
            m.box((cx, cy, 0), (L, 0.2, d + ov * 2), roof, "Gloss", 0.07, rot=(0, 0, -s * ang), jitter=0.0)
            # shingle rows for texture
            if not kit.LOW:
                for k in range(3):
                    t = (k + 1) / 4
                    px = s * (half * (1 - t))
                    py = h + roof_h * t + 0.12
                    m.box((px - s * 0.0, py - 0.02, 0), (0.08, 0.06, d + ov * 2 - 0.1), kit.shade(roof, 0.85), "Gloss", 0.02,
                          rot=(0, 0, -s * ang), ao=False)
        # gable walls (triangles)
        tri = [(-w / 2, h), (w / 2, h), (0, h + roof_h * 0.98)]
        m.extrude(tri, -d / 2 + 0.02, d / 2 - 0.02, wall, "Satin", plane="xy")
        m.tube([(-0.02, h + roof_h + 0.1, -d / 2 - ov), (0.02, h + roof_h + 0.1, d / 2 + ov)], 0.1, kit.shade(roof, 0.8), "Gloss", 8, smooth_path=False)
        if chimney:
            m.box((w * 0.25, h + roof_h * 0.8, -d * 0.2), (0.34, roof_h * 0.9, 0.34), "brick", "Satin", 0.04)
            m.box((w * 0.25, h + roof_h * 1.27, -d * 0.2), (0.44, 0.1, 0.44), "stone", "Satin", 0.03)
        face_z = -d / 2 - 0.02 if back else d / 2 + 0.02
        rot_face = math.pi if back else 0.0
        with m.at(0, face_z, rot_face):
            if door_color:
                door(m, 0 if windows != 2 else 0, 0.0, 0.7, min(1.45, h * 0.62), door_color, trim)
            for f in range(floors):
                wy = h * (0.55 if floors == 1 else (0.3 + f * 0.42))
                if floors > 1 and f == 0 and door_color:
                    xs = [-w * 0.3, w * 0.3]
                else:
                    xs = [-w * 0.3, w * 0.3] if windows == 2 else ([0] if windows == 1 else [-w * 0.33, 0, w * 0.33])
                for wx in xs:
                    if floors == 1 and door_color and abs(wx) < 0.5:
                        continue
                    window(m, wx, wy + (0.15 if floors == 1 else 0), 0.0, 0.52, 0.6, trim, glow=glow, shutters=shutters)
    if solid:
        m.solid(x, z, w + 0.2, d + 0.2) if abs(math.sin(rot)) < 0.5 else m.solid(x, z, d + 0.2, w + 0.2)


def picket_fence(m, a, b, color="white", h=0.6, gap=None):
    """Fence from a to b (x,z); gap=(t0,t1) along the run leaves an opening."""
    a, b = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
    L = (b - a).length
    n = max(2, int(L / 0.28))
    dirv = (b - a).normalized()
    ang = math.atan2(dirv.x, dirv.z)
    for i in range(n + 1):
        t = i / n
        if gap and gap[0] < t < gap[1]:
            continue
        p = a.lerp(b, t)
        m.box((p.x, h / 2, p.z), (0.1, h, 0.06), color, "Satin", 0.025, rot=(0, ang, 0), taper=(0.6, 1.0))
    segs = [(0, 1)] if not gap else [(0, gap[0]), (gap[1], 1)]
    for t0, t1 in segs:
        p0, p1 = a.lerp(b, t0), a.lerp(b, t1)
        for y in (h * 0.35, h * 0.72):
            m.tube([(p0.x, y, p0.z), (p1.x, y, p1.z)], 0.03, kit.shade(color, 0.92), "Satin", 6, smooth_path=False)
        mid = (p0 + p1) / 2
        seglen = (p1 - p0).length
        w_ = abs(dirv.x) * seglen + 0.2
        d_ = abs(dirv.z) * seglen + 0.2
        m.solid(mid.x, mid.z, max(0.2, w_), max(0.2, d_))


def rail(m, a, b, color="white", h=0.8, post="white", solid=True):
    a, b = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
    L = (b - a).length
    n = max(1, int(L / 1.2))
    for i in range(n + 1):
        p = a.lerp(b, i / n)
        m.cyl((p.x, 0, p.z), 0.06, h, post, "Satin", 10, 0.02)
        m.sphere((p.x, h + 0.03, p.z), 0.08, post, "Satin", 10, 8)
    for y in (h * 0.45, h):
        m.tube([(a.x, y, a.z), (b.x, y, b.z)], 0.04, color, "Gloss", 8, smooth_path=False)
    if solid:
        mid = (a + b) / 2
        d = (b - a)
        m.solid(mid.x, mid.z, max(0.2, abs(d.x) + 0.15), max(0.2, abs(d.z) + 0.15))


def lamp(m, x, z, h=2.2, glow=True, color="iron", solid=True, part=None):
    m.cyl((x, 0, z), 0.12, 0.2, color, "Satin", 12, 0.03)
    m.cyl((x, 0.2, z), 0.055, h - 0.2, color, "Gloss", 10, 0.0)
    m.box((x, h + 0.2, z), (0.3, 0.36, 0.3), "ffd88a" if glow else "sky", "Glow_warm" if glow else "Glass", 0.04)
    m.lathe([(0.26, 0), (0.28, 0.04), (0.1, 0.18), (0, 0.22)], (x, h + 0.38, z), color, "Gloss", 12)
    m.cyl((x, h - 0.02, z), 0.2, 0.05, color, "Gloss", 12, 0.01)
    if solid:
        m.solid(x, z, 0.3, 0.3)


def bench(m, x, z, rot=0.0, color="wood", frame="iron", solid=True, w=1.5):
    with m.at(x, z, rot):
        for k in range(3):
            m.box((0, 0.48, -0.16 + k * 0.16), (w, 0.07, 0.13), color, "Satin", 0.025)
        for k in range(2):
            m.box((0, 0.72 + k * 0.2, -0.3), (w, 0.13, 0.06), color, "Satin", 0.025, rot=(-0.15, 0, 0))
        for s in (-1, 1):
            m.box((s * (w / 2 - 0.12), 0.24, 0), (0.08, 0.48, 0.42), frame, "Gloss", 0.03)
            m.box((s * (w / 2 - 0.12), 0.8, -0.32), (0.08, 0.6, 0.06), frame, "Gloss", 0.02)
    if solid:
        m.solid(x, z, w + 0.1, 0.7) if abs(math.sin(rot)) < 0.5 else m.solid(x, z, 0.7, w + 0.1)


def crate(m, x, z, s=0.5, color="wood_light", rot=0.0, y=0.0, solid=True):
    with m.at(x, z, rot, y=y):
        m.box((0, s / 2, 0), (s, s, s), color, "Satin", 0.04)
        for sx in (-1, 1):
            m.box((sx * s * 0.47, s / 2, 0), (0.05, s * 0.98, s * 1.02), kit.shade(color, 0.8), "Satin", 0.015)
        m.box((0, s / 2, s * 0.5), (s * 0.9, 0.06, 0.03), kit.shade(color, 0.8), "Satin", 0.01, rot=(0, 0, 0.75))
    if solid and y == 0:
        m.solid(x, z, s, s)


def barrel(m, x, z, s=0.45, color="wood", band="iron", solid=True):
    m.lathe([(0, 0), (s * 0.8, 0), (s * 0.95, s * 0.5), (s, s * 1.0), (s * 0.95, s * 1.5), (s * 0.8, s * 2.0), (0, s * 2.0)], (x, 0, z), color, "Satin", 18, jitter=0.03)
    for y in (0.35, 1.65):
        m.tube([(x + math.cos(a) * s * 0.93, y * s, z + math.sin(a) * s * 0.93) for a in (i * TAU / 16 for i in range(16))], 0.03, band, "Metal", 5, closed=True)
    if solid:
        m.solid(x, z, s * 2, s * 2)


def lifebuoy(m, x, y, z, r=0.3, rot=0.0):
    with m.at(x, z, rot, y=y):
        for k in range(4):
            a0, a1 = k * TAU / 4, (k + 1) * TAU / 4
            pts = [(math.cos(a0 + (a1 - a0) * i / 6) * r, math.sin(a0 + (a1 - a0) * i / 6) * r, 0) for i in range(7)]
            m.tube(pts, r * 0.3, "red" if k % 2 == 0 else "white", "Gloss", 10)


def umbrella(m, x, z, colors=("red", "white"), h=2.0, r=1.0):
    m.cyl((x, 0, z), 0.04, h, "white", "Satin", 8, 0)
    n = 8
    for k in range(n):
        a0, a1 = k * TAU / n, (k + 1) * TAU / n
        pts = [(x, h + 0.35, z), (x + math.cos(a0) * r, h - 0.05, z + math.sin(a0) * r), (x + math.cos(a1) * r, h - 0.05, z + math.sin(a1) * r)]
        m.quad(pts, colors[k % len(colors)], "Satin", double=True)
        m.sphere((x + math.cos((a0 + a1) / 2) * r * 0.97, h - 0.08, z + math.sin((a0 + a1) / 2) * r * 0.97), 0.07, colors[k % len(colors)], "Satin", 8, 6)


def awning(m, x, y, z, w, depth, colors=("red", "white"), stripes=6, rot=0.0, slope=0.35):
    with m.at(x, z, rot, y=y):
        sw = w / stripes
        for k in range(stripes):
            m.box((-w / 2 + sw * (k + 0.5), 0, depth / 2), (sw, 0.06, depth), colors[k % len(colors)], "Satin", 0.02, rot=(slope, 0, 0))
            m.sphere((-w / 2 + sw * (k + 0.5), -math.sin(slope) * depth - 0.02, depth * math.cos(slope)), (sw * 0.5, 0.13, 0.05),
                     colors[k % len(colors)], "Satin", 12, 8, clamp_top=0.0)


def stall(m, x, z, rot=0.0, colors=("red", "white"), counter="wood_light", goods=None, w=2.2, solid=True):
    with m.at(x, z, rot):
        m.box((0, 0.5, 0.2), (w, 1.0, 0.8), counter, "Satin", 0.06)
        m.box((0, 1.03, 0.25), (w + 0.1, 0.08, 0.95), kit.shade(counter, 0.8), "Satin", 0.03)
        m.box((0, 0.5, 0.61), (w - 0.2, 0.7, 0.02), colors[0], "Satin", 0.01)
        for sx in (-1, 1):
            m.cyl((sx * (w / 2 - 0.05), 0, -0.25), 0.05, 2.3, "white", "Satin", 8, 0)
            m.cyl((sx * (w / 2 - 0.05), 0, 0.55), 0.05, 2.0, "white", "Satin", 8, 0)
        m.box((0, 1.4, -0.3), (w, 1.9, 0.08), kit.shade(colors[0], 0.9), "Satin", 0.03)
        awning(m, 0, 2.3, -0.3, w + 0.2, 1.1, colors)
        if goods:
            goods(m)
    if solid:
        m.solid(x, z, w + 0.2, 1.3) if abs(math.sin(rot)) < 0.5 else m.solid(x, z, 1.3, w + 0.2)


def bunting(m, a, b, sag=0.5, colors=("red", "sun", "blue", "mint", "pink"), part=None):
    a, b = Vector(a), Vector(b)
    n = max(4, int((b - a).length / 0.45))
    pts = []
    for i in range(n + 1):
        t = i / n
        p = a.lerp(b, t)
        p.y -= sag * 4 * t * (1 - t)
        pts.append(p)
    m.tube(pts, 0.015, "white", "Satin", 5)
    for i in range(n):
        p0, p1 = pts[i], pts[i + 1]
        mid = (p0 + p1) / 2
        m.quad([tuple(p0 + (p1 - p0) * 0.1), tuple(p0 + (p1 - p0) * 0.9), tuple(mid + Vector((0, -0.34, 0)))], colors[i % len(colors)], "Satin", double=True, ao=False)


def string_lights(m, a, b, sag=0.5, colors=("Glow_warm",)):
    a, b = Vector(a), Vector(b)
    n = max(4, int((b - a).length / 0.5))
    pts = []
    for i in range(n + 1):
        t = i / n
        p = a.lerp(b, t)
        p.y -= sag * 4 * t * (1 - t)
        pts.append(p)
    m.tube(pts, 0.012, "ink", "Satin", 4)
    for i, p in enumerate(pts[1:-1]):
        m.sphere(tuple(p + Vector((0, -0.08, 0))), (0.07, 0.09, 0.07), "ffe2a0", colors[i % len(colors)], 8, 6, ao=False)


def kite(m, p, color="red", size=1.0, rot=(0, 0, 0), tail=True, name=None, accent="white", string_to=None, mat="Satin"):
    """Diamond kite with cross spars and a bow tail, optionally as an animated Sway_ node."""
    ctx = m.part(name, p) if name else None
    if ctx:
        ctx.__enter__()
    s = size
    with m.at(p[0], p[2], 0, y=p[1]):
        pts = [(0, 0.62 * s), (0.42 * s, 0.1 * s), (0, -0.62 * s), (-0.42 * s, 0.1 * s)]
        m.extrude(pts, -0.02 * s, 0.02 * s, color, mat, plane="xy", rot=rot)
        # two-tone panels
        m.extrude([(0, 0.62 * s), (0.42 * s, 0.1 * s), (0, 0.1 * s)], 0.021 * s, 0.03 * s, accent, mat, plane="xy", rot=rot)
        m.extrude([(0, -0.62 * s), (-0.42 * s, 0.1 * s), (0, 0.1 * s)], 0.021 * s, 0.03 * s, accent, mat, plane="xy", rot=rot)
        m.box((0, 0, 0.04 * s), (0.03 * s, 1.24 * s, 0.03 * s), "wood_dark", "Satin", 0.0, rot=rot)
        m.box((0, 0.1 * s, 0.04 * s), (0.84 * s, 0.03 * s, 0.03 * s), "wood_dark", "Satin", 0.0, rot=rot)
        if tail:
            from mathutils import Euler
            R = Euler(rot, "XYZ").to_matrix()
            tp = [R @ Vector((math.sin(i * 0.9) * 0.12 * s, -0.62 * s - i * 0.28 * s, 0)) for i in range(6)]
            m.tube([tuple(v) for v in tp], 0.012 * s, "white", "Satin", 4)
            bows = ("sun", "blue", "rose", "mint")
            for i, v in enumerate(tp[1:]):
                m.sphere(tuple(v), (0.08 * s, 0.045 * s, 0.03 * s), bows[i % 4], "Satin", 8, 5, ao=False)
    if ctx:
        ctx.__exit__()


def boat(m, x, z, rot=0.0, hull="red", deck="wood_light", cabin="white", size=1.0, mast=True, name=None, y=-0.18):
    ctx = m.part(name, (x, y, z)) if name else None
    if ctx:
        ctx.__enter__()
    with m.at(x, z, rot, y=y, s=size):
        m.sphere((0, 0.25, 0), (1.25, 0.45, 0.5), hull, "Gloss", 26, 14, clamp_top=0.18)
        m.sphere((0, 0.3, 0), (1.26, 0.2, 0.51), "white", "Gloss", 26, 8, clamp_top=0.1, clamp_bottom=-0.05)
        m.box((0, 0.46, 0), (2.0, 0.06, 0.72), deck, "Satin", 0.03)
        m.box((-0.3, 0.72, 0), (0.7, 0.5, 0.55), cabin, "Satin", 0.07)
        m.box((-0.3, 1.0, 0), (0.82, 0.08, 0.66), hull, "Gloss", 0.04)
        for sz in (-1, 1):
            m.box((-0.3, 0.76, sz * 0.28), (0.4, 0.2, 0.02), "sky", "Gloss", 0.01)
        if mast:
            m.cyl((0.35, 0.46, 0), 0.04, 1.8, "wood_dark", "Satin", 8, 0)
            m.extrude([(0.4, 0.7), (0.4, 2.1), (1.25, 0.72)], -0.015, 0.015, "white", "Satin", plane="xy")
            m.extrude([(0.3, 2.2), (0.3, 2.35), (-0.05, 2.28)], -0.01, 0.01, "sun", "Satin", plane="xy")
    if ctx:
        ctx.__exit__()


def lighthouse(m, x, z, h=6.0, stripe=("white", "red"), s=1.0, glow=True, beam=False, solid=True):
    with m.at(x, z, s=s):
        m.cyl((0, 0, 0), 1.25, 0.5, "stone", "Satin", 24, 0.06, jitter=0.03)
        bands = 5
        r0, r1 = 1.0, 0.68
        for k in range(bands):
            y0, y1 = 0.5 + (h - 0.5) * k / bands, 0.5 + (h - 0.5) * (k + 1) / bands
            ra = r0 + (r1 - r0) * k / bands
            rb = r0 + (r1 - r0) * (k + 1) / bands
            m.cyl((0, y0, 0), ra, y1 - y0, stripe[k % 2], "Gloss", 24, 0.0, r2=rb)
        m.cyl((0, h, 0), 1.0, 0.16, "ink", "Satin", 24, 0.04)
        pts = [(math.cos(a) * 0.95, h + 0.5, math.sin(a) * 0.95) for a in (i * TAU / 20 for i in range(20))]
        m.tube(pts, 0.035, "ink", "Gloss", 5, closed=True)
        for i in range(10):
            a = i * TAU / 10
            m.cyl((math.cos(a) * 0.95, h + 0.16, math.sin(a) * 0.95), 0.025, 0.34, "ink", "Satin", 5, 0)
        m.cyl((0, h + 0.16, 0), 0.55, 0.85, "fff2c4" if glow else "sky", "Glow_warm" if glow else "Glass", 16, 0.02)
        for i in range(6):
            a = i * TAU / 6
            m.cyl((math.cos(a) * 0.55, h + 0.16, math.sin(a) * 0.55), 0.03, 0.85, "ink", "Satin", 5, 0)
        m.lathe([(0.7, 0), (0.72, 0.05), (0.45, 0.4), (0.1, 0.6), (0, 0.75)], (0, h + 1.0, 0), stripe[1], "Gloss", 20)
        m.sphere((0, h + 1.8, 0), 0.1, "sun", "Metal", 10, 8)
        m.box((0, 0.95, 0.98), (0.55, 0.95, 0.1), "blue", "Gloss", 0.05)
        for k in range(2):
            m.box((0, 2.2 + k * 1.5, (r0 - 0.1 - k * 0.1)), (0.3, 0.42, 0.1), "sky", "Gloss", 0.04)
    if beam:
        with m.part("Spin_beam", (x, h * s + 0.55 * s, z)):
            for sgn in (-1, 1):
                m.lathe([(0.05, 0), (0.9, 7.5)], (x, h * s + 0.55 * s, z), "fff2c4", "Beam", 16,
                        rot=(0, 0, sgn * math.pi / 2), smooth=True, ao=False, cap=False)
    if solid:
        m.solid(x, z, 2.5 * s, 2.5 * s)


def cloud(m, x, y, z, s=1.0, name=None):
    ctx = m.part(name, (x, y, z)) if name else None
    if ctx:
        ctx.__enter__()
    for dx, dy, r in ((0, 0, 0.9), (0.9, -0.15, 0.7), (-0.9, -0.2, 0.65), (0.4, 0.4, 0.6), (-0.4, 0.3, 0.55)):
        m.sphere((x + dx * s, y + dy * s, z), (r * s, r * s * 0.8, r * s * 0.8), "ffffff", "Matte", 14, 10, ao=False)
    if ctx:
        ctx.__exit__()


def table(m, x, z, w=1.4, d=0.9, color="wood_light", rot=0.0, cloth=None, solid=True, h=0.78):
    with m.at(x, z, rot):
        m.box((0, h, 0), (w, 0.1, d), color, "Satin", 0.04)
        if cloth:
            m.box((0, h + 0.055, 0), (w * 0.7, 0.012, d + 0.1), cloth, "Satin", 0.005)
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.12)), 0.05, h, kit.shade(color, 0.8), "Satin", 8, 0, r2=0.04)
    if solid:
        m.solid(x, z, w, d) if abs(math.sin(rot)) < 0.5 else m.solid(x, z, d, w)


def chair(m, x, z, rot=0.0, color="blue", solid=False):
    with m.at(x, z, rot):
        m.box((0, 0.46, 0), (0.46, 0.07, 0.46), color, "Gloss", 0.03)
        m.box((0, 0.78, -0.2), (0.44, 0.5, 0.06), color, "Gloss", 0.03)
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * 0.18, 0, sz * 0.18), 0.03, 0.44, "white", "Satin", 6, 0)
    if solid:
        m.solid(x, z, 0.5, 0.5)


def shelf(m, x, z, w=1.4, h=1.8, color="wood", rot=0.0, items=True, seed=0, solid=True):
    rr = random.Random(seed)
    with m.at(x, z, rot):
        m.box((0, h / 2, 0), (w, h, 0.4), color, "Satin", 0.04)
        m.box((0, h / 2, 0.02), (w - 0.12, h - 0.12, 0.38), kit.shade(color, 0.7), "Satin", 0.02)
        for k in range(1, 4):
            y = h * k / 4
            m.box((0, y, 0.05), (w - 0.1, 0.05, 0.36), color, "Satin", 0.01)
            if items:
                xx = -w / 2 + 0.15
                while xx < w / 2 - 0.2:
                    bw = rr.uniform(0.06, 0.12)
                    bh = rr.uniform(0.22, 0.34)
                    c = rr.choice(("red", "blue", "sun", "mint", "purple", "coral", "teal"))
                    m.box((xx + bw / 2, y + bh / 2 + 0.025, 0.08), (bw, bh, 0.26), c, "Satin", 0.01, ao=False)
                    xx += bw + 0.01
    if solid:
        m.solid(x, z, w, 0.5) if abs(math.sin(rot)) < 0.5 else m.solid(x, z, 0.5, w)


def rug(m, x, z, r=2.0, rings=("sun", "coral", "white", "teal", "sun"), y=0.01):
    n = len(rings)
    for i, c in enumerate(rings):
        rr_ = r * (1 - i / n)
        m.cyl((x, y + i * 0.004, z), rr_, 0.02, c, "Matte", 40, 0.0, ao=True)


def potted_plant(m, x, z, s=1.0, pot="coral", leaf="leaf", solid=True):
    with m.at(x, z, s=s):
        m.lathe([(0, 0), (0.22, 0), (0.3, 0.42), (0.34, 0.46), (0.3, 0.5), (0, 0.48)], (0, 0, 0), pot, "Gloss", 18)
        for i in range(5):
            a = i * TAU / 5
            m.sphere((math.cos(a) * 0.18, 0.75 + (i % 2) * 0.12, math.sin(a) * 0.18), (0.22, 0.3, 0.14), leaf, "Satin", 12, 8, rot=(0, -a, 0.4), jitter=0.05)
        m.sphere((0, 0.95, 0), 0.22, leaf, "Satin", 12, 8)
    if solid:
        m.solid(x, z, 0.6 * s, 0.6 * s)


def room(m, w, d, h, wall="wall_yellow", wain="wall_cream", trim="white", floor_y=0.0, win_back=(), win_left=(), stripes=None,
         win_w=1.1, win_h=1.3, glow=False, view_glass="sky", thickness=0.3):
    """Cutaway room: back wall (z=-d/2) and left wall (x=-w/2). Windows are x (back) / z (left) centres."""
    t = thickness

    def wall_run(length, openings, build):
        # split a wall into solid pieces around window openings (positions along the run)
        pos = -length / 2
        for c in sorted(openings) + [None]:
            end = (c - win_w / 2 - 0.08) if c is not None else length / 2
            if end > pos:
                build(pos, end, 0, h)
            if c is not None:
                build(c - win_w / 2 - 0.08, c + win_w / 2 + 0.08, 0, 1.0)
                build(c - win_w / 2 - 0.08, c + win_w / 2 + 0.08, 1.0 + win_h + 0.16, h)
                pos = c + win_w / 2 + 0.08

    def back(a, b, y0, y1):
        m.box(((a + b) / 2, (y0 + y1) / 2, -d / 2 - t / 2), (b - a, y1 - y0, t), wall, "Satin", 0.02)

    def left(a, b, y0, y1):
        m.box((-w / 2 - t / 2, (y0 + y1) / 2, (a + b) / 2), (t, y1 - y0, b - a), wall, "Satin", 0.02)

    wall_run(w, list(win_back), back)
    wall_run(d, list(win_left), left)
    # corner post and top caps
    m.box((-w / 2 - t / 2, h / 2, -d / 2 - t / 2), (t, h, t), wall, "Satin", 0.02)
    m.box((0 - t / 2, h + 0.06, -d / 2 - t / 2), (w + t + 0.1, 0.12, t + 0.1), trim, "Satin", 0.03)
    m.box((-w / 2 - t / 2, h + 0.06, 0), (t + 0.1, 0.12, d + 0.1), trim, "Satin", 0.03)
    # wainscot + skirting + dado rail
    m.box((0, 0.45, -d / 2 + 0.02), (w, 0.9, 0.05), wain, "Satin", 0.01)
    m.box((-w / 2 + 0.02, 0.45, 0), (0.05, 0.9, d), wain, "Satin", 0.01)
    m.box((0, 0.93, -d / 2 + 0.05), (w, 0.07, 0.08), trim, "Satin", 0.02)
    m.box((-w / 2 + 0.05, 0.93, 0), (0.08, 0.07, d), trim, "Satin", 0.02)
    m.box((0, 0.07, -d / 2 + 0.05), (w, 0.14, 0.07), trim, "Satin", 0.02)
    m.box((-w / 2 + 0.05, 0.07, 0), (0.07, 0.14, d), trim, "Satin", 0.02)
    if stripes:
        k = 0
        x = -w / 2 + 0.3
        while x < w / 2 - 0.2:
            if not any(abs(x - c) < win_w / 2 + 0.15 for c in win_back):
                m.box((x, 0.95 + (h - 0.95) / 2, -d / 2 + 0.005), (0.12, h - 0.95, 0.02), stripes, "Satin", 0.0, ao=False)
            x += 0.6
        z = -d / 2 + 0.3
        while z < d / 2 - 0.2:
            if not any(abs(z - c) < win_w / 2 + 0.15 for c in win_left):
                m.box((-w / 2 + 0.005, 0.95 + (h - 0.95) / 2, z), (0.02, h - 0.95, 0.12), stripes, "Satin", 0.0, ao=False)
            z += 0.6
    for c in win_back:
        window(m, c, 1.08 + win_h / 2, -d / 2 - t / 2, win_w, win_h, trim, glass=view_glass, glow=glow, depth=t + 0.06, cross=True)
    for c in win_left:
        window(m, -w / 2 - t / 2, 1.08 + win_h / 2, c, win_w, win_h, trim, glass=view_glass, glow=glow, rot=math.pi / 2, depth=t + 0.06)
