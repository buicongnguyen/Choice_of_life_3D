"""Compatible entry point for the crafted Blender asset pipeline."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("build_crafted_assets.py")), run_name="__main__")
