"""Export lightweight variants from the crafted sources; never modify the .blend files.

Run: blender --background --python art/build_low_detail.py
Re-run after rebuilding the full-detail assets. Pivots, dimensions and material names
are retained so both modes share the same animation and collision/gameplay data.
"""
import json
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "low"
OUT.mkdir(parents=True, exist_ok=True)
source = json.loads((OUT.parent / "manifest.json").read_text(encoding="utf-8"))
report = {}

for filename in source["files"]:
    name = Path(filename).stem
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / "art" / f"{name}.blend"))
    # Constant-color materials avoid texture downloads and texture sampling on phones.
    for material in bpy.data.materials:
        material.use_nodes = True
        nodes = material.node_tree.nodes
        nodes.clear()
        shader = nodes.new("ShaderNodeBsdfPrincipled")
        shader.inputs["Base Color"].default_value = material.diffuse_color
        shader.inputs["Roughness"].default_value = 0.85
        output = nodes.new("ShaderNodeOutputMaterial")
        material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    room = name in ("home", "school", "campus", "office", "town", "garden")
    ratio = 0.45 if name in ("male", "female", "baby") else 0.28
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        # Small features (eyes, buttons, toes) keep their original silhouette.
        triangles = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        if triangles > 320:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new("Phone detail", "DECIMATE")
            if room:
                # Collapse decimation can eat thin planks and walls after the
                # source meshes have been batched by material. Planar dissolve
                # removes redundant faces without moving architecture vertices.
                modifier.decimate_type = "DISSOLVE"
                modifier.angle_limit = math.radians(8)
                modifier.use_dissolve_boundaries = False
                modifier.delimit = {"NORMAL", "MATERIAL"}
            else:
                modifier.ratio = ratio
                modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        for uv in list(obj.data.uv_layers):
            obj.data.uv_layers.remove(uv)
        obj.data.validate(clean_customdata=True)
        obj.data.update()

    bpy.ops.export_scene.gltf(
        filepath=str(OUT / filename), export_format="GLB", export_yup=True,
        export_apply=True, export_extras=False, export_texcoords=False,
    )
    report[name] = {
        "bytes": (OUT / filename).stat().st_size,
        "triangles": sum(len(p.vertices) - 2 for obj in bpy.context.scene.objects
                         if obj.type == "MESH" for p in obj.data.polygons),
        "sourceBytes": source["files"][filename],
        "sourceTriangles": source["detail"][name]["triangles"],
    }
    print(f"LOW DETAIL {name}: {report[name]}", flush=True)

(OUT / "manifest.json").write_text(json.dumps({
    "generator": "Blender / art/build_low_detail.py",
    "sourceRevision": source["revision"],
    "textures": False,
    "detail": report,
}, indent=2) + "\n", encoding="utf-8")
