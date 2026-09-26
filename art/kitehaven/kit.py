"""Kitehaven art kit: toy-diorama primitives, vertex-colour materials, baked AO, GLB export.

Everything is authored in *game space* (x right, y up, z toward the camera) and converted
to Blender space only when a mesh is created. Colour lives in a corner colour attribute
named ``Col`` so a whole diorama needs only a handful of materials (and draw calls):
the material decides how a surface reflects light, the vertex colour decides its hue.
Ambient occlusion is ray-traced once at build time and multiplied into those colours.

Runtime contract (see src/world.ts):
- Recolourable materials: Skin, Hair, Top, Bottom, Shoes, Accent, Kite.
- Animated nodes: Spin_*, Sway_*, Bob_*, Flag_* (world.ts animates them by prefix).
- Characters: Head, Eyes, ArmL, ArmR, LegL, LegR pivots; Hair_* / Acc_* are toggled.
"""
import bpy
import bmesh
import colorsys
import json
import math
import random
from pathlib import Path
from mathutils import Matrix, Vector, Euler
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "models"
LOW = False  # set by build.py for the phone variants

G2B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

# Vivid, warm palette (sRGB hex). Named so scenes stay consistent.
PAL = {
    # nature
    "grass": "5cc24a", "grass2": "7fd65a", "grass_dark": "3f9a3a", "leaf": "46b04a", "leaf2": "8ad64e",
    "leaf_dark": "2f8a3c", "trunk": "8a5230", "soil": "7a4a2a", "sand": "f5d48f", "sand2": "ecc37a",
    "rock": "9aa3b5", "rock2": "7d869c", "cliff": "c98a5a", "cliff2": "a86a45",
    "sea": "1aa6d8", "sea_deep": "0e6fb3", "sea_night": "0b2a4a", "foam": "e8fbff",
    # built
    "cream": "fff1d6", "white": "fffaf0", "wood": "c9793e", "wood2": "b8692f", "wood_dark": "7f4524",
    "wood_light": "e3a765", "plank": "d98f4e", "plank2": "c77d3f", "brick": "e0663f", "brick2": "c9542f",
    "stone": "c8c0b0", "stone2": "aea593", "slate": "4f5a74", "metal": "a8b3c4", "iron": "3b4256",
    "tarmac": "5b6378", "tarmac2": "667089",
    # accents
    "red": "ee3b3b", "coral": "ff6a4d", "orange": "ff9a2e", "sun": "ffc234", "lemon": "ffe14d",
    "lime": "a6e22e", "mint": "5fe0b7", "teal": "1fb8a8", "sky": "5cc8ff", "blue": "2f7de1",
    "navy": "213a8f", "ink": "1d2340", "purple": "8c5cf0", "lilac": "c49bff", "pink": "ff8fb1",
    "rose": "ff5f8f", "peach": "ffb48a", "black": "1a1a24", "eye": "20182a",
    "wall_yellow": "ffd75e", "wall_blue": "7cc6ff", "wall_pink": "ff9fb0", "wall_mint": "8ee6c4",
    "wall_cream": "ffe9c4", "wall_peach": "ffbe8f", "wall_lilac": "c9b3ff",
    "roof_red": "e8483b", "roof_blue": "2e7bd6", "roof_teal": "1fa89c", "roof_orange": "f07a2a",
    "roof_purple": "7a55d6",
}


def srgb_to_linear(c):
    return c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(color):
    """Accept a palette key, hex string or (r,g,b) in sRGB 0..1; return sRGB tuple."""
    if isinstance(color, (tuple, list)):
        return tuple(color[:3])
    h = PAL.get(color, color)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def shade(color, value=1.0, sat=1.0, hue=0.0):
    r, g, b = rgb(color)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return colorsys.hsv_to_rgb((h + hue) % 1, min(1, s * sat), min(1, v * value))


# Physical materials. Recolourable ones keep a neutral default factor.
MATERIALS = {
    "Matte": dict(rough=0.86),
    "Satin": dict(rough=0.52),
    "Gloss": dict(rough=0.24, coat=0.0),
    "Metal": dict(rough=0.32, metal=1.0),
    "Glass": dict(rough=0.06, alpha=0.42),
    "Water": dict(rough=0.08),
    "Glow_warm": dict(emit="ffc861", strength=3.0),
    "Glow_white": dict(emit="fff6e0", strength=3.0),
    "Glow_cyan": dict(emit="7ff0ff", strength=3.0),
    "Glow_red": dict(emit="ff4d3d", strength=3.0),
    "Glow_pink": dict(emit="ff7ab8", strength=3.0),
    "Glow_green": dict(emit="7dff8a", strength=3.0),
    "Beam": dict(emit="fff2c4", strength=2.0, alpha=0.18),
    "Skin": dict(rough=0.5, base="f2b98f"),
    "Hair": dict(rough=0.3, base="5a3a2a"),
    "Top": dict(rough=0.6, base="2f7de1"),
    "Bottom": dict(rough=0.62, base="213a8f"),
    "Shoes": dict(rough=0.35, base="ee3b3b"),
    "Accent": dict(rough=0.45, base="ffc234"),
    "Kite": dict(rough=0.4, base="ee3b3b"),
}
RECOLOUR = {"Skin", "Hair", "Top", "Bottom", "Shoes", "Accent", "Kite"}
_mat_cache = {}


def material(name):
    if name in _mat_cache and _mat_cache[name].name == name:
        return _mat_cache[name]
    spec = MATERIALS[name]
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    p.inputs["Roughness"].default_value = spec.get("rough", 0.5)
    p.inputs["Metallic"].default_value = spec.get("metal", 0.0)
    if "base" in spec:
        p.inputs["Base Color"].default_value = (*[srgb_to_linear(c) for c in rgb(spec["base"])], 1)
    else:
        attr = nt.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        nt.links.new(attr.outputs["Color"], p.inputs["Base Color"])
    if "emit" in spec:
        p.inputs["Emission Color"].default_value = (*[srgb_to_linear(c) for c in rgb(spec["emit"])], 1)
        p.inputs["Emission Strength"].default_value = spec.get("strength", 1.0)
    if "alpha" in spec:
        p.inputs["Alpha"].default_value = spec["alpha"]
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    m.diffuse_color = (*[srgb_to_linear(c) for c in rgb(spec.get("base", "ffffff"))], 1)
    _mat_cache[name] = m
    return m


class Accum:
    __slots__ = ("verts", "faces", "cols", "smooth", "ao", "_loop_ao")

    def __init__(self):
        self.verts, self.faces, self.cols, self.smooth, self.ao = [], [], [], [], []
        self._loop_ao = None


class Part:
    def __init__(self, name, pivot, parent):
        self.name, self.pivot, self.parent = name, Vector(pivot), parent
        self.mats = {}
        self.ao = True


def _mat(p=(0, 0, 0), rot=None, scale=(1, 1, 1)):
    m = Matrix.Translation(Vector(p))
    if rot:
        m = m @ Euler(rot, "XYZ").to_matrix().to_4x4()
    s = Matrix.Diagonal((*scale, 1))
    return m @ s


class Model:
    """A GLB under construction. Geometry is accumulated per (part, material)."""

    def __init__(self, name, ao=True, ao_distance=1.1, ao_strength=0.62, seed=7):
        self.name = name
        self.parts = {"root": Part("root", (0, 0, 0), None)}
        self.current = "root"
        self.ao, self.ao_distance, self.ao_strength = ao, ao_distance, ao_strength
        self.rng = random.Random(seed)
        self.colliders, self.anchors = [], {}
        self.extra = {}
        self.xf = Matrix.Identity(4)
        self.tag = None  # variant tag applied to colliders/anchors (e.g. workplace variants)

    def at(self, x=0.0, z=0.0, rot=0.0, y=0.0, s=1.0):
        """Author a piece in local space: translate, rotate about Y, uniform scale."""
        return _XF(self, Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, "Y") @ Matrix.Scale(s, 4))

    def variant(self, tag):
        return _Tag(self, tag)

    def world(self, x, y, z):
        return self.xf @ Vector((x, y, z))

    # ---- structure -------------------------------------------------------
    def part(self, name, pivot=(0, 0, 0), parent=None, ao=None):
        if name not in self.parts:
            self.parts[name] = Part(name, self.xf @ Vector(pivot), parent or self.current)
            if ao is not None:
                self.parts[name].ao = ao
        return _PartScope(self, name)

    def solid(self, x, z, w, d):
        """Walk blocker (local x,z centre and w,d size) stored as a world-space AABB."""
        pts = [self.xf @ Vector((x + sx * w / 2, 0, z + sz * d / 2)) for sx in (-1, 1) for sz in (-1, 1)]
        x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
        z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
        c = dict(x=round((x0 + x1) / 2, 3), z=round((z0 + z1) / 2, 3), w=round(x1 - x0, 3), d=round(z1 - z0, 3))
        if self.tag:
            c["variant"] = self.tag
        self.colliders.append(c)

    def anchor(self, name, x, z, facing=0.0, y=None):
        p = self.xf @ Vector((x, 0, z))
        a = dict(x=round(p.x, 3), z=round(p.z, 3), facing=round(facing, 3))
        if y is not None:
            a["y"] = round(y, 3)
        self.anchors[name] = a

    # ---- colour ----------------------------------------------------------
    def _colour(self, color, jitter):
        r, g, b = rgb(color)
        if jitter:
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            v = min(1, max(0, v * (1 + self.rng.uniform(-jitter, jitter))))
            h = (h + self.rng.uniform(-jitter, jitter) * 0.04) % 1
            r, g, b = colorsys.hsv_to_rgb(h, s, v)
        return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)

    # ---- core append -----------------------------------------------------
    def _append(self, bm, M, color, mat, jitter=0.0, smooth_all=None, smooth_faces=None, ao=True, colors=None):
        M = self.xf @ M
        acc = self.parts[self.current].mats.setdefault(mat, Accum())
        base = len(acc.verts)
        bm.verts.index_update()
        for v in bm.verts:
            acc.verts.append(M @ v.co)
        per_face = jitter and jitter > 0
        solid = self._colour(color, 0) if not per_face else None
        for i, f in enumerate(bm.faces):
            acc.faces.append(tuple(base + v.index for v in f.verts))
            if colors is not None:
                acc.cols.append(colors(f, M))
            else:
                acc.cols.append(self._colour(color, jitter) if per_face else solid)
            if smooth_all is not None:
                acc.smooth.append(smooth_all)
            else:
                acc.smooth.append(bool(smooth_faces and f in smooth_faces))
            acc.ao.append(ao)
        bm.free()

    # ---- primitives (all positions in game space) ------------------------
    def box(self, p, s, color, mat="Satin", bevel=0.05, seg=2, rot=None, jitter=0.0, ao=True, taper=None):
        if LOW:
            seg = min(seg, 1)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co.x *= s[0]
            v.co.y *= s[1]
            v.co.z *= s[2]
            if taper and v.co.y > 0:
                v.co.x *= taper[0]
                v.co.z *= taper[1]
        new_faces = set()
        b = min(bevel, min(s) * 0.45) if bevel else 0
        if b > 0.0005:
            res = bmesh.ops.bevel(bm, geom=list(bm.edges), offset=b, segments=max(1, seg), profile=0.5,
                                  affect="EDGES", clamp_overlap=True)
            new_faces = set(res["faces"])
        self._append(bm, _mat(p, rot), color, mat, jitter, smooth_faces=new_faces if seg > 1 else set(), ao=ao)

    def sphere(self, p, r, color, mat="Satin", seg=18, rings=12, rot=None, ao=True, jitter=0.0, detail=False, clamp_top=None, clamp_bottom=None):
        if detail and LOW:
            return
        if LOW:
            seg, rings = max(8, seg // 2), max(5, rings // 2)
        if isinstance(r, (int, float)):
            r = (r, r, r)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
        for v in bm.verts:
            v.co = Vector((v.co.x * r[0], v.co.z * r[1], v.co.y * r[2]))
            if clamp_top is not None and v.co.y > clamp_top:
                v.co.y = clamp_top
            if clamp_bottom is not None and v.co.y < clamp_bottom:
                v.co.y = clamp_bottom
        bm.normal_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        self._append(bm, _mat(p, rot), color, mat, jitter, smooth_all=True, ao=ao)

    def lathe(self, profile, p, color, mat="Satin", seg=20, rot=None, smooth=True, ao=True, cap=True, jitter=0.0):
        """Revolve [(radius, y)] around +Y. Zero radius makes a pole."""
        if LOW:
            seg = max(8, seg // 2)
        bm = bmesh.new()
        rows = []
        for radius, y in profile:
            if radius <= 1e-6:
                rows.append([bm.verts.new((0, y, 0))])
            else:
                rows.append([bm.verts.new((radius * math.cos(a), y, -radius * math.sin(a)))
                             for a in (i * math.tau / seg for i in range(seg))])
        for r0, r1 in zip(rows, rows[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                a0, a1 = r0[i % len(r0)], r0[j % len(r0)]
                b0, b1 = r1[i % len(r1)], r1[j % len(r1)]
                vs = [a0, a1, b1, b0]
                uniq = []
                for v in vs:
                    if v not in uniq:
                        uniq.append(v)
                if len(uniq) >= 3:
                    try:
                        bm.faces.new(uniq)
                    except ValueError:
                        pass
        if cap:
            for row, top in ((rows[0], False), (rows[-1], True)):
                if len(row) > 2:
                    try:
                        f = bm.faces.new(row if top else list(reversed(row)))
                    except ValueError:
                        pass
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        self._append(bm, _mat(p, rot), color, mat, jitter, smooth_all=smooth, ao=ao)

    def cyl(self, p, r, h, color, mat="Satin", seg=20, bevel=0.03, r2=None, rot=None, ao=True, jitter=0.0):
        """Cylinder standing on p (base centre), axis +Y, with rounded rims."""
        r2 = r if r2 is None else r2
        b = min(bevel, r * 0.4, h * 0.3) if bevel else 0
        if b > 0 and not LOW:
            prof = [(0, 0), (r - b, 0), (r - b * 0.3, b * 0.1), (r, b), (r2, h - b), (r2 - b * 0.3, h - b * 0.1), (r2 - b, h), (0, h)]
        else:
            prof = [(0, 0), (r, 0), (r2, h), (0, h)]
        self.lathe(prof, p, color, mat, seg, rot, smooth=True, ao=ao, cap=False, jitter=jitter)

    def capsule(self, a, b, r, color, mat="Satin", seg=14, r2=None, ao=True):
        a, b = Vector(a), Vector(b)
        r2 = r if r2 is None else r2
        axis = b - a
        L = axis.length
        steps = 3 if LOW else 5
        prof = []
        for i in range(steps + 1):
            t = -math.pi / 2 + (math.pi / 2) * i / steps
            prof.append((r * math.cos(t), r * math.sin(t)))
        for i in range(steps + 1):
            t = (math.pi / 2) * i / steps
            prof.append((r2 * math.cos(t), L + r2 * math.sin(t)))
        prof[0] = (0, -r)
        prof[-1] = (0, L + r2)
        rot = Vector((0, 1, 0)).rotation_difference(axis.normalized()).to_euler("XYZ") if L > 1e-6 else None
        self.lathe(prof, a, color, mat, seg, rot, smooth=True, ao=ao, cap=False)

    def tube(self, pts, r, color, mat="Satin", seg=8, closed=False, ao=True, smooth_path=True, r_end=None):
        pts = [Vector(p) for p in pts]
        if smooth_path and len(pts) > 2:
            pts = _catmull(pts, 4 if not LOW else 2, closed)
        if LOW:
            seg = max(5, seg // 2)
        n = len(pts)
        bm = bmesh.new()
        rings = []
        # parallel transport frame
        t0 = (pts[1] - pts[0]).normalized()
        up = Vector((0, 1, 0)) if abs(t0.y) < 0.9 else Vector((1, 0, 0))
        nrm = t0.cross(up).normalized()
        for i, p in enumerate(pts):
            if closed:
                t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
            else:
                t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            nrm = (nrm - t * nrm.dot(t)).normalized()
            bin_ = t.cross(nrm)
            rr = r if r_end is None else r + (r_end - r) * i / max(1, n - 1)
            rings.append([bm.verts.new(p + (nrm * math.cos(a) + bin_ * math.sin(a)) * rr)
                          for a in (k * math.tau / seg for k in range(seg))])
        count = n if closed else n - 1
        for i in range(count):
            r0, r1 = rings[i], rings[(i + 1) % n]
            for k in range(seg):
                kk = (k + 1) % seg
                bm.faces.new((r0[k], r0[kk], r1[kk], r1[k]))
        if not closed:
            bm.faces.new(list(reversed(rings[0])))
            bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        self._append(bm, Matrix.Identity(4), color, mat, 0, smooth_all=True, ao=ao)

    def extrude(self, poly, z0, z1, color, mat="Satin", plane="xy", p=(0, 0, 0), rot=None, bevel=0.0, jitter=0.0, ao=True):
        """Extrude a 2D polygon. plane='xy': poly in (x,y), extruded along z from z0..z1.
        plane='xz': poly in (x,z) on the ground, extruded along y from z0..z1."""
        bm = bmesh.new()
        if plane == "xy":
            vs = [bm.verts.new((x, y, z0)) for x, y in poly]
        else:
            vs = [bm.verts.new((x, z0, z)) for x, z in poly]
        f = bm.faces.new(vs)
        bmesh.ops.recalc_face_normals(bm, faces=[f])
        ext = bmesh.ops.extrude_face_region(bm, geom=[f])
        d = Vector((0, 0, z1 - z0)) if plane == "xy" else Vector((0, z1 - z0, 0))
        bmesh.ops.translate(bm, vec=d, verts=[e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        new_faces = set()
        if bevel and not LOW:
            res = bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
            new_faces = set(res["faces"])
        self._append(bm, _mat(p, rot), color, mat, jitter, smooth_faces=new_faces, ao=ao)

    def grid(self, p, w, d, color, mat="Matte", step=0.3, jitter=0.0, heights=None, ao=True, colors=None, shape=None):
        """Subdivided ground patch (top face only), so baked AO has vertices to land on."""
        nx, nz = max(1, round(w / step)), max(1, round(d / step))
        bm = bmesh.new()
        rows = []
        for j in range(nz + 1):
            row = []
            for i in range(nx + 1):
                x = -w / 2 + w * i / nx
                z = -d / 2 + d * j / nz
                if shape:
                    x, z = shape(x, z)
                y = heights(p[0] + x, p[2] + z) if heights else 0
                row.append(bm.verts.new((x, y, z)))
            rows.append(row)
        for j in range(nz):
            for i in range(nx):
                bm.faces.new((rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            if f.normal.y < 0:
                f.normal_flip()
        self._append(bm, _mat(p), color, mat, jitter, smooth_all=heights is not None, ao=ao, colors=colors)

    def disc(self, p, r, color, mat="Matte", seg=32, y_scale=None, ao=True, rot=None):
        bm = bmesh.new()
        c = bm.verts.new((0, 0, 0))
        ring = [bm.verts.new((r * math.cos(a), 0, -r * math.sin(a) * (y_scale or 1))) for a in (i * math.tau / seg for i in range(seg))]
        for i in range(seg):
            bm.faces.new((c, ring[i], ring[(i + 1) % seg]))
        for f in bm.faces:
            f.normal_update()
            if f.normal.y < 0:
                f.normal_flip()
        self._append(bm, _mat(p, rot), color, mat, 0, smooth_all=False, ao=ao)

    def rock(self, p, r, color, mat="Satin", seed=0, rough=0.22, rot=None, ao=True):
        """Faceted stylised boulder."""
        if isinstance(r, (int, float)):
            r = (r, r, r)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1 if LOW else 2, radius=1.0)
        rr = random.Random(seed)
        for v in bm.verts:
            k = 1 + rr.uniform(-rough, rough)
            v.co = Vector((v.co.x * r[0] * k, max(-0.35, v.co.z) * r[1] * k, v.co.y * r[2] * k))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        self._append(bm, _mat(p, rot), color, mat, 0.05, smooth_all=False, ao=ao)

    def col(self, color, jitter=0.0):
        return self._colour(color, jitter)

    def quad(self, corners, color, mat="Matte", ao=True, double=False):
        bm = bmesh.new()
        vs = [bm.verts.new(c) for c in corners]
        bm.faces.new(vs)
        if double:
            bm.faces.new([bm.verts.new(c) for c in reversed(corners)])
        self._append(bm, Matrix.Identity(4), color, mat, 0, smooth_all=False, ao=ao)

    # ---- export ------------------------------------------------------------
    def build(self, reset=True, offset=(0, 0, 0)):
        """Create Blender objects; returns the root empty."""
        if reset:
            reset_scene()
        if self.ao and not LOW_SKIP_AO:
            import time as _t
            t0 = _t.time()
            self._bake_ao()
            st = getattr(self, "_ao_stats", [])
            n = sum(s[0] for s in st)
            if n:
                print(f"AO {self.name}: {n} verts, mean {sum(s[0]*s[1] for s in st)/n:.3f}, min {min(s[2] for s in st):.3f}, {_t.time()-t0:.1f}s", flush=True)
        objs = {}
        root = bpy.data.objects.new(self.name, None)
        bpy.context.collection.objects.link(root)
        root.location = G2B @ Vector(offset)
        objs["root"] = root
        order = sorted(self.parts.values(), key=lambda p: _depth(self, p))
        for part in order:
            if part.name == "root":
                continue
            e = bpy.data.objects.new(part.name, None)
            bpy.context.collection.objects.link(e)
            parent = self.parts[part.parent]
            e.parent = objs[parent.name]
            e.location = G2B @ (part.pivot - parent.pivot)
            e.empty_display_size = 0.1
            objs[part.name] = e
        for part in order:
            for mat, acc in part.mats.items():
                if not acc.faces:
                    continue
                me = bpy.data.meshes.new(f"{part.name}_{mat}")
                verts = [G2B @ (v - part.pivot) for v in acc.verts]
                me.from_pydata([tuple(v) for v in verts], [], acc.faces)
                me.update()
                me.polygons.foreach_set("use_smooth", acc.smooth)
                attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
                flat = []
                for poly, col in zip(me.polygons, acc.cols):
                    for li in poly.loop_indices:
                        c = col if not isinstance(col, list) else col[li - poly.loop_start]
                        flat.extend(c)
                # apply AO per loop if baked
                if getattr(acc, "_loop_ao", None) is not None:
                    lao = acc._loop_ao
                    for i in range(len(me.loops)):
                        k = lao[i]
                        flat[i * 4] *= k
                        flat[i * 4 + 1] *= k
                        flat[i * 4 + 2] *= k
                attr.data.foreach_set("color", flat)
                me.materials.append(material(mat))
                ob = bpy.data.objects.new(f"{part.name}_{mat}" if part.name != "root" else f"{self.name}_{mat}", me)
                bpy.context.collection.objects.link(ob)
                ob.parent = objs[part.name]
        return root

    def _bake_ao(self):
        """Distance-weighted hemisphere occlusion per vertex, written per loop later."""
        all_v, all_f = [], []
        for part in self.parts.values():
            for acc in part.mats.values():
                b = len(all_v)
                all_v.extend(acc.verts)
                all_f.extend(tuple(b + i for i in f) for f in acc.faces)
        if not all_f:
            return
        tree = BVHTree.FromPolygons(all_v, all_f, all_triangles=False, epsilon=0.0)
        K = 8 if LOW else 14
        rng = random.Random(3)
        dirs = []
        for i in range(K):
            u, v = (i + 0.5) / K, rng.random()
            r = math.sqrt(u)
            th = math.tau * v
            dirs.append((r * math.cos(th), math.sqrt(max(0, 1 - u)), r * math.sin(th)))
        D, S = self.ao_distance, self.ao_strength
        self._ao_stats = []
        for part in self.parts.values():
            for acc in part.mats.values():
                n = len(acc.verts)
                normals = [Vector((0, 0, 0)) for _ in range(n)]
                for f in acc.faces:
                    a, b, c = acc.verts[f[0]], acc.verts[f[1]], acc.verts[f[2]]
                    fn = (b - a).cross(c - a)
                    for i in f:
                        normals[i] += fn
                occ = [1.0] * n
                used = set()
                for fi, f in enumerate(acc.faces):
                    if acc.ao[fi] and part.ao:
                        used.update(f)
                cache = {}
                for i in used:
                    nn = normals[i]
                    if nn.length < 1e-9:
                        continue
                    nn = nn.normalized()
                    key = (round(acc.verts[i].x, 3), round(acc.verts[i].y, 3), round(acc.verts[i].z, 3),
                           round(nn.x, 1), round(nn.y, 1), round(nn.z, 1))
                    if key in cache:
                        occ[i] = cache[key]
                        continue
                    t = Vector((1, 0, 0)) if abs(nn.x) < 0.9 else Vector((0, 0, 1))
                    tx = nn.cross(t).normalized()
                    tz = nn.cross(tx)
                    origin = acc.verts[i] + nn * 0.012
                    hit = 0.0
                    for dx, dy, dz in dirs:
                        d = tx * dx + nn * dy + tz * dz
                        loc, _, _, dist = tree.ray_cast(origin, d, D)
                        if loc is not None:
                            hit += 1.0 - (dist / D) ** 0.7
                    val = 1.0 - S * (hit / K)
                    occ[i] = val
                    cache[key] = val
                if used:
                    vals = [occ[i] for i in used]
                    self._ao_stats.append((len(used), sum(vals) / len(vals), min(vals)))
                # expand per loop (faces are listed in loop order)
                loops = []
                for f in acc.faces:
                    loops.extend(occ[i] for i in f)
                acc._loop_ao = loops

    def export(self, folder=None, draco=True):
        folder = Path(folder or (OUT / "low" if LOW else OUT))
        folder.mkdir(parents=True, exist_ok=True)
        root = self.build()
        path = folder / f"{self.name}.glb"
        bpy.ops.object.select_all(action="DESELECT")
        kw = dict(filepath=str(path), export_format="GLB", export_yup=True, export_apply=True,
                  export_texcoords=False, export_normals=True, export_vertex_color="NAME",
                  export_vertex_color_name="Col", export_all_vertex_colors=False,
                  export_extras=False, export_cameras=False, export_lights=False,
                  export_draco_mesh_compression_enable=draco,
                  export_draco_mesh_compression_level=7,
                  export_draco_position_quantization=15,
                  export_draco_normal_quantization=10,
                  export_draco_color_quantization=10)
        bpy.ops.export_scene.gltf(**kw)
        tris = sum(len(f) - 2 for part in self.parts.values() for acc in part.mats.values() for f in acc.faces)
        meshes = sum(1 for part in self.parts.values() for acc in part.mats.values() if acc.faces)
        info = dict(bytes=path.stat().st_size, triangles=tris, meshes=meshes)
        print("KITEHAVEN_ASSET", self.name, "low" if LOW else "full", info, flush=True)
        return info


LOW_SKIP_AO = False


class _XF:
    def __init__(self, model, m):
        self.model, self.m = model, m

    def __enter__(self):
        self.prev = self.model.xf
        self.model.xf = self.prev @ self.m
        return self.model

    def __exit__(self, *a):
        self.model.xf = self.prev


class _Tag:
    def __init__(self, model, tag):
        self.model, self.tag = model, tag

    def __enter__(self):
        self.prev = self.model.tag
        self.model.tag = self.tag
        return self.model

    def __exit__(self, *a):
        self.model.tag = self.prev


class _PartScope:
    def __init__(self, model, name):
        self.model, self.name = model, name

    def __enter__(self):
        self.prev = self.model.current
        self.model.current = self.name
        return self.model

    def __exit__(self, *a):
        self.model.current = self.prev


def _depth(model, part):
    d = 0
    while part.parent:
        part = model.parts[part.parent]
        d += 1
    return d


def _catmull(pts, sub, closed):
    out = []
    n = len(pts)
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[i - 1] if (closed or i > 0) else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(pts[-1])
    return out


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mat_cache.clear()


# ---------------------------------------------------------------------------
# Preview rendering (review only; never shipped)
# ---------------------------------------------------------------------------
def render_preview(path, target=(0, 0.6, 0), distance=26.0, lens=50, size=(1280, 800), direction=(10, 14, 18),
                   sky=("bfe8ff", "fff4d8"), sun=1.0):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    world = bpy.data.worlds.new("Preview") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (*[srgb_to_linear(c) for c in rgb(sky[0])], 1)
    bg.inputs["Strength"].default_value = 0.9
    d = Vector(direction).normalized()
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    t = Vector(target)
    cam.location = G2B @ (t + d * distance)
    look = (G2B @ t) - cam.location
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    key = bpy.data.lights.new("Key", "SUN")
    key.energy = 3.2 * sun
    key.color = (1.0, 0.93, 0.82)
    key.angle = math.radians(8)
    k = bpy.data.objects.new("Key", key)
    scene.collection.objects.link(k)
    k.rotation_euler = (G2B @ Vector((-5, 12, 6))).to_track_quat("Z", "Y").to_euler()
    fill = bpy.data.lights.new("Fill", "SUN")
    fill.energy = 0.9 * sun
    fill.color = (0.78, 0.88, 1.0)
    f = bpy.data.objects.new("Fill", fill)
    scene.collection.objects.link(f)
    f.rotation_euler = (G2B @ Vector((6, 7, -5))).to_track_quat("Z", "Y").to_euler()
    scene.render.filepath = str(path)
    try:
        scene.eevee.taa_render_samples = 32
    except Exception:
        pass
    bpy.ops.render.render(write_still=True)
