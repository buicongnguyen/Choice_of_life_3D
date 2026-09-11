# Crafted-realism art release — 0.2.0

## Implemented

Rebuilt all twenty original GLBs and their editable Blender sources. The game now uses the detailed exports directly; these are not separate concept images or mockups.

- Six room families: padded sofa construction, seat piping, cot spindles and quilt, staggered grain-textured floorboards, layered window frames and pleated curtains, desk construction and drawer handles, keyboards/mugs, slatted benches, cottage siding/roof tiles, planters, branching trees and a shaped fountain.
- Ten reward props: curved boat hull and cloth sail, lobed apple, bound book/pages/bookmark, metal coins and raised rims, fitted tin/clasp/hinges, folded textile/binding/fringe, wooden ring rattle, shaped plant leaves, envelope folds/seal, and stitched ball panels.
- Female/male/baby models: improved eye layers, eyebrows, noses and smiles; fitted shirt geometry/collars/buttons; shaped hands; shoe soles, laces and toe seams; swept hair and a coiled bun. The baby remains a seated, age-appropriate model.
- Cat: pointed ears, inner-ear shapes, muzzle, pupils, whiskers, curved tail and tabby markings.
- Differentiated physical materials and deterministic 128×128 embedded surface maps. Opaque clothing remains opaque. The game and model viewer share lighting and a locally generated reflection environment.
- Added `asset-gallery.html`, a desktop/touch close-up viewer using the production GLBs, with rotation, zoom, reset and twenty model selections.
- Added release-versioned asset URLs so a new game build does not keep showing old cached meshes.

## Review corrections

The first visual pass exposed excessive hair-strand separation, a too-strong cloth surface, a collar intersection, a sail that blended into the background, curved rigging edges, and a grid min-width issue when resizing the viewer to a phone. These were refined before release. Decorative curve resolution and tiny flower/bead geometry were reduced while retaining their visible silhouette. Static geometry is batched by material; character geometry is batched by material within each articulation parent.

The final complete art collection is approximately 18.5 MB (versus 24.2 MB in the first detailed export). It is larger than the old primitive art collection, approximately 4.3 MB. Assets remain loaded on demand; this is not a claim of measured low-end mobile frame-rate performance. Exact model byte/triangle/mesh counts are recorded in `public/models/manifest.json`.

## Compatibility and checks

- Existing movement pivots (`Head`, `ArmL`, `ArmR`, `LegL`, `LegR`) and chapter scales are retained.
- Spawn, map boundaries, interaction coordinates, ground heights and collider footprints are unchanged. Blender now emits their metadata directly; floating-point formatting/order changes do not change the layout.
- Save key, career/relationship facts, choices, discovery logic and story progression are unchanged.
- All GLBs are checked for embedded textures, opaque materials and expected articulation names.
- The short art browser review loads every model, checks the viewer on a phone, and exercises actual game movement, a choice, reload and Continue. Results are in `art-smoke-result.json`; local visual captures are under ignored `docs/captures/crafted-*.png`.
- Existing focused logic/navigation tests and the production type/build checks remain the release gate.

## Scope

This is a more detailed stylized miniature art pass applying professional modeling/material principles. It is not photorealistic or equivalent to the art budget and hand-authored animation of a full AAA title. Hand-sculpted characters, full wardrobes, high-end skin shading, facial rigs and cinematic animation remain separate future work. Physical-device performance and Safari testing remain outstanding.
