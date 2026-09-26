"""Review renders (never shipped): character lineups and diorama beauty shots."""
import bpy
from pathlib import Path
from . import kit
from .kit import srgb_to_linear, rgb


def _descendants(obj):
    out = []
    for c in obj.children:
        out.append(c)
        out.extend(_descendants(c))
    return out


def dress(root, colors, show=()):
    """Per-instance recolour + visibility, mirroring what world.ts does at runtime."""
    for ob in _descendants(root):
        name = ob.name.split(".")[0]
        if ob.type == "EMPTY" and (name.startswith("Hair_") or name.startswith("Acc_") or name == "Mouth_open"):
            vis = name in show
            for d in [ob] + _descendants(ob):
                d.hide_render = not vis
        if ob.type == "MESH":
            new = []
            for m in ob.data.materials:
                if m and m.name.split(".")[0] in colors:
                    c = m.copy()
                    p = next(n for n in c.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                    p.inputs["Base Color"].default_value = (*[srgb_to_linear(x) for x in rgb(colors[m.name.split('.')[0]])], 1)
                    new.append(c)
                else:
                    new.append(m)
            for i, m in enumerate(new):
                ob.data.materials[i] = m


def lineup(path):
    from . import characters as ch
    cast = [
        ("baby", dict(Skin="f2c29b", Hair="5a3a2a", Top="ffe14d", Bottom="5cc8ff", Shoes="ff8fb1", Accent="ffffff"), ("Hair_curl",)),
        ("kid", dict(Skin="8d5a3b", Hair="1d1414", Top="ee3b3b", Bottom="213a8f", Shoes="ffc234", Accent="ffffff"), ("Hair_curls",)),
        ("kid", dict(Skin="f5c8a0", Hair="e2913b", Top="5fe0b7", Bottom="8c5cf0", Shoes="ffffff", Accent="ff5f8f"), ("Hair_pony", "Acc_skirt")),
        ("adult", dict(Skin="e8a97e", Hair="3a2418", Top="2f7de1", Bottom="3b4256", Shoes="ee3b3b", Accent="ffc234"), ("Hair_swoop",)),
        ("adult", dict(Skin="6b4028", Hair="16110f", Top="ff6a4d", Bottom="fff1d6", Shoes="1d2340", Accent="ffe14d"), ("Hair_bun", "Acc_skirt")),
        ("adult", dict(Skin="f2c29b", Hair="b8542a", Top="1fb8a8", Bottom="213a8f", Shoes="7f4524", Accent="ffffff"), ("Hair_short", "Acc_beard", "Acc_apron")),
        ("elder", dict(Skin="e0a27a", Hair="e9e6f0", Top="c49bff", Bottom="4f5a74", Shoes="7f4524", Accent="ff8fb1"), ("Hair_bob", "Acc_glasses", "Acc_scarf")),
        ("elder", dict(Skin="a86a45", Hair="d8d8dc", Top="ffc234", Bottom="5b6378", Shoes="3b4256", Accent="ee3b3b"), ("Hair_short", "Acc_glasses", "Acc_cane", "Acc_cap")),
    ]
    kit.reset_scene()
    xs = [(-4.9 + i * 1.4) for i in range(len(cast))]
    for (kind, colors, show), x in zip(cast, xs):
        m = ch.character(kind)
        root = m.build(reset=False, offset=(x, 0, 0))
        dress(root, colors, show)
    floor = kit.Model("floor", ao=False)
    floor.box((0, -0.05, 0), (14, 0.1, 4), "wall_cream", "Satin", 0.04)
    floor.build(reset=False)
    kit.render_preview(path, target=(0, 0.7, 0), distance=15.5, lens=50, direction=(0, 3, 14), size=(1600, 700))
