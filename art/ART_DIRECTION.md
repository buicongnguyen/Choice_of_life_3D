# Crafted realism — 0.2.0 art pass

The target is a more believable stylized miniature world, not photorealism or a claim of AAA production scale. Preserve the readable isometric view and cute cast while applying professional asset principles: silhouette first, plausible construction, differentiated materials, restrained detail and consistent lighting.

## What changes

- Furniture: upholstered sofa with separate padded seats, piping, arms and feet; framed cot; desks with structural aprons, inset tops and hardware; slatted benches.
- Rooms: staggered wood boards with grain, layered window frames and sills, fabric curtains, detailed computer workstations, architectural trim and roofing.
- Outdoors: tapered pots with soil and rim, shaped leaves with stems, branching trunks, clustered foliage, fountain basin/rim/water, stone and timber material response.
- Collectibles: lobed apple and curved leaf, cloth folds/stitching, bound book with individual page edges, rolled-edge tin and latch, metallic coins with raised rims, a curved toy boat and triangular sail, envelope folds/wax seal, a ring rattle and a seamed ball.
- People: retain distinct male/female/baby bases and stable rig names. Improve garment silhouettes, collars, seams, hands, layered hair, eyes, eyebrows, curved smiles and shoes. No adult anatomy changes are applied to the baby.
- Cat: shaped ears, muzzle, eyes, whiskers and a curved tail.
- Surfaces: embedded deterministic small PBR texture maps for wood, woven cloth, plaster and stone; independent metal, ceramic, skin and water response. Recolorable clothing/skin/hair retain neutral texture modulation.
- Lighting: softer calibrated illumination and a local reflection environment; no downloaded HDRIs, external models or runtime asset service.

## Constraints

Keep the original map bounds, ground heights, spawn, object interaction positions, stage scales, and animation pivots. Update Blender and runtime collision metadata together if a ground footprint changes. Export the actual GLBs used by the game, not only a showcase render. Merge static parts by material, and articulated parts by material plus rig parent, to control draw calls. Keep textures small and embedded so Pages requires no external art hosting.

## Review

Rebuild all twenty assets in Blender. Inspect the nursery, outdoor scene, adult character and collectibles in the actual Three.js renderer. Check representative mobile framing and movement after export. Run the existing short logic/build checks, commit the Blender sources and generated GLBs, push over SSH and confirm the live release SHA.

Future work: hand-sculpted characters, a full clothing wardrobe, authored skeletal/facial animation, unique rooms per profession and large-scale texture baking. Those are separate production tasks, not features silently implied by this pass.
