"""Chunky toy characters for every age. One GLB per age group; hair styles and
accessories are separate nodes the runtime shows or hides, so a dozen townsfolk can
share four files and still read as different people.

Nodes: Body (torso bob), Head, Eyes (blink), Mouth_smile / Mouth_open (talk),
ArmL, ArmR, LegL, LegR, Hair_<style>, Acc_<item>.
Recolourable materials: Skin, Hair, Top, Bottom, Shoes, Accent.
"""
import math
import bmesh
from mathutils import Vector
from . import kit
from .kit import Model

HAIR_STYLES = ["short", "swoop", "bob", "pony", "bun", "curls", "long", "spiky"]

AGES = {
    # head radius/centre, torso bottom/top and radii, hip height, leg radius, shoulder height, arm length
    "kid": dict(head=0.285, head_y=0.97, torso=(0.4, 0.7), torso_r=(0.185, 0.165), hip=0.38, leg_r=0.09,
                shoulder=0.67, arm=0.27, hip_x=0.09, foot=(0.1, 0.078, 0.15)),
    "adult": dict(head=0.255, head_y=1.23, torso=(0.5, 0.94), torso_r=(0.215, 0.195), hip=0.48, leg_r=0.102,
                  shoulder=0.89, arm=0.35, hip_x=0.105, foot=(0.115, 0.085, 0.18)),
    "elder": dict(head=0.25, head_y=1.18, torso=(0.49, 0.9), torso_r=(0.225, 0.195), hip=0.47, leg_r=0.098,
                  shoulder=0.86, arm=0.33, hip_x=0.105, foot=(0.115, 0.085, 0.18), stoop=0.12),
}


def hair_shell(m, c, R, style):
    """A sphere slightly larger than the head; face region pushed inside the skull."""
    seg, rings = (16, 10) if kit.LOW else (34, 22)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    for v in bm.verts:
        d = Vector((v.co.x, v.co.z, v.co.y))  # to game axes: y up, z forward
        x, y, z = d.x, d.y, d.z
        thick = 1.09
        # hairline: height (in unit sphere y) above which the front is covered
        if style == "swoop":
            line = 0.36 + 0.28 * x  # side-swept fringe, lower on the left
        elif style in ("bob", "long"):
            line = 0.34 - 0.12 * abs(x)
        elif style == "spiky":
            line = 0.46
        elif style == "curls":
            line = 0.4
        else:
            line = 0.44 - 0.1 * abs(x)
        # how far down the back/sides the hair reaches
        low = {"short": -0.3, "swoop": -0.3, "spiky": -0.25, "pony": -0.25, "bun": -0.22,
               "curls": -0.35, "bob": -0.62, "long": -0.95}[style]
        covered = True
        if z > 0.05 and y < line:
            # face opening; sides frame the face for bob/long styles
            side = abs(x) > 0.8 and style in ("bob", "long")
            covered = side
        if y < low:
            covered = False
        if style in ("bob", "long") and y < -0.15 and z > 0.3:
            covered = False
        if not covered:
            thick = 0.8
        elif style in ("bob", "long") and y < 0.1:
            thick = 1.09 + 0.12 * min(1, (0.1 - y) * 1.5)  # flare outward at the ends
        elif style == "curls":
            thick = 1.14
        v.co = Vector((x * R[0] * thick, y * R[1] * thick, z * R[2] * thick))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m._append(bm, kit._mat(c), "ffffff", "Hair", 0, smooth_all=True, ao=False)


def face(m, c, r, age):
    ex = r * 0.36
    ey = c.y - r * 0.02
    ez = c.z + r * 0.84
    with m.part("Eyes", (0, ey, ez)):
        for s in (-1, 1):
            m.sphere((s * ex, ey, ez), (r * 0.17, r * 0.24, r * 0.12), "eye", "Gloss", 14, 10, ao=False)
            m.sphere((s * ex + r * 0.05, ey + r * 0.08, ez + r * 0.1), r * 0.055, "ffffff", "Glow_white", 8, 6, ao=False)
            m.sphere((s * ex - r * 0.04, ey - r * 0.08, ez + r * 0.11), r * 0.03, "ffffff", "Glow_white", 6, 4, ao=False, detail=True)
    # happy closed eyes (^ ^), shown instead of Eyes for a big smile
    with m.part("Eyes_happy", (0, ey, ez)):
        for s in (-1, 1):
            m.tube([(s * ex - r * 0.13, ey - r * 0.03, ez + r * 0.06), (s * ex, ey + r * 0.09, ez + r * 0.1), (s * ex + r * 0.13, ey - r * 0.03, ez + r * 0.06)],
                   r * 0.035, "eye", "Gloss", 6, ao=False)
    # brows are their own pivots so moods can raise and tilt them
    for s, tag in ((-1, "L"), (1, "R")):
        with m.part("Brow" + tag, (s * ex, ey + r * 0.355, ez - r * 0.03)):
            m.capsule((s * ex - r * 0.12, ey + r * 0.34, ez - r * 0.02), (s * ex + r * 0.12, ey + r * 0.37, ez - r * 0.04),
                      r * 0.035, "ffffff", "Hair", 8)
    # cheeks
    for s in (-1, 1):
        m.sphere((s * r * 0.56, c.y - r * 0.28, c.z + r * 0.72), (r * 0.16, r * 0.1, r * 0.08), "ff8fa0", "Matte", 12, 8, ao=False)
    # nose
    m.sphere((0, c.y - r * 0.14, c.z + r * 0.95), (r * 0.12, r * 0.1, r * 0.1), "ffffff", "Skin", 12, 8, ao=False)
    # mouths (runtime toggles smile / open while talking)
    with m.part("Mouth_smile", (0, c.y - r * 0.4, c.z + r * 0.88)):
        m.tube([(-r * 0.17, c.y - r * 0.36, c.z + r * 0.86), (0, c.y - r * 0.46, c.z + r * 0.9), (r * 0.17, c.y - r * 0.36, c.z + r * 0.86)],
               r * 0.03, "7a2430", "Matte", 6, ao=False)
    with m.part("Mouth_sad", (0, c.y - r * 0.42, c.z + r * 0.88)):
        m.tube([(-r * 0.14, c.y - r * 0.46, c.z + r * 0.87), (0, c.y - r * 0.39, c.z + r * 0.9), (r * 0.14, c.y - r * 0.46, c.z + r * 0.87)],
               r * 0.03, "7a2430", "Matte", 6, ao=False)
    with m.part("Mouth_open", (0, c.y - r * 0.42, c.z + r * 0.86)):
        m.sphere((0, c.y - r * 0.42, c.z + r * 0.86), (r * 0.13, r * 0.1, r * 0.06), "7a2430", "Matte", 12, 8, ao=False)
        m.sphere((0, c.y - r * 0.47, c.z + r * 0.9), (r * 0.08, r * 0.04, r * 0.03), "ff6f7d", "Matte", 8, 6, ao=False)


def head(m, a, kind):
    r = a["head"]
    neck_y = a["torso"][1] - 0.02
    stoop = a.get("stoop", 0)
    c = Vector((0, a["head_y"], stoop * 0.4))
    with m.part("Head", (0, neck_y, stoop * 0.25)):
        m.sphere(c, (r * 1.02, r, r * 0.95), "ffffff", "Skin", 28, 18)
        for s in (-1, 1):  # ears
            m.sphere((s * r * 0.98, c.y - r * 0.05, c.z - r * 0.05), (r * 0.16, r * 0.22, r * 0.12), "ffffff", "Skin", 12, 8)
        face(m, c, r, kind)
        R = (r * 1.02, r, r * 0.95)
        for style in HAIR_STYLES:
            with m.part("Hair_" + style, (0, c.y, c.z)):
                hair_shell(m, c, R, style)
                if style == "swoop":
                    m.capsule((-r * 0.75, c.y + r * 0.62, c.z + r * 0.62), (r * 0.55, c.y + r * 0.35, c.z + r * 0.86), r * 0.2, "ffffff", "Hair", 12)
                elif style == "pony":
                    m.sphere((0, c.y + r * 0.35, c.z - r * 1.0), r * 0.26, "ffffff", "Hair", 14, 10)
                    m.capsule((0, c.y + r * 0.2, c.z - r * 1.15), (0, c.y - r * 0.75, c.z - r * 1.25), r * 0.22, "ffffff", "Hair", 12, r2=r * 0.12)
                    m.sphere((0, c.y + r * 0.35, c.z - r * 0.92), (r * 0.16, r * 0.1, r * 0.1), "ffffff", "Accent", 10, 6)
                elif style == "bun":
                    m.sphere((0, c.y + r * 1.02, c.z - r * 0.25), r * 0.38, "ffffff", "Hair", 16, 12)
                    m.tube([(-r * 0.3, c.y + r * 0.82, c.z - r * 0.2), (0, c.y + r * 0.78, c.z - r * 0.05), (r * 0.3, c.y + r * 0.82, c.z - r * 0.2)],
                           r * 0.06, "ffffff", "Accent", 6)
                elif style == "curls":
                    for i in range(14 if not kit.LOW else 7):
                        t = i / 14 * math.tau
                        yy = 0.55 + 0.35 * math.sin(i * 2.1)
                        rr = math.sqrt(max(0.0, 1 - yy * yy))
                        dx, dz = math.cos(t) * rr, math.sin(t) * rr
                        if dz > 0.55 and yy < 0.62:
                            continue
                        m.sphere((dx * r * 1.1, c.y + yy * r * 1.05, c.z + dz * r * 1.05), r * 0.28, "ffffff", "Hair", 10, 8)
                elif style == "spiky":
                    for i in range(7):
                        t = (i - 3) * 0.32
                        base = Vector((math.sin(t) * r * 0.6, c.y + r * 0.75, c.z + math.cos(t) * r * 0.2 - r * 0.1))
                        tip = base + Vector((math.sin(t) * r * 0.35, r * 0.45, r * 0.25))
                        m.capsule(base, tip, r * 0.2, "ffffff", "Hair", 10, r2=r * 0.05)
                elif style == "long":
                    m.capsule((0, c.y - r * 0.2, c.z - r * 0.7), (0, c.y - r * 1.5, c.z - r * 0.75), r * 0.62, "ffffff", "Hair", 16, r2=r * 0.5)
        # accessories on the head
        with m.part("Acc_glasses", (0, c.y, c.z)):
            ey = c.y - r * 0.02
            ez = c.z + r * 0.98
            for s in (-1, 1):
                pts = [(s * r * 0.36 + math.cos(t) * r * 0.24, ey + math.sin(t) * r * 0.22, ez) for t in (i * math.tau / 12 for i in range(12))]
                m.tube(pts, r * 0.03, "2a2d3e", "Gloss", 6, closed=True, ao=False)
                m.tube([(s * r * 0.6, ey + r * 0.05, ez - r * 0.02), (s * r * 0.98, ey + r * 0.08, c.z - r * 0.1)], r * 0.025, "2a2d3e", "Gloss", 5, ao=False)
            m.tube([(-r * 0.13, ey + r * 0.06, ez + r * 0.01), (r * 0.13, ey + r * 0.06, ez + r * 0.01)], r * 0.025, "2a2d3e", "Gloss", 5, ao=False)
        with m.part("Acc_beard", (0, c.y, c.z)):
            m.sphere((0, c.y - r * 0.55, c.z + r * 0.45), (r * 0.72, r * 0.5, r * 0.55), "ffffff", "Hair", 18, 12)
            m.capsule((-r * 0.3, c.y - r * 0.3, c.z + r * 0.92), (r * 0.3, c.y - r * 0.3, c.z + r * 0.92), r * 0.1, "ffffff", "Hair", 8)
        with m.part("Acc_sunhat", (0, c.y, c.z)):
            m.cyl((0, c.y + r * 0.55, c.z), r * 1.75, r * 0.07, "ffffff", "Accent", 28, 0.02)
            m.lathe([(0, r * 1.25), (r * 0.72, r * 1.2), (r * 0.9, r * 0.9), (r * 0.95, r * 0.6), (0, r * 0.6)], (0, c.y, c.z), "ffffff", "Accent", 24)
            m.cyl((0, c.y + r * 0.62, c.z), r * 0.97, r * 0.16, "ee3b3b", "Satin", 24, 0.01)
        with m.part("Acc_cap", (0, c.y, c.z)):
            m.lathe([(0, r * 1.08), (r * 0.6, r * 1.02), (r * 0.95, r * 0.7), (r * 1.06, r * 0.35), (0, r * 0.35)], (0, c.y, c.z), "ffffff", "Accent", 24)
            m.box((0, c.y + r * 0.38, c.z + r * 1.05), (r * 1.3, r * 0.08, r * 0.7), "ffffff", "Accent", 0.02)
        with m.part("Acc_headband", (0, c.y, c.z)):
            pts = [(math.cos(t) * r * 1.07, c.y + r * 0.5, c.z + math.sin(t) * r * 1.0) for t in (i * math.tau / 16 for i in range(16))]
            m.tube(pts, r * 0.07, "ffffff", "Accent", 6, closed=True)


def body(m, a, kind):
    t0, t1 = a["torso"]
    r0, r1 = a["torso_r"]
    stoop = a.get("stoop", 0)
    if True:  # called inside the Body part scope
        # hips / trousers top
        m.sphere((0, a["hip"] + 0.02, 0), (r0 * 0.98, 0.12, r0 * 0.78), "ffffff", "Bottom", 20, 12)
        # torso: tapered rounded barrel
        prof = [(0, t0 - 0.02), (r0 * 0.8, t0), (r0, t0 + 0.06), (r0 * 1.02, (t0 + t1) / 2), (r1, t1 - 0.06), (r1 * 0.7, t1 + 0.01), (0, t1 + 0.03)]
        m.lathe(prof, (0, 0, stoop * 0.12), "ffffff", "Top", 22)
        # collar
        pts = [(math.cos(t) * r1 * 0.62, t1 + 0.0, stoop * 0.12 + math.sin(t) * r1 * 0.55) for t in (i * math.tau / 14 for i in range(14))]
        m.tube(pts, 0.028, "ffffff", "Accent", 6, closed=True)
        # neck
        m.cyl((0, t1 - 0.02, stoop * 0.2), 0.07, 0.1, "ffffff", "Skin", 12, 0.0)
        # belt line
        pts = [(math.cos(t) * r0 * 1.0, t0 + 0.01, math.sin(t) * r0 * 0.8) for t in (i * math.tau / 16 for i in range(16))]
        m.tube(pts, 0.02, "ffffff", "Bottom", 5, closed=True)
        with m.part("Acc_skirt", (0, t0, 0)):
            m.lathe([(r0 * 0.9, t0 + 0.04), (r0 * 1.05, t0 - 0.04), (r0 * 1.55, a["hip"] - 0.2), (r0 * 1.5, a["hip"] - 0.22), (0, a["hip"] - 0.2)],
                    (0, 0, 0), "ffffff", "Bottom", 24)
        with m.part("Acc_apron", (0, t0, 0)):
            m.box((0, (t0 + t1) / 2 - 0.06, r0 * 0.93 + stoop * 0.12), (r0 * 1.15, (t1 - t0) + 0.1, 0.045), "ffffff", "Accent", 0.02, seg=3, taper=(0.78, 1))
            m.box((0, t0 + 0.02, r0 * 1.0 + stoop * 0.1), (r0 * 0.7, 0.09, 0.02), "ffffff", "Accent", 0.01)
            m.tube([(-r1 * 0.55, t1 - 0.05, r1 * 0.6), (0, t1 + 0.07, r1 * 0.2), (r1 * 0.55, t1 - 0.05, r1 * 0.6)], 0.015, "ffffff", "Accent", 5)
        with m.part("Acc_scarf", (0, t1, 0)):
            pts = [(math.cos(t) * r1 * 0.72, t1 - 0.01, stoop * 0.12 + math.sin(t) * r1 * 0.66) for t in (i * math.tau / 14 for i in range(14))]
            m.tube(pts, 0.05, "ffffff", "Accent", 8, closed=True)
            m.capsule((r1 * 0.3, t1 - 0.03, r1 * 0.68), (r1 * 0.42, t1 - 0.22, r1 * 0.78), 0.045, "ffffff", "Accent", 8)
        with m.part("Acc_badge", (0, t1, 0)):
            m.box((-r1 * 0.5, t1 - 0.14, r1 * 1.0 + stoop * 0.1), (0.08, 0.1, 0.015), "fffaf0", "Satin", 0.008)
            m.box((-r1 * 0.5, t1 - 0.12, r1 * 1.0 + stoop * 0.1 + 0.009), (0.06, 0.02, 0.004), "2f7de1", "Satin", 0.0)
        with m.part("Acc_stethoscope", (0, t1, 0)):
            m.tube([(-r1 * 0.5, t1 - 0.2, r1 * 0.9), (-r1 * 0.62, t1 - 0.02, r1 * 0.5), (0, t1 + 0.02, -r1 * 0.2), (r1 * 0.62, t1 - 0.02, r1 * 0.5), (r1 * 0.45, t1 - 0.2, r1 * 0.9)],
                   0.014, "3b4256", "Gloss", 5)
            m.cyl((r1 * 0.45, t1 - 0.24, r1 * 0.9), 0.035, 0.02, "a8b3c4", "Metal", 12, 0.005, rot=(math.pi / 2, 0, 0))
        with m.part("Acc_bag", (0, t1, 0)):
            m.box((r0 * 1.05, t0 + 0.02, 0.02), (0.07, 0.2, 0.22), "ffffff", "Accent", 0.03)
            m.tube([(-r1 * 0.8, t1 - 0.02, 0), (0, (t0 + t1) / 2, r1 * 1.0), (r0 * 1.02, t0 + 0.1, 0.02)], 0.014, "ffffff", "Accent", 5)
    # arms
    for s, tag in ((-1, "L"), (1, "R")):
        sh = Vector((s * (r1 + 0.03), a["shoulder"], stoop * 0.15))
        L = a["arm"]
        with m.part("Arm" + tag, sh):
            elbow = sh + Vector((s * 0.035, -L * 0.5, 0))
            wrist = sh + Vector((s * 0.05, -L * 0.88, 0.02))
            m.capsule(sh, elbow, 0.075 if kind != "kid" else 0.065, "ffffff", "Top", 12, r2=0.066)
            m.capsule(elbow, wrist, 0.058 if kind != "kid" else 0.05, "ffffff", "Skin", 12, r2=0.052)
            m.sphere(wrist + Vector((s * 0.005, -0.045, 0.005)), (0.07, 0.075, 0.065), "ffffff", "Skin", 12, 8)
            if tag == "R":
                with m.part("Acc_cane", wrist):
                    m.cyl((wrist.x + 0.02, 0.02, wrist.z + 0.06), 0.022, wrist.y - 0.04, "8a5230", "Gloss", 10, 0.01)
                    m.tube([(wrist.x + 0.02, wrist.y - 0.02, wrist.z + 0.06), (wrist.x + 0.02, wrist.y + 0.05, wrist.z + 0.0), (wrist.x + 0.02, wrist.y + 0.0, wrist.z - 0.07)],
                           0.022, "8a5230", "Gloss", 8)


def legs(m, a):
    fx, fy, fz = a["foot"]
    for s, tag in ((-1, "L"), (1, "R")):
        hip = Vector((s * a["hip_x"], a["hip"], 0))
        with m.part("Leg" + tag, hip):
            ankle = Vector((s * a["hip_x"], fy * 1.4, 0))
            m.capsule(hip, ankle, a["leg_r"], "ffffff", "Bottom", 12, r2=a["leg_r"] * 0.85)
            # chunky shoe with a pale sole
            m.sphere((s * a["hip_x"], fy * 0.95, fz * 0.3), (fx, fy, fz), "ffffff", "Shoes", 16, 10)
            m.sphere((s * a["hip_x"], fy * 0.32, fz * 0.32), (fx * 1.02, fy * 0.42, fz * 1.04), "fff6e8", "Satin", 16, 8)


def baby():
    m = Model("baby", ao=False)
    r = 0.25
    body_scope = m.part("Body", (0, 0.2, 0))
    body_scope.__enter__()
    m.sphere((0, 0.25, 0), (0.2, 0.2, 0.2), "ffffff", "Top", 22, 14)
    m.sphere((0, 0.14, 0.02), (0.19, 0.12, 0.18), "ffffff", "Bottom", 18, 10)
    m.sphere((0, 0.3, 0.19), (0.05, 0.05, 0.02), "ffffff", "Accent", 10, 6)  # bib button
    c = Vector((0, 0.62, 0.04))
    with m.part("Head", (0, 0.42, 0.02)):
        m.sphere(c, (r * 1.05, r, r * 0.98), "ffffff", "Skin", 28, 18)
        for s in (-1, 1):
            m.sphere((s * r * 1.0, c.y - r * 0.05, c.z - r * 0.05), (r * 0.16, r * 0.2, r * 0.12), "ffffff", "Skin", 12, 8)
        face(m, c, r, "baby")
        with m.part("Hair_curl", (0, c.y, c.z)):
            m.tube([(-0.02, c.y + r * 0.95, c.z + r * 0.1), (0.04, c.y + r * 1.12, c.z + r * 0.02), (0.08, c.y + r * 1.02, c.z + r * 0.12), (0.03, c.y + r * 0.97, c.z + r * 0.16)],
                   0.025, "ffffff", "Hair", 7)
        with m.part("Hair_short", (0, c.y, c.z)):
            hair_shell(m, c, (r * 1.05, r, r * 0.98), "spiky")
        with m.part("Acc_bonnet", (0, c.y, c.z)):
            m.lathe([(0, r * 1.12), (r * 0.7, r * 1.05), (r * 1.08, r * 0.55), (r * 1.1, 0.0), (r * 0.98, -r * 0.35), (0, -r * 0.35)],
                    (0, c.y, c.z - r * 0.15), "ffffff", "Accent", 24)
    for s, tag in ((-1, "L"), (1, "R")):
        sh = Vector((s * 0.17, 0.36, 0.02))
        with m.part("Arm" + tag, sh):
            m.capsule(sh, sh + Vector((s * 0.06, -0.14, 0.08)), 0.055, "ffffff", "Top", 10)
            m.sphere(sh + Vector((s * 0.07, -0.19, 0.1)), 0.06, "ffffff", "Skin", 10, 8)
    body_scope.__exit__()
    for s, tag in ((-1, "L"), (1, "R")):
        hip = Vector((s * 0.1, 0.13, 0.05))
        with m.part("Leg" + tag, hip):
            m.capsule(hip, hip + Vector((s * 0.04, -0.06, 0.16)), 0.065, "ffffff", "Bottom", 10)
            m.sphere(hip + Vector((s * 0.05, -0.07, 0.24)), (0.065, 0.06, 0.08), "ffffff", "Shoes", 10, 8)
    return m


def character(kind):
    if kind == "baby":
        return baby()
    m = Model(kind, ao=False)
    a = AGES[kind]
    with m.part("Body", (0, a["hip"], 0)):
        body(m, a, kind)
        head(m, a, kind)
    legs(m, a)
    return m


def build(export=True):
    info = {}
    for kind in ("baby", "kid", "adult", "elder"):
        m = character(kind)
        if export:
            info[kind] = m.export()
    return info
