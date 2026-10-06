"""The Life Run kit (docs/LIFE_RUN_PLAN.md): track tiles, street dressing, obstacles,
pickups and the crossroads gate, one `Run_<name>` node each, built from the town's toy kit.

Conventions: the runner travels towards -z. Lanes sit at x = -2.2, 0, 2.2 on a 7.2-wide
road; track tiles are 12 long, centred on z = 0. Obstacles and pickups are centred on their
lane at x = 0. Dressing is authored facing +z (towards the camera) and runtime turns it to
face the road.
"""
import math
import random
from . import kit
from .kit import Model
from . import pieces as P
from .pieces import TAU

TILE = 12.0
ROAD = 7.2
LANE = 2.2


def runner():
    m = Model("runner", ao_distance=0.8, ao_strength=0.5, seed=11)

    def node(name):
        return m.part("Run_" + name, (0, 0, 0), parent="root")

    # ------------------------------------------------------------------ track tiles
    with node("track_town"):
        P.cobbles(m, 0, 0, ROAD, TILE, colors=("stone", "stone2", "cream"), size=0.5)
        for sx in (-1, 1):
            # kerbs and pavements
            m.box((sx * (ROAD / 2 + 0.12), 0.08, 0), (0.24, 0.16, TILE), "white", "Satin", 0.04)
            P.tiles(m, sx * (ROAD / 2 + 1.3), 0, 2.1, TILE, a="cream", b="wall_peach", size=0.7, y=0.12)
            m.box((sx * (ROAD / 2 + 2.45), 0.0, 0), (0.25, 0.3, TILE), "grass_dark", "Satin", 0.05)
        # painted lane dashes between the three lanes
        for lx in (-LANE / 2, LANE / 2):
            for k in range(4):
                m.box((lx, 0.012, -TILE / 2 + 1.5 + k * 3), (0.12, 0.014, 1.4), "fffaf0", "Matte", 0.0, ao=False)
    with node("track_pier"):
        P.planks(m, 0, 0, ROAD + 3.2, TILE, along="z", width=0.4)
        for sx in (-1, 1):
            P.rail(m, (sx * (ROAD / 2 + 1.6), -TILE / 2), (sx * (ROAD / 2 + 1.6), TILE / 2), color="white", h=0.9, solid=False)
            for k in range(3):
                m.cyl((sx * (ROAD / 2 + 1.7), -2.2, -TILE / 2 + 2 + k * 4), 0.22, 2.2, "wood_dark", "Satin", 12, 0.04)
            P.water(m, sx * (ROAD / 2 + 8.6), 0, 14.0, TILE, y=-0.6)
        for lx in (-LANE / 2, LANE / 2):
            for k in range(4):
                m.box((lx, 0.014, -TILE / 2 + 1.5 + k * 3), (0.12, 0.014, 1.4), "ffd88a", "Matte", 0.0, ao=False)
    with node("track_garden"):
        m.grid((0, -0.02, 0), ROAD + 9.0, TILE, "grass", "Matte", step=0.6, colors=P.pattern(m, P.meadow()))
        m.grid((0, 0.0, 0), ROAD, TILE, "sand", "Matte", step=0.4, colors=P.pattern(m, lambda x, z: ("sand" if P.noise(x, z, 1.4) > 0.45 else "sand2", 0.03)))
        for sx in (-1, 1):
            m.box((sx * (ROAD / 2 + 0.1), 0.05, 0), (0.2, 0.12, TILE), "wood_light", "Satin", 0.04)
            P.flowers(m, sx * (ROAD / 2 + 0.75), 0, 0.9, TILE, n=26, seed=3 + sx)
            for k in range(3):
                P.bush(m, sx * (ROAD / 2 + 2.6), -TILE / 2 + 2 + k * 4, 0.8, "leaf", seed=k + (5 if sx > 0 else 9))
        for lx in (-LANE / 2, LANE / 2):
            for k in range(6):
                m.disc((lx, 0.012, -TILE / 2 + 1 + k * 2), 0.12, "fffaf0", "Matte", 10, ao=False)
    with node("plaza"):
        P.tiles(m, 0, 0, 18.0, TILE, a="cream", b="wall_yellow", size=0.9)
        for sx in (-1, 1):
            m.box((sx * 9.1, 0.12, 0), (0.3, 0.24, TILE), "white", "Satin", 0.05)
        P.rug(m, 0, 2.5, 2.2, rings=("sun", "coral", "white", "teal", "sun"), y=0.012)

    # ------------------------------------------------------------------ street dressing
    houses = [("wall_yellow", "roof_red", "blue"), ("wall_pink", "roof_teal", "sun"), ("wall_mint", "roof_orange", "red"), ("wall_blue", "roof_purple", "teal")]
    for k, (wall, roof, door) in enumerate(houses):
        with node(f"house{k}"):
            P.house(m, 0, 0, 3.4, 3.0, 2.5 + (k % 2) * 0.7, wall, roof, door_color=door, windows=2, chimney=k % 2 == 0, solid=False,
                    floors=1 + (k % 2), shutters=("teal", "red", "blue", "sun")[k])
            P.flowers(m, 0, 1.75, 2.6, 0.4, n=8, seed=k)
    with node("tree"):
        P.tree(m, 0, 0, 1.25, ("leaf", "leaf2"), seed=4, solid=False)
    with node("lamp"):
        P.lamp(m, 0, 0, h=2.8, solid=False)
    with node("stall"):
        P.stall(m, 0, 0, colors=("red", "white"), w=2.4, solid=False,
                goods=lambda mm: [mm.sphere((-0.7 + i * 0.35, 1.15, 0.35), 0.13, ("orange", "red", "lime", "sun", "coral")[i], "Gloss", 10, 8) for i in range(5)])
    with node("bunting"):
        for sx in (-1, 1):
            m.cyl((sx * 5.4, 0, 0), 0.09, 4.8, "white", "Satin", 10, 0.02)
            m.sphere((sx * 5.4, 4.85, 0), 0.13, "sun", "Gloss", 10, 8)
        P.bunting(m, (-5.4, 4.6, 0), (5.4, 4.6, 0), 0.7)
    with node("boat"):
        P.boat(m, 0, 0, 0.0, "red", size=1.2, y=-0.5)

    # ------------------------------------------------------------------ obstacles
    with node("crate"):
        # stacked kite crates: block the lane, change lane to pass
        for i, (x, y, c) in enumerate(((-0.42, 0, "wood_light"), (0.42, 0, "wood"), (0.0, 0.8, "wood_light"))):
            P.crate(m, x, 0, 0.8, c, rot=0.15 * (i - 1), y=y, solid=False)
        P.kite(m, (0.0, 1.95, 0.3), "red", 0.35, tail=False)
    with node("cart"):
        # a market cart, long along z
        L = 4.4
        m.box((0, 0.95, 0), (1.8, 0.9, L), "red", "Gloss", 0.1)
        m.box((0, 1.42, 0), (1.9, 0.08, L + 0.1), "wood_light", "Satin", 0.03)
        for sz in (-1, 1):
            for sx in (-1, 1):
                m.cyl((sx * 0.95, 0.42, sz * (L / 2 - 0.7)), 0.42, 0.16, "sun", "Gloss", 18, 0.04, rot=(0, 0, math.pi / 2))
                m.cyl((sx * 1.0, 0.42, sz * (L / 2 - 0.7)), 0.12, 0.08, "ink", "Satin", 10, 0.02, rot=(0, 0, math.pi / 2))
        for i in range(4):
            m.sphere((-0.5 + (i % 2) * 1.0, 1.62, -1.2 + i * 0.8), 0.24, ("orange", "lime", "coral", "sun")[i], "Gloss", 12, 8)
        for sx in (-1, 1):
            for sz in (-1, 1):
                m.cyl((sx * 0.85, 1.45, sz * (L / 2 - 0.2)), 0.05, 0.7, "white", "Satin", 8, 0)
        with m.at(0, 0, 0, y=2.1):
            for k in range(6):
                m.box((-0.9 + 0.3 * (k + 0.5), 0, 0), (0.3, 0.07, L + 0.3), ("white", "red")[k % 2], "Satin", 0.02)
    with node("hurdle"):
        # a low striped barrier: jump it
        for sx in (-1, 1):
            m.box((sx * 0.9, 0.3, 0), (0.12, 0.6, 0.3), "white", "Satin", 0.03)
        for k in range(5):
            m.box((-0.72 + k * 0.36, 0.45, 0), (0.36, 0.2, 0.08), ("red", "white")[k % 2], "Gloss", 0.02)
        m.box((0, 0.2, 0), (1.8, 0.08, 0.08), "white", "Satin", 0.02)
    with node("banner"):
        # a festival banner strung low: slide under it
        for sx in (-1, 1):
            m.cyl((sx * 1.0, 0, 0), 0.07, 2.25, "white", "Satin", 10, 0.02)
            m.sphere((sx * 1.0, 2.3, 0), 0.11, "sun", "Gloss", 10, 8)
        m.box((0, 1.5, 0), (2.0, 0.7, 0.06), "blue", "Satin", 0.03)
        m.box((0, 1.5, 0.04), (1.6, 0.42, 0.02), "fffaf0", "Satin", 0.02)
        P.bunting(m, (-1.0, 1.12, 0.02), (1.0, 1.12, 0.02), 0.04)
        P.kite(m, (0.0, 1.5, 0.07), "red", 0.28, tail=False)

    # ------------------------------------------------------------------ pickups (centred at y = 0)
    with node("coin"):
        m.cyl((0, -0.04, 0), 0.32, 0.08, "sun", "Gloss", 24, 0.025, rot=(math.pi / 2, 0, 0))
        m.cyl((0, -0.045, 0), 0.25, 0.09, "lemon", "Gloss", 24, 0.01, rot=(math.pi / 2, 0, 0))
        m.extrude([(0, 0.17), (0.12, 0), (0, -0.17), (-0.12, 0)], 0.04, 0.07, "orange", "Gloss", plane="xy", bevel=0.01)
    with node("spark"):
        pts = []
        for k in range(10):
            a = k * math.pi / 5 + math.pi / 2
            r = 0.34 if k % 2 == 0 else 0.15
            pts.append((math.cos(a) * r, math.sin(a) * r))
        m.extrude(pts, -0.06, 0.06, "lemon", "Gloss", plane="xy", bevel=0.025)
        m.sphere((0, 0, 0.05), 0.08, "ffe2a0", "Glow_warm", 8, 6, ao=False)
    with node("heart"):
        pts = [(math.sin(t) ** 3 * 0.32, -0.05 + (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 16 * 0.32) for t in (i * TAU / 28 for i in range(28))]
        m.extrude(pts, -0.07, 0.07, "rose", "Gloss", plane="xy", bevel=0.035)
    with node("kite"):
        P.kite(m, (0, 0, 0), "red", 0.75, tail=True, accent="sun")
        m.tube([(math.cos(a) * 0.62, math.sin(a) * 0.62, 0) for a in (i * TAU / 24 for i in range(24))], 0.03, "ffe2a0", "Glow_warm", 6, closed=True, ao=False)

    # ------------------------------------------------------------------ the crossroads gate
    with node("gate"):
        for sx in (-1, 1):
            m.box((sx * 0.95, 1.4, 0), (0.24, 2.8, 0.24), "white", "Satin", 0.05)
            m.sphere((sx * 0.95, 2.95, 0), 0.17, "sun", "Gloss", 12, 8)
            m.box((sx * 0.95, 0.1, 0), (0.36, 0.2, 0.36), "sun", "Satin", 0.04)
        pts = [(math.cos(a) * 0.95, 2.8 + math.sin(a) * 0.45, 0) for a in (i * math.pi / 14 for i in range(15))]
        m.tube(pts, 0.09, "sun", "Gloss", 10)
        # the sign board (runtime paints the option's words on a plane just in front of it)
        m.box((0, 3.55, -0.02), (2.3, 0.9, 0.08), "ink", "Satin", 0.04)
        P.string_lights(m, (-0.95, 2.6, 0.13), (0.95, 2.6, 0.13), 0.25)
    with node("gate_shut"):
        # a gate you can't take yet: a closed picket in the arch
        for k in range(7):
            m.box((-0.75 + k * 0.25, 0.65, 0), (0.12, 1.3, 0.06), "white", "Satin", 0.025, taper=(0.6, 1.0))
        for y in (0.45, 1.0):
            m.box((0, y, 0.04), (1.7, 0.1, 0.05), "slate", "Satin", 0.02)
        m.cyl((0, 1.25, 0.08), 0.13, 0.08, "sun", "Metal", 16, 0.02, rot=(math.pi / 2, 0, 0))
    # ------------------------------------------------------------------ the town behind the crossroads
    with node("backdrop"):
        rr = random.Random(8)
        x = -15.0
        k = 0
        while x < 15.0:
            wall, roof, door = houses[k % 4]
            w = rr.uniform(2.8, 3.6)
            P.house(m, x + w / 2, 0, w, 3.0, 2.6 + (k % 3) * 0.6, wall, roof, door_color=door, windows=2, chimney=k % 2 == 1, solid=False, floors=1 + (k % 2))
            x += w + 0.5
            k += 1
        for k in range(7):
            P.tree(m, -13.5 + k * 4.5, -2.6, 1.3, ("leaf", "leaf2"), seed=k + 30, solid=False)
        for sx in (-1, 1):
            for k in range(3):
                with m.at(sx * 11.5, 4 + k * 5, -sx * math.pi / 2):
                    wall, roof, door = houses[(k + (1 if sx > 0 else 0)) % 4]
                    P.house(m, 0, 0, 3.6, 3.0, 2.8, wall, roof, door_color=door, windows=2, chimney=False, solid=False)
            P.lamp(m, sx * 8.6, 2.0, h=2.8, solid=False)
            P.lamp(m, sx * 8.6, 10.0, h=2.8, solid=False)
        P.bunting(m, (-8.6, 3.0, 2.0), (8.6, 3.0, 2.0), 0.8)
        P.kite(m, (-6.0, 7.5, -4.0), "red", 1.2, tail=True)
        P.kite(m, (7.0, 8.5, -5.0), "blue", 1.0, tail=True, accent="sun")
    return m
