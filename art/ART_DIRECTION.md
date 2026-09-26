# Kitehaven art direction

**Bar:** toy dioramas with the finish of a Nintendo first-party game: chunky forms,
generous bevels, saturated glossy colour, readable silhouettes and lots of cheerful dressing.
It is a quality bar only. Every model here is original and procedurally authored.

## Principles
- **Vivid and warm, never pastel.** Sun yellow, coral, sea blue, grass green, candy stripes.
  Night keeps a deep blue sky and black-blue water; the lamps carry the colour.
- **One town, twelve places.** Each chapter has its own diorama with its own silhouette. The
  harbour backdrop ties them together and shows the pier in the state your choices left it.
- **Chunky toy people.** Big heads, short limbs, glossy eyes with highlights, rounded shoes.
  They age with you: baby, kid, adult, elder.
- **Colour lives in the vertices.** Per-face colour with baked ambient occlusion; materials only
  describe the finish (Matte, Satin, Gloss, Metal, Glass, Water, Glow, and recolourable Skin,
  Hair, Top, Bottom, Shoes, Accent and Kite).

## Pipeline
```sh
# full + phone detail, layout.json and manifest.json (≈30 s)
.tools/blender-4.5.0-windows-x64/blender.exe --background --factory-startup --python art/kitehaven/build.py
# a subset (layout and manifest are merged)
... --python art/kitehaven/build.py -- --only pier,props
# review renders in Eevee (lineup, one scene, or all)
... --python art/kitehaven/run_preview.py -- lineup out.png
... --python art/kitehaven/run_preview.py -- all out-folder
```

- `kit.py`: primitives (bevelled boxes, lathes, capsules, tubes, extrusions, subdivided grids,
  faceted rocks), a transform stack, vertex-colour materials, the baked AO ray tracer, and Draco
  GLB export.
- `pieces.py`: houses, trees, fences, stalls, bunting, kites, boats, a lighthouse, rooms,
  furniture, and painterly patterns (planks, tiles, cobbles, meadows).
- `characters.py`: the four bodies, eight hairstyles and accessories.
- `scenes.py`: the twelve dioramas, the harbour backdrop and the props pack.
- `build.py`: builds everything and **fails** if an anchor is off the walkable ground, inside
  furniture or unreachable from the spawn point.

## Runtime contract (see `src/world.ts`)
- Walkable ground is x ∈ [−5.85, 5.85], z ∈ [−4.05, 4.05] at y = 0 in every scene.
- Anchors: `spawn`, `exit`, `act`, `npc0…npc5`, `find0…find2`, `hunt0…hunt3`.
- Colliders are world-space boxes. Workplace colliders carry a `variant` (`studio`,
  `workshop`, `clinic`).
- Animated nodes by prefix: `Spin_*`, `Sway_*`, `Bob_*`. Variants: `Var_*` (workplace),
  `Pier_old`, `Pier_ruined`, `Pier_restored`, `Marina` (harbour).
- Characters: `Body`, `Head`, `Eyes` (blink), `Mouth_smile` / `Mouth_open` (talking), `ArmL`,
  `ArmR`, `LegL`, `LegR`. `Hair_<style>` and `Acc_<item>` group nodes are shown or hidden.
