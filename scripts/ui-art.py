"""Convert the Blender UI renders (art/ui/out/*.png) to small WebP files in public/ui/.

Icons are displayed at up to 48 CSS px, so 160 px covers a 3x phone screen.
    python scripts/ui-art.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art" / "ui" / "out"
DST = ROOT / "public" / "ui"
DST.mkdir(parents=True, exist_ok=True)
total = 0
for png in sorted(SRC.glob("*.png")):
    im = Image.open(png).convert("RGBA")
    size = 560 if png.stem == "emblem" else 160
    im = im.resize((size, size), Image.LANCZOS)
    out = DST / f"{png.stem}.webp"
    im.save(out, "WEBP", quality=88, method=6)
    total += out.stat().st_size
    print(f"{out.name:18} {out.stat().st_size / 1024:6.1f} KB")
print(f"total {total / 1024:.0f} KB")
