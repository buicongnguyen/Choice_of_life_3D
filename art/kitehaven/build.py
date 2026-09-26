"""Build every Kitehaven GLB (full + phone detail), the layout contract and the manifest.

  blender --background --factory-startup --python art/kitehaven/build.py
  blender ... --python art/kitehaven/build.py -- --only pier,props      (subset; layout merged)
  blender ... --python art/kitehaven/build.py -- --full-only            (skip phone variants)

Outputs: public/models/*.glb, public/models/low/*.glb, public/models/layout.json,
public/models/manifest.json. The build fails if an anchor is off the walkable ground,
inside furniture or unreachable from the spawn point.
"""
import json
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import kitehaven.kit as kit  # noqa: E402
from kitehaven import scenes, characters  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
only = set()
if "--only" in args:
    only = set(args[args.index("--only") + 1].split(","))
full_only = "--full-only" in args

OUT = kit.OUT
HALF_W, HALF_D, RADIUS = 5.85, 4.05, 0.24
REQUIRED = ["spawn", "exit", "act"] + [f"npc{i}" for i in range(5)] + [f"find{i}" for i in range(3)] + [f"hunt{i}" for i in range(4)]


def blocked(x, z, colliders, variant=None):
    for c in colliders:
        if c.get("variant") and c["variant"] != variant:
            continue
        if abs(x - c["x"]) <= c["w"] / 2 + RADIUS and abs(z - c["z"]) <= c["d"] / 2 + RADIUS:
            return True
    return abs(x) >= HALF_W or abs(z) >= HALF_D


def reachable(start, colliders, variant=None, step=0.2):
    nx, nz = int(HALF_W * 2 / step), int(HALF_D * 2 / step)
    cell = lambda x, z: (round((x + HALF_W) / step), round((z + HALF_D) / step))
    seen = set()
    s = cell(*start)
    stack = [s]
    while stack:
        i, j = stack.pop()
        if (i, j) in seen or not (0 <= i <= nx and 0 <= j <= nz):
            continue
        x, z = i * step - HALF_W, j * step - HALF_D
        if blocked(x, z, colliders, variant):
            continue
        seen.add((i, j))
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if di or dj:
                    stack.append((i + di, j + dj))
    return seen, cell


def validate(name, m, variants):
    errors = []
    for key in REQUIRED:
        if key not in m.anchors:
            errors.append(f"{name}: missing anchor {key}")
    for variant in variants or [None]:
        seen, cell = reachable((m.anchors["spawn"]["x"], m.anchors["spawn"]["z"]), m.colliders, variant)
        for key, a in m.anchors.items():
            if key == "exit":
                continue
            if blocked(a["x"], a["z"], m.colliders, variant):
                errors.append(f"{name}[{variant}]: anchor {key} ({a['x']},{a['z']}) is blocked")
                continue
            c = cell(a["x"], a["z"])
            near = any((c[0] + di, c[1] + dj) in seen for di in (-1, 0, 1) for dj in (-1, 0, 1))
            if not near:
                errors.append(f"{name}[{variant}]: anchor {key} unreachable from spawn")
        e = m.anchors.get("exit")
        if e and blocked(e["x"], e["z"], m.colliders, variant):
            errors.append(f"{name}[{variant}]: exit blocked")
    return errors


def run(low):
    kit.LOW = low
    report, layout, errors = {}, {}, []
    for name, fn in scenes.SCENES.items():
        if only and name not in only:
            continue
        t = time.time()
        m = fn()
        if not low:
            errors += validate(name, m, m.extra.get("variants"))
            layout[name] = dict(colliders=m.colliders, anchors=m.anchors, **m.extra)
        report[name] = m.export()
        print(f"  {name} {'low' if low else 'full'} {time.time() - t:.1f}s", flush=True)
    for name, fn in (("harbour", scenes.harbour), ("props", scenes.props)):
        if only and name not in only:
            continue
        m = fn()
        if not low and m.extra:
            layout[name] = m.extra
        report[name] = m.export()
    if not only or only & {"baby", "kid", "adult", "elder", "characters"}:
        for kind in ("baby", "kid", "adult", "elder"):
            report[kind] = characters.character(kind).export()
    return report, layout, errors


t0 = time.time()
full, layout, errors = run(False)
if errors:
    print("\n".join(errors), flush=True)
    raise SystemExit("KITEHAVEN_BUILD_FAILED: layout validation")
low = {} if full_only else run(True)[0]

manifest_path = OUT / "manifest.json"
layout_path = OUT / "layout.json"
old_manifest = json.loads(manifest_path.read_text()) if (only and manifest_path.exists()) else {}
old_layout = json.loads(layout_path.read_text()) if (only and layout_path.exists()) else {}
if old_manifest.get("revision", "").startswith("kitehaven"):
    full = {**old_manifest.get("full", {}), **full}
    low = {**old_manifest.get("low", {}), **low}
layout = {**{k: v for k, v in old_layout.items() if k != "_meta"}, **layout}
layout["_meta"] = dict(walkable=dict(halfWidth=HALF_W, halfDepth=HALF_D, radius=RADIUS))
layout_path.write_text(json.dumps(layout, indent=1))
manifest_path.write_text(json.dumps(dict(
    author="Choice of Life 3D project",
    generator="Blender 4.5 / art/kitehaven/build.py",
    revision="kitehaven-1.0.0",
    license="Original project-generated geometry; vertex colour only, no textures or external assets",
    full=full, low=low,
    totals=dict(full=sum(v["bytes"] for v in full.values()), low=sum(v["bytes"] for v in low.values())),
), indent=2))
print("KITEHAVEN_BUILD_COMPLETE", f"{time.time() - t0:.0f}s", sum(v["bytes"] for v in full.values()), sum(v["bytes"] for v in low.values()), flush=True)
