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

## Step 2: part materials, dressed sets (2026-11-26)
Owner: "Accept the GEN-15 look" and "start gen-15 step 2". The look was accepted, and cleanup step 2 was done.
- **Look `crafted-v2`** (shot field `look`; the Director default for dialogue films; `crafted-v1` stays selectable and unchanged).
  - It is crafted-v1 plus part materials. Recipes have no part names, so `partRole` (src/visual/crafted.js) derives a role from the recipe family, the colour slot and the shape:
    - **glass:** a thin dark slab (slot 4; thinnest side at most 6 cm; the other two at least 8 cm) on a machine family (screens, visors, windows). It is drawn darker and bluer. CPU adds a view-dependent sheen; Three uses roughness 0.12 and metalness 0.18.
    - **metal:** a thin secondary-colour part (slot 1; thinnest side at most 8 cm) on a machine family (trims, bezels, rails, rods). It is drawn cooler and lighter. CPU adds a sharp highlight and brighter bevels; Three uses roughness 0.3 and metalness 0.55.
  - People, animals, plants and glowing parts never get a role.
  - The role is an extra argument on the shared box stream. Renderers without crafted-v2 ignore it, so legacy and crafted-v1 drawing are identical (tested, digests unchanged).
- **Dressed sets:** see docs/SETS.md "topic-v2".
- Render `gen15b-sky-r1` (the sky script, 60 s), from clean 6dea830: CPU 6769a5630b61c789…, Three 07af439d90e3aa2f…. All PASS; CHECKS 0 (silence-v1 0, talk 77 %); QUALITY pass-with-findings, errors 0, warnings 0; matched hashes exact; glitch clean; −16.0 LUFS; vulkan. Render time: CPU 131.6 s (fixa-sky-r1 113.3 s, +16 % from the dressing), Three 55.0 s (56.0 s). Agent stills: the lab-set dressing shows behind the speakers, the pieces match the words, and both backends agree. **No human review.**
- **Alternating gesture arms** (owner: "the characters move their left hand only … add it now"; old videos may stay as they are):
  - Beats used to lift only the right arm (pose `armPitch`; the right arm appears on the viewer's left).
  - Opt-in `bodyLanguage.alternateArms` (src/core/body.js): each character's beats alternate right, left, right … across the film, counted over earlier shots that also alternate. Left beats drive `leftArmPitch`.
  - On by default for Director dialogue films. Accepted films keep the right arm. It is a boolean and does not count as an "enable" key.
- Render `gen15b-sky-r2` (alternating arms), from clean a189015: CPU b5698d35a2e5fdf4…, Three 5849347e0ae35f46…. All PASS; CHECKS 0; matched hashes exact; glitch clean; −16.0 LUFS. Beats per character alternate right and left (Student and Explorer 7 each). Agent frames 336 and 632: the Explorer lifts its left arm, then its right arm, mirrored. **No human review.**
- **Robot eyes on CPU** (owner: "in some frames in cpu rendering the robot has one eye"):
  - Cause: the CPU painter sorts flat polygons by average depth. On a turned head the far eye sat deeper than the centres of the head block and face panel and was painted over. This also affects the historical painter.
  - Fix in the crafted looks only (`CRAFTED.litBias` 0.18 m): glowing surface details (eyes, lights, mouths) sort nearer. 0.08 was not enough: gen15b-sky-r3 frame 1620 showed only the bevel strips of one eye. 0.16 is the smallest value that keeps every eye front visible for head turns up to ±0.9 rad and side cameras.
  - Three has a depth buffer and is unaffected. The historical painter is unchanged.
  - Render `gen15b-sky-r4`, from clean 751174a: CPU 096dbab2fcefe1e8…, Three 5849347e0ae35f46… (byte-identical to r2). All PASS; CHECKS 0; glitch clean; −16.0 LUFS. Agent frames 585, 1620, 1665 and 1710 show both eyes (r2 showed one). Gesture frames show nothing glowing through the arms. **No human review.**
- Tests: tests/gen15b.test.js.
