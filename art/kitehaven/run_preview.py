"""blender --background --factory-startup --python art/kitehaven/run_preview.py -- <what> <out.png>"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import importlib
import kitehaven.kit as kit  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
what = args[0] if args else "lineup"
out = args[1] if len(args) > 1 else str(Path.cwd() / f"preview-{what}.png")
if what == "lineup":
    from kitehaven import preview
    preview.lineup(out)
elif what == "all":
    from kitehaven import scenes
    for name in list(scenes.SCENES) + ["harbour", "props"]:
        scenes.preview(name, str(Path(out) / f"{name}.png"))
        print("PREVIEW_DONE", name, flush=True)
else:
    from kitehaven import scenes, preview
    scenes.preview(what, out)
print("PREVIEW_DONE", out, flush=True)
