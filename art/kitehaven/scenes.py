"""The twelve Kitehaven dioramas, the harbour backdrop and the props pack.

Walkable ground is x in [-5.85, 5.85], z in [-4.05, 4.05] at y = 0 in every scene.
Each scene records anchors used by the story runtime:
  spawn, exit, act, npc0..npc4, find0..find2, hunt0..hunt3
and axis-aligned colliders. build.py validates both.
"""
import math
import random
from . import kit
from .kit import Model
from . import pieces as P
from .pieces import TAU

W, D = 15.0, 11.0


def face_to(x, z, tx=0.0, tz=0.0):
    return round(math.atan2(tx - x, tz - z), 3)


def npcs(m, spots, center=(0.0, 0.0)):
    for i, (x, z) in enumerate(spots):
        m.anchor(f"npc{i}", x, z, face_to(x, z, *center))


def points(m, prefix, spots):
    for i, (x, z) in enumerate(spots):
        m.anchor(f"{prefix}{i}", x, z)


# ---------------------------------------------------------------------------
# 1. Nursery under the eaves (morning)
# ---------------------------------------------------------------------------
def nursery():
    m = Model("nursery", ao_distance=1.2)
    w, d = 13.6, 10.0
    P.slab(m, w, d, "plank", "wood_dark", (("wood", 0.3), ("stone2", 0.6)), r=0.25, step=0.3)
    P.planks(m, 0, 0, w - 0.1, d - 0.1, ("e3a765", "d99a5a", "e8b070"), y=0.002)
    P.room(m, w, d, 3.6, wall="wall_yellow", wain="wall_mint", trim="white", win_back=(0.9,), win_left=(1.6,), stripes="ffe68f",
           win_w=1.8, win_h=1.5)
    # window seat with cushions
    m.box((0.9, 0.35, -4.55), (2.4, 0.7, 0.8), "white", "Satin", 0.06)
    m.box((0.9, 0.78, -4.5), (2.2, 0.18, 0.7), "coral", "Satin", 0.08)
    for x in (0.2, 1.6):
        m.box((x, 1.02, -4.72), (0.6, 0.45, 0.16), "sun" if x < 1 else "sky", "Satin", 0.07, rot=(-0.2, 0, 0))
    m.solid(0.9, -4.55, 2.4, 0.8)
    # crib with mobile
    with m.at(3.7, -3.55):
        m.box((0, 0.5, 0), (2.3, 0.18, 1.2), "white", "Gloss", 0.05)
        m.box((0, 0.66, 0), (2.1, 0.22, 1.02), "fffaf0", "Satin", 0.1)
        m.box((0.3, 0.8, 0.05), (1.3, 0.1, 0.9), "sky", "Satin", 0.06)
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * 1.1, 0, sz * 0.55), 0.07, 1.35, "mint", "Gloss", 12, 0.02)
                m.sphere((sx * 1.1, 1.42, sz * 0.55), 0.1, "sun", "Gloss", 10, 8)
            for k in range(7):
                m.cyl((sx * 1.1, 0.6, -0.42 + k * 0.14), 0.025, 0.7, "white", "Gloss", 6, 0)
        for sz in (-1, 1):
            m.tube([(-1.1, 1.28, sz * 0.55), (1.1, 1.28, sz * 0.55)], 0.04, "mint", "Gloss", 8, smooth_path=False)
            for k in range(13):
                m.cyl((-0.95 + k * 0.16, 0.6, sz * 0.55), 0.022, 0.68, "white", "Gloss", 6, 0)
        m.cyl((1.0, 1.4, -0.55), 0.03, 1.1, "white", "Satin", 6, 0)
        m.tube([(1.0, 2.5, -0.55), (0.6, 2.6, -0.3), (0.2, 2.5, 0.0)], 0.02, "white", "Satin", 5)
    with m.part("Spin_mobile", (3.9, 2.45, -3.55)):
        for k in range(4):
            a = k * TAU / 4
            px, pz = 3.9 + math.cos(a) * 0.45, -3.55 + math.sin(a) * 0.45
            m.tube([(3.9, 2.45, -3.55), (px, 2.45, pz)], 0.012, "white", "Satin", 4)
            P.kite(m, (px, 2.15, pz), ("red", "sun", "blue", "mint")[k], 0.3, rot=(0, a, 0), tail=False)
    m.solid(3.7, -3.55, 2.4, 1.3)
    # rocking chair for Nana
    with m.at(-4.7, -2.7, 0.7):
        for sx in (-1, 1):
            m.tube([(sx * 0.4, 0.12, -0.6), (sx * 0.4, 0.03, 0), (sx * 0.4, 0.12, 0.6)], 0.05, "wood", "Gloss", 8)
            m.cyl((sx * 0.38, 0.05, 0.3), 0.045, 0.5, "wood", "Gloss", 8, 0)
            m.cyl((sx * 0.38, 0.05, -0.3), 0.045, 1.35, "wood", "Gloss", 8, 0)
            m.box((sx * 0.4, 0.78, 0.05), (0.08, 0.06, 0.7), "wood", "Gloss", 0.02)
        m.box((0, 0.52, 0.02), (0.84, 0.1, 0.72), "wood", "Gloss", 0.04)
        m.box((0, 0.64, 0.02), (0.76, 0.12, 0.66), "rose", "Satin", 0.06)
        for k in range(5):
            m.cyl((-0.3 + k * 0.15, 0.6, -0.32), 0.03, 0.75, "wood_light", "Gloss", 6, 0)
        m.box((0, 1.36, -0.32), (0.86, 0.12, 0.08), "wood", "Gloss", 0.03)
        m.box((0.05, 0.84, 0.0), (0.5, 0.3, 0.38), "lilac", "Satin", 0.1, rot=(0.3, 0.2, 0))  # knitted blanket
    m.solid(-4.7, -2.7, 1.1, 1.1)
    # toy chest
    with m.at(-5.5, 1.2, math.pi / 2):
        m.box((0, 0.35, 0), (1.3, 0.7, 0.75), "red", "Gloss", 0.08)
        m.box((0, 0.74, 0), (1.36, 0.12, 0.8), "sun", "Gloss", 0.05)
        m.box((0, 0.4, 0.39), (0.3, 0.3, 0.02), "sun", "Gloss", 0.02)
        for sx in (-1, 1):
            m.box((sx * 0.58, 0.35, 0.38), (0.08, 0.66, 0.04), "sun", "Gloss", 0.01)
    m.solid(-5.5, 1.2, 0.85, 1.4)
    P.shelf(m, -2.4, -4.55, 1.8, 2.0, "wood_light", seed=3)
    P.rug(m, 0.4, 0.4, 2.4, ("sun", "coral", "white", "sky", "mint", "sun"))
    # toys on the rug and floor
    for i, (x, z, c) in enumerate(((-0.8, 1.6, "red"), (-0.45, 1.75, "blue"), (-0.62, 1.95, "sun"), (1.6, -0.6, "mint"))):
        m.box((x, 0.14, z), (0.26, 0.26, 0.26), c, "Gloss", 0.05, rot=(0, i * 0.5, 0))
        m.box((x, 0.28, z), (0.14, 0.02, 0.14), "white", "Satin", 0.0, rot=(0, i * 0.5, 0), ao=False)
    for k, c in enumerate(("red", "orange", "sun", "lime", "blue")):
        m.cyl((1.9, 0.02 + k * 0.08, 1.4), 0.2 - k * 0.03, 0.07, c, "Gloss", 16, 0.02)
    m.cyl((1.9, 0.0, 1.4), 0.03, 0.5, "wood_light", "Gloss", 8, 0)
    # teddy
    with m.at(-3.2, -4.3):
        m.sphere((0, 0.3, 0), (0.26, 0.3, 0.22), "wood_light", "Satin", 14, 10)
        m.sphere((0, 0.72, 0), 0.22, "wood_light", "Satin", 14, 10)
        for s in (-1, 1):
            m.sphere((s * 0.16, 0.9, 0), 0.08, "wood_light", "Satin", 10, 8)
            m.sphere((s * 0.08, 0.76, 0.19), 0.03, "eye", "Gloss", 6, 4)
        m.sphere((0, 0.67, 0.2), (0.08, 0.06, 0.05), "cream", "Satin", 10, 8)
        m.box((0, 0.5, 0.18), (0.24, 0.06, 0.05), "red", "Satin", 0.02)
    # floor lamp + plant + frames
    with m.at(-5.9, -4.1):
        m.cyl((0, 0, 0), 0.25, 0.06, "ink", "Gloss", 16, 0.02)
        m.cyl((0, 0, 0), 0.04, 2.1, "ink", "Gloss", 8, 0)
        m.lathe([(0.2, 2.0), (0.42, 1.85), (0.42, 1.8), (0.2, 2.35), (0, 2.35)], (0, 0, 0), "ffe2a0", "Glow_warm", 16)
    m.solid(-5.9, -4.1, 0.5, 0.5)
    P.potted_plant(m, 6.0, -4.2, 1.2, "blue")
    for z, c in ((-2.6, "sky"), (-0.4, "pink")):
        m.box((-w / 2 + 0.06, 2.5, z), (0.06, 0.8, 0.65), "white", "Satin", 0.03)
        m.box((-w / 2 + 0.1, 2.5, z), (0.02, 0.62, 0.48), c, "Satin", 0.0)
        P.kite(m, (-w / 2 + 0.16, 2.5, z), "red" if c == "sky" else "blue", 0.28, rot=(0, math.pi / 2, 0), tail=False)
    npcs(m, [(-3.4, -1.7), (2.1, -1.8), (3.9, 1.3), (-1.3, -2.9), (-2.6, 2.4)])
    points(m, "find", [(-4.4, 3.2), (5.2, -1.6), (-0.6, -3.6)])
    points(m, "hunt", [(-2.9, 3.4), (4.9, 3.3), (-4.9, -0.6), (1.8, -3.5)])
    m.anchor("spawn", 0.4, 2.7, math.pi)
    m.anchor("exit", 5.3, 0.6)
    m.anchor("act", 0.4, 0.4)
    m.extra = dict(backdrop=None, floor=0.0, interior=True)
    return m


# ---------------------------------------------------------------------------
# 2. Two back gardens and a gap in the fence (afternoon)
# ---------------------------------------------------------------------------
def gardens():
    m = Model("gardens", ao_distance=1.3)
    def top(x, z):
        stones = abs(x + 1.2) < 0.45 and (round((z - 0.2) / 0.9) * 0.9 + 0.2 - z) ** 2 < 0.09 and -4 < z < 3.4
        return ("stone", 0.05) if stones else P.meadow(seed=1.0)(x, z)
    P.slab(m, W, D, "grass", "grass_dark", top_fn=top)
    P.house(m, -4.2, -6.3, 4.6, 2.4, 2.6, "wall_blue", "roof_red", door_color="sun", shutters="white")
    P.house(m, 3.9, -6.3, 4.4, 2.4, 2.5, "wall_yellow", "roof_teal", door_color="red", shutters="blue")
    # patio in front of your back door
    P.cobbles(m, -4.2, -4.6, 3.0, 1.2, ("stone", "stone2", "sand"), 0.4, y=0.01)
    P.picket_fence(m, (0.3, -5.0), (0.3, 1.8), "white", 0.7, gap=(0.34, 0.54))
    # sandpit
    with m.at(-3.5, 1.9):
        for sx in (-1, 1):
            m.box((sx * 1.1, 0.15, 0), (0.18, 0.3, 1.7), "wood", "Satin", 0.04)
        for sz in (-1, 1):
            m.box((0, 0.15, sz * 0.8), (2.35, 0.3, 0.18), "wood", "Satin", 0.04)
        m.grid((0, 0.16, 0), 2.0, 1.4, "sand", "Matte", 0.25, jitter=0.06, heights=lambda x, z: 0.04 * math.sin(x * 3) * math.cos(z * 4))
        m.lathe([(0, 0), (0.12, 0), (0.16, 0.25), (0.14, 0.25), (0, 0.02)], (0.5, 0.18, 0.2), "blue", "Gloss", 12)
        m.box((-0.4, 0.22, -0.3), (0.12, 0.03, 0.4), "sun", "Gloss", 0.01, rot=(0, 0.6, 0))
    m.solid(-3.5, 1.9, 2.4, 1.8)
    # paddling pool
    with m.at(3.4, 1.9):
        m.lathe([(0.95, 0), (1.05, 0.05), (1.05, 0.3), (0.95, 0.35), (0.85, 0.3), (0.85, 0.05), (0, 0.05)], (0, 0, 0), "sky", "Gloss", 32)
        m.cyl((0, 0.0, 0), 0.86, 0.26, "5cc8ff", "Water", 32, 0.0)
        for k in range(8):
            a = k * TAU / 8
            m.sphere((math.cos(a) * 0.96, 0.2, math.sin(a) * 0.96), 0.12, ("red", "white", "sun", "white")[k % 4], "Gloss", 10, 8)
        m.sphere((0.3, 0.3, 0.1), (0.14, 0.1, 0.18), "sun", "Gloss", 12, 8)  # rubber duck body
        m.sphere((0.3, 0.42, 0.22), 0.08, "sun", "Gloss", 10, 8)
        m.box((0.3, 0.41, 0.32), (0.06, 0.03, 0.06), "orange", "Gloss", 0.01)
    m.solid(3.4, 1.9, 2.1, 2.1)
    # washing line
    for x, z in ((-5.9, -3.4), (-2.1, -3.6)):
        m.cyl((x, 0, z), 0.06, 2.1, "white", "Satin", 8, 0)
        m.box((x, 2.05, z), (0.06, 0.06, 0.5), "white", "Satin", 0.01)
        m.solid(x, z, 0.25, 0.25)
    P.bunting(m, (-5.9, 2.05, -3.4), (-2.1, 2.05, -3.6), 0.25, ("white",))
    for k, (x, c, h) in enumerate(((-5.2, "red", 0.7), (-4.4, "sky", 0.55), (-3.7, "sun", 0.75), (-2.9, "pink", 0.5))):
        m.box((x, 1.72 - h / 2 + 0.2, -3.45 - k * 0.04), (0.55, h, 0.03), c, "Satin", 0.02)
    # apple tree with a stuck kite
    P.tree(m, -6.4, -0.8, 1.1, ("leaf", "leaf2"), seed=2)
    for k in range(6):
        a = k * 1.1
        m.sphere((-6.4 + math.cos(a) * 0.7, 1.7 + (k % 3) * 0.3, -0.8 + math.sin(a) * 0.6), 0.09, "red", "Gloss", 10, 8)
    P.kite(m, (-5.8, 2.6, -0.3), "sun", 0.55, rot=(0.2, 0.7, 0.4), name="Sway_kite_tree")
    # swing on Rowan's side
    with m.at(5.8, -2.6, math.pi / 2):
        for sx in (-1, 1):
            m.tube([(sx * 0.9, 0, -0.5), (sx * 0.9, 2.0, 0), (sx * 0.9, 0, 0.5)], 0.06, "red", "Gloss", 8, smooth_path=False)
        m.tube([(-0.9, 2.0, 0), (0.9, 2.0, 0)], 0.07, "red", "Gloss", 8, smooth_path=False)
        with m.part("Sway_swing", (0, 2.0, 0)):
            for sx in (-0.3, 0.3):
                m.cyl((sx, 0.55, 0), 0.015, 1.45, "white", "Satin", 4, 0)
            m.box((0, 0.55, 0), (0.75, 0.07, 0.3), "sun", "Gloss", 0.03)
    m.solid(5.8, -2.6, 1.4, 2.1)
    # flower beds and bushes along the back
    P.flowers(m, -1.4, -4.7, 2.2, 0.6, ("red", "sun", "pink", "purple"), 14, 1)
    P.flowers(m, 1.9, -4.6, 2.4, 0.6, ("white", "coral", "sun", "blue"), 14, 2)
    P.bush(m, -6.6, 3.8, 1.1, "leaf2", 3, ("pink", "white"))
    P.bush(m, 6.6, 4.1, 1.0, "leaf", 4, ("sun", "red"))
    P.bush(m, 6.8, 0.6, 0.9, "leaf2", 5)
    P.grass_tufts(m, 0, 0, 12, 8, 26, seed=4)
    # garden gnome
    with m.at(-0.6, -4.2):
        m.cyl((0, 0, 0), 0.14, 0.3, "blue", "Gloss", 12, 0.04)
        m.sphere((0, 0.4, 0), 0.13, "peach", "Satin", 12, 8)
        m.sphere((0, 0.33, 0.1), (0.12, 0.12, 0.06), "white", "Satin", 10, 8)
        m.lathe([(0.14, 0), (0.0, 0.34)], (0, 0.48, 0), "red", "Gloss", 12)
    npcs(m, [(1.7, -1.3), (-2.6, -2.2), (-1.4, 0.1), (-4.8, 0.2), (2.2, -3.5)])
    points(m, "find", [(-5.4, 3.3), (1.9, 3.5), (4.8, -0.3)])
    points(m, "hunt", [(-4.8, -1.9), (5.1, 3.6), (1.6, -3.6), (-1.0, 3.6)])
    m.anchor("spawn", -1.2, 2.8, math.pi)
    m.anchor("exit", 5.4, 0.2)
    m.anchor("act", -1.2, -1.2)
    m.extra = dict(backdrop=dict(x=-3, y=-7, z=-30, s=1.3, variant="old"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 3. Schoolyard (bright morning)
# ---------------------------------------------------------------------------
def schoolyard():
    m = Model("schoolyard", ao_distance=1.2)
    def top(x, z):
        if z > 4.4 or x > 6.6:
            return P.meadow(seed=2.0)(x, z)
        if -0.6 < x < 5.6 and -2.3 < z < 1.9:
            return ("e8674a", 0.02)
        return ("c2c8d6" if P.noise(x, z, 1.4, 3) > 0.3 else "b8bfce", 0.02)
    P.slab(m, W, D, "c2c8d6", "grass_dark", top_fn=top)
    for (a, b) in (((-0.6, -2.3), (5.6, -2.3)), ((-0.6, 1.9), (5.6, 1.9)), ((-0.6, -2.3), (-0.6, 1.9)), ((5.6, -2.3), (5.6, 1.9)), ((2.5, -2.3), (2.5, 1.9))):
        m.box(((a[0] + b[0]) / 2, 0.006, (a[1] + b[1]) / 2), (abs(b[0] - a[0]) + 0.08, 0.01, abs(b[1] - a[1]) + 0.08), "white", "Matte", 0.0, ao=False)
    # school building
    with m.at(-2.0, -6.4):
        m.box((0, 1.9, 0), (10.0, 3.8, 2.6), "brick", "Satin", 0.08, jitter=0.0)
        m.box((0, 3.9, 0), (10.3, 0.3, 2.9), "cream", "Satin", 0.06)
        m.box((0, 0.35, 0.02), (10.1, 0.7, 2.7), "brick2", "Satin", 0.05)
        for x in (-4.2, -2.8, 1.8, 3.2, 4.4):
            P.window(m, x, 2.4, 1.32, 0.9, 1.3, "white", "sky", depth=0.12, sill=True)
        # clock tower
        m.box((0, 4.8, 0.2), (2.2, 2.0, 2.0), "brick", "Satin", 0.06)
        m.lathe([(1.55, 0), (1.5, 0.1), (0, 1.6)], (0, 5.8, 0.2), "roof_blue", "Gloss", 4, rot=(0, math.pi / 4, 0), smooth=False)
        m.cyl((0, 4.9, 1.2), 0.72, 0.12, "white", "Gloss", 32, 0.03, rot=(math.pi / 2, 0, 0))
        m.cyl((0, 4.9, 1.3), 0.62, 0.02, "cream", "Satin", 32, 0.0, rot=(math.pi / 2, 0, 0))
        m.box((0, 5.1, 1.33), (0.07, 0.42, 0.03), "ink", "Satin", 0.01)
        m.box((0.13, 4.9, 1.34), (0.3, 0.06, 0.03), "ink", "Satin", 0.01)
        # entrance
        m.box((0, 1.2, 1.4), (2.2, 2.4, 0.3), "cream", "Satin", 0.05)
        P.door(m, 0, 1.45, 1.3, 1.9, "blue", "white")
        for k in range(3):
            m.box((0, 0.08 + k * 0.08, 1.9 - k * 0.2), (2.6 - k * 0.2, 0.16, 0.5), "stone", "Satin", 0.03)
        m.box((0, 2.75, 1.65), (2.8, 0.15, 0.9), "sun", "Gloss", 0.05)
    m.solid(-2.0, -6.0, 10.4, 3.4)
    # bike shed (Maya's lunchbox ends up on its roof)
    with m.at(5.1, -3.5):
        for x in (-1.1, 1.1):
            for z in (-0.6, 0.6):
                m.cyl((x, 0, z), 0.06, 2.0 - z * 0.25, "iron", "Gloss", 8, 0)
        m.box((0, 2.05, 0), (2.7, 0.1, 1.7), "roof_teal", "Gloss", 0.04, rot=(0.14, 0, 0))
        for x in (-0.6, 0.0, 0.6):
            m.tube([(x, 0.05, -0.3), (x, 0.55, -0.2), (x, 0.05, 0.2)], 0.03, "sun", "Gloss", 6)
    m.solid(5.1, -3.5, 2.5, 1.5)
    # climbing frame
    with m.at(-4.4, -1.3):
        cols = ("red", "sun", "blue", "mint")
        for i, x in enumerate((-0.9, 0.0, 0.9)):
            for z in (-0.7, 0.7):
                m.cyl((x, 0, z), 0.06, 1.8, cols[i], "Gloss", 10, 0.02)
        for y in (0.6, 1.2, 1.8):
            for z in (-0.7, 0.7):
                m.tube([(-0.9, y, z), (0.9, y, z)], 0.045, cols[int(y * 2) % 4], "Gloss", 8, smooth_path=False)
            for x in (-0.9, 0.0, 0.9):
                m.tube([(x, y, -0.7), (x, y, 0.7)], 0.045, cols[(int(y * 2) + 1) % 4], "Gloss", 8, smooth_path=False)
        m.box((0.45, 1.2, 0), (0.9, 0.08, 1.4), "wood_light", "Satin", 0.03)
    m.solid(-4.4, -1.3, 2.1, 1.7)
    # slide
    with m.at(-4.3, 2.3, math.pi / 2):
        m.box((0, 0.8, -0.9), (0.9, 1.6, 0.9), "sun", "Gloss", 0.08)
        m.box((0, 1.6, -0.9), (1.0, 0.1, 1.0), "blue", "Gloss", 0.04)
        m.box((0, 0.85, 0.45), (0.7, 0.08, 2.1), "red", "Gloss", 0.04, rot=(0.7, 0, 0))
        for sx in (-1, 1):
            m.box((sx * 0.38, 0.95, 0.45), (0.06, 0.14, 2.1), "red", "Gloss", 0.02, rot=(0.7, 0, 0))
    m.solid(-4.3, 2.3, 2.8, 1.1)
    # hopscotch and painted circle
    for k, (dx, dz) in enumerate(((0, 0), (0, -0.55), (-0.28, -1.1), (0.28, -1.1), (0, -1.65), (-0.28, -2.2), (0.28, -2.2))):
        m.box((0.8 + dx, 0.008, 2.3 + dz), (0.5, 0.012, 0.5), ("sun", "white", "coral", "white", "sky", "white", "mint")[k], "Matte", 0.0, ao=False)
        m.box((0.8 + dx, 0.012, 2.3 + dz), (0.4, 0.012, 0.4), "c2c8d6", "Matte", 0.0, ao=False)
    for k in range(32):
        a = k * TAU / 32
        m.box((2.5 + math.cos(a) * 1.0, 0.01, -0.2 + math.sin(a) * 1.0), (0.22, 0.012, 0.07), "white", "Matte", 0.0, rot=(0, -a, 0), ao=False)
    # garden bed for the class project
    with m.at(0.9, -3.8):
        m.box((0, 0.2, 0), (2.4, 0.4, 0.9), "wood", "Satin", 0.05)
        m.grid((0, 0.36, 0), 2.2, 0.7, "soil", "Matte", 0.2, jitter=0.1)
        for k in range(7):
            m.capsule((-0.9 + k * 0.3, 0.36, 0), (-0.9 + k * 0.3, 0.6, 0.05), 0.02, "leaf_dark", "Satin", 5)
            m.sphere((-0.9 + k * 0.3, 0.62, 0.05), (0.09, 0.05, 0.09), ("lime", "leaf2")[k % 2], "Satin", 8, 6)
    m.solid(0.9, -3.8, 2.4, 0.9)
    P.bench(m, 3.3, 2.9, math.pi, "sun")
    P.tree(m, 6.8, 2.2, 1.1, ("leaf2", "leaf"), seed=6)
    P.tree(m, 6.7, -1.3, 0.9, ("leaf", "lime"), seed=7)
    P.tree(m, -6.8, 3.9, 0.8, ("leaf2", "leaf"), seed=8, kind="pine")
    P.flowers(m, 0, 4.8, 12, 0.5, ("red", "sun", "white", "pink"), 18, 3)
    P.lamp(m, -1.1, 3.3, 2.1, False)
    npcs(m, [(2.2, -1.6), (3.6, -2.0), (-1.6, -3.3), (-2.2, 0.8), (4.3, 1.2)])
    points(m, "find", [(-5.3, 3.8), (5.6, 3.7), (-2.6, -2.2)])
    points(m, "hunt", [(-5.4, 0.6), (5.5, 0.4), (2.6, 3.8), (-1.2, -2.3)])
    m.anchor("spawn", 0.0, 2.9, math.pi)
    m.anchor("exit", 5.6, -1.1)
    m.anchor("act", 2.8, -0.2)
    m.extra = dict(backdrop=dict(x=6, y=-7, z=-32, s=1.3, variant="old"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 4. The Old Pier at the Kite Festival (bright midday)
# ---------------------------------------------------------------------------
def pier():
    m = Model("pier", ao_distance=1.2)
    P.slab(m, W, D, "plank", "wood_dark", (("wood", 0.35),), r=0.3, step=0.3)
    P.planks(m, 0, 0, W - 0.2, D - 0.2, ("d98f4e", "cf8547", "e09a58"), width=0.45, y=0.002, along="z")
    # pier legs into the sea
    for x in (-6.8, -3.4, 0, 3.4, 6.8):
        for z in (-5.0, 0, 5.0):
            m.cyl((x, -3.2, z), 0.28, 2.9, "wood_dark", "Satin", 12, 0.04)
            m.cyl((x, -1.7, z), 0.31, 0.2, "iron", "Satin", 12, 0.02)
    P.water(m, 0, 0, 44, 36, "sea", "sea_deep", 0.8, y=-1.3)
    # railings
    P.rail(m, (-7.2, 5.1), (7.2, 5.1), "white", 0.9, "white", solid=False)
    P.rail(m, (7.3, -5.2), (7.3, 5.1), "white", 0.9, "white", solid=False)
    for x in (-5.2, 5.2):
        P.lifebuoy(m, x, 0.55, 5.18, 0.28)
    # stalls along the back
    def kite_goods(mm):
        for k, c in enumerate(("red", "sun", "blue", "mint", "rose")):
            P.kite(mm, (-0.8 + k * 0.4, 1.5 + (k % 2) * 0.35, -0.2), c, 0.3, tail=False)
    P.stall(m, -3.8, -4.6, 0.0, ("red", "white"), "wood_light", kite_goods, 2.6)
    def ice(mm):
        for k, c in enumerate(("pink", "lemon", "mint", "wall_peach")):
            mm.lathe([(0, 0), (0.07, 0.2)], (-0.6 + k * 0.4, 1.08, 0.3), "wood_light", "Satin", 8, rot=(math.pi, 0, 0))
            mm.sphere((-0.6 + k * 0.4, 1.3, 0.3), 0.1, c, "Gloss", 10, 8)
    P.stall(m, 0.2, -4.6, 0.0, ("pink", "white"), "white", ice, 2.4)
    P.stall(m, 3.9, -4.6, 0.0, ("blue", "white"), "wood_light", None, 2.4)
    # lighthouse at the pier end (right)
    P.lighthouse(m, 7.9, -4.3, 5.2, s=0.8, glow=False)
    # bunting and festival poles
    for x, z in ((-6.9, -2.2), (-6.9, 3.0), (6.9, -2.2), (6.9, 3.0)):
        m.cyl((x, 0, z), 0.08, 3.4, "white", "Gloss", 8, 0.02)
        m.sphere((x, 3.45, z), 0.13, "sun", "Gloss", 10, 8)
        m.solid(x, z, 0.3, 0.3)
    P.bunting(m, (-6.9, 3.3, -2.2), (6.9, 3.3, -2.2), 0.6)
    P.bunting(m, (-6.9, 3.3, 3.0), (6.9, 3.3, 3.0), 0.6, ("sun", "blue", "red", "white"))
    P.bunting(m, (-6.9, 3.3, -2.2), (-6.9, 3.3, 3.0), 0.3, ("mint", "pink", "sun"))
    # the sky full of kites
    rr = random.Random(9)
    for k in range(9):
        x = -6 + k * 1.6 + rr.uniform(-0.4, 0.4)
        y = 5.5 + rr.uniform(0, 3.0)
        z = -3 + rr.uniform(-2, 3)
        P.kite(m, (x, y, z), ("red", "sun", "blue", "mint", "rose", "purple", "orange", "teal", "lemon")[k], rr.uniform(0.8, 1.3),
               rot=(rr.uniform(-0.3, 0.3), rr.uniform(-0.6, 0.6), rr.uniform(-0.4, 0.4)), name=f"Sway_kite{k}")
    # benches, barrels, crates
    P.bench(m, -4.2, 4.5, math.pi, "blue", solid=False)
    P.bench(m, 3.4, 4.5, math.pi, "red", solid=False)
    m.solid(-4.2, 4.45, 1.6, 0.6)
    m.solid(3.4, 4.45, 1.6, 0.6)
    P.barrel(m, -6.3, -3.4, 0.36)
    P.barrel(m, -6.0, 0.4, 0.3, "coral")
    P.crate(m, 6.3, 0.6, 0.6)
    P.crate(m, 6.3, 1.25, 0.45, "wood", y=0.6)
    P.umbrella(m, 1.9, 2.3, ("sun", "white"), 2.1, 1.0)
    P.table(m, 1.9, 2.3, 0.9, 0.9, "white", solid=True)
    P.lamp(m, -1.0, 4.7, 2.3, False, solid=False)
    # boats bobbing in the harbour
    P.boat(m, -4.0, 8.4, 0.3, "red", name="Bob_boat0", y=-1.55)
    P.boat(m, 4.5, 8.8, -0.5, "blue", name="Bob_boat1", y=-1.55, size=0.9)
    P.boat(m, 10.5, 1.0, 1.4, "sun", name="Bob_boat2", y=-1.55, size=0.8)
    npcs(m, [(-1.3, -1.0), (-3.8, -3.1), (2.5, 0.8), (4.8, -2.4), (-3.0, 2.4)])
    points(m, "find", [(-5.6, 3.8), (5.6, 3.7), (1.9, -3.4)])
    points(m, "hunt", [(-5.4, -1.6), (5.4, -0.8), (-1.8, 3.6), (0.6, -2.4)])
    m.anchor("spawn", 0.0, 2.8, math.pi)
    m.anchor("exit", -5.4, 1.2)
    m.anchor("act", 0.2, 0.8)
    m.extra = dict(backdrop=dict(x=-12, y=-5, z=-30, s=1.4, variant="old"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 5. The storm night on the harbour
# ---------------------------------------------------------------------------
def storm():
    m = Model("storm", ao_distance=1.3)
    P.slab(m, W, D, "slate", "iron", (("stone2", 0.5), ("rock2", 0.8)), r=0.5)
    P.cobbles(m, 0, 0, W - 0.2, D - 0.2, ("slate", "4a5570", "5d6884"), 0.5, y=0.003)
    P.water(m, 0, 0, 46, 38, "163f6b", "sea_night", 0.8, y=-0.9)
    # the kite shop and Nana's cottage along the back
    P.house(m, -4.6, -6.2, 4.2, 2.4, 2.8, "wall_peach", "roof_red", door_color="blue", glow=True, shutters="blue")
    P.house(m, 0.6, -6.3, 3.2, 2.2, 2.4, "wall_cream", "roof_blue", door_color="red", glow=True)
    # shop sign with a kite
    P.kite(m, (-4.6, 2.2, -4.85), "sun", 0.5, tail=False)
    # harbour wall on the right with bollards, lighthouse on the breakwater with a sweeping beam
    m.box((7.0, 0.3, 0), (0.9, 0.6, D - 0.6), "stone2", "Satin", 0.08, jitter=0.05)
    for z in (-3.6, -1.2, 1.2, 3.6):
        m.lathe([(0.2, 0), (0.22, 0.3), (0.3, 0.4), (0.26, 0.5), (0, 0.5)], (6.2, 0, z), "iron", "Gloss", 12)
        m.solid(6.2, z, 0.5, 0.5)
    m.solid(7.0, 0, 1.0, D)
    P.lighthouse(m, 9.4, -5.8, 6.0, beam=True, s=0.85)
    # pontoon with the Marigold straining at her ropes
    P.planks(m, 3.2, 6.6, 2.0, 3.4, ("plank2", "wood", "plank"), 0.3, y=-0.2, along="x")
    m.box((3.2, -0.45, 6.6), (2.1, 0.4, 3.5), "wood_dark", "Satin", 0.05)
    P.boat(m, 5.6, 7.4, 1.2, "red", name="Bob_marigold", y=-1.2)
    P.boat(m, -2.8, 7.8, -0.2, "sun", name="Bob_boat1", y=-1.2, size=0.85)
    m.tube([(4.0, 0.3, 5.2), (5.0, -0.2, 6.2), (5.5, 0.1, 6.8)], 0.035, "sand2", "Satin", 5)
    # lamps (warm, vivid against the dark blue)
    for x, z in ((-6.2, -3.4), (-1.6, -3.6), (2.8, -3.2), (-6.2, 3.4), (4.8, 3.8)):
        P.lamp(m, x, z, 2.4, True)
    # crates, barrels, nets, sandbags, puddles
    P.crate(m, -2.8, 1.6, 0.6, "wood_light", 0.3)
    P.crate(m, -2.3, 1.0, 0.5, "wood", -0.2)
    P.barrel(m, 1.0, 2.8, 0.34, "blue")
    P.barrel(m, 1.7, 3.3, 0.3, "red")
    for k in range(5):
        m.sphere((-5.6 + k * 0.42, 0.14, 4.3), (0.26, 0.16, 0.2), "sand2", "Satin", 10, 8, jitter=0.05)
    m.solid(-4.8, 4.3, 2.3, 0.5)
    for x, z, r in ((-0.6, 0.4, 0.8), (3.6, -1.0, 0.6), (-4.4, -1.8, 0.5)):
        m.cyl((x, 0.0, z), r, 0.02, "2a5a8a", "Water", 24, 0.0)
    # lobster pots & rope coils
    for x, z in ((4.6, -2.2), (5.1, -1.6)):
        m.lathe([(0.3, 0), (0.32, 0.3), (0.2, 0.5), (0, 0.52)], (x, 0, z), "sun", "Satin", 10)
        m.solid(x, z, 0.6, 0.6)
    for k in range(4):
        m.tube([(-0.2 + math.cos(a) * (0.28 - k * 0.04), 0.05 + k * 0.05, -2.2 + math.sin(a) * (0.28 - k * 0.04)) for a in (i * TAU / 12 for i in range(12))],
               0.04, "sand2", "Satin", 6, closed=True)
    # first-aid tent (Mum)
    with m.at(-4.9, 1.4):
        m.extrude([(-1.0, 0), (1.0, 0), (0, 1.5)], -0.9, 0.9, "white", "Satin", plane="xy", bevel=0.04)
        m.box((0, 0.9, 0.93), (0.36, 0.1, 0.02), "red", "Satin", 0.0)
        m.box((0, 0.9, 0.93), (0.1, 0.36, 0.02), "red", "Satin", 0.0)
        m.box((0, 0.5, 0.95), (0.7, 0.9, 0.02), "8a1f1f", "Matte", 0.0)
    m.solid(-4.9, 1.4, 2.1, 1.9)
    npcs(m, [(4.0, 3.0), (-3.4, 0.4), (-3.6, -3.1), (-0.8, -2.9), (1.8, 0.8)])
    points(m, "find", [(-5.6, -1.0), (2.2, -2.6), (-1.8, 3.6)])
    points(m, "hunt", [(-5.6, -3.4), (5.1, -3.5), (-0.8, 3.7), (2.4, -0.8)])
    m.anchor("spawn", -0.8, 2.6, math.pi)
    m.anchor("exit", -5.6, 3.2)
    m.anchor("act", 0.0, 0.0)
    m.extra = dict(backdrop=None, floor=0.0, night=True)
    return m


# ---------------------------------------------------------------------------
# 6. Clifftop station (early morning)
# ---------------------------------------------------------------------------
def station():
    m = Model("station", ao_distance=1.2)
    def top(x, z):
        if z < -4.3:
            return ("stone2", 0.08)
        if z > 4.5:
            return ("grass", 0.05)
        if -4.3 <= z < -3.9:
            return ("sun", 0.02)
        k = (math.floor(x / 0.55 + (math.floor(z / 0.55) % 2) * 0.5), math.floor(z / 0.55))
        return (("f3d9a8", "e9c48d", "f7e3bd", "dcb07a")[(k[0] * 7 + k[1] * 13) % 4], 0.02)
    P.slab(m, W, D, "stone", "stone2", top_fn=top, step=0.275)
    # tracks
    for x in range(-7, 8):
        m.box((x, 0.04, -5.25), (0.35, 0.08, 1.4), "wood_dark", "Satin", 0.02)
    for z in (-5.7, -4.8):
        m.box((0, 0.13, z), (W - 0.4, 0.08, 0.08), "metal", "Metal", 0.02)
    # the train
    with m.at(-2.2, -5.25):
        for i, (x, c) in enumerate(((-3.6, "red"), (0.0, "cream"), (3.6, "red"))):
            m.box((x, 1.25, 0), (3.4, 1.9, 1.45), c, "Gloss", 0.12)
            m.box((x, 2.3, 0), (3.5, 0.18, 1.5), "ink", "Gloss", 0.08)
            m.box((x, 0.4, 0), (3.2, 0.3, 1.3), "ink", "Satin", 0.05)
            for wx in (-1.0, 0.0, 1.0):
                m.box((x + wx, 1.55, 0.74), (0.7, 0.55, 0.04), "sky", "Gloss", 0.04)
            m.box((x, 0.95, 0.74), (3.3, 0.08, 0.04), "sun", "Gloss", 0.0)
            for wx in (-1.1, 1.1):
                m.cyl((x + wx, 0.3, 0.6), 0.28, 0.12, "iron", "Gloss", 16, 0.02, rot=(math.pi / 2, 0, 0))
        m.box((1.8, 1.0, 0.76), (0.5, 1.4, 0.04), "ffd88a", "Glow_warm", 0.02)  # open door, lit
        m.box((5.5, 1.2, 0), (0.6, 1.4, 1.2), "red", "Gloss", 0.2)
        m.cyl((5.7, 1.3, 0), 0.18, 0.1, "fff2c4", "Glow_warm", 16, 0.02, rot=(0, 0, math.pi / 2))
    m.solid(-2.2, -5.25, 12.0, 1.6)
    # canopy over the platform
    for x in (-5.0, -1.6, 1.8, 5.2):
        m.cyl((x, 0, -3.6), 0.09, 3.0, "iron", "Gloss", 10, 0.02)
        m.box((x, 2.85, -3.6), (0.2, 0.25, 1.4), "iron", "Gloss", 0.03)
        m.solid(x, -3.6, 0.3, 0.3)
    m.box((0, 3.05, -3.8), (12.4, 0.16, 2.2), "roof_teal", "Gloss", 0.06, rot=(-0.08, 0, 0))
    for k in range(20):
        m.sphere((-6.0 + k * 0.63, 2.9, -2.7), (0.32, 0.13, 0.05), "white", "Satin", 10, 6, clamp_top=0.0)
    # station building on the left
    with m.at(-7.6, -0.6, math.pi / 2):
        m.box((0, 1.5, 0), (4.4, 3.0, 2.4), "wall_cream", "Satin", 0.08)
        m.box((0, 3.1, 0), (4.8, 0.25, 2.8), "roof_teal", "Gloss", 0.06)
        m.box((0, 3.6, 0), (4.4, 0.8, 2.2), "roof_teal", "Gloss", 0.2, taper=(0.8, 0.6))
        P.door(m, -1.0, 1.21, 0.8, 1.6, "teal", "white")
        P.window(m, 0.8, 1.7, 1.22, 1.2, 0.9, "white", "sky")
        m.box((0.8, 2.7, 1.25), (2.2, 0.4, 0.06), "navy", "Gloss", 0.04)  # nameboard
        for k in range(9):
            m.box((-0.1 + k * 0.22, 2.7, 1.29), (0.14, 0.2, 0.02), "white", "Matte", 0.0, ao=False)
    m.solid(-7.2, -0.6, 2.8, 4.8)
    # clock on a post
    with m.at(2.8, -2.7):
        m.cyl((0, 0, 0), 0.07, 2.4, "iron", "Gloss", 10, 0)
        m.cyl((0, 2.55, -0.08), 0.34, 0.16, "sun", "Gloss", 24, 0.03, rot=(math.pi / 2, 0, 0))
        m.cyl((0, 2.55, 0.0), 0.28, 0.02, "white", "Satin", 24, 0.0, rot=(math.pi / 2, 0, 0))
        m.box((0, 2.62, 0.03), (0.03, 0.16, 0.01), "ink", "Satin", 0.0)
        m.box((0.06, 2.55, 0.03), (0.13, 0.03, 0.01), "ink", "Satin", 0.0)
    m.solid(2.8, -2.7, 0.3, 0.3)
    P.bench(m, -2.6, -3.0, 0.0, "red")
    P.bench(m, 5.4, -2.9, 0.0, "blue")
    # luggage pile
    for k, (x, z, c, s) in enumerate(((-4.2, 1.6, "coral", (0.7, 0.5, 0.35)), (-4.2, 1.6, "teal", (0.55, 0.35, 0.3)), (-3.6, 1.9, "sun", (0.5, 0.6, 0.3)))):
        m.box((x, s[1] / 2 + (0.5 if k == 1 else 0), z), s, c, "Gloss", 0.06)
        m.tube([(x - 0.12, s[1] + (0.5 if k == 1 else 0), z), (x, s[1] + 0.12 + (0.5 if k == 1 else 0), z), (x + 0.12, s[1] + (0.5 if k == 1 else 0), z)], 0.025, "ink", "Satin", 5)
    m.solid(-3.9, 1.75, 1.2, 0.8)
    # planters and the cliff edge fence
    for x in (-5.4, -1.8, 1.8, 5.4):
        with m.at(x, 4.6):
            m.box((0, 0.25, 0), (1.4, 0.5, 0.6), "wood", "Satin", 0.05)
        P.flowers(m, x, 4.6, 1.2, 0.4, ("red", "sun", "pink", "white"), 7, int(x * 10))
    P.rail(m, (-7.2, 5.2), (7.2, 5.2), "white", 0.8, "white", solid=False)
    for x in (-1.0, 4.0):
        P.lamp(m, x, 3.8, 2.4, False)
    npcs(m, [(-1.2, -2.0), (3.6, 1.6), (-3.2, -0.6), (0.8, -1.6), (4.8, -1.4)])
    points(m, "find", [(-5.4, 3.7), (5.6, 3.6), (0.4, 3.9)])
    points(m, "hunt", [(-5.4, -2.9), (1.1, 2.5), (5.6, 0.4), (-2.2, 3.4)])
    m.anchor("spawn", 0.0, 2.8, math.pi)
    m.anchor("exit", 0.2, -3.3)
    m.anchor("act", 1.6, 0.4)
    m.extra = dict(backdrop=dict(x=2, y=-10, z=-36, s=1.5, variant="ruined"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 7. Workplace (three trades: studio / workshop / clinic)
# ---------------------------------------------------------------------------
def workplace():
    m = Model("workplace", ao_distance=1.2)
    w, d = 13.6, 10.0
    P.slab(m, w, d, "cream", "stone2", (("stone", 0.3), ("stone2", 0.6)), r=0.25)
    P.planks(m, 0, 0, w - 0.1, d - 0.1, ("e9c38f", "ddb27c", "f2d09e"), 0.5, y=0.002)
    P.room(m, w, d, 3.8, wall="wall_cream", wain="wall_blue", trim="white", win_back=(-3.2, 0.2, 3.6), win_left=(-2.2, 1.6), win_w=2.2, win_h=1.9)
    # shared: door, coat rack, water cooler, notice board
    P.door(m, -6.78, 3.2, 0.9, 2.0, "sun", "white", rot=math.pi / 2)
    with m.at(-5.9, 3.8):
        m.cyl((0, 0, 0), 0.22, 0.05, "ink", "Gloss", 12, 0.01)
        m.cyl((0, 0, 0), 0.04, 1.9, "ink", "Gloss", 8, 0)
        m.sphere((0.15, 1.6, 0.05), (0.2, 0.35, 0.12), "coral", "Satin", 10, 8)
    with m.at(6.1, -4.3):
        m.box((0, 0.5, 0), (0.5, 1.0, 0.5), "white", "Gloss", 0.06)
        m.lathe([(0.2, 0), (0.24, 0.1), (0.24, 0.5), (0.1, 0.6), (0, 0.6)], (0, 1.0, 0), "sky", "Glass", 14)
    m.solid(6.1, -4.3, 0.6, 0.6)
    P.potted_plant(m, 6.1, 3.6, 1.3, "sun")
    # variants ---------------------------------------------------------
    with m.part("Var_studio"), m.variant("studio"):
        for x, z in ((-3.6, -2.2), (0.4, -2.4)):
            with m.at(x, z):
                m.box((0, 0.95, 0), (1.8, 0.08, 1.1), "white", "Gloss", 0.03, rot=(0.25, 0, 0))
                for sx in (-1, 1):
                    m.box((sx * 0.8, 0.45, 0), (0.08, 0.9, 0.9), "ink", "Gloss", 0.02)
                m.box((0.1, 1.07, 0.05), (1.2, 0.02, 0.8), "sky", "Satin", 0.0, rot=(0.25, 0, 0))
                m.box((0.2, 1.08, 0.05), (0.5, 0.02, 0.4), "sun", "Satin", 0.0, rot=(0.25, 0, 0))
                m.cyl((0.7, 1.0, -0.35), 0.03, 0.6, "ink", "Gloss", 6, 0)
                m.lathe([(0.02, 0), (0.16, -0.15), (0, -0.15)], (0.7, 1.7, -0.15), "ffe2a0", "Glow_warm", 12)
            m.solid(x, z, 1.9, 1.2)
        with m.at(-3.0, -4.8):
            m.box((0, 2.3, 0.05), (2.4, 1.3, 0.06), "wood_light", "Satin", 0.03)
            rr = random.Random(3)
            for k in range(9):
                m.box((-0.9 + (k % 3) * 0.9 + rr.uniform(-0.1, 0.1), 1.9 + (k // 3) * 0.4, 0.1), (0.5, 0.3, 0.02),
                      ("sun", "pink", "sky", "mint", "white", "coral")[k % 6], "Satin", 0.0, rot=(0, 0, rr.uniform(-0.1, 0.1)))
        for k in range(4):
            P.kite(m, (-2 + k * 1.8, 3.1, -1.0 + (k % 2) * 1.2), ("red", "sun", "blue", "mint")[k], 0.6, rot=(-0.8, 0.3 * k, 0.2), name=f"Sway_proto{k}")
        # the pier model on a table
        P.table(m, 3.4, 0.9, 2.0, 1.2, "white")
        with m.at(3.4, 0.9):
            m.box((0, 0.88, 0), (1.7, 0.06, 0.4), "wood_light", "Satin", 0.01)
            for x in (-0.6, -0.2, 0.2, 0.6):
                m.cyl((x, 0.85, 0), 0.03, 0.06, "wood_dark", "Satin", 6, 0)
            m.cyl((0.75, 0.9, 0), 0.08, 0.5, "white", "Gloss", 12, 0.01)
            m.cyl((0.75, 1.36, 0), 0.08, 0.1, "red", "Gloss", 12, 0.01)
        with m.at(5.4, -2.6, -math.pi / 2):
            m.box((0, 0.35, 0), (2.2, 0.7, 0.9), "coral", "Satin", 0.12)
            m.box((0, 0.85, -0.35), (2.2, 0.7, 0.25), "coral", "Satin", 0.1)
        m.solid(5.4, -2.6, 1.0, 2.3)
    with m.part("Var_workshop"), m.variant("workshop"):
        # boat on trestles
        with m.at(-1.6, -1.8, 0.15):
            for x in (-1.0, 1.0):
                m.box((x, 0.35, 0), (0.12, 0.7, 1.0), "wood", "Satin", 0.02, taper=(1, 0.4))
            m.sphere((0, 1.25, 0), (1.9, 0.62, 0.72), "blue", "Gloss", 26, 14, clamp_top=0.35)
            m.sphere((0, 1.3, 0), (1.92, 0.22, 0.73), "white", "Gloss", 26, 8, clamp_top=0.1, clamp_bottom=-0.02)
            for k in range(6):
                m.box((-1.2 + k * 0.48, 1.62, 0), (0.08, 0.05, 1.3), "wood_light", "Satin", 0.01)
        m.solid(-1.6, -1.8, 3.9, 1.6)
        with m.at(-0.8, -4.55):
            m.box((0, 0.85, 0), (3.2, 0.12, 0.8), "wood_light", "Satin", 0.03)
            for sx in (-1, 1):
                m.box((sx * 1.45, 0.42, 0), (0.12, 0.84, 0.7), "wood", "Satin", 0.02)
            m.box((0, 2.1, -0.32), (3.0, 1.2, 0.05), "wood", "Satin", 0.02)
            for k in range(8):
                m.box((-1.2 + k * 0.34, 2.1 + (k % 2) * 0.2, -0.26), (0.06, 0.5, 0.05), ("red", "sun", "blue", "iron")[k % 4], "Gloss", 0.01)
            m.box((0.8, 0.97, 0.1), (0.5, 0.12, 0.3), "red", "Gloss", 0.03)
        m.solid(-0.8, -4.55, 3.3, 0.9)
        for k in range(4):
            m.box((4.8, 0.1 + k * 0.16, -2.8 + (k % 2) * 0.05), (2.4, 0.14, 0.3), ("wood_light", "plank", "wood", "plank2")[k], "Satin", 0.02)
        m.solid(4.8, -2.8, 2.5, 0.5)
        for k in range(3):
            m.tube([(3.6 + math.cos(a) * (0.35 - k * 0.05), 0.06 + k * 0.06, 1.6 + math.sin(a) * (0.35 - k * 0.05)) for a in (i * TAU / 12 for i in range(12))],
                   0.05, "sand2", "Satin", 6, closed=True)
        m.solid(3.6, 1.6, 0.8, 0.8)
    with m.part("Var_clinic"), m.variant("clinic"):
        for x in (-3.6, 0.6):
            with m.at(x, -3.4):
                m.box((0, 0.55, 0), (1.1, 0.25, 2.0), "white", "Satin", 0.08)
                m.box((0, 0.72, -0.7), (0.9, 0.14, 0.45), "sky", "Satin", 0.07)
                m.box((0, 0.72, 0.25), (1.0, 0.1, 1.2), "mint", "Satin", 0.05)
                for sz in (-1, 1):
                    for sx in (-1, 1):
                        m.cyl((sx * 0.48, 0, sz * 0.9), 0.03, 0.45, "metal", "Metal", 6, 0)
                m.box((0, 0.9, -1.02), (1.1, 0.7, 0.06), "metal", "Metal", 0.03)
                m.cyl((0.8, 0, 0.0), 0.03, 2.4, "metal", "Metal", 6, 0)
                m.box((0.8, 1.4, 0.25), (0.04, 1.8, 1.4), "sky", "Satin", 0.02)
            m.solid(x, -3.4, 1.4, 2.2)
        with m.at(-5.9, -0.8, math.pi / 2):
            m.box((0, 1.0, 0), (1.2, 2.0, 0.5), "white", "Gloss", 0.05)
            m.box((0, 1.0, 0.26), (1.1, 1.9, 0.02), "sky", "Glass", 0.01)
            m.box((0, 1.6, 0.27), (0.3, 0.1, 0.02), "red", "Satin", 0.0)
            m.box((0, 1.6, 0.27), (0.1, 0.3, 0.02), "red", "Satin", 0.0)
        m.solid(-5.9, -0.8, 0.6, 1.3)
        P.table(m, 4.2, -2.2, 1.6, 0.9, "white")
        m.box((4.2, 1.05, -2.4), (0.6, 0.45, 0.05), "ink", "Gloss", 0.02)
        m.box((4.2, 1.05, -2.37), (0.52, 0.36, 0.02), "7ff0ff", "Glow_cyan", 0.0)
        for k in range(3):
            P.chair(m, 1.0 + k * 0.7, 2.6, math.pi, ("sun", "mint", "coral")[k])
        m.solid(1.7, 2.6, 2.2, 0.6)
    npcs(m, [(1.4, 0.1), (-3.2, 1.4), (4.0, -0.6), (-4.8, -0.2), (-0.8, 2.6)])
    points(m, "find", [(-5.3, 3.4), (5.2, 3.2), (2.4, -1.4)])
    points(m, "hunt", [(-2.4, 3.4), (5.5, -0.5), (-4.4, 0.6), (1.2, 1.6)])
    m.anchor("spawn", 0.0, 2.8, math.pi)
    m.anchor("exit", -5.4, 3.0)
    m.anchor("act", 0.2, 1.2)
    m.extra = dict(backdrop=dict(x=-6, y=-6, z=-32, s=1.4, variant="ruined"), floor=0.0, interior=True, variants=["studio", "workshop", "clinic"])
    return m


# ---------------------------------------------------------------------------
# 8. Rooftop party at sunset
# ---------------------------------------------------------------------------
def rooftop():
    m = Model("rooftop", ao_distance=1.2)
    P.slab(m, W, D, "orange", "brick2", (("brick", 0.8), ("brick2", 1.2)), r=0.3)
    P.tiles(m, 0, 0, W - 0.2, D - 0.2, "f7b184", "f0a172", 0.7, y=0.002)
    # parapet
    for (a, b, h) in (((-7.3, -5.3), (7.3, -5.3), 0.9), ((-7.3, -5.3), (-7.3, 5.3), 0.9), ((-7.3, 5.3), (7.3, 5.3), 0.45), ((7.3, -5.3), (7.3, 5.3), 0.45)):
        x0, z0 = a
        x1, z1 = b
        m.box(((x0 + x1) / 2, h / 2, (z0 + z1) / 2), (abs(x1 - x0) + 0.4, h, abs(z1 - z0) + 0.4), "brick", "Satin", 0.05)
        m.box(((x0 + x1) / 2, h + 0.05, (z0 + z1) / 2), (abs(x1 - x0) + 0.5, 0.1, abs(z1 - z0) + 0.5), "cream", "Satin", 0.03)
    # stair hut (exit) and water tower
    with m.at(-6.0, -4.3):
        m.box((0, 1.4, 0), (2.2, 2.8, 1.8), "wall_cream", "Satin", 0.08)
        m.box((0, 2.9, 0), (2.5, 0.2, 2.1), "roof_blue", "Gloss", 0.05)
        P.door(m, 0.2, 0.92, 0.8, 1.7, "blue", "white")
    m.solid(-6.0, -4.3, 2.4, 2.0)
    with m.at(6.0, -4.4):
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * 0.6, 0, sz * 0.6), 0.07, 2.2, "wood_dark", "Satin", 8, 0)
        m.cyl((0, 2.2, 0), 1.0, 1.6, "wood", "Satin", 20, 0.04, jitter=0.03)
        m.lathe([(1.08, 0), (0.6, 0.5), (0, 0.8)], (0, 3.8, 0), "roof_red", "Gloss", 20)
        for y in (2.5, 3.3):
            m.tube([(math.cos(a) * 1.02, y, math.sin(a) * 1.02) for a in (i * TAU / 20 for i in range(20))], 0.03, "iron", "Metal", 5, closed=True)
    m.solid(6.0, -4.4, 1.6, 1.6)
    # string light poles and zigzag lights
    poles = [(-6.9, -2.0), (-6.9, 3.0), (6.9, -2.0), (6.9, 3.0), (0.0, -5.0)]
    for x, z in poles:
        m.cyl((x, 0, z), 0.07, 3.2, "ink", "Gloss", 8, 0)
    P.string_lights(m, (-6.9, 3.2, -2.0), (6.9, 3.2, 3.0), 0.7)
    P.string_lights(m, (-6.9, 3.2, 3.0), (6.9, 3.2, -2.0), 0.7)
    P.string_lights(m, (-6.9, 3.2, -2.0), (0.0, 3.2, -5.0), 0.4)
    P.string_lights(m, (0.0, 3.2, -5.0), (6.9, 3.2, -2.0), 0.4)
    # planters
    for x in (-3.4, -0.4, 2.6):
        with m.at(x, -4.7):
            m.box((0, 0.35, 0), (2.0, 0.7, 0.7), "wood", "Satin", 0.05)
        P.bush(m, x - 0.4, -4.7, 0.7, "leaf2", int(x * 3), ("pink", "sun", "white"))
        P.bush(m, x + 0.5, -4.7, 0.6, "leaf", int(x * 5))
    m.solid(-0.4, -4.7, 8.0, 0.8)
    P.tree(m, 6.6, 1.4, 0.7, ("leaf2", "leaf"), seed=11)
    with m.at(6.6, 1.4):
        m.box((0, 0.3, 0), (0.9, 0.6, 0.9), "coral", "Satin", 0.05)
    # picnic tables with food and candles
    for x, z, c in ((-2.4, 0.2, "coral"), (2.4, -1.4, "sky")):
        with m.at(x, z):
            m.box((0, 0.75, 0), (2.0, 0.1, 0.9), "wood_light", "Satin", 0.03)
            m.box((0, 0.81, 0), (1.9, 0.02, 0.4), c, "Satin", 0.0)
            for sz in (-1, 1):
                m.box((0, 0.42, sz * 0.7), (2.0, 0.08, 0.3), "wood_light", "Satin", 0.02)
                for sx in (-1, 1):
                    m.box((sx * 0.8, 0.2, sz * 0.7), (0.08, 0.4, 0.25), "wood", "Satin", 0.01)
            for sx in (-1, 1):
                m.box((sx * 0.8, 0.37, 0), (0.1, 0.74, 0.8), "wood", "Satin", 0.02)
            for k, (px, fc) in enumerate(((-0.6, "red"), (-0.1, "sun"), (0.45, "lime"))):
                m.cyl((px, 0.8, 0.1), 0.2, 0.03, "white", "Gloss", 16, 0.01)
                m.sphere((px, 0.87, 0.1), (0.13, 0.06, 0.13), fc, "Gloss", 10, 6)
            m.cyl((0.8, 0.8, -0.2), 0.05, 0.12, "cream", "Satin", 8, 0.01)
            m.sphere((0.8, 0.97, -0.2), (0.03, 0.05, 0.03), "ffc861", "Glow_warm", 6, 4)
        m.solid(x, z, 2.1, 1.8)
    # deck chairs
    for x, z, c in ((4.4, 2.6, "sun"), (5.4, 2.2, "teal")):
        with m.at(x, z, 2.6):
            m.box((0, 0.35, 0), (0.6, 0.05, 1.2), c, "Satin", 0.02, rot=(0.3, 0, 0))
            for sx in (-1, 1):
                m.tube([(sx * 0.3, 0, 0.5), (sx * 0.3, 0.3, 0), (sx * 0.3, 0.75, -0.55)], 0.03, "wood", "Satin", 6, smooth_path=False)
        m.solid(x, z, 0.9, 0.9)
    # neighbouring roofs below
    for k, (x, z, c) in enumerate(((-11, -4, "roof_blue"), (-10.5, 4, "roof_teal"), (11, -3, "roof_red"), (10.5, 5, "roof_orange"), (2, -10, "roof_purple"), (-5, -10, "roof_red"))):
        with m.at(0, 0, 0, y=-3.2):
            P.house(m, x, z, 3.6, 3.0, 2.4, ("wall_yellow", "wall_pink", "wall_mint", "wall_blue", "wall_cream", "wall_lilac")[k], c,
                    rot=0 if abs(z) > 8 else (math.pi / 2 if x < 0 else -math.pi / 2), chimney=True, door_color=None, glow=True, solid=False)
    npcs(m, [(-2.8, -1.7), (0.8, -3.0), (3.6, 0.8), (-4.0, 2.2), (4.6, -2.3), (-1.3, 2.7)])
    points(m, "find", [(-5.4, 3.8), (5.4, 3.9), (2.4, 3.7)])
    points(m, "hunt", [(-5.4, -1.2), (0.4, 1.6), (5.4, -0.8), (-0.8, -3.1)])
    m.anchor("spawn", 0.0, 2.9, math.pi)
    m.anchor("exit", -5.2, -2.8)
    m.anchor("act", 0.0, -0.6)
    m.extra = dict(backdrop=dict(x=-4, y=-9, z=-30, s=1.4, variant="ruined"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 9. Family kitchen (evening)
# ---------------------------------------------------------------------------
def kitchen():
    m = Model("kitchen", ao_distance=1.2)
    w, d = 13.6, 10.0
    P.slab(m, w, d, "cream", "wood_dark", (("wood", 0.3), ("stone2", 0.6)), r=0.25)
    P.tiles(m, 0, 0, w - 0.1, d - 0.1, "fff1d6", "8ee6c4", 0.62, y=0.002)
    P.room(m, w, d, 3.6, wall="wall_peach", wain="wall_mint", trim="white", win_back=(-0.6,), win_left=(0.8,), glow=False, view_glass="4a67b5",
           win_w=1.6, win_h=1.3)
    # kitchen run along the back wall
    with m.at(-1.2, -4.45):
        m.box((0, 0.46, 0), (6.8, 0.92, 0.9), "mint", "Gloss", 0.05)
        m.box((0, 0.96, 0.02), (7.0, 0.08, 0.96), "wood_light", "Satin", 0.03)
        for k in range(6):
            m.box((-2.9 + k * 1.15, 0.5, 0.46), (1.0, 0.75, 0.03), kit.shade("mint", 1.08), "Gloss", 0.02)
            m.box((-2.9 + k * 1.15, 0.78, 0.49), (0.3, 0.04, 0.03), "metal", "Metal", 0.01)
        m.box((0.6, 0.97, 0.05), (0.9, 0.04, 0.6), "metal", "Metal", 0.02)  # sink
        m.tube([(0.6, 1.0, -0.3), (0.6, 1.4, -0.3), (0.6, 1.45, -0.1), (0.6, 1.3, 0.0)], 0.03, "metal", "Metal", 6)
        # stove + pot
        m.box((2.6, 0.99, 0.0), (1.0, 0.04, 0.8), "ink", "Gloss", 0.02)
        m.cyl((2.4, 1.0, 0.1), 0.28, 0.35, "red", "Gloss", 16, 0.03)
        m.cyl((2.4, 1.35, 0.1), 0.3, 0.04, "red", "Gloss", 16, 0.01)
        m.sphere((2.4, 1.42, 0.1), 0.05, "ink", "Gloss", 8, 6)
        # upper cabinets
        for k, x in enumerate((-2.8, -1.8, 2.2, 3.2)):
            m.box((x, 2.55, 0.1), (0.95, 0.85, 0.5), "mint", "Gloss", 0.05)
            m.box((x + 0.3, 2.3, 0.37), (0.04, 0.2, 0.03), "metal", "Metal", 0.01)
        # jars, fruit bowl
        for k, c in enumerate(("coral", "sun", "sky")):
            m.cyl((-2.6 + k * 0.35, 1.0, -0.15), 0.12, 0.3, "white", "Glass", 12, 0.02)
            m.cyl((-2.6 + k * 0.35, 1.0, -0.15), 0.1, 0.2, c, "Satin", 10, 0.01)
        m.lathe([(0, 0), (0.1, 0), (0.3, 0.12), (0.28, 0.14), (0, 0.05)], (-1.0, 1.0, 0.0), "blue", "Gloss", 16)
        for k, c in enumerate(("red", "sun", "lime", "orange")):
            m.sphere((-1.1 + k * 0.08, 1.12 + (k % 2) * 0.06, 0.05 - k * 0.04), 0.09, c, "Gloss", 10, 8)
    m.solid(-1.2, -4.45, 7.0, 1.0)
    # fridge covered in drawings
    with m.at(-5.9, -4.4):
        m.box((0, 1.1, 0), (1.1, 2.2, 0.95), "cream", "Gloss", 0.12)
        m.box((0, 1.45, 0.49), (1.0, 0.03, 0.02), kit.shade("cream", 0.8), "Satin", 0.0)
        m.box((0.4, 1.0, 0.5), (0.06, 0.5, 0.04), "metal", "Metal", 0.02)
        rr = random.Random(4)
        for k in range(5):
            m.box((-0.2 + rr.uniform(-0.2, 0.2), 1.1 + k * 0.2, 0.49), (0.3, 0.24, 0.01), ("sun", "sky", "pink", "white", "lime")[k], "Satin", 0.0,
                  rot=(0, 0, rr.uniform(-0.2, 0.2)))
    m.solid(-5.9, -4.4, 1.2, 1.1)
    # dining table with chairs and dinner
    P.table(m, -2.6, 0.2, 2.2, 1.3, "wood", cloth="coral", solid=True)
    for k, (dx, dz, r) in enumerate(((-0.6, -0.9, 0.0), (0.6, -0.9, 0.0), (-0.6, 0.9, math.pi), (0.6, 0.9, math.pi))):
        P.chair(m, -2.6 + dx, 0.2 + dz, r, ("sun", "sky", "mint", "pink")[k])
    m.solid(-2.6, 0.2, 2.4, 2.4)
    for k, (dx, dz) in enumerate(((-0.6, -0.3), (0.6, -0.3), (-0.6, 0.3), (0.6, 0.3))):
        m.cyl((-2.6 + dx, 0.84, 0.2 + dz), 0.2, 0.03, "white", "Gloss", 16, 0.01)
    m.cyl((-2.6, 0.84, 0.2), 0.25, 0.14, "wood_light", "Satin", 16, 0.03)
    m.sphere((-2.6, 0.98, 0.2), (0.22, 0.08, 0.22), "orange", "Gloss", 12, 8)
    for x in (-3.4, -1.8):
        m.cyl((x, 2.6, 0.2), 0.012, 1.0, "ink", "Satin", 4, 0)
        m.lathe([(0.02, 0), (0.3, -0.25), (0.28, -0.28), (0, -0.2)], (x, 2.6, 0.2), "ffe2a0", "Glow_warm", 16)
    # sofa corner
    with m.at(4.6, -2.8, -math.pi / 2):
        m.box((0, 0.3, 0), (2.8, 0.6, 1.1), "blue", "Satin", 0.15)
        m.box((0, 0.8, -0.45), (2.8, 0.8, 0.3), "blue", "Satin", 0.14)
        for sx in (-1, 1):
            m.box((sx * 1.35, 0.55, 0), (0.3, 0.6, 1.1), "blue", "Satin", 0.12)
        m.box((-0.6, 0.72, 0.0), (0.5, 0.4, 0.16), "sun", "Satin", 0.08, rot=(-0.3, 0.2, 0))
    m.solid(4.6, -2.8, 1.2, 3.0)
    P.rug(m, 3.2, -1.2, 1.4, ("purple", "lilac", "white", "lilac"))
    P.shelf(m, -6.5, -1.8, 1.6, 2.0, "wood", rot=math.pi / 2, seed=9)
    # cat bed + school bag + coat hooks by the door
    with m.at(1.4, 2.8):
        m.lathe([(0, 0), (0.45, 0), (0.5, 0.15), (0.42, 0.2), (0.35, 0.08), (0, 0.08)], (0, 0, 0), "coral", "Satin", 20)
        m.sphere((0, 0.2, 0), (0.28, 0.15, 0.22), "orange", "Satin", 12, 8)
        m.sphere((0.2, 0.28, 0.1), 0.12, "orange", "Satin", 12, 8)
        for s in (-1, 1):
            m.lathe([(0.04, 0), (0, 0.08)], (0.2 + s * 0.06, 0.36, 0.08), "orange", "Satin", 6)
    m.solid(1.4, 2.8, 1.0, 1.0)
    P.door(m, -6.78, 2.8, 0.9, 2.0, "red", "white", rot=math.pi / 2)
    for k, c in enumerate(("sun", "blue", "rose")):
        m.sphere((-6.55, 1.8, 1.7 - k * 0.35), (0.12, 0.3, 0.1), c, "Satin", 10, 8)
    with m.at(-5.6, 1.4):
        m.box((0, 0.25, 0), (0.5, 0.5, 0.25), "red", "Gloss", 0.08)
        m.tube([(-0.15, 0.5, 0), (0, 0.62, 0), (0.15, 0.5, 0)], 0.03, "ink", "Satin", 5)
    # wall clock
    m.cyl((3.2, 2.7, -d / 2 + 0.05), 0.35, 0.08, "sun", "Gloss", 24, 0.03, rot=(math.pi / 2, 0, 0))
    m.cyl((3.2, 2.7, -d / 2 + 0.13), 0.28, 0.02, "white", "Satin", 24, 0.0, rot=(math.pi / 2, 0, 0))
    npcs(m, [(-3.0, -1.5), (1.8, -1.6), (0.4, 1.6), (4.2, 1.4), (-4.8, 2.6)])
    points(m, "find", [(-4.9, -0.9), (5.3, 3.4), (2.9, -3.4)])
    points(m, "hunt", [(-0.4, -3.6), (5.4, -0.2), (-4.4, 3.5), (2.8, 3.6)])
    m.anchor("spawn", -0.4, 2.8, math.pi)
    m.anchor("exit", -5.6, 2.8)
    m.anchor("act", 0.4, -0.6)
    m.extra = dict(backdrop=None, floor=0.0, interior=True)
    return m


# ---------------------------------------------------------------------------
# 10. Town square on the day of the vote
# ---------------------------------------------------------------------------
def square():
    m = Model("square", ao_distance=1.3)
    P.slab(m, W, D, "stone", "stone2")
    P.cobbles(m, 0, 0, W - 0.2, D - 0.2, ("e9dcc4", "dccdb1", "f2e6cf", "e6c9a0"), 0.5, y=0.003, weights=(4, 3, 3, 1))
    # town hall
    with m.at(-1.2, -6.4):
        m.box((0, 2.2, 0), (8.6, 4.4, 2.6), "cream", "Satin", 0.08)
        m.box((0, 4.5, 0.1), (9.0, 0.3, 2.9), "white", "Satin", 0.06)
        m.extrude([(-3.2, 4.6), (3.2, 4.6), (0, 5.9)], 1.1, 1.5, "cream", "Satin", plane="xy", bevel=0.05)
        m.cyl((0, 5.0, 1.45), 0.42, 0.1, "sun", "Gloss", 24, 0.02, rot=(math.pi / 2, 0, 0))
        for x in (-2.7, -1.35, 1.35, 2.7):
            m.cyl((x, 0.4, 1.55), 0.24, 4.1, "white", "Satin", 18, 0.03)
            m.box((x, 4.45, 1.55), (0.6, 0.18, 0.6), "white", "Satin", 0.03)
            m.box((x, 0.5, 1.55), (0.6, 0.2, 0.6), "white", "Satin", 0.03)
        for k in range(3):
            m.box((0, 0.1 + k * 0.1, 2.2 - k * 0.22), (7.0 - k * 0.3, 0.2, 0.5), "stone", "Satin", 0.03)
        P.door(m, 0, 1.32, 1.4, 2.4, "navy", "white")
        for x in (-3.6, 3.6):
            P.window(m, x, 2.6, 1.32, 0.9, 1.5, "white", "sky")
        # clock tower
        m.box((0, 6.2, 0), (1.8, 2.4, 1.8), "cream", "Satin", 0.05)
        m.cyl((0, 6.5, 0.92), 0.6, 0.1, "white", "Gloss", 24, 0.02, rot=(math.pi / 2, 0, 0))
        m.box((0, 6.65, 1.0), (0.06, 0.34, 0.02), "ink", "Satin", 0.0)
        m.box((0.1, 6.5, 1.0), (0.24, 0.05, 0.02), "ink", "Satin", 0.0)
        m.lathe([(1.2, 0), (0.1, 1.4), (0, 1.5)], (0, 7.4, 0), "roof_teal", "Gloss", 4, rot=(0, math.pi / 4, 0), smooth=False)
        m.cyl((0, 8.9, 0), 0.03, 0.8, "iron", "Satin", 6, 0)
        m.extrude([(0, 9.6), (0.6, 9.45), (0, 9.3)], -0.01, 0.01, "sun", "Satin", plane="xy")
    m.solid(-1.2, -5.8, 9.0, 3.6)
    # fountain
    with m.at(-3.2, -0.8):
        m.cyl((0, 0, 0), 1.4, 0.55, "stone", "Satin", 32, 0.08)
        m.cyl((0, 0.05, 0), 1.2, 0.45, "5cc8ff", "Water", 32, 0.0)
        m.cyl((0, 0.4, 0), 0.25, 1.0, "stone", "Satin", 16, 0.04)
        m.lathe([(0, 0), (0.7, 0.05), (0.72, 0.2), (0.6, 0.22), (0, 0.12)], (0, 1.3, 0), "stone", "Satin", 24)
        m.cyl((0, 1.45, 0), 0.55, 0.04, "5cc8ff", "Water", 24, 0.0)
        m.sphere((0, 1.75, 0), (0.12, 0.28, 0.12), "d7f6ff", "Glass", 10, 8)
    m.solid(-3.2, -0.8, 2.9, 2.9)
    # the stage with banners: teal = save the pier, purple = the marina
    with m.at(4.4, -3.8):
        m.box((0, 0.25, 0), (3.4, 0.5, 2.0), "wood", "Satin", 0.05)
        m.box((0, 0.25, 1.0), (3.4, 0.4, 0.04), "red", "Satin", 0.0)
        m.box((0.8, 0.95, 0.3), (0.6, 0.9, 0.4), "wood_light", "Satin", 0.04)
        for sx, c in ((-1.6, "teal"), (1.6, "purple")):
            m.cyl((sx, 0.5, -0.8), 0.05, 2.6, "iron", "Gloss", 8, 0)
            m.box((sx, 2.2, -0.75), (1.0, 1.3, 0.04), c, "Satin", 0.02)
            m.box((sx, 2.35, -0.72), (0.7, 0.15, 0.02), "white", "Satin", 0.0)
            m.box((sx, 2.0, -0.72), (0.5, 0.1, 0.02), "white", "Satin", 0.0)
    m.solid(4.4, -3.8, 3.6, 2.2)
    # rows of chairs facing the stage
    for r_ in range(3):
        for k in range(4):
            P.chair(m, 2.6 + k * 0.75, -0.9 + r_ * 1.0, math.pi * 0.95, ("sun", "white", "sky", "white")[k % 4])
    m.solid(3.7, 0.1, 3.1, 2.6)
    # market stalls & trees in planters, lamps, bunting
    def veg(mm):
        for k, c in enumerate(("red", "lime", "orange", "purple", "sun")):
            mm.sphere((-0.8 + k * 0.4, 1.14, 0.25), 0.12, c, "Gloss", 10, 8)
    P.stall(m, -6.3, 2.6, math.pi / 2, ("teal", "white"), "wood_light", veg, 2.2)
    for x, z in ((0.8, 3.9), (-2.4, 3.9)):
        with m.at(x, z):
            m.box((0, 0.35, 0), (0.9, 0.7, 0.9), "stone2", "Satin", 0.05)
        P.tree(m, x, z, 0.8, ("leaf", "leaf2"), seed=int(x * 7), solid=False)
        m.solid(x, z, 1.0, 1.0)
    for x, z in ((-6.0, -2.8), (6.2, 2.6)):
        P.lamp(m, x, z, 2.5, False)
    P.bunting(m, (-7.0, 3.6, -3.4), (7.0, 3.6, -3.4), 0.7, ("teal", "white", "sun"))
    npcs(m, [(-0.6, -2.5), (1.6, 2.6), (4.8, -1.6), (-4.8, 1.2), (0.8, -0.2)])
    points(m, "find", [(-5.4, 3.6), (5.6, 3.8), (-0.6, 1.6)])
    points(m, "hunt", [(-5.3, -2.0), (5.8, 2.0), (-1.4, 3.6), (1.9, -3.6)])
    m.anchor("spawn", 0.0, 2.9, math.pi)
    m.anchor("exit", -5.6, -0.6)
    m.anchor("act", 1.2, 0.8)
    m.extra = dict(backdrop=dict(x=10, y=-6, z=-30, s=1.5, variant="ruined"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 11. Nana's cottage garden by the sea (late afternoon)
# ---------------------------------------------------------------------------
def cottage():
    m = Model("cottage", ao_distance=1.3)
    def top(x, z):
        path = abs(x - 0.3 * z - 0.6) < 0.5 and -4.5 < z < 4.5
        return ("sand", 0.06) if path else P.meadow(seed=4.0)(x, z)
    P.slab(m, W, D, "grass", "grass_dark", top_fn=top)
    # the cottage: white walls, big soft thatch
    with m.at(-3.8, -6.1):
        m.box((0, 1.3, 0), (5.0, 2.6, 2.6), "white", "Satin", 0.1)
        m.box((0, 0.15, 0), (5.1, 0.3, 2.7), "stone2", "Satin", 0.05)
        m.sphere((0, 2.7, 0), (3.1, 1.5, 1.8), "sand2", "Satin", 30, 16, clamp_bottom=0.0, jitter=0.04)
        m.sphere((0, 2.72, 0), (3.12, 0.25, 1.82), "wood_light", "Satin", 30, 8, clamp_bottom=0.0, clamp_top=0.06)
        m.sphere((1.5, 3.6, -0.2), (0.35, 0.8, 0.35), "brick", "Satin", 10, 8, clamp_bottom=-0.3)
        P.door(m, 0.4, 1.32, 0.8, 1.6, "blue", "white")
        for x in (-1.6, 1.8):
            P.window(m, x, 1.45, 1.32, 0.6, 0.65, "white", "sky", shutters="blue")
        for k in range(8):  # climbing roses
            a = k * 0.8
            m.sphere((-0.3 + math.cos(a) * 0.2 + (k % 3) * 0.1, 0.5 + k * 0.22, 1.36), 0.1, ("rose", "leaf")[k % 2], "Satin", 8, 6)
    m.solid(-3.8, -6.1, 5.4, 3.0)
    # vegetable beds
    for x, crop in ((-1.2, "cabbage"), (2.2, "carrot")):
        with m.at(x, -3.4):
            m.box((0, 0.2, 0), (2.4, 0.4, 1.1), "wood", "Satin", 0.05)
            m.grid((0, 0.38, 0), 2.2, 0.9, "soil", "Matte", 0.2, jitter=0.1)
            for k in range(6):
                px = -0.9 + (k % 3) * 0.9
                pz = -0.22 + (k // 3) * 0.45
                if crop == "cabbage":
                    m.sphere((px, 0.52, pz), (0.2, 0.16, 0.2), "lime", "Satin", 12, 8)
                    m.sphere((px, 0.56, pz), (0.12, 0.12, 0.12), "leaf2", "Satin", 10, 8)
                else:
                    for j in range(3):
                        m.capsule((px + j * 0.08 - 0.08, 0.4, pz), (px + j * 0.1 - 0.1, 0.62, pz + 0.03), 0.025, "leaf", "Satin", 5)
                    m.lathe([(0.05, 0), (0, -0.12)], (px, 0.43, pz), "orange", "Satin", 8)
        m.solid(x, -3.4, 2.4, 1.1)
    # low stone wall along the sea side with a gate
    for x in range(-7, 8):
        if 5 <= x <= 6:
            continue
        m.rock((x * 1.0, 0.1, 5.0), (0.55, 0.45, 0.42), "stone", "Satin", seed=x + 20)
    m.solid(0, 5.0, 15, 0.8)
    for z in range(-4, 5):
        m.rock((7.0, 0.1, z * 1.0), (0.42, 0.45, 0.55), "stone2", "Satin", seed=z + 40)
    m.solid(7.0, 0.0, 0.8, 11)
    # bench facing the sea
    P.bench(m, 4.0, 3.5, math.pi * 0.8, "wood")
    # bird bath, apple tree, flowers, kite on the shed
    with m.at(1.9, 0.6):
        m.cyl((0, 0, 0), 0.12, 0.8, "stone", "Satin", 12, 0.02, r2=0.08)
        m.lathe([(0, 0), (0.5, 0.05), (0.52, 0.16), (0.45, 0.16), (0, 0.1)], (0, 0.8, 0), "stone", "Satin", 20)
        m.cyl((0, 0.86, 0), 0.44, 0.04, "5cc8ff", "Water", 20, 0.0)
        m.sphere((0.25, 1.04, 0.1), (0.1, 0.08, 0.14), "sky", "Gloss", 10, 8)
        m.sphere((0.25, 1.13, 0.2), 0.06, "sky", "Gloss", 8, 6)
    m.solid(1.9, 0.6, 0.6, 0.6)
    P.tree(m, 6.0, -3.8, 1.1, ("leaf2", "leaf"), seed=13)
    for k in range(5):
        m.sphere((6.0 + math.cos(k * 1.3) * 0.7, 1.8 + (k % 2) * 0.4, -3.8 + math.sin(k * 1.3) * 0.6), 0.09, "red", "Gloss", 8, 6)
    with m.at(5.4, -5.8):
        m.box((0, 1.0, 0), (2.4, 2.0, 1.6), "wood", "Satin", 0.06, jitter=0.05)
        m.box((0, 2.1, 0), (2.7, 0.15, 1.9), "roof_teal", "Gloss", 0.04, rot=(0.12, 0, 0))
        P.door(m, -0.4, 0.82, 0.7, 1.5, "sun", "white")
        P.kite(m, (0.6, 1.3, 0.85), "red", 0.45, tail=True)
    m.solid(5.4, -5.8, 2.6, 1.8)
    P.flowers(m, -5.8, 2.8, 1.8, 2.2, ("rose", "sun", "white", "purple", "coral"), 18, 5)
    m.solid(-5.8, 2.8, 1.6, 2.0)
    P.flowers(m, -2.8, -4.7, 3.6, 0.5, ("pink", "sun", "white"), 12, 6)
    P.bush(m, -6.6, -2.0, 1.0, "leaf2", 7, ("pink", "white"))
    P.grass_tufts(m, 0, 0, 12, 8, 26, seed=9)
    npcs(m, [(-2.6, -1.7), (3.4, 2.0), (0.6, -1.6), (-1.8, 1.8), (4.8, -1.4)])
    points(m, "find", [(-4.6, 0.2), (5.8, 1.5), (-0.9, 3.7)])
    points(m, "hunt", [(-4.6, -2.9), (4.2, 0.2), (-1.2, 3.7), (0.4, -1.8)])
    m.anchor("spawn", 0.6, 2.8, math.pi)
    m.anchor("exit", 5.6, 4.0)
    m.anchor("act", 1.6, 2.2)
    m.extra = dict(backdrop=dict(x=8, y=-6, z=-32, s=1.4, variant="dynamic"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# 12. The clifftop at the last festival (golden sunset)
# ---------------------------------------------------------------------------
def clifftop():
    m = Model("clifftop", ao_distance=1.3)
    def top(x, z):
        return P.meadow(seed=5.0)(x, z)
    P.slab(m, W, D, "grass", "grass_dark", (("cliff", 0.9), ("cliff2", 1.2), ("rock", 1.4)), top_fn=top)
    P.lighthouse(m, -5.6, -4.3, 6.6, s=1.05)
    with m.at(-2.6, -5.6):
        m.box((0, 0.9, 0), (2.2, 1.8, 1.6), "white", "Satin", 0.08)
        m.box((0, 1.95, 0), (2.5, 0.3, 1.9), "roof_red", "Gloss", 0.08)
        P.door(m, 0.3, 0.82, 0.7, 1.4, "blue", "white")
    m.solid(-2.6, -5.6, 2.4, 1.8)
    # rope fence along the cliff edge (front and right)
    for x in range(-7, 8, 2):
        m.cyl((x, 0, 5.1), 0.07, 0.9, "wood", "Satin", 8, 0.02)
    for z in range(-5, 6, 2):
        m.cyl((7.1, 0, z), 0.07, 0.9, "wood", "Satin", 8, 0.02)
    m.tube([(x, 0.75 - 0.08 * math.cos(x * math.pi / 2) ** 2, 5.1) for x in range(-7, 8)], 0.025, "sand2", "Satin", 5)
    m.tube([(7.1, 0.75 - 0.08 * math.cos(z * math.pi / 2) ** 2, z) for z in range(-5, 6)], 0.025, "sand2", "Satin", 5)
    # bench facing the sea, picnic blanket, cairn
    P.bench(m, 3.0, -2.4, math.pi * 0.75, "wood")
    with m.at(-1.2, 1.4, 0.3):
        def check(x, z):
            return ("red" if (math.floor(x / 0.4) + math.floor(z / 0.4)) % 2 else "white", 0.02)
        m.grid((0, 0.02, 0), 2.4, 1.8, "red", "Satin", 0.2, colors=P.pattern(m, check))
        m.box((0.7, 0.18, -0.4), (0.6, 0.3, 0.4), "wood", "Satin", 0.06)
        m.tube([(0.5, 0.33, -0.4), (0.7, 0.5, -0.4), (0.9, 0.33, -0.4)], 0.025, "wood_dark", "Satin", 5)
    for k in range(4):
        m.rock((5.6, 0.12 + k * 0.28, -4.0), (0.45 - k * 0.08, 0.2, 0.4 - k * 0.07), "stone", "Satin", seed=k + 60)
    m.solid(5.6, -4.0, 1.0, 1.0)
    # wildflowers everywhere
    P.flowers(m, -4.6, 2.8, 2.4, 2.0, ("sun", "white", "purple", "rose"), 16, 21)
    P.flowers(m, 4.4, 2.9, 2.6, 1.8, ("coral", "sun", "white", "lilac"), 16, 22)
    P.flowers(m, 1.2, -4.6, 3.0, 0.8, ("rose", "white", "sun"), 12, 23)
    for x, z in ((-4.6, 2.8), (4.4, 2.9)):
        m.solid(x, z, 2.0, 1.6)
    P.bush(m, 6.4, -4.6, 1.0, "leaf2", 24, ("sun", "white"))
    P.grass_tufts(m, 0, 0, 13, 9, 30, seed=25)
    # the sky full of kites for the last festival
    rr = random.Random(12)
    for k in range(12):
        x = -7 + k * 1.3 + rr.uniform(-0.5, 0.5)
        y = 6.0 + rr.uniform(0, 4.0)
        z = -1 + rr.uniform(-5, 5)
        P.kite(m, (x, y, z), ("red", "sun", "blue", "mint", "rose", "purple", "orange", "teal", "lemon", "coral", "sky", "lime")[k], rr.uniform(0.8, 1.4),
               rot=(rr.uniform(-0.3, 0.3), rr.uniform(-0.6, 0.6), rr.uniform(-0.4, 0.4)), name=f"Sway_kite{k}")
    npcs(m, [(-2.6, -0.9), (1.2, -1.2), (2.8, 1.4), (-3.6, 1.2), (-0.4, 2.8)], center=(0.6, 0.6))
    points(m, "find", [(-4.2, -1.9), (5.5, 0.4), (-0.4, -3.6)])
    points(m, "hunt", [(-5.4, 0.6), (5.6, -1.6), (0.9, 3.8), (-1.6, -3.2)])
    m.anchor("spawn", 0.2, 2.6, math.pi)
    m.anchor("exit", 5.3, 1.6)
    m.anchor("act", 0.6, 0.6)
    m.extra = dict(backdrop=dict(x=-4, y=-19, z=-46, s=1.7, variant="dynamic"), floor=0.0)
    return m


# ---------------------------------------------------------------------------
# Harbour backdrop: the town on the hill and the pier in four states
# ---------------------------------------------------------------------------
def harbour():
    m = Model("harbour", ao_distance=1.6, seed=3)
    rr = random.Random(21)
    # terraced hill with houses
    for row in range(4):
        y = row * 1.6
        z = -row * 2.6
        m.box((0, y - 0.6, z), (30 - row * 3, 1.6, 3.2), ("grass", "grass2", "grass", "leaf")[row], "Matte", 0.3, jitter=0.03)
        m.box((0, y - 1.5, z + 1.5), (30 - row * 3, 1.4, 0.4), "stone", "Satin", 0.1, jitter=0.06)
        x = -13.5 + row * 1.5
        with m.at(0, 0, 0, y=y + 0.2):
            while x < 13.5 - row * 1.5:
                ww = rr.uniform(1.6, 2.4)
                P.house(m, x + ww / 2, z, ww, 1.8, rr.uniform(1.6, 2.4),
                        rr.choice(("wall_yellow", "wall_pink", "wall_mint", "wall_blue", "wall_cream", "wall_peach", "wall_lilac")),
                        rr.choice(("roof_red", "roof_blue", "roof_teal", "roof_orange", "roof_purple")),
                        door_color=rr.choice(("red", "blue", "sun", "teal")), windows=1, chimney=rr.random() < 0.5, solid=False)
                x += ww + rr.uniform(0.3, 0.8)
            if row == 3:
                for k in range(6):
                    P.tree(m, -12 + k * 4.6 + rr.uniform(-1, 1), z - 1.0, 1.0, ("leaf", "leaf2"), seed=k + 70, solid=False)
    # everything above sits a little above y=0 so the town reads from the sea
    # quay along the water
    m.box((0, -0.3, 2.4), (30, 0.6, 2.0), "stone", "Satin", 0.1, jitter=0.05)
    # lighthouse on the breakwater (right)
    m.box((12.5, -0.4, 8), (1.4, 0.8, 12), "stone2", "Satin", 0.15, jitter=0.05)
    P.lighthouse(m, 12.5, 13.5, 5.5, solid=False, glow=False)
    # the pier in its four states
    with m.part("Pier_old"):
        _pier_deck(m, -3.0, broken=False)
        for k, c in enumerate(("red", "pink", "blue")):
            with m.at(-3.0, 6.0 + k * 3.0):
                m.box((-1.0, 0.9, 0), (1.2, 1.2, 1.2), "white", "Satin", 0.05)
                P.awning(m, -1.0, 1.55, -0.6, 1.4, 1.0, (c, "white"), 4, rot=math.pi / 2)
    with m.part("Pier_ruined"):
        _pier_deck(m, -3.0, broken=True)
    with m.part("Pier_restored"):
        _pier_deck(m, -3.0, broken=False)
        with m.at(-3.0, 13.5):
            m.cyl((0, 0.3, 0), 1.8, 1.6, "white", "Satin", 24, 0.06)
            m.lathe([(2.1, 0), (1.2, 0.8), (0, 1.3)], (0, 1.9, 0), "teal", "Gloss", 24)
            m.cyl((0, 3.2, 0), 0.05, 1.2, "iron", "Satin", 6, 0)
            P.kite(m, (0.4, 4.3, 0), "red", 0.6, tail=True)
        P.bunting(m, (-4.5, 1.6, 3.5), (-4.5, 1.6, 12), 0.4)
        P.bunting(m, (-1.5, 1.6, 3.5), (-1.5, 1.6, 12), 0.4, ("sun", "blue", "red", "white"))
    with m.part("Marina"):
        m.box((-3.0, -0.2, 9.0), (8.0, 0.3, 1.0), "white", "Satin", 0.05)
        for k in range(4):
            m.box((-5.5 + k * 1.8, -0.2, 11.0), (0.4, 0.3, 3.0), "white", "Satin", 0.05)
        with m.at(-7.0, 6.0):
            m.box((0, 1.6, 0), (4.0, 3.2, 3.0), "sky", "Glass", 0.1)
            m.box((0, 3.3, 0), (4.3, 0.25, 3.3), "white", "Satin", 0.05)
            m.box((0, 0.1, 0), (4.1, 0.3, 3.1), "white", "Satin", 0.05)
        for k in range(4):
            with m.at(-4.6 + k * 1.8, 12.5, math.pi / 2):
                m.sphere((0, 0.2, 0), (1.4, 0.4, 0.45), "white", "Gloss", 20, 10, clamp_top=0.15)
                m.box((0.1, 0.45, 0), (1.2, 0.3, 0.6), "white", "Gloss", 0.08)
                m.box((0.1, 0.5, 0), (1.0, 0.12, 0.62), "ink", "Gloss", 0.03)
    # fishing boats in the harbour (always)
    P.boat(m, 4.0, 6.0, 0.4, "red", size=0.9, y=-0.9)
    P.boat(m, 7.0, 9.0, -0.3, "sun", size=0.8, y=-0.9)
    P.boat(m, 2.0, 10.5, 1.0, "blue", size=0.85, y=-0.9)
    m.extra = dict(variants=["Pier_old", "Pier_ruined", "Pier_restored", "Marina"])
    return m


def _pier_deck(m, x, broken):
    for k in range(10):
        z = 3.6 + k * 1.0
        if broken and k in (4, 5, 8):
            if k == 5:
                m.box((x - 0.8, -0.8, z), (1.3, 0.18, 1.0), "wood", "Satin", 0.03, rot=(0.4, 0, 0.3))
            continue
        m.box((x, 0.0, z), (3.4, 0.18, 1.02), ("plank", "plank2")[k % 2], "Satin", 0.03)
        for sx in (-1, 1):
            m.cyl((x + sx * 1.5, -2.0, z), 0.14, 2.0, "wood_dark", "Satin", 10, 0.02)
    if not broken:
        m.tube([(x - 1.65, 0.6, 3.6), (x - 1.65, 0.6, 12.6)], 0.04, "white", "Gloss", 6, smooth_path=False)
        m.tube([(x + 1.65, 0.6, 3.6), (x + 1.65, 0.6, 12.6)], 0.04, "white", "Gloss", 6, smooth_path=False)


# ---------------------------------------------------------------------------
# Props pack: one GLB, one top-level Prop_<name> node per item (pivot at its base)
# ---------------------------------------------------------------------------
PROP_NAMES = ["kite", "toyboat", "lunchbox", "medal", "key", "tin", "shell", "apple", "book", "letter", "flower", "teddy",
              "blocks", "lantern", "spool", "seedling", "cupcake", "ticket", "glasses", "photo", "sandbag", "gate", "cat",
              "star", "heart", "coin", "compass", "scarf", "pills", "keys", "drawing", "camera"]


def props():
    m = Model("props", ao_distance=0.4, ao_strength=0.4)

    def prop(name):
        return m.part("Prop_" + name, (0, 0, 0), parent="root")

    with prop("kite"):
        P.kite(m, (0, 0.62, 0), "ffffff", 0.9, tail=True, accent="ffd0c0", mat="Kite")
    with prop("toyboat"):
        with m.at(0, 0, s=0.34):
            P.boat(m, 0, 0, 0, "blue", y=0.0)
    with prop("lunchbox"):
        m.capsule((0, 0.18, 0), (0, 0.62, 0), 0.18, "red", "Gloss", 16, r2=0.12)
        m.lathe([(0.12, 0), (0.0, 0.25)], (0, 0.7, 0), "white", "Gloss", 14)
        for k in range(3):
            a = k * TAU / 3
            m.extrude([(0, 0), (0.18, -0.05), (0.02, 0.22)], -0.02, 0.02, "sun", "Gloss", plane="xy", p=(0, 0.02, 0), rot=(0, a, 0))
        m.cyl((0, 0.45, 0.17), 0.07, 0.04, "sky", "Gloss", 14, 0.01, rot=(math.pi / 2, 0, 0))
    with prop("medal"):
        m.cyl((0, 0.05, 0), 0.24, 0.06, "sun", "Metal", 24, 0.02, rot=(math.pi / 2, 0, 0))
        m.cyl((0, 0.05, 0.02), 0.17, 0.04, "orange", "Metal", 24, 0.01, rot=(math.pi / 2, 0, 0))
        m.extrude([(-0.12, 0.28), (0.12, 0.28), (0.18, 0.72), (-0.18, 0.72)], -0.01, 0.01, "blue", "Satin", plane="xy")
        m.extrude([(-0.04, 0.28), (0.04, 0.28), (0.06, 0.72), (-0.06, 0.72)], 0.011, 0.02, "red", "Satin", plane="xy")
    with prop("key"):
        m.tube([(math.cos(a) * 0.14, 0.62 + math.sin(a) * 0.14, 0) for a in (i * TAU / 14 for i in range(14))], 0.04, "sun", "Metal", 8, closed=True)
        m.cyl((0, 0.05, 0), 0.035, 0.44, "sun", "Metal", 10, 0.01)
        for y in (0.1, 0.2):
            m.box((0.07, y, 0), (0.12, 0.05, 0.05), "sun", "Metal", 0.01)
    with prop("tin"):
        m.box((0, 0.18, 0), (0.6, 0.34, 0.42), "blue", "Gloss", 0.06)
        m.box((0, 0.37, 0), (0.64, 0.07, 0.46), "sky", "Gloss", 0.03)
        m.box((0, 0.42, 0), (0.24, 0.02, 0.14), "sun", "Metal", 0.01)
    with prop("shell"):
        for k in range(7):
            a = -0.9 + k * 0.3
            m.capsule((0, 0.05, 0), (math.sin(a) * 0.3, 0.1 + math.cos(a) * 0.25, 0.05), 0.07, "peach" if k % 2 else "pink", "Gloss", 10, r2=0.1)
    with prop("apple"):
        m.sphere((0, 0.25, 0), (0.25, 0.23, 0.25), "red", "Gloss", 20, 14)
        m.cyl((0, 0.44, 0), 0.02, 0.12, "trunk", "Satin", 6, 0)
        m.sphere((0.08, 0.52, 0), (0.1, 0.02, 0.05), "leaf2", "Satin", 8, 6, rot=(0, 0, 0.4))
    with prop("book"):
        m.box((0, 0.1, 0), (0.44, 0.16, 0.56), "fffaf0", "Satin", 0.02)
        for y in (0.02, 0.18):
            m.box((0, y, 0), (0.48, 0.04, 0.6), "purple", "Gloss", 0.02)
        m.box((-0.23, 0.1, 0), (0.04, 0.2, 0.6), "purple", "Gloss", 0.02)
        m.box((0.02, 0.205, 0), (0.2, 0.01, 0.2), "sun", "Metal", 0.0)
    with prop("letter"):
        m.box((0, 0.04, 0), (0.56, 0.06, 0.38), "fffaf0", "Satin", 0.02)
        m.extrude([(-0.27, 0.19), (0.27, 0.19), (0, -0.02)], 0.071, 0.08, "cream", "Satin", plane="xz")
        m.cyl((0, 0.08, 0.03), 0.06, 0.03, "red", "Gloss", 14, 0.01)
    with prop("flower"):
        for k, c in enumerate(("rose", "sun", "white", "purple", "coral")):
            a = k * TAU / 5
            m.cyl((math.cos(a) * 0.05, 0, math.sin(a) * 0.05), 0.015, 0.5 + k * 0.03, "leaf_dark", "Satin", 5, 0)
            m.sphere((math.cos(a) * 0.12, 0.55 + k * 0.03, math.sin(a) * 0.12), 0.09, c, "Satin", 10, 8)
        m.lathe([(0.08, 0.1), (0.16, 0.3), (0.0, 0.3)], (0, 0, 0), "sky", "Satin", 12)
    with prop("teddy"):
        m.sphere((0, 0.25, 0), (0.22, 0.25, 0.18), "wood_light", "Satin", 14, 10)
        m.sphere((0, 0.6, 0), 0.18, "wood_light", "Satin", 14, 10)
        for s in (-1, 1):
            m.sphere((s * 0.13, 0.74, 0), 0.07, "wood_light", "Satin", 10, 8)
            m.sphere((s * 0.07, 0.63, 0.16), 0.025, "eye", "Gloss", 6, 4)
        m.sphere((0, 0.56, 0.16), (0.07, 0.05, 0.04), "cream", "Satin", 10, 8)
    with prop("blocks"):
        for k, (x, y, z, c) in enumerate(((0, 0.12, 0, "red"), (0.26, 0.12, 0.02, "blue"), (0.13, 0.36, 0.01, "sun"))):
            m.box((x - 0.12, y, z), (0.24, 0.24, 0.24), c, "Gloss", 0.04, rot=(0, k * 0.3, 0))
    with prop("lantern"):
        m.box((0, 0.25, 0), (0.3, 0.4, 0.3), "ffd88a", "Glow_warm", 0.04)
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * 0.15, 0.05, sz * 0.15), 0.02, 0.42, "ink", "Gloss", 6, 0)
        m.box((0, 0.04, 0), (0.36, 0.08, 0.36), "ink", "Gloss", 0.02)
        m.lathe([(0.2, 0), (0.1, 0.12), (0, 0.14)], (0, 0.46, 0), "ink", "Gloss", 10)
        m.tube([(-0.1, 0.6, 0), (0, 0.72, 0), (0.1, 0.6, 0)], 0.015, "ink", "Gloss", 5)
    with prop("spool"):
        m.cyl((0, 0.0, 0), 0.22, 0.05, "wood", "Satin", 16, 0.01)
        m.cyl((0, 0.05, 0), 0.12, 0.3, "white", "Satin", 16, 0.02)
        m.cyl((0, 0.35, 0), 0.22, 0.05, "wood", "Satin", 16, 0.01)
    with prop("seedling"):
        m.lathe([(0, 0), (0.14, 0), (0.18, 0.25), (0.2, 0.28), (0, 0.27)], (0, 0, 0), "coral", "Gloss", 14)
        m.capsule((0, 0.25, 0), (0.02, 0.45, 0), 0.015, "leaf", "Satin", 5)
        for s in (-1, 1):
            m.sphere((s * 0.08, 0.47, 0), (0.08, 0.03, 0.05), "leaf2", "Satin", 8, 6, rot=(0, 0, -s * 0.4))
    with prop("cupcake"):
        m.lathe([(0, 0), (0.14, 0), (0.18, 0.18), (0, 0.18)], (0, 0, 0), "sky", "Satin", 14)
        m.sphere((0, 0.24, 0), (0.19, 0.12, 0.19), "pink", "Gloss", 14, 8)
        m.sphere((0, 0.36, 0), 0.05, "red", "Gloss", 8, 6)
    with prop("ticket"):
        m.box((0, 0.02, 0), (0.5, 0.03, 0.26), "sun", "Satin", 0.01)
        m.box((0.1, 0.037, 0), (0.02, 0.005, 0.24), "orange", "Satin", 0.0)
    with prop("glasses"):
        for s in (-1, 1):
            m.tube([(s * 0.12 + math.cos(a) * 0.09, 0.12 + math.sin(a) * 0.08, 0) for a in (i * TAU / 12 for i in range(12))], 0.016, "ink", "Gloss", 5, closed=True)
        m.tube([(-0.04, 0.14, 0), (0.04, 0.14, 0)], 0.014, "ink", "Gloss", 5)
    with prop("photo"):
        m.box((0, 0.25, 0), (0.44, 0.5, 0.05), "wood_light", "Satin", 0.02, rot=(-0.2, 0, 0))
        m.box((0, 0.26, 0.03), (0.34, 0.38, 0.02), "sky", "Satin", 0.0, rot=(-0.2, 0, 0))
        m.box((0, 0.2, 0.035), (0.34, 0.12, 0.02), "grass", "Satin", 0.0, rot=(-0.2, 0, 0))
    with prop("sandbag"):
        m.sphere((0, 0.14, 0), (0.3, 0.14, 0.22), "sand2", "Satin", 12, 8)
    with prop("gate"):
        for sx in (-1, 1):
            m.cyl((sx * 0.7, 0, 0), 0.09, 1.9, "sun", "Gloss", 12, 0.03)
            m.sphere((sx * 0.7, 1.95, 0), 0.13, "sun", "Gloss", 12, 8)
        pts = [(math.cos(a) * 0.7, 1.9 + math.sin(a) * 0.5, 0) for a in (i * math.pi / 12 for i in range(13))]
        m.tube(pts, 0.08, "sun", "Gloss", 10)
        m.extrude([(-0.35, 0.0), (0.35, 0.0), (0, 0.4)], -0.02, 0.02, "coral", "Gloss", plane="xy", p=(0, 2.3, 0))
    with prop("cat"):
        m.sphere((0, 0.22, 0), (0.18, 0.2, 0.3), "orange", "Satin", 14, 10)
        m.sphere((0, 0.45, 0.22), 0.17, "orange", "Satin", 14, 10)
        for s in (-1, 1):
            m.lathe([(0.06, 0), (0, 0.12)], (s * 0.09, 0.57, 0.22), "orange", "Satin", 6)
            m.sphere((s * 0.06, 0.48, 0.37), (0.03, 0.04, 0.02), "eye", "Gloss", 6, 4)
        m.tube([(0, 0.2, -0.28), (0.15, 0.35, -0.4), (0.1, 0.55, -0.42)], 0.04, "orange", "Satin", 6)
    with prop("star"):
        pts = []
        for k in range(10):
            a = k * math.pi / 5 + math.pi / 2
            r = 0.3 if k % 2 == 0 else 0.13
            pts.append((math.cos(a) * r, 0.32 + math.sin(a) * r))
        m.extrude(pts, -0.05, 0.05, "sun", "Gloss", plane="xy", bevel=0.02)
    with prop("heart"):
        pts = [(math.sin(t) ** 3 * 0.3, 0.33 + (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 16 * 0.3) for t in (i * TAU / 28 for i in range(28))]
        m.extrude(pts, -0.06, 0.06, "rose", "Gloss", plane="xy", bevel=0.03)
    with prop("coin"):
        for k in range(3):
            m.cyl((k * 0.02, k * 0.07, 0), 0.2, 0.06, "sun", "Metal", 22, 0.02)
    with prop("compass"):
        m.cyl((0, 0, 0), 0.24, 0.08, "sun", "Metal", 24, 0.02)
        m.cyl((0, 0.08, 0), 0.2, 0.01, "white", "Satin", 24, 0.0)
        m.extrude([(0, 0.16), (0.04, 0), (0, -0.16), (-0.04, 0)], 0.09, 0.1, "red", "Gloss", plane="xz")
    with prop("scarf"):
        m.tube([(-0.3, 0.05, 0), (-0.1, 0.1, 0.1), (0.1, 0.05, -0.05), (0.3, 0.1, 0.05)], 0.07, "red", "Satin", 8)
        m.box((0.36, 0.06, 0.05), (0.14, 0.04, 0.2), "white", "Satin", 0.01)
    with prop("pills"):
        m.cyl((0, 0, 0), 0.12, 0.3, "white", "Gloss", 14, 0.02)
        m.cyl((0, 0.3, 0), 0.13, 0.08, "blue", "Gloss", 14, 0.02)
        m.box((0, 0.16, 0.12), (0.18, 0.14, 0.01), "sun", "Satin", 0.0)
    with prop("keys"):
        m.tube([(math.cos(a) * 0.1, 0.05, math.sin(a) * 0.1) for a in (i * TAU / 12 for i in range(12))], 0.02, "metal", "Metal", 5, closed=True)
        for k, c in enumerate(("sun", "metal")):
            m.box((0.12 + k * 0.05, 0.05, 0.12 - k * 0.2), (0.06, 0.03, 0.28), c, "Metal", 0.01, rot=(0, 0.5 - k, 0))
        m.box((-0.12, 0.05, 0.1), (0.12, 0.06, 0.16), "red", "Gloss", 0.03)
    with prop("drawing"):
        m.box((0, 0.02, 0), (0.5, 0.02, 0.38), "fffaf0", "Satin", 0.005)
        m.sphere((0.12, 0.04, -0.08), (0.07, 0.005, 0.07), "sun", "Satin", 10, 4)
        m.box((-0.08, 0.035, 0.06), (0.2, 0.005, 0.12), "red", "Satin", 0.0)
        m.box((-0.08, 0.035, 0.14), (0.3, 0.005, 0.04), "grass", "Satin", 0.0)
    with prop("camera"):
        m.box((0, 0.15, 0), (0.44, 0.28, 0.2), "ink", "Gloss", 0.05)
        m.cyl((0, 0.15, 0.1), 0.1, 0.1, "metal", "Metal", 16, 0.02, rot=(math.pi / 2, 0, 0))
        m.box((0.13, 0.31, 0), (0.1, 0.05, 0.12), "red", "Gloss", 0.02)
    # Lane-stepping guides (docs/SUBWAY_LANES_PLAN.md): authored flat on the ground, pointing
    # along local +x; world.ts rotates each instance to lie along a lane's own direction.
    with prop("lane_track"):
        n, dash, gap = 7, 0.6, 0.38
        span = n * (dash + gap) - gap
        for k in range(n):
            x = -span / 2 + k * (dash + gap) + dash / 2
            m.box((x, 0.012, 0), (dash, 0.012, 0.12), "ffd88a", "Glow_warm", 0.0, ao=False)
    with prop("lane_marker"):
        pts = [(-0.16, 0.14), (0.18, 0), (-0.16, -0.14), (-0.02, 0)]
        m.extrude(pts, 0.012, 0.045, "ffc234", "Glow_warm", plane="xz", bevel=0.01, ao=False)
    return m


SCENES = {
    "nursery": nursery, "gardens": gardens, "schoolyard": schoolyard, "pier": pier, "storm": storm, "station": station,
    "workplace": workplace, "rooftop": rooftop, "kitchen": kitchen, "square": square, "cottage": cottage, "clifftop": clifftop,
}


def preview(name, out):
    from . import preview as pv
    builder = SCENES.get(name) or {"harbour": harbour, "props": props}[name]
    m = builder()
    m.build()
    night = name == "storm"
    kit.render_preview(out, target=(0, 0.5, 0), distance=27 if name not in ("harbour",) else 45, lens=50,
                       sky=("20304f", "20304f") if night else ("bfe8ff", "fff4d8"), sun=0.35 if night else 1.0)
