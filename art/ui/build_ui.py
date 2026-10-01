"""Kitehaven UI art: toy-style 3D icons and the title emblem, rendered headless in Blender.

The icons match the dioramas: puffy extruded shapes and bevelled primitives in the game's
warm palette, soft studio light, and an ink outline (inverted hull) that echoes the ink
borders of the HTML interface. Text never goes into the art (the UI is translated), so
buttons stay HTML and only pictures come from here.

    blender --background --factory-startup --python art/ui/build_ui.py [-- --only heart,sun] [-- --samples 64]

Writes PNGs to art/ui/out/; scripts/ui-art.py converts them to WebP in public/ui/.
"""
import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art" / "ui" / "out"
OUT.mkdir(parents=True, exist_ok=True)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ONLY = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None
SAMPLES = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 96

PAL = {
    "red": "ee3b3b", "coral": "ff6a4d", "orange": "ff9a2e", "sun": "ffc234", "lemon": "ffe14d",
    "lime": "a6e22e", "mint": "5fe0b7", "teal": "1fb8a8", "sky": "5cc8ff", "blue": "2f7de1",
    "navy": "213a8f", "ink": "1d2340", "purple": "8c5cf0", "lilac": "c49bff", "pink": "ff8fb1",
    "rose": "ff5f8f", "peach": "ffb48a", "cream": "fff1d6", "white": "fffaf0", "wood": "c9793e",
    "wood_dark": "7f4524", "wood_light": "e3a765", "grass": "5cc24a", "leaf": "46b04a",
    "soil": "8a5230", "gold": "ffb81c", "slate": "4f5a74", "glass": "bfe8ff", "sea": "1aa6d8",
    "sea_deep": "0e6fb3", "paper": "fff6e3",
}


def lin(h):
    h = PAL.get(h, h)
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x < 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)


# ---------------------------------------------------------------------------
# scene
# ---------------------------------------------------------------------------
def reset():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for x in list(coll):
            coll.remove(x)


def setup(size=256, scale=2.7, tilt=16):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices:
                        d.use = d.type == kind
                    sc.cycles.device = "GPU"
                    break
            except TypeError:
                continue
    except Exception:
        pass
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.82, 0.86, 1.0, 1)
    bg.inputs[1].default_value = 0.55
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = scale
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    t = math.radians(tilt)
    cam.location = (0, -12 * math.cos(t), 12 * math.sin(t))
    cam.rotation_euler = (math.pi / 2 - t, 0, 0)
    sc.camera = cam

    def area(name, loc, energy, color, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.color = color
        ld.size = size
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        direction = -Vector(loc)
        ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(ob)

    area("key", (-4.5, -6.5, 6.5), 900, (1.0, 0.94, 0.86), 5)
    area("fill", (6.5, -5, 0.5), 260, (0.82, 0.88, 1.0), 6)
    area("rim", (1.5, 7, 5), 700, (1.0, 0.92, 0.85), 4)


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------
_mats = {}


def mat(color, rough=0.42, metal=0.0, coat=0.25, emit=0.0, transmit=0.0):
    key = (color, rough, metal, coat, emit, transmit)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f"m_{color}_{len(_mats)}")
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = lin(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.15
    if emit:
        b.inputs["Emission Color"].default_value = lin(color)
        b.inputs["Emission Strength"].default_value = emit
    if transmit:
        b.inputs["Transmission Weight"].default_value = transmit
    _mats[key] = m
    return m


def outline_mat():
    if "outline" in _mats:
        return _mats["outline"]
    m = bpy.data.materials.new("outline")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = lin("ink")
    em.inputs[1].default_value = 1.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    # The flipped shell shows only where it peeks out around the silhouette, and only to the
    # camera: to every other ray (shadows, bounces) it is glass, so it never darkens the icon.
    path = nt.nodes.new("ShaderNodeLightPath")
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(path.outputs["Is Camera Ray"], inv.inputs[1])
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MAXIMUM"
    nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
    nt.links.new(inv.outputs[0], mx.inputs[1])
    nt.links.new(mx.outputs[0], mix.inputs[0])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    _mats["outline"] = m
    return m


# ---------------------------------------------------------------------------
# geometry helpers (Blender space: x right, z up, the camera looks along +y)
# ---------------------------------------------------------------------------
PARTS = []


def _register(ob, material, bevel=0.0, smooth=True, outline=True):
    ob.data.materials.append(material)
    ob["bevel"] = bevel
    ob["smooth"] = smooth
    ob["outline"] = outline
    PARTS.append(ob)
    return ob


def round_polygon(pts, r, seg=6):
    """Fillet every corner (convex or concave) so a bevel can never fold into a spike."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % n])
        a, b = p0 - p1, p2 - p1
        la, lb = a.length, b.length
        if la < 1e-6 or lb < 1e-6:
            continue
        a.normalize()
        b.normalize()
        theta = math.acos(max(-1.0, min(1.0, a.dot(b))))
        if theta > math.radians(172):
            out.append(tuple(p1))
            continue
        t = r / math.tan(theta / 2)
        t = min(t, 0.45 * min(la, lb))
        rr = t * math.tan(theta / 2)
        t1, t2 = p1 + a * t, p1 + b * t
        bis = (a + b).normalized()
        c = p1 + bis * (rr / math.sin(theta / 2))
        a1 = math.atan2(t1.y - c.y, t1.x - c.x)
        a2 = math.atan2(t2.y - c.y, t2.x - c.x)
        d = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
        for k in range(seg + 1):
            ang = a1 + d * k / seg
            out.append((c.x + rr * math.cos(ang), c.y + rr * math.sin(ang)))
    return out


def puff(points, color, depth=0.22, bevel=0.1, at=(0, 0, 0), y=0.0, holes=(), m=None, outline=True, rot=0.0):
    """A puffy extruded 2D shape standing up, facing the camera. points are (x, z) pairs."""
    cu = bpy.data.curves.new("puff", "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = depth
    cu.bevel_depth = bevel
    cu.bevel_resolution = 5
    cu.resolution_u = 12
    # the bevel grows inward, so the silhouette is the drawn shape
    cu.offset = -bevel
    points = round_polygon(points, bevel * 1.35)
    holes = [round_polygon(h, bevel * 1.35) for h in holes]
    for loop in (points, *holes):
        sp = cu.splines.new("POLY")
        sp.points.add(len(loop) - 1)
        for i, (x, z) in enumerate(loop):
            sp.points[i].co = (x, z, 0, 1)
        sp.use_cyclic_u = True
    ob = bpy.data.objects.new("puff", cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.curves.remove(cu)
    me.transform(Matrix.Rotation(math.pi / 2, 4, "X"))  # curve y → up, extrusion → toward camera
    me.transform(Matrix.Rotation(rot, 4, "Y"))
    me.transform(Matrix.Translation((at[0], y + at[1], at[2])))
    obj = bpy.data.objects.new("puff", me)
    bpy.context.scene.collection.objects.link(obj)
    return _register(obj, m or mat(color), 0.0, True, outline)


def prim(kind, color, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), bevel=0.06, m=None, outline=True, **kw):
    ops = {
        "cube": bpy.ops.mesh.primitive_cube_add,
        "sphere": bpy.ops.mesh.primitive_uv_sphere_add,
        "cyl": bpy.ops.mesh.primitive_cylinder_add,
        "cone": bpy.ops.mesh.primitive_cone_add,
        "torus": bpy.ops.mesh.primitive_torus_add,
    }
    if kind == "sphere":
        kw.setdefault("segments", 48)
        kw.setdefault("ring_count", 24)
    if kind in ("cyl", "cone"):
        kw.setdefault("vertices", 48)
    if kind == "torus":
        kw.setdefault("major_segments", 64)
        kw.setdefault("minor_segments", 20)
    ops[kind](location=loc, rotation=rot, **kw)
    ob = bpy.context.active_object
    ob.scale = scale
    if kind in ("sphere", "torus"):
        bevel = 0.0
    return _register(ob, m or mat(color), bevel, True, outline)


def circle(r, n=64, cx=0.0, cz=0.0, start=0.0):
    return [(cx + r * math.cos(start + 2 * math.pi * i / n), cz + r * math.sin(start + 2 * math.pi * i / n)) for i in range(n)]


def arc_tube(r, a0, a1, thick, color, at=(0, 0, 0), y=0.0, m=None):
    """A bent tube along a circular arc in the facing plane."""
    n = 24
    pts = [(at[0] + r * math.cos(a0 + (a1 - a0) * i / n), at[2] + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    return tube(pts, thick, color, y=y + at[1], m=m)


def tube(pts, thick, color, y=0.0, m=None, outline=True):
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = thick
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, (x, z) in enumerate(pts):
        sp.points[i].co = (x, y, z, 1)
    ob = bpy.data.objects.new("tube", cu)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.curves.remove(cu)
    obj = bpy.data.objects.new("tube", me)
    bpy.context.scene.collection.objects.link(obj)
    return _register(obj, m or mat(color), 0.0, True, outline)


def eyes_smile(cx, cz, y, s=1.0):
    """The characters' face: two glossy eyes with a glint and a small smile."""
    for dx in (-0.16, 0.16):
        prim("sphere", "ink", (cx + dx * s, y, cz + 0.04 * s), (0.055 * s, 0.03 * s, 0.075 * s), m=mat("ink", 0.15, coat=1), outline=False)
        prim("sphere", "white", (cx + dx * s + 0.018 * s, y - 0.03 * s, cz + 0.07 * s), (0.018 * s,) * 3, m=mat("white", emit=2.0), outline=False)
    arc_tube(0.12 * s, math.radians(200), math.radians(340), 0.018 * s, "ink", at=(cx, 0, cz - 0.06 * s), y=y, m=mat("ink", 0.3))
    for dx in (-0.3, 0.3):
        prim("sphere", "pink", (cx + dx * s, y + 0.01, cz - 0.07 * s), (0.07 * s, 0.02 * s, 0.045 * s), m=mat("rose", 0.6, coat=0), outline=False)


# ---------------------------------------------------------------------------
# finishing: normalise size, bake transforms, bevel, outline
# ---------------------------------------------------------------------------
def finish(fit=2.0, outline=0.045, center=True):
    if not PARTS:
        return
    dg = bpy.context.evaluated_depsgraph_get()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in PARTS:
        for v in ob.data.vertices:
            w = ob.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    size = max(hi.x - lo.x, hi.z - lo.z)
    k = fit / size
    mid = (lo + hi) / 2
    shift = Matrix.Translation((-mid.x, -mid.y, -mid.z)) if center else Matrix.Identity(4)
    M = Matrix.Scale(k, 4) @ shift
    for ob in PARTS:
        ob.data.transform(M @ ob.matrix_world)
        ob.matrix_world = Matrix.Identity(4)
        for p in ob.data.polygons:
            p.use_smooth = ob["smooth"]
        if ob["bevel"]:
            b = ob.modifiers.new("bevel", "BEVEL")
            b.width = ob["bevel"] * k
            b.segments = 4
            b.limit_method = "ANGLE"
            b.harden_normals = False
            ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = False
        if ob["outline"] and outline:
            ob.data.materials.append(outline_mat())
            s = ob.modifiers.new("outline", "SOLIDIFY")
            s.thickness = outline
            s.offset = 1
            s.use_flip_normals = True
            s.use_rim = False
            s.material_offset = len(ob.data.materials) - 1
    del dg


def render(name):
    path = OUT / f"{name}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name)


# ---------------------------------------------------------------------------
# shapes
# ---------------------------------------------------------------------------
def heart_pts(s=1.0, n=96):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * s, z / 17 * s))
    # drop the near-duplicate points at the dip and the tip; round_polygon rounds them
    out = []
    for p in pts:
        if not out or math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) > 0.02 * s:
            out.append(p)
    return out


def star_pts(r1, r2, n=5, cx=0.0, cz=0.0, rot=math.pi / 2):
    return [(cx + (r1 if i % 2 == 0 else r2) * math.cos(rot + math.pi * i / n), cz + (r1 if i % 2 == 0 else r2) * math.sin(rot + math.pi * i / n)) for i in range(2 * n)]


def rounded_rect(w, h, r, cx=0.0, cz=0.0, n=8):
    pts = []
    for (sx, sz, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ccx, ccz = cx + sx * (w / 2 - r), cz + sz * (h / 2 - r)
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((ccx + r * math.cos(a), ccz + r * math.sin(a)))
    return pts


def kite(cx=0.0, cz=0.0, s=1.0, main="red", panel="sun", y=0.0, tail=True):
    top, right, bot, left = (cx, cz + 0.62 * s), (cx + 0.44 * s, cz + 0.1 * s), (cx, cz - 0.62 * s), (cx - 0.44 * s, cz + 0.1 * s)
    mid = (cx, cz + 0.1 * s)
    puff([left, top, right, bot], main, depth=0.05 * s, bevel=0.035 * s, y=y)
    puff([mid, top, right], panel, depth=0.02 * s, bevel=0.02 * s, y=y - 0.07 * s, outline=False)
    puff([mid, bot, left], panel, depth=0.02 * s, bevel=0.02 * s, y=y - 0.07 * s, outline=False)
    tube([top, bot], 0.018 * s, "wood_dark", y=y - 0.1 * s, outline=False)
    tube([left, right], 0.018 * s, "wood_dark", y=y - 0.1 * s, outline=False)
    if tail == "curl":
        pts = [(cx + 0.11 * i * s, cz - 0.62 * s - 0.1 * i * s + math.sin(i * 1.3) * 0.04 * s) for i in range(6)]
        tube(pts, 0.014 * s, "white", y=y, outline=False)
        for i, c in enumerate(("sun", "blue", "rose", "mint")):
            x, z = pts[i + 1]
            prim("sphere", c, (x, y, z), (0.08 * s, 0.04 * s, 0.05 * s))
    elif tail:
        pts = [(cx + math.sin(i * 0.9) * 0.1 * s, cz - 0.62 * s - i * 0.16 * s) for i in range(6)]
        tube(pts, 0.012 * s, "white", y=y, outline=False)
        for i, c in enumerate(("sun", "blue", "rose", "mint")):
            x, z = pts[i + 1]
            prim("sphere", c, (x, y, z), (0.07 * s, 0.035 * s, 0.04 * s))


# ---------------------------------------------------------------------------
# the icons
# ---------------------------------------------------------------------------
def icon_health():
    puff(heart_pts(1.0), "red", depth=0.28, bevel=0.16)
    prim("sphere", "white", (-0.42, -0.5, 0.42), (0.13, 0.05, 0.09), m=mat("white", emit=1.5), outline=False)


def icon_joy():
    ray_pts = star_pts(1.05, 0.66, 10, rot=0)
    puff(ray_pts, "orange", depth=0.12, bevel=0.06, y=0.12)
    puff(circle(0.66), "sun", depth=0.26, bevel=0.16)
    eyes_smile(0, 0.02, -0.46, 1.3)


def icon_savings():
    for i, (dx, dz) in enumerate(((0.28, -0.1), (-0.22, 0.12))):
        y = 0.25 - i * 0.35
        prim("cyl", "gold", (dx, y, dz), (0.72, 0.72, 0.16), (math.pi / 2, 0, 0), bevel=0.05, m=mat("gold", 0.28, 0.75, coat=0.4))
        prim("torus", "gold", (dx, y - 0.16, dz), (1, 1, 0.5), (math.pi / 2, 0, 0), m=mat("gold", 0.25, 0.8), major_radius=0.52, minor_radius=0.045, outline=False)
        puff(star_pts(0.26, 0.11), "orange", depth=0.03, bevel=0.03, at=(dx, 0, dz), y=y - 0.2, m=mat("sun", 0.3, 0.6), outline=False)


def icon_journal():
    prim("cube", "cream", (0.06, 0.08, 0), (0.62, 0.2, 0.82), bevel=0.04, m=mat("paper", 0.7, coat=0))
    prim("cube", "coral", (0, -0.06, 0), (0.66, 0.08, 0.88), bevel=0.06)
    prim("cube", "coral", (-0.64, 0.05, 0), (0.08, 0.2, 0.88), bevel=0.05)
    puff(heart_pts(0.36), "sun", depth=0.05, bevel=0.04, at=(0.02, 0, 0.12), y=-0.2)
    prim("cube", "teal", (0.38, 0.0, -0.92), (0.07, 0.03, 0.2), bevel=0.02)


def icon_goto():
    pts = [p for p in circle(0.62, 80, 0, 0.35) if p[1] > 0.0] + [(0.0, -0.95)]
    pts.sort(key=lambda p: math.atan2(p[1] - 0.2, p[0]))
    puff(pts, "coral", depth=0.26, bevel=0.14)
    puff(circle(0.26, 48, 0, 0.35), "white", depth=0.05, bevel=0.05, y=-0.34)


def icon_kite():
    kite(0, 0.2, 1.35, tail="curl")


def icon_album():
    prim("cube", "white", (0.25, 0.25, 0.1), (0.62, 0.06, 0.72), (0, math.radians(12), 0), bevel=0.04, m=mat("paper", 0.6, coat=0))
    prim("cube", "white", (-0.12, -0.05, -0.05), (0.66, 0.06, 0.76), (0, math.radians(-8), 0), bevel=0.04, m=mat("paper", 0.6, coat=0))
    prim("cube", "sky", (-0.12 + 0.02, -0.14, 0.08), (0.52, 0.02, 0.48), (0, math.radians(-8), 0), bevel=0.01, outline=False)
    puff([(-0.62, -0.3), (-0.3, 0.05), (0.02, -0.16), (0.36, 0.14), (0.4, -0.3)], "grass", depth=0.02, bevel=0.02, y=-0.2, outline=False, rot=math.radians(-8))
    prim("sphere", "sun", (0.16, -0.2, 0.36), (0.1, 0.03, 0.1), m=mat("sun", emit=0.8), outline=False)


def icon_settings():
    pts = []
    teeth = 10
    for i in range(teeth * 4):
        a = 2 * math.pi * i / (teeth * 4)
        r = 1.0 if (i % 4) in (1, 2) else 0.76
        pts.append((r * math.cos(a), r * math.sin(a)))
    puff(pts, "teal", depth=0.26, bevel=0.1, holes=[circle(0.32, 48)[::-1]])
    prim("torus", "mint", (0, -0.3, 0), (1, 1, 0.6), (math.pi / 2, 0, 0), major_radius=0.5, minor_radius=0.05, outline=False, m=mat("mint", 0.35))


def icon_pause():
    for dx in (-0.36, 0.36):
        puff(rounded_rect(0.44, 1.5, 0.18, dx, 0), "navy", depth=0.22, bevel=0.1)


def icon_play():
    puff([(-0.55, 0.75), (0.8, 0.0), (-0.55, -0.75)], "sun", depth=0.24, bevel=0.14)


def icon_sound():
    puff([(-0.9, 0.3), (-0.5, 0.3), (0.0, 0.72), (0.0, -0.72), (-0.5, -0.3), (-0.9, -0.3)], "navy", depth=0.24, bevel=0.1)
    arc_tube(0.4, math.radians(-45), math.radians(45), 0.07, "sun", at=(0.05, 0, 0))
    arc_tube(0.72, math.radians(-45), math.radians(45), 0.07, "sun", at=(0.05, 0, 0))


def icon_music():
    m = mat("purple", 0.35)
    prim("sphere", "purple", (-0.45, 0, -0.55), (0.3, 0.2, 0.22), (0, math.radians(-25), 0), m=m)
    prim("sphere", "purple", (0.45, 0, -0.35), (0.3, 0.2, 0.22), (0, math.radians(-25), 0), m=m)
    prim("cube", "purple", (-0.2, 0, 0.1), (0.05, 0.05, 0.62), bevel=0.03, m=m)
    prim("cube", "purple", (0.7, 0, 0.3), (0.05, 0.05, 0.62), bevel=0.03, m=m)
    prim("cube", "purple", (0.25, 0, 0.82), (0.5, 0.07, 0.11), (0, math.radians(-12), 0), bevel=0.04, m=m)


def icon_language():
    prim("sphere", "blue", (0, 0, 0), (0.85, 0.85, 0.85), m=mat("sea", 0.3, coat=0.6))
    for lat in (-0.45, 0.0, 0.45):
        r = math.sqrt(max(0.0, 0.86 ** 2 - lat ** 2))
        prim("torus", "cream", (0, 0, lat), (1, 1, 1), major_radius=r, minor_radius=0.035, outline=False, m=mat("white", 0.4))
    for rz in (0, 60, 120):
        prim("torus", "cream", (0, 0, 0), (1, 1, 1), (math.pi / 2, 0, math.radians(rz)), major_radius=0.86, minor_radius=0.035, outline=False, m=mat("white", 0.4))
    puff([(-0.5, 0.3), (-0.1, 0.55), (0.15, 0.2), (-0.2, -0.1), (-0.45, 0.0)], "grass", depth=0.02, bevel=0.03, y=-0.86, outline=False)
    puff([(0.2, -0.2), (0.55, -0.05), (0.5, -0.5), (0.2, -0.6)], "grass", depth=0.02, bevel=0.03, y=-0.8, outline=False)


def icon_chapter():
    prim("cube", "ink", (0, 0, -0.25), (0.85, 0.12, 0.55), bevel=0.05, m=mat("ink", 0.4))
    board = [(-0.85, 0.34), (0.85, 0.34), (0.85, 0.6), (-0.85, 0.6)]
    puff(board, "white", depth=0.1, bevel=0.03, rot=math.radians(-14))
    for i in range(4):
        x0 = -0.75 + i * 0.42
        puff([(x0, 0.36), (x0 + 0.2, 0.36), (x0 + 0.32, 0.58), (x0 + 0.12, 0.58)], "ink", depth=0.02, bevel=0.01, y=-0.14, outline=False, rot=math.radians(-14))
    puff(star_pts(0.22, 0.1, 5, 0, -0.22), "sun", depth=0.04, bevel=0.03, y=-0.2)


def icon_people():
    for dx, c, h in ((-0.42, "blue", 1.0), (0.42, "coral", 0.9)):
        prim("sphere", c, (dx, 0, -0.45 * h), (0.42, 0.34, 0.5), )
        prim("sphere", "peach", (dx, -0.05, 0.28 * h), (0.3, 0.3, 0.3), m=mat("peach", 0.5))
        for ex in (-0.1, 0.1):
            prim("sphere", "ink", (dx + ex, -0.33, 0.3 * h), (0.035, 0.02, 0.05), m=mat("ink", 0.15, coat=1), outline=False)


def icon_keepsakes():
    prim("cube", "mint", (0, 0, -0.25), (0.75, 0.6, 0.55), bevel=0.06)
    prim("cube", "teal", (0, 0, 0.36), (0.82, 0.66, 0.14), bevel=0.05)
    prim("cube", "coral", (0, -0.03, -0.1), (0.16, 0.66, 0.72), bevel=0.03, outline=False)
    for s in (-1, 1):
        prim("torus", "coral", (s * 0.22, 0, 0.62), (1, 0.5, 0.8), (0, math.radians(90 + s * 30), 0), major_radius=0.22, minor_radius=0.07)


def icon_paths():
    prim("cyl", "wood", (0, 0, -0.15), (0.08, 0.08, 1.0), bevel=0.02)
    puff([(-0.1, 0.52), (0.62, 0.52), (0.86, 0.33), (0.62, 0.14), (-0.1, 0.14)], "sun", depth=0.12, bevel=0.05, y=-0.1)
    puff([(0.1, 0.02), (-0.62, 0.02), (-0.86, -0.17), (-0.62, -0.36), (0.1, -0.36)], "teal", depth=0.12, bevel=0.05, y=-0.1)
    prim("sphere", "grass", (0, 0, -1.05), (0.5, 0.35, 0.14))


def icon_story():
    prim("cube", "paper", (0, 0, 0), (0.6, 0.04, 0.72), bevel=0.02, m=mat("paper", 0.7, coat=0))
    for z in (0.78, -0.78):
        prim("cyl", "wood", (0, 0, z), (0.1, 0.1, 0.72), (0, math.pi / 2, 0), bevel=0.02)
        for s in (-1, 1):
            prim("sphere", "wood_dark", (s * 0.76, 0, z), (0.12, 0.12, 0.12))
    for i, w in enumerate((0.8, 0.9, 0.7, 0.85)):
        prim("cube", "ink", (-0.05 + (w - 0.85) * 0.3, -0.06, 0.4 - i * 0.24), (0.42 * w, 0.01, 0.025), bevel=0, outline=False, m=mat("ink", 0.5))


def icon_customise():
    pal = [(math.cos(2 * math.pi * i / 64) * 0.95, math.sin(2 * math.pi * i / 64) * 0.72) for i in range(64)]
    puff(pal, "wood_light", depth=0.14, bevel=0.06, holes=[circle(0.14, 32, -0.5, -0.25)[::-1]])
    for (x, z, c) in ((-0.35, 0.36, "red"), (0.1, 0.46, "sun"), (0.52, 0.28, "blue"), (0.55, -0.2, "grass"), (0.12, -0.4, "purple")):
        prim("sphere", c, (x, -0.2, z), (0.17, 0.08, 0.14), m=mat(c, 0.25, coat=0.8), outline=False)
    prim("cyl", "wood_dark", (0.95, -0.4, -0.55), (0.06, 0.06, 0.55), (0, math.radians(40), 0), bevel=0.02)
    prim("cone", "rose", (0.62, -0.4, -0.15), (0.1, 0.1, 0.18), (0, math.radians(40 + 180), 0), bevel=0.0)


def icon_newlife():
    prim("sphere", "soil", (0, 0, -0.62), (0.8, 0.5, 0.36))
    tube([(0, -0.35), (0.02, 0.0), (-0.04, 0.35)], 0.06, "leaf")
    leaf = [(0, 0), (0.25, 0.2), (0.62, 0.22), (0.4, -0.05), (0.1, -0.08)]
    puff(leaf, "grass", depth=0.06, bevel=0.06, at=(0, 0, 0.3))
    puff([(-x, z) for x, z in leaf], "lime", depth=0.06, bevel=0.06, at=(-0.04, 0, 0.42))


def icon_graphics():
    m = mat("lilac", 0.12, coat=1.0)
    prim("cone", "lilac", (0, 0, -0.1), (0.8, 0.8, 0.7), (math.pi, 0, 0), bevel=0.0, m=m, vertices=8, radius1=1, depth=1)
    prim("cyl", "lilac", (0, 0, 0.45), (0.8, 0.8, 0.08), bevel=0.0, m=m, vertices=8)
    for o in PARTS[-2:]:
        o["smooth"] = False
    puff(star_pts(0.34, 0.1, 4), "sun", depth=0.05, bevel=0.03, at=(0.72, 0, 0.72), y=-0.5)
    puff(star_pts(0.2, 0.06, 4), "white", depth=0.04, bevel=0.02, at=(-0.78, 0, 0.3), y=-0.5)


def icon_textsize():
    prim("torus", "sun", (-0.15, 0, 0.2), (1, 1, 1), (math.pi / 2, 0, 0), major_radius=0.58, minor_radius=0.12)
    prim("cyl", "glass", (-0.15, 0.02, 0.2), (0.56, 0.56, 0.04), (math.pi / 2, 0, 0), bevel=0.0, m=mat("glass", 0.05, coat=1, transmit=0.6), outline=False)
    prim("cyl", "coral", (0.52, 0, -0.5), (0.13, 0.13, 0.42), (0, math.radians(45), 0), bevel=0.04)


def icon_camera():
    prim("cube", "coral", (0, 0, -0.1), (0.95, 0.4, 0.62), bevel=0.14)
    prim("cube", "ink", (-0.5, 0, 0.58), (0.22, 0.3, 0.1), bevel=0.04, m=mat("ink", 0.4))
    prim("cyl", "ink", (0.05, -0.45, -0.1), (0.46, 0.46, 0.14), (math.pi / 2, 0, 0), bevel=0.04, m=mat("ink", 0.35))
    prim("cyl", "glass", (0.05, -0.56, -0.1), (0.3, 0.3, 0.05), (math.pi / 2, 0, 0), bevel=0.0, m=mat("sea", 0.05, coat=1), outline=False)
    prim("sphere", "white", (-0.02, -0.62, 0.0), (0.07, 0.02, 0.07), m=mat("white", emit=2), outline=False)
    prim("cube", "sun", (0.62, -0.1, 0.52), (0.18, 0.2, 0.08), bevel=0.03)


def icon_motion():
    prim("sphere", "orange", (0.2, 0, 0.2), (0.62, 0.45, 0.62))
    arc_tube(0.36, 0, 2 * math.pi * 0.9, 0.05, "sun", at=(0.2, 0, 0.2), y=-0.42)
    arc_tube(0.16, 0, 2 * math.pi * 0.8, 0.04, "sun", at=(0.22, 0, 0.22), y=-0.44)
    prim("sphere", "lime", (-0.2, 0, -0.45), (0.95, 0.35, 0.22))
    for dx in (-0.85, -0.65):
        tube([(dx, -0.35), (dx - 0.08, 0.1)], 0.035, "lime")
        prim("sphere", "ink", (dx - 0.08, 0, 0.12), (0.07, 0.07, 0.07), m=mat("ink", 0.2, coat=1))


def icon_pace():
    shoe = [(-0.95, -0.3), (-0.95, 0.25), (-0.55, 0.45), (-0.2, 0.2), (0.35, 0.12), (0.85, -0.05), (0.95, -0.3)]
    puff(shoe, "blue", depth=0.36, bevel=0.12)
    puff([(-1.0, -0.3), (1.0, -0.3), (1.0, -0.5), (-1.0, -0.5)], "white", depth=0.4, bevel=0.08, y=0.0)
    for i in range(3):
        prim("cube", "white", (-0.35 + i * 0.2, -0.42, 0.24 - i * 0.06), (0.1, 0.02, 0.025), (0, math.radians(-20), 0), bevel=0.01, outline=False)
    puff(star_pts(0.14, 0.06, 5, 0.55, 0.02), "sun", depth=0.02, bevel=0.02, y=-0.44, outline=False)


def icon_home():
    puff([(-0.72, -0.8), (0.72, -0.8), (0.72, 0.1), (-0.72, 0.1)], "cream", depth=0.3, bevel=0.06)
    puff([(-0.98, 0.05), (0.0, 0.92), (0.98, 0.05)], "red", depth=0.42, bevel=0.1, y=0.02)
    puff(rounded_rect(0.36, 0.56, 0.14, 0, -0.52), "blue", depth=0.04, bevel=0.03, y=-0.32)
    prim("sphere", "sun", (0.1, -0.42, -0.52), (0.04,) * 3, outline=False)


def icon_restart():
    icon_newlife()


def icon_close():
    for a in (45, -45):
        puff(rounded_rect(0.34, 1.7, 0.16), "coral", depth=0.2, bevel=0.1, rot=math.radians(a))


def icon_trophy():
    m = mat("gold", 0.25, 0.8, coat=0.4)
    prim("cyl", "gold", (0, 0, 0.3), (0.6, 0.6, 0.45), m=m, bevel=0.08, radius=1, depth=1)
    for s in (-1, 1):
        prim("torus", "gold", (s * 0.62, 0, 0.35), (0.7, 1, 1), (math.pi / 2, 0, 0), m=m, major_radius=0.25, minor_radius=0.07)
    prim("cyl", "gold", (0, 0, -0.35), (0.14, 0.14, 0.3), m=m, bevel=0.03)
    prim("cube", "wood_dark", (0, 0, -0.75), (0.5, 0.3, 0.14), bevel=0.05)
    puff(star_pts(0.22, 0.1), "white", depth=0.03, bevel=0.03, at=(0, 0, 0.32), y=-0.62, m=mat("white", emit=0.6))


def icon_flower():
    for i in range(5):
        a = math.pi / 2 + 2 * math.pi * i / 5
        puff(circle(0.34, 48, 0.46 * math.cos(a), 0.3 + 0.46 * math.sin(a)), "rose", depth=0.14, bevel=0.08)
    prim("sphere", "sun", (0, -0.2, 0.3), (0.3, 0.16, 0.3))
    tube([(0.0, -0.15), (0.06, -0.55), (0.0, -1.0)], 0.06, "leaf")
    puff([(0.04, -0.6), (0.4, -0.4), (0.62, -0.5), (0.36, -0.72)], "grass", depth=0.06, bevel=0.05)


def icon_lantern():
    puff(rounded_rect(0.9, 1.1, 0.18, 0, -0.1), "lemon", depth=0.4, bevel=0.1, m=mat("lemon", 0.3, emit=1.6))
    for dx in (-0.46, 0.46):
        prim("cube", "navy", (dx, -0.3, -0.1), (0.07, 0.07, 0.58), bevel=0.03)
    prim("sphere", "orange", (0, -0.42, -0.15), (0.16, 0.1, 0.24), m=mat("orange", 0.3, emit=3.0), outline=False)
    puff([(-0.62, 0.45), (0.62, 0.45), (0.36, 0.78), (-0.36, 0.78)], "navy", depth=0.5, bevel=0.06)
    puff(rounded_rect(1.3, 0.2, 0.08, 0, -0.74), "navy", depth=0.5, bevel=0.06)
    arc_tube(0.32, 0.15, math.pi - 0.15, 0.05, "navy", at=(0, 0, 0.8))


def icon_star():
    puff(star_pts(1.0, 0.48), "sun", depth=0.26, bevel=0.12)
    eyes_smile(0, -0.02, -0.4, 1.15)


def icon_ticket():
    puff(rounded_rect(1.9, 1.05, 0.16), "coral", depth=0.12, bevel=0.05, rot=math.radians(-12))
    puff(rounded_rect(1.5, 0.66, 0.1), "cream", depth=0.04, bevel=0.03, y=-0.12, rot=math.radians(-12), outline=False)
    puff(star_pts(0.22, 0.1, 5, 0.38, 0.04), "sun", depth=0.04, bevel=0.02, y=-0.18, rot=math.radians(-12))
    for i in range(4):
        prim("cube", "ink", (-0.55 + i * 0.16, -0.18, 0.13 - i * 0.034), (0.05, 0.01, 0.018), (0, math.radians(-12), 0), bevel=0, outline=False, m=mat("ink", 0.5))


def icon_toyboat():
    puff([(-1.0, -0.2), (1.0, -0.2), (0.7, -0.62), (-0.7, -0.62)], "red", depth=0.42, bevel=0.08)
    puff(rounded_rect(1.6, 0.12, 0.05, 0, -0.28), "white", depth=0.44, bevel=0.03, outline=False)
    tube([(0.0, -0.22), (0.0, 0.95)], 0.045, "wood_dark")
    puff([(0.08, 0.9), (0.08, -0.05), (0.8, -0.05)], "white", depth=0.06, bevel=0.04)
    puff([(-0.08, 0.7), (-0.08, 0.02), (-0.6, 0.02)], "sun", depth=0.06, bevel=0.04)
    puff([(-1.15, -0.72), (-0.6, -0.6), (0.0, -0.72), (0.6, -0.6), (1.15, -0.72), (1.15, -0.95), (-1.15, -0.95)], "sea", depth=0.2, bevel=0.06, y=-0.25)


def icon_medal():
    puff([(-0.5, 0.95), (-0.2, 0.95), (0.12, 0.15), (-0.18, 0.15)], "blue", depth=0.06, bevel=0.04)
    puff([(0.5, 0.95), (0.2, 0.95), (-0.12, 0.15), (0.18, 0.15)], "red", depth=0.06, bevel=0.04)
    prim("cyl", "gold", (0, -0.1, -0.35), (0.6, 0.6, 0.14), (math.pi / 2, 0, 0), bevel=0.05, m=mat("gold", 0.28, 0.75, coat=0.4))
    puff(star_pts(0.32, 0.14, 5, 0, -0.35), "orange", depth=0.04, bevel=0.03, y=-0.26, m=mat("sun", 0.3, 0.6))


def icon_key():
    m = mat("gold", 0.28, 0.75, coat=0.4)
    puff(circle(0.42, 64, -0.55, 0.0), "gold", depth=0.14, bevel=0.06, holes=[circle(0.18, 48, -0.55, 0.0)[::-1]], m=m, rot=math.radians(28))
    puff(rounded_rect(1.0, 0.18, 0.06, 0.35, 0.0), "gold", depth=0.14, bevel=0.05, m=m, rot=math.radians(28))
    for x in (0.55, 0.78):
        puff(rounded_rect(0.13, 0.32, 0.04, x, -0.2), "gold", depth=0.14, bevel=0.04, m=m, rot=math.radians(28))
    prim("sphere", "rose", (-0.52, -0.12, -0.28), (0.1, 0.06, 0.1), outline=False)


ICONS = {
    "health": icon_health, "joy": icon_joy, "savings": icon_savings, "journal": icon_journal,
    "goto": icon_goto, "kite": icon_kite, "album": icon_album, "settings": icon_settings,
    "pause": icon_pause, "play": icon_play, "sound": icon_sound, "music": icon_music,
    "language": icon_language, "chapter": icon_chapter, "people": icon_people,
    "keepsakes": icon_keepsakes, "paths": icon_paths, "story": icon_story,
    "customise": icon_customise, "newlife": icon_newlife, "graphics": icon_graphics,
    "textsize": icon_textsize, "camera": icon_camera, "motion": icon_motion, "pace": icon_pace,
    "home": icon_home, "close": icon_close, "trophy": icon_trophy,
    "flower": icon_flower, "lantern": icon_lantern, "star": icon_star, "ticket": icon_ticket,
    "toyboat": icon_toyboat, "medal": icon_medal, "key": icon_key,
}


# ---------------------------------------------------------------------------
# the title emblem: a badge with the lighthouse, the sea and your kite
# ---------------------------------------------------------------------------
def emblem():
    # sky disc and a sun-yellow rim
    prim("cyl", "sky", (0, 0.2, 0), (1.0, 1.0, 0.12), (math.pi / 2, 0, 0), bevel=0.0, m=mat("sky", 0.6, coat=0), vertices=96)
    prim("torus", "sun", (0, 0.0, 0), (1, 1, 1), (math.pi / 2, 0, 0), major_radius=1.02, minor_radius=0.1, major_segments=96)
    # sun low on the horizon
    prim("sphere", "lemon", (-0.46, 0.05, 0.12), (0.26, 0.05, 0.26), m=mat("lemon", 0.5, emit=0.6), outline=False)
    # sea in two bands of waves
    def waves(z, amp, color, y, top=0.0):
        # a wavy top edge, then back along the inside of the badge
        w = math.sqrt(0.97 ** 2 - z ** 2)
        pts = [(x, z + amp * math.sin(x * 9 + top)) for x in (-w + 2 * w * i / 40 for i in range(41))]
        a0, a1 = math.atan2(z, w), math.atan2(z, -w) - 2 * math.pi
        pts += [(0.97 * math.cos(a0 + (a1 - a0) * i / 30), 0.97 * math.sin(a0 + (a1 - a0) * i / 30)) for i in range(1, 30)]
        return puff(pts, color, depth=0.05, bevel=0.03, y=y, outline=False)
    waves(-0.18, 0.035, "sea", -0.02)
    waves(-0.36, 0.04, "sea_deep", -0.06, 1.3)
    # clip everything to the disc visually: a cream rim ring hides edges
    # headland and lighthouse
    head = [(0.12, -0.2), (0.3, -0.02), (0.7, 0.02), (0.95, -0.2), (0.95, -0.5), (0.12, -0.5)]
    head = [(x * min(1, 0.95 / math.hypot(x, z)), z * min(1, 0.95 / math.hypot(x, z))) for x, z in head]
    puff(head, "grass", depth=0.14, bevel=0.05, y=-0.1)
    tower = [(0.46, -0.05), (0.66, -0.05), (0.62, 0.48), (0.5, 0.48)]
    puff(tower, "white", depth=0.14, bevel=0.03, y=-0.16)
    for z0 in (0.05, 0.27):
        puff([(0.458 - (z0 * 0.07), z0), (0.662 + (z0 * -0.07), z0), (0.655 - 0.01, z0 + 0.1), (0.465 + 0.01, z0 + 0.1)], "red", depth=0.02, bevel=0.012, y=-0.33, outline=False)
    puff(rounded_rect(0.16, 0.12, 0.03, 0.56, 0.54), "lemon", depth=0.12, bevel=0.02, y=-0.16, m=mat("lemon", 0.3, emit=2.5))
    puff([(0.46, 0.6), (0.56, 0.72), (0.66, 0.6)], "red", depth=0.12, bevel=0.03, y=-0.16)
    # the kite high on the left, its string running down to the pier
    kite(-0.32, 0.5, 0.52, "red", "sun", y=-0.35)
    tube([(-0.32, 0.18), (-0.1, -0.05), (0.08, -0.22)], 0.006, "white", y=-0.3, outline=False)
    # a ribbon banner across the bottom (no words; the title is HTML)
    ribbon = [(-0.95, -0.62), (0.95, -0.62), (0.88, -0.82), (-0.88, -0.82)]
    puff(ribbon, "coral", depth=0.1, bevel=0.04, y=-0.5)
    for s in (-1, 1):
        puff([(s * 0.9, -0.66), (s * 1.18, -0.7), (s * 1.08, -0.8), (s * 1.18, -0.9), (s * 0.9, -0.86)], "red", depth=0.08, bevel=0.03, y=-0.44)
    for (x, z, r) in ((-0.8, 0.62, 0.08), (0.2, 0.8, 0.06), (0.86, 0.66, 0.05)):
        puff(star_pts(r, r * 0.4, 4, x, z), "white", depth=0.02, bevel=0.015, y=-0.6, m=mat("white", emit=1.2), outline=False)


def build(name, fn, size=256, fit=2.0, outline=0.05, scale=2.7, tilt=16):
    reset()
    _mats.clear()
    PARTS.clear()
    setup(size, scale, tilt)
    fn()
    finish(fit, outline)
    render(name)


if __name__ == "__main__":
    for name, fn in ICONS.items():
        if ONLY and name not in ONLY:
            continue
        build(name, fn)
    if not ONLY or "emblem" in ONLY:
        build("emblem", emblem, size=768, fit=2.4, outline=0.03, scale=2.75, tilt=8)
    print("UI_ART_COMPLETE")
