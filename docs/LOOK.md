# GEN-15 look track, step 1: crafted look (2026-11-25)
Owner: "lets skip 13 and 14 for now and go to the better looking shapes and materials".

## What changes (opt-in shot field `look: 'crafted-v1'`)
- **Same semantic boxes.** Geometry digests, quality checks, attachments and staging are unchanged. Only how each box is drawn changes, and in the same way on both renderers (src/visual/crafted.js):
  - **bevel:** every box is drawn as a chamfered box: 6 inset faces, 12 edge strips and 8 corners. The radius is absolute, 3.5 cm on big parts and 22 % of the thinnest side on thin parts; parts thinner than 2 cm stay plain. Before, Three scaled one unit rounded box, so thin parts got squashed corners, and CPU drew sharp boxes.
  - **palette:** colours are softened: saturation × 0.86, darks lifted by 6 %, a slight warm bias.
  - **shading:** CPU uses softer light (ambient 0.66, key 0.32, fill 0.1) and a small catch light on bevel strips. Three uses the same chamfered polygons as real-size geometry, cached by size, with matte, non-metallic materials (roughness 0.66, metalness 0.06).
- **Director request field `look`:**
  - `'crafted-v1'` or `'none'`;
  - absent means crafted for dialogue films, unchanged output otherwise;
  - never part of the prompt;
  - not allowed with Foundry `geometryProfile` shots (they keep their own meshes).

## Evidence
- Render `gen15-forest-r1` (the GEN-12 forest request) from clean 75c451a: CPU 0a996a7262fe460c…, Three 7f81ed48893f2bec…. All gates PASS, QUALITY pass, checks 0, hashes exact, glitch clean, −16.0 LUFS. Render time 188 s for both backends (174 s before).
- Agent comparison with gen12-forest-r2 (before):
  - **CPU:** a clear change; bevelled edges on heads, hands, feet and trees, and a softer, warmer palette.
  - **Three:** subtle, because it already rounded corners. It is slightly lighter and flatter, a little washed out.
  - Possible tuning after the owner's review: Three contrast and roughness.
- The owner has not reviewed it yet. Accepting the look starts cleanup step 2 (delete the "before" reference set).

## Three tune (owner: "tune three js", 2026-11-25)
- **Cause of the washed-out Three look:** the CPU palette lifts dark colours, which the painter needs, but Three already has ambient light and tone mapping, and the fully matte materials added more flat light.
- **Fix:** Three alone (`CRAFTED.three`) gets a lighter palette touch (saturation 0.94, lift 0.015, warm 0.012), ambient × 0.78, exposure × 0.93, roughness 0.56 and metalness 0.12. CPU is unchanged.
- **Render `gen15-forest-r2`** from clean 35ffc7c:
  - CPU 0a996a7262fe460c…, byte-identical to r1, which proves CPU is unchanged;
  - Three c1be7010ecad39c0…;
  - all gates PASS.
- **Agent comparison:** Three colours and contrast are back near their pre-GEN-15 strength, and the bevels stay.

## Next steps on the look track
Richer sets and set dressing; material accents per part (metal trims, glass screens); GEN-16 needs an owner decision (a Three-only cinematic profile).

Tests: tests/gen15.test.js (chamfer geometry: counts, orientation, inside the box, area, absolute and thin bevels; palette; legacy CPU faces identical without the look; contract, Director default, none, legacy, prompt unchanged, negatives).
