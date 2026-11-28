# Forward-only handoff: GPU-05 TESTED + RENDERED, PR open; next GPU-06 after the merge (2026-11-28)

**Latest checkpoint (GPU-05):** `feature/gpu-05-characters` from main e706f2a (GPU-04 merged as PR #74). **The GPU-05 PR is open, not merged.** The docs PR #75 (`chore/fresh-session-gpu05`) should merge first; then rebase this branch on main and keep both texts in the continuity docs.
- **Owner decisions:** the engine creates the characters; look "B Soft rounded" (chosen over agent stills: today / soft / crisp); first heroes student, scientist, service-robot.
- **Changed:**
  - `src/core/hero-characters.js` (new: style, soft radius, hero parts, `heroDetail`);
  - `src/core/render-profiles.js` (`cinematic.characters: 'soft-v1'`, capability hero-char-v1, Director default, `threeOptions.characters`);
  - `src/visual/three-backend.js` (rounded real-size geometry for human/robot parts, Cinematic soft-v1 only; disposal);
  - `src/director/index.js` (`heroDetail` pass: detail-3 humans in soft-v1 films);
  - tests `tests/gpu05-characters.test.js` (5, with negatives) and the GPU-00…03 expectations for the new key;
  - fixture `examples/gpu05-portrait.request.json`.
- **Results:**
  - `npm test` 613 (612 pass, 0 fail, 1 skip); Python 70 OK; digests unchanged (director f5b5104977219fdf);
  - GPU Standard swangle still byte-identical to main;
  - gpu05-portrait-r1 `--compare standard` on the RTX (vulkan), b75da76, sourceDirty false: PASS; CHECKS 0 warnings both sides; frame_glitch clean both.
- **Unresolved, for the owner:**
  - deferral of the SkinnedMesh skeleton, morph targets, LODs and imported-rig adapters to GPU-06 (a gate; owner's word);
  - a topic-set floor lamp can stand right behind a speaker's head (pre-existing staging; candidate for GPU-07).
- **Next action for "fod continue":**
  1. If the GPU-05 PR is open, report it, confirm CI, and wait for the merge word (and the deferral answer).
  2. After the merge, delete all renders (out/gpu05-*, out/gpu05-looks, public/audio).
  3. GPU-06 (animation, dialogue and facial performance): ask the owner first only about a local viseme aligner (otherwise labelled estimated cues).

**Previous checkpoint (fresh session), heading as written:** fresh session at GPU-05 (2026-11-28)

**Start here ("fod continue").** Main is **e706f2a** (PR #74 merged). Tag `v1.2-dual-backend-final` → 2cb82ef, untouched. No unit PR is open; this record is on `chore/fresh-session-gpu05` (docs only). If its PR is still open, ask the owner to merge it.

**Campaign B so far (all merged on the owner's word):**

| Unit | PR → main | What it gave |
|---|---|---|
| GPU-00 | #67 → dac8f8d | ADR-001 Accepted; `renderProfile: 'cinematic-v1'`; preflight RP-01…RP-06; device-relative budget (CAMPAIGN_B_PROTOCOL.md) |
| GPU-01 | #68 → 936d0cb | `cinematic.materials: 'pbr-v1'`: physical materials per part (src/visual/pbr.js); `--compare standard` |
| FIX-RS | #70 → 3a59a65 | 1-pixel read after every frame (no stale frames); bloom blur in JS (no stripes) |
| GPU-02 | #71 → 9f2d909 | `cinematic.lights` (`auto-v1` + 5 presets, owner's "stronger" values; src/visual/cinematic-lights.js) |
| GPU-03 | #72 → 9d26a5b | `cinematic.textures: 'proc-v1'`: procedural textures (src/visual/pbr-textures.js; Foundry bark/ground) |
| FIX-NR | #73 → 6d21a35 | no lower-third caption boxes; narrator group framing; compact layout (Director digest f5b5104977219fdf) |
| GPU-04 | #74 → e706f2a | GLB import verified existing (AF05 own reader); unreachable nodes refused; 22 hostile tests |

- Director requests with `renderProfile` get `cinematic: {version: 1, materials: 'pbr-v1', lights: 'auto-v1', textures: 'proc-v1'}` by default.
- GPU Standard and CPU Classic are unchanged by every Cinematic unit (swangle stills byte-identical; digests).
- **Deliberate byte changes:** FIX-RS bloom (≤ 3 levels) and FIX-NR Director plans.
- **Baseline:**
  - `npm test` 608 (607 pass, 0 fail, 1 Windows skip); Python 70 OK;
  - digests with `--exclude talk04,talk05,gen01,gen09,gen12,fixa,dual,gpu`: graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director f5b5104977219fdf.

**Standing owner rules (2026-11-28; also in CLAUDE.md):**
- fast implementations; benchmarks (perf-bench ×3) only at GPU-10/GPU-12 or on request;
- after every merge delete all renders (keep out/speech-cache, public/media, the fixture JSON); "the final will be what we keep";
- no caption boxes in Director films;
- explain every option in plain words before asking, and make proposals that fit other machines too;
- GPU-10 must first ask the owner to configure the budget check;
- code branches are `feature/…` (CI runs only there and on main).

**Next action for "fod continue": GPU-05 (high-fidelity characters).**
1. Bootstrap (CLAUDE.md), `git switch main && git pull`, then branch `feature/gpu-05-characters`.
2. Read CAMPAIGN_B.md "GPU-05", directive §4 GPU-05, and the seams: src/visual/catalog.js and catalog-rig.js (human/robot recipes, detail 2/3 faces, `headed`), src/core/identity.js, src/core/body.js and talk.js, src/foundry/hero.js and hero-recipes.js.
3. **Owner decision (2026-11-28, before GPU-05): the engine creates the hero characters** ("yes i agree"). It extends the existing procedural character builder (catalog recipes and rig) into refined stylized characters. No imported or self-made models now: rigged GLB characters need skins and animations, which the importer refuses by design and the owner's GPU-04 choice excludes. Importing rigged characters may be reconsidered after GPU-06 (skeletons and animation), on the owner's word.
   - **Ask the owner only about the look** (UI choice, options explained plainly, shown as rendered stills the agent makes): e.g. rounded-stylized vs detailed-blocky, and which 2–3 characters to start with (e.g. scientist, student, robot).
   - Keep the box characters as a valid style.
4. **Build:** opt-in, versioned, Cinematic only, generalized (every film can use the new characters through the Director); tests including negatives.
5. **Evidence:** one comparison render with checks; then checkpoint, PR, and merge only on the owner's word.

**Render session (PowerShell):** `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`. Run long renders detached (CLAUDE.md tooling lessons).

**Previous checkpoint (GPU-04), heading as written:** GPU-04 VERIFIED EXISTING + HARDENED, PR open; next GPU-05 (2026-11-28)

**Latest checkpoint (GPU-04):** `feature/gpu-04-glb` from main 6d21a35. FIX-NR is merged as PR #73 on the owner's "merge". **The GPU-04 PR is open, not merged.**
- **Owner:** plain GLB only; own generated models only.
- **Changed:**
  - `scripts/import-formats.mjs` (unreachable nodes refused);
  - `tests/gpu04-glb.test.js` (new).
- **Results:**
  - 608 tests, 0 fail; digests unchanged (director f5b5104977219fdf);
  - gpu04-imported-r1 comparison PASS, glitch clean.
- **Next action for "fod continue":**
  1. If the GPU-04 PR is open, report it, confirm CI, and wait for the merge word.
  2. After the merge, delete all renders.
  3. GPU-05 (high-fidelity characters): first ask the owner about art direction and the first 2–3 hero characters (UI choice, options explained). Keep the box characters as a valid style. Fast: tests and one render.

**Previous checkpoint (FIX-NR), heading as written:** FIX-NR TESTED + RENDERED, PR open; next GPU-04 (2026-11-28)

**Latest checkpoint (FIX-NR):** `feature/fix-narrator` from main 9d26a5b. GPU-03 is merged as PR #72 on the owner's "merge and continue". **The FIX-NR PR is open, not merged.**
- **Owner (standing):** "remove every old renders … the final will be what we keep". All renders are deleted, including the v1.2 final batches and the GPU-00 references (about 4.5 GB). After every merge, delete all renders in out/ and public/audio; keep only out/speech-cache, public/media and the fixture JSON.
- **Changed:**
  - `src/director/index.js` (`shotOverlays`, `narratorRig`);
  - `src/director/offline.js` (compact narrator layout);
  - `tests/fixnr-narrator.test.js`.
- **Results:**
  - 605 tests, 0 fail;
  - digests: graph, geometry and detail2 unchanged; director **f5b5104977219fdf** (deliberate);
  - fixnr-product-r2: one caption, large subjects, CHECKS motion/visibility/crowding 0, glitch clean;
  - no benchmarks (owner rule).
- **Open for the owner:** narrator films still show the shot title and subheading at the top, and the subheading repeats the first spoken sentence. Offer removing or shortening it if the owner wants.
- **Next action for "fod continue":**
  1. If the FIX-NR PR is open, report it, confirm CI, and wait for the merge word.
  2. After the merge, delete all renders.
  3. GPU-04 on `feature/gpu-04-glb`: ask the owner first about the GLB loader and decoders (GLTFLoader is in three; DRACO/meshopt/KTX2 need approval) and the format policy. Fast: tests and one render.

**Previous checkpoint (GPU-03), heading as written:** GPU-03 TESTED + RENDERED, PR open; next FIX-NR (2026-11-28)

**Latest checkpoint (GPU-03):** `feature/gpu-03-textures` from main 9f2d909. GPU-02 is merged as PR #71 on the owner's "merge". **The GPU-03 PR is open, not merged.**
- **Owner decisions this session:**
  - procedural textures only;
  - the narrator defects get a separate unit after GPU-03 (FIX-NR);
  - "we dont need extra caption box at all";
  - "timed turns only at the milestones … we need fast implementations".
- **Changed:**
  - `src/foundry/materials.js` (bark and ground; `TEXTURE_PATTERNS` exported);
  - `src/visual/pbr-textures.js` (new);
  - `src/visual/three-backend.js` (texture sets, UV geometry, floor, disposal);
  - `src/core/render-profiles.js` (proc-texture-v1, textures rule);
  - tests `tests/gpu03-textures.test.js`, with the GPU-00/01/02 test expectations updated;
  - fixtures `examples/gpu03-*.request.json`.
- **Results:**
  - 602 tests, 0 fail; digests unchanged; Standard byte-identical;
  - 3 comparison films PASS, clean on glitch and stale checks;
  - bench (already running before the owner's rule): 1.04 × Standard, +470 MiB GPU memory.
- **Next action for "fod continue":**
  1. If the GPU-03 PR is open, report it, confirm CI, and wait for the merge word.
  2. After the merge, clear renders older than GPU-03: keep gpu03-*, the GPU-00 references, out/speech-cache, public/media and the v1.2 batches; remove gpu02-* and out/bench/gpu02-*.
  3. FIX-NR on `feature/fix-narrator` (CAMPAIGN_B.md "FIX-NR"). Fast: tests, one fresh narrator film, checks; no benchmarks. Then GPU-04 (ask the owner first about the GLB loader and decoders: an owner decision).

**Previous checkpoint (GPU-02), heading as written:** GPU-02 TESTED + RENDERED, PR open; next GPU-03 (2026-11-28)

**Latest checkpoint (GPU-02):** `feature/gpu-02-lighting` from main 3a59a65. FIX-RS is merged as PR #70 on the owner's "continue i agree with merge", after CI passed on 8c01269. **The GPU-02 PR is open, not merged.**
- **Owner decision:** the "stronger" lighting values (UI choice over Standard / subtle / stronger stills).
- **Changed:**
  - `src/visual/cinematic-lights.js` (new);
  - `src/visual/three-backend.js` (fill light, 2048 px shadow, presets per shot, room-reflection share);
  - `src/core/render-profiles.js` (env-light-v1, LIGHT_PRESET_IDS, defaults, threeOptions.lights);
  - tests `tests/gpu02-lights.test.js` (6), with `tests/gpu00-profiles.test.js` and `tests/gpu01-pbr.test.js` updated for the new defaults;
  - fixtures `examples/gpu02-{portrait,product,environment}.request.json`.
- **Results:**
  - `npm test` 596 (0 fail); digests unchanged; GPU Standard stills byte-identical to main;
  - 3 comparison films PASS (f46c097, sourceDirty false), clean on glitch and stale checks; no added flicker;
  - bench: Cinematic wall time 1.0 × Standard, +350 MiB GPU memory; RAM over the 3 GB cap (reported).
- **Unresolved:**
  - the RAM cap on this laptop (→ GPU-10 configuration);
  - the product film's pre-existing CHECKS warnings (OFF_FRAME object-2 etc.; Director staging, not lighting);
  - the PR CI result to confirm before the merge.
- **Next action for "fod continue":**
  1. If the GPU-02 PR is open, report it, confirm CI on its head, and wait for the merge word.
  2. After the merge, clear renders older than GPU-02: keep gpu02-*-r1, out/bench/gpu02-*, the GPU-00 references and out/bench/gpu00-*, out/speech-cache, public/media and the v1.2 final batches; remove gpu01-*.
  3. Then GPU-03 on `feature/gpu-03-textures` from main (CAMPAIGN_B.md "GPU-03"). Ask the owner first about importing local textures that carry third-party licences (an owner decision for GPU-03); procedural generators need no approval.

**Previous checkpoint (FIX-RS), heading as written:** FIX-RS TESTED + RENDERED, PR open; next GPU-02 (2026-11-28)

**Latest checkpoint (FIX-RS):** `feature/fix-render-stability` (renamed from fix/… so the CI test job runs; PR #69 closed → #70) from main 936d0cb. GPU-01 is merged as PR #68 on the owner's "merge and start the fix", after CI passed on dca76d5. **The FIX-RS PR is open, not merged.**
- **Changed:**
  - `src/index.jsx` (1-pixel read after drawFilm);
  - `src/core/fidelity.js` (`blurRGBA`);
  - `src/visual/fidelity-effects.js` (bloom uses blurRGBA);
  - `tests/fixrs-capture.test.js` (6 tests).
- **Root causes, fixes, alternatives rejected, measurements:** CAMPAIGN_B.md "FIX-RS".
- **Results:**
  - `npm test` 590 (0 fail); Python 70 OK; digests unchanged (`--exclude …,dual,gpu`);
  - 4 swatch re-renders and gpu01-swatches-r3 are clean (glitch, stripes, stale frames).
- **For the owner:**
  - the read costs about 26 % render speed on the RTX route (28 vs 38 fps, 8 tabs);
  - polished re-renders differ from older renders by ≤ 3 levels on about 1 % of pixels (new byte baseline);
  - the merge needs the owner's word after CI.
- **Measurement tools (scratchpad, re-creatable; not in the repo):**
  - stripe score: high-pass column means in rows 26–40 %, > 1 = striped;
  - stale scan: a frame matching a non-adjacent earlier frame at mean diff < 0.5 while differing from the previous frame by > 2;
  - the reproduction: openBrowser + selectComposition(puppeteerInstance) + renderMedia, 1 tab.
  - Worth turning into a repo check in GPU-10 (performance and quality profiles).
- **Next action for "fod continue":**
  1. If the FIX-RS PR is open, report it, confirm CI on its head, and wait for the merge word.
  2. After the merge, clear renders older than FIX-RS. Keep gpu01-swatches-r3, gpu01-portrait-r2, the GPU-00 references, out/bench/gpu00-*, gpu01-portrait-r2-*, out/speech-cache, public/media and the v1.2 final batches. Remove out/bench/gpu01-swatch-c1/c8, fixrs-*, fixrs2-* and gpu01-swatches-r2.
  3. Then GPU-02 on `feature/gpu-02-lighting` from main (CAMPAIGN_B.md "GPU-02"). Ask the owner about look references only if they want to steer (otherwise propose a before/after).

**Previous checkpoint (GPU-01), heading as written:** Campaign B GPU-01 TESTED + RENDERED, PR open; next FIX-RS (2026-11-27)

**Latest checkpoint (GPU-01):** `feature/gpu-01-pbr` from main dac8f8d. GPU-00 is merged as PR #67 on the owner's "now merge and move to gpu-01", after CI passed on d5eed73. **The GPU-01 PR is open, not merged.**
- **Owner decisions this session:**
  - GPU-10 must first ask the owner to configure the pre-render budget check (in the roadmap);
  - the pre-existing render defects get a separate unit, FIX-RS, before GPU-02 ("Separate unit next").
- **Built:**
  - `src/visual/pbr.js` (new);
  - `src/visual/three-backend.js` (options, pbr materials, per-material room light);
  - `src/visual/catalog.js` (surface keys);
  - `src/core/render-profiles.js` (pbr-v1, cinematic block, threeOptions);
  - `src/core/timeline.js`, `src/director/{schema,index,foundry}.js`, `src/index.jsx`;
  - `src/studio/production.js` (ids, standardVariant, normalizedScene);
  - `scripts/production-options.mjs` (`--compare standard`), `scripts/produce.mjs`, `scripts/compare_release.py` and `scripts/matched_inventory.py` (`--profiles`);
  - tests `tests/gpu01-pbr.test.js` and `tests/test_profile_pair.py`; `tests/gpu00-profiles.test.js` updated for pbr-v1 and the defaults;
  - fixtures `examples/gpu01-swatches-cinematic.json` and `examples/gpu01-portrait.request.json`.
- **Results:**
  - `npm test` 584 (583 pass, 0 fail, 1 skip); Python 70 OK; fonts current;
  - digests unchanged with `--exclude …,dual,gpu` (the `gpu` exclusion is new, see the protocol);
  - GPU Standard swangle stills byte-identical to main;
  - films gpu01-swatches-r2 and gpu01-portrait-r2, both `--compare standard`, PASS, sourceDirty false, b6dad1a;
  - bench: Cinematic 0.94 × Standard wall time, +100 MiB GPU memory; one Cinematic run had 3.23 GB RAM growth, over the 3 GB reference cap (reported).
- **Tuning history (agent stills, not owner review):**
  - first attempt +35–45 % brighter and washed out;
  - then metals read black, because three ignores material.envMapIntensity when scene.environment is set;
  - final version: per-material room light and steel-tinted metals, luma −3 to −5 % vs Standard.
- **Superseded films:** gpu01-*-r1 (the metal defect).
- **Unresolved:**
  - FIX-RS defects (stripes; flash at frame 480 in gpu01-swatches);
  - the backpack straps read as metal (crafted-v2 role rule for the "case" family);
  - the PR CI result to confirm before the merge.
- **Next action for "fod continue":**
  1. If the GPU-01 PR is open, report it, confirm CI on its head, and wait for the owner's merge word.
  2. After the merge, clear renders older than GPU-01: keep the GPU-00 references, gpu01-*-r2, out/bench/gpu00-* and gpu01-portrait-r2-*, out/speech-cache, public/media and the v1.2 final batches.
  3. Then FIX-RS on `feature/fix-render-stability` (renamed from fix/… so the CI test job runs; PR #69 closed → #70) from main (plan in CAMPAIGN_B.md "FIX-RS"). Then GPU-02.

**Previous checkpoint (GPU-00):** `feature/gpu-00-architecture` from main 69a3a5e (PR #66 merged on the owner's "merge pr 66 and start gpu-00"). **PR #67 is open, not merged.**
- **Owner decisions this session:**
  - **ADR-001 Accepted** ("Approve as written", UI choice);
  - **budget delegated** ("what you propose since this is not the only computer that will use the program"), so the proposal recorded is relative to the rendering machine. The owner asked for every option to be explained; do that in plain words whenever offering choices.
- **Built:**
  - `docs/CAMPAIGN_B_AUDIT.md` (inventory);
  - `docs/adr/ADR-001-render-profiles.md` (Accepted);
  - `src/core/render-profiles.js` (profiles, capability table `shared`, negotiation, RP-01…RP-06, report fields), wired into `src/core/timeline.js`, `src/director/schema.js`, `src/director/index.js`, `src/director/foundry.js`, `scripts/production-options.mjs`, `scripts/produce.mjs` (RP-05 warning) and `scripts/native-render.mjs` (report fields, `threeVersion`);
  - `tests/gpu00-profiles.test.js` (12 tests);
  - `examples/gpu00-{portrait,product,environment,science}.request.json`;
  - `docs/continuity/CAMPAIGN_B_PROTOCOL.md` (campaign-b-protocol-v1 with the budget and the Standard baseline table);
  - a new section in DUAL_BACKEND_POLICY.md.
- **Results:**
  - `npm test` 572 (571 pass, 0 fail, 1 Windows skip); Python 63 OK; fonts up to date; digests unchanged (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6);
  - 4 reference productions on vulkan (sourceDirty false, commit 7e8945c), all PASS; 12 bench runs, 0 failed. Numbers in CAMPAIGN_B_PROTOCOL.md.
- **Agent stills:** portrait frame 24.2 and the product contact sheet were inspected; both look normal for Standard.
- **Unresolved, recorded:**
  - product reference: 3 motion and 5 silence warnings, `OFF_FRAME` object-2 in 3 shots, laptop small in frame;
  - the environment reference's Director picks are charts and props, not a rich place (GPU-07's job);
  - frame_glitch and loudness not run on the references;
  - RP-06 enforcement (device memory and free RAM preflight) is GPU-10;
  - PR #67 CI result to confirm before the merge.
- **Next action for "fod continue":**
  1. If PR #67 is open, report it, confirm CI is green on its head, and wait for the owner's merge word.
  2. After the merge, clear renders older than GPU-00. Keep out/gpu00-*, out/bench/gpu00-*, out/speech-cache, public/media, and the v1.2 final films named below as the regression baseline.
  3. Then GPU-01 (CAMPAIGN_B.md "GPU-01"): first the capability `pbr-v1` and the Standard-vs-Cinematic matched mode (one shared preparation, two Three.js renders).

**Previous checkpoint (Campaign B setup):**
- **Campaign A is complete:** tag `v1.2-dual-backend-final` → main 2cb82ef (owner "tag"; no release publication).
- **The owner supplied the Campaign B master directive** and asked for the FOD setup to start in a new session.
- **Stored on `chore/campaign-b-setup`** (docs only):
  - directive verbatim (docs/continuity/CAMPAIGN_B_DIRECTIVE.md);
  - tracker with binding rules, reuse map, proposed protocol, FOD plan per milestone, owner decisions and ledger (docs/continuity/CAMPAIGN_B.md);
  - CLAUDE.md, AGENTS.md, CURRENT_STATE, NEXT_UNITS, START_CLAUDE, the continuity README;
  - a status note in DUAL_BACKEND_POLICY.md (no rule changed).
- **If its PR is still open at bootstrap, its content is the latest canon:** read it from that branch and ask the owner to merge it.

**Next action for "fod continue": GPU-00** (plan: CAMPAIGN_B.md "GPU-00"; directive §4 GPU-00 and §2)
1. **Bootstrap.**
   - Confirm `git rev-list -n 1 v1.2-dual-backend-final` = 2cb82efc060ff13e06274fe557e5c4927a119056 and main clean.
   - `git switch main && git pull && npm install`, then branch `feature/gpu-00-architecture` from main.
2. **Baseline.**
   - Run `npm test` (fail 0), Python 63 OK, `node scripts/font-metrics.mjs --check`.
   - Run `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual`: graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6.
   - Run `nvidia-smi` and `node scripts/gl-probe.mjs` (WebGL renderer per GL route).
3. **Inventory (read-only)** → docs/CAMPAIGN_B_AUDIT.md:
   - three-backend.js renderer, colour, shadows, lights, materials, caches, disposal;
   - Foundry materials, textures and LOD; graph and box-stream APIs; Remotion render settings;
   - the `three/examples/jsm` modules available (verified present: GLTFLoader, DRACOLoader, KTX2Loader, meshopt decoder, RGBE/HDR loaders, EffectComposer, UnrealBloomPass, BokehPass, RoomEnvironment).
4. **Draft `docs/adr/ADR-001-render-profiles.md`** (Proposed):
   - the three profiles; shared vs exclusive capabilities with a typed capability vocabulary;
   - a distinct versioned profile field (`profile` is taken by the fidelity profile);
   - the preflight negotiation contract with diagnostic codes and user choices;
   - the determinism statement; what DUAL_BACKEND_POLICY keeps and replaces.
   - **Stop and ask the owner to approve it (UI choice).** No GPU-exclusive capability before approval.
5. **After approval:**
   - ADR → Accepted; add a pointer section to DUAL_BACKEND_POLICY.md.
   - Profile skeleton: field, validation, capability table, preflight refusals, report fields. No visual change; tests prove legacy renders and digests unchanged and that wrong pairings fail before rendering.
6. **Reference scenes** (portrait character, product hero, environment, scientific visualization), each with one prepared audio and timeline. Run them on Standard via perf-bench (≥ 3 runs, cold then warm): wall time, fps, peak GPU memory, process RAM, WebGL renderer, concurrency, encoder.
7. **Budget table** for the owner to agree or revise (directive targets: Cinematic ≤ 6 GiB GPU memory for 60 s references, ≥ 2 GiB headroom, ≤ 3× Standard median wall time). Then freeze `campaign-b-protocol-v1` (CAMPAIGN_B_PROTOCOL.md), checkpoint and open the PR. Merge only on the owner's word.

- **Render session:** `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"`. Run long jobs detached (CLAUDE.md "Tooling lessons").
- **Kept renders:** out/batches/dual09-matrix-r2 and dual09-final-r1 (v1.2 final films; both verify), out/bench/d09-*, out/dual09-preview-mem/result.json, out/speech-cache, public/media. The v1.2 harbour fixture (reg-harbour06) is a ready regression input for perf-bench, but its soundtrack in public/audio was cleared: re-create it with a fresh `produce.mjs` pair before benchmarking.

**Previous checkpoint (merge):** PR #64 (DUAL-09) merged on the owner's "merge and finilize" → main 79f76d7 (CI 46033308643 green on 7cabbf6, 560 tests). Renders older than DUAL-09 cleared (1,465 MB); kept out/batches/dual09-matrix-r2 and dual09-final-r1 (both verify), out/bench/d09-*, out/dual09-preview-mem/result.json, the speech cache and public/media.
- **Next action for "fod continue":** ask the owner for the tag word. On "tag": tag `v1.2-dual-backend-final` on the exact accepted main commit (79f76d7 or the commit of this record's merge, as the owner says), push the tag, no release publication. **Campaign B (GPU-only graphics) only with the owner's separate authorization after the tag** (it revises docs/DUAL_BACKEND_POLICY.md).
- Deferred by the owner: CPU-only detail polish ("we can fix anything in cpu in later stages"), generalized, not per film.

**Latest checkpoint (DUAL-09):** `feature/dual-09-qualification` from main 527df34 (DUAL-08 merged as PR #63 on the owner's "merge and continue"; renders older than DUAL-08 cleared). PR open, **not merged, not tagged**.
- **Built and fixed:**
  - preview in-flight hardening (6705c84): 2 concurrent picture loads, obsolete fetches aborted and never decoded; real-Chromium bench scripts/preview-memory-bench.mjs: peak +1221/+1372 MB before → +676/+596 MB after;
  - batch production reports read with a 32 MB bound (0aa339b): a passing 235.7 s film had been refused (504 KB report) and re-rendered;
  - lists never drawn with their first item missing (fee87d8); 77 example plans compared, only the two new fixtures change; legacy Director digest unchanged.
- **Qualification:**
  - 8 new fixtures (examples/dual09-*.request.json) across all content modes, the three formats, 30/60/90 s and a 235.7 s film, on both backends, plus DUAL-07 narrator and DUAL-06 harbour regressions;
  - final films: out/batches/dual09-matrix-r2 (dialogue, narrator, mixed, typography, maths, gallery, 2 regressions) and out/batches/dual09-final-r1 (charts, long); `batch.mjs verify` ok on all;
  - superseded batches: dual09-matrix-r1 (environment not set), dual09-long-r1 and dual09-charts-r1 (list defect).
- **Owner review changes (no re-render, owner's decision):** CPU far-eye repair (5b104a9, `CRAFTED.detailBias` 0.10) and no light beams in new Director films (`fidelity.lightShafts: 0`; Director digest now 8a0ad025b6c9f6d6).
- **Tests:** 560 JS (0 fail, 1 Windows skip), Python 63 OK, graph/geometry/detail2 = DUAL-00, Director digest changed on purpose (above), fonts current. Clean install from a fresh clone: same results.
- **Measured:** CPU 28.5 fps byte-stable; Three vulkan 44.3 fps, 1.59 GB GPU memory, **not byte-stable** (visually identical, ≥ 51.5 dB; known since DUAL-04); Three swangle 3.4 fps, byte-stable.
- **Changed files:**
  - code: src/visual/preview-media.js, studio/app.js, scripts/batch-lib.mjs, src/director/aids.js;
  - tests: tests/dual09-preview.test.js (new), tests/batch.test.js, tests/audit07.test.js, tests/composition.test.js, tests/fixtures/fake-produce.mjs;
  - bench and fixtures: scripts/preview-memory-bench.mjs (new), examples/dual09-*.request.json, examples/batches/dual09-*.batch.json;
  - docs: docs/RELEASE_1_2.md (new), docs/MEDIA.md, docs/BATCH.md, docs/COMPOSITION.md, README.md and the continuity docs.
- **Unresolved, for the owner:**
  - review representative films;
  - accept the known limitations or make the GPU byte-stability a gate;
  - the licence situation (GPL parts, Remotion terms, no project licence);
  - merge, then tag `v1.2-dual-backend-final` on the exact accepted commit (no publication).
- **Next action for "fod continue":**
  - if the DUAL-09 PR is open, report it and wait for the owner's review, merge word and tag word (confirm CI green on its head);
  - after the merge: clear renders older than DUAL-09 (keep out/batches/dual09-matrix-r2 and dual09-final-r1, out/bench/d09-*, out/dual09-preview-mem, the speech cache and public/media);
  - tag only on the owner's word;
  - Campaign B only with separate authorization after the tag.
Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized. The text below is the earlier fresh-start handoff for DUAL-08, kept as written; the checkpoint above supersedes its "Next action".
- **DUAL-00 … DUAL-07 are COMPLETE and MERGED.** Main is at **0e83826** (PR #61 merged on the owner's "merge"; CI 45989203443 green on 14a4a9a, 522/522).
- **DUAL-07** = Studio integration (content mode, format, look, sound, visuals JSON, picture library; real fonts and pictures in the preview), the **independent audit repair** (findings 1–4 reproduced and repaired; finding 5 = DUAL-08 boundary requirements, recorded) and a tidier "Make a film" form (owner request). The owner inspected the Studio before the merge.
- **Next milestone: DUAL-08** (bounded local batch production). The owner decided **"Build it now"** (2026-11-27), before DUAL-09. Its binding requirements are the **"DUAL-08 boundary assessment"** in CAMPAIGN_A.md (eight items) plus the DUAL-08 plan there.
- **After DUAL-08: DUAL-09** (final qualification and release, proposed tag `v1.2-dual-backend-final`, tag only on the owner's word), including the recorded hardening item: bound in-flight preview picture loads (concurrent decode limit, cancelled obsolete fetches, measured peak process memory).
- This handoff is on `chore/fod-handoff-dual08` (docs only, no CI by design). **If its PR is still open at bootstrap, its content is the latest canon:** read it from that branch and ask the owner to merge it.

Date: 2026-11-27. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Campaign status, evidence and the remaining plan: CAMPAIGN_A.md. Requirements: CAMPAIGN_A_DIRECTIVE.md (verbatim). Contracts: docs/COMPOSITION.md (compose-v1/v2, fonts), docs/MATHS.md, docs/CHARTS.md, docs/MEDIA.md, docs/FORMATS.md, docs/THEMES_AUDIO.md, docs/AUTHORING.md (authoring guide), docs/STUDIO.md. Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md.

## Where things stand (one table)
| Milestone | State | Main capability (all opt-in) | Contract |
|---|---|---|---|
| DUAL-00 | MERGED #50 | baseline, capability audit, fixture IDs `dual<NN>-<slug>-r<n>` | CAMPAIGN_A_AUDIT.md, CAMPAIGN_A_PROTOCOL.md |
| DUAL-01 | MERGED #51 | `compose-v1` aids; `content` explainer-v1 / mixed-v1; check aids-v1 | docs/COMPOSITION.md |
| DUAL-02 | MERGED #52 | bundled OFL fonts; `compose-v2` typography; typography-v1 | docs/COMPOSITION.md "Typography" |
| DUAL-03 | MERGED #53 | MathJax 4.1.3 (Node-only) equations, plots, graphs, arrays, `request.visuals` | docs/MATHS.md |
| CI | MERGED #54 | test job runs `npm ci` | CURRENT_STATE.md |
| DUAL-04 | MERGED #55 | charts, timelines, flowcharts, comparison cards (two audit repair passes) | docs/CHARTS.md |
| DUAL-05 | MERGED #57 | local PNG/JPEG/static WebP library, verified `image` item, pan/zoom | docs/MEDIA.md |
| DUAL-06 | MERGED #59, #60 | vertical/landscape/square formats; contrast theme, caption styles, silent soundtrack | docs/FORMATS.md, docs/THEMES_AUDIO.md |
| DUAL-07 | MERGED #61 | Studio: content mode, format, look, sound, visuals JSON, picture library, verified preview pictures, GL adapter identity; audit repaired | docs/AUTHORING.md, docs/STUDIO.md |
| DUAL-08 | **TESTED + RENDERED**, PR open | bounded local batch queue, machine render lock | docs/BATCH.md |
| DUAL-09 | planned | qualification and release v1.2 | CAMPAIGN_A.md plan |

## Next action for "fod continue": DUAL-08
1. Bootstrap (below). If `chore/fod-handoff-dual08` is still an open PR, read this file from it and ask the owner to merge it.
2. `git switch main && git pull && npm install`; branch `feature/dual-08-batch` from main (never stacked).
3. Read the DUAL-08 directive section (CAMPAIGN_A_DIRECTIVE.md), the DUAL-08 audit rows (CAMPAIGN_A_AUDIT.md), the DUAL-08 plan and the **"DUAL-08 boundary assessment"** in CAMPAIGN_A.md; the relevant source is scripts/studio-server.mjs (job registry, `atomic`, `nativeRunner`), scripts/cli.mjs, scripts/produce.mjs and scripts/native-render.mjs.
4. Build a bounded local batch (CLI first; Studio list later only if cheap): a queue of validated requests/projects with explicit backend, format and output root; unique IDs; per-batch and per-job manifests written atomically before each side effect; one render at a time by default; cross-process lock shared with the Studio and produce.mjs; process-tree cancel (Windows `taskkill /T /F`); restart recovery marking interrupted jobs; idempotent resume that skips verified outputs and never re-renders them; bounded retries; per-job failure reports; no SaaS, scheduling or posting. Ask the owner before any new dependency.
5. Exit (CAMPAIGN_A.md): mixed success / failure / cancel fixtures, restart recovery, no lost outputs, bounded resources; tests incl. negative and race cases; fresh `dual08-…` films on both backends from a small batch; FOD checkpoint; PR; merge only on the owner's word; then clear renders older than DUAL-08 (owner rule).

## The FOD loop for every remaining milestone
1. **Branch:** one branch per unit, from main.
2. **Read:** the directive section, the audit rows, the plan rows and the relevant source only.
3. **Implement and test:**
   - reproduce any reported defect before fixing it;
   - make minimal opt-in, versioned changes;
   - validate every untrusted input with explicit messages;
   - add positive, negative and adversarial tests (drawing tests check intermediate and final frames).
4. **Check the baseline:** `npm test` (fail 0), the Python tests, the legacy digests (`--exclude talk04,talk05,gen01,gen09,gen12,fixa,dual`) and `node scripts/font-metrics.mjs --check`.
5. **Render:**
   - commit first (`sourceDirty false`), and do not touch the working tree while a render runs;
   - produce fresh `dual<NN>-…` films with `node scripts/produce.mjs --request … --backend both --id …` on vulkan;
   - record PASS lines, CHECKS, QUALITY, frame_glitch, ebur128 loudness and hashes;
   - inspect stills from the timeline's phrase frames on both backends, and fix what the stills show.
6. **Checkpoint:** update CURRENT_STATE.md, this file and the CAMPAIGN_A.md row, evidence and ledger, plus the milestone's contract doc.
7. **Hand over:** push, open the PR and wait for the PR CI test job, then report in plain language with short tables. **Merge only on the owner's word**, after confirming CI is green on the PR's current head.
8. **Be honest in reports:** keep automated checks, agent stills and owner review separate. GPU (vulkan) Three.js renders are not bit-reproducible across runs (PSNR ≈ 64 dB between identical scenes); CPU renders are.

## Tooling lessons (cost real time this session)
- **Bash heredocs and `node -e`:**
  - they strip regex backslashes (`\s` became `s`; `\b` became a backspace character);
  - double-quoted `node -e` also runs backtick substitution.
  - Write edit scripts to the scratchpad with the Write tool, or use the Edit tool.
- **Write tool and `\uXXXX`:** it turns `\uXXXX` escapes inside regex or string literals into literal characters (U+2028 broke a regex). Afterwards run a small "re-escape invisible characters" script (e.g. scratchpad `unesc.cjs`: replace U+2028/2029/200B–200F/202A–202E/FEFF with `\u` escapes). `tests/typography.test.js` guards source files against control characters.
- **Line endings:** working copies are CRLF; normalise `\r\n` before multi-line anchors.
- **Renders:** never write files while a render runs; the second production in a batch will be marked sourceDirty.
- **Headless browser probes:** running chrome-headless-shell directly (`--dump-dom`) crashes on this machine (network service and GPU process exit). Use Remotion's `openBrowser('chrome')`, `browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}})` and `page.evaluate(fn,...args)`.
- **Render stall watchdog:** dual06-contrast-r1 once stalled at frame 90 with idle tabs and no error. Watch long renders with a loop that reports when the log stops growing for 3 minutes; reproduce with single-frame renderStill before blaming code. Never leave a scripts/.tmp-* file while starting a production (it marks the run sourceDirty).
- **Processes:** the session's permission check refused stopping a stray `chrome-headless-shell`. Don't work around it; tell the owner.

## Open issues
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12 and PR #43; ask before closing.
- OPEN-7 disk (after the 2026-11-27 cleanup, owner rule "clear older renders after each merged milestone"): out/ holds only the DUAL-07 evidence (dual07-harbour-v-r1, dual07-narrator-r2, Studio jobs studio-e7dd725ee4f43709ef0f CPU and studio-6c066c099db672cd73ee Three), out/speech-cache and the polish0x fixture folders; public/audio is empty; public/media holds the five dual05 illustrations (local library, git-ignored; `node scripts/media-import.mjs verify`).
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test (DUAL-09).
- DUAL-09 hardening item: in-flight preview picture loads are not yet bounded (see CAMPAIGN_A.md, DUAL-09 plan).
- A render once stalled with idle tabs (dual06-contrast-r1); use the stall watchdog (Tooling lessons).
- The owner's Studio may still be running from this session (port 4173, started with the launcher); stop it by closing its window or by the PID on port 4173.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main **0e83826** (or later if this handoff PR was merged); only `v0.4-render-baseline` tagged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the DUAL-08 directive section).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests **8a0ad025b6c9f6d6** (since DUAL-09: every Director plan carries `fidelity.lightShafts: 0`, owner "those lights should be removed"; 2cbf9916e65da935 before);
   - `npm test` must give fail 0 (522 tests at 0e83826, 1 Windows skip; CI runs all 522). Also run it once with public/media renamed away: CI has no local media library;
   - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` must give 63 OK;
   - `node scripts/font-metrics.mjs --check` must say up to date.

## Owner working agreement and taste (binding; see also auto-memory)
- **Delegation:**
  - the owner delegates whole units and wants plain-language reports with short tables;
  - stop only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo, or changing accepted films.
- **Branches and merges:**
  - one branch per unit, always from main, never stacked;
  - push the branch and open a PR (the owner allowed pushes: "i allow pushes");
  - **merge only on the owner's explicit word, after PR CI passes**;
  - docs-only records go on `chore/…` branches, which get no CI by design.
- **Choices over silent changes:** the owner prefers being offered choices in the UI over silent rule changes ("give a list of advice … so whoever uses it could be able to choose"). When a threshold is uncertain, offer options and say what the measurement shows.
- **Render cleanup (owner 2026-11-27, standing):** "no need to accumulate videos all the time". After each merged milestone, delete renders older than it in out/ and the temporary soundtracks in public/audio; keep the latest milestone's films, out/speech-cache and public/media. List what was removed in CAMPAIGN_A.md.
- **Old films:** "for old videos there is no problem if they remain as they are. the last videos are those that count". New behaviour goes on the Director/Studio path as an opt-in default; accepted films stay unchanged.
- **Generalize:** every fix must work for every video automatically. Prove it with a fresh Director or Studio request and no hand edits.
- **Vertical video:**
  - films go to 9:16 feeds;
  - characters must read large;
  - **no character may ever be cut by the frame edge**. A character wholly outside the frame (for example the listener during a single) is fine.
- **Calm, sparse motion:** about 1 small nod and 2 arm beats per character per 17 s, now alternating arms; turns about 0.8 s; camera pans well under 30°/s; at most one single per shot.
- **Scripts:** the owner writes scripts in Claude chat with the Studio's prompt box (docs/SCRIPT_FORMAT.md). Claude-drafted lines are drafts.
- **Wording and claims:**
  - never call loudness-driven mouths "lip-sync" or "alignment";
  - never claim a human review, GPU use, a passing test or a merge that was not observed;
  - say "clicked through in a headless browser" for agent UI tests, never that the owner did it.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- **Studio for the owner:** double-click `Start-AetherMotion-Studio.cmd` (from a terminal: `.\Start-AetherMotion-Studio.cmd`).
  - It sets the render env below for its window, starts the Studio on 127.0.0.1:4173 and opens the browser.
  - If the agent starts it, use `Start-Process <launcher>` (a visible window), **never a background task of the session**. A hidden Studio confused the owner. Stop a stray one by the PID on port 4173.
- **Render session:** `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); the repo default stays swangle.
  - Sample the GPU with an nvidia-smi loop.
  - Use a Stopwatch, not `Measure-Command`.
- **Production:** `node scripts/produce.mjs --request <file> --backend both --id <new id>`. Commit every input first (`sourceDirty false`).
- **Gates to report:**
  - produce PASS lines;
  - the `CHECKS:` line (motion-speed-v1, visibility-v2, crowding-v1, silence-v1 with talk share, and reels-v1 in Reels mode);
  - `python scripts/frame_glitch.py <film>`, which **needs `AETHER_FFMPEG` set**;
  - ebur128 loudness (about −16 LUFS);
  - speech-report.json `pace`, `fit` and `alignment.maxCps`.
- **Agent UI tests:** (DUAL-07 harness: wait for a *new* download link before reading a render result; keep the harness outside the repo during renders so the tree stays clean)
- **Agent UI tests (setup):**
  - start a temporary Studio from the working tree with `createStudio()` on a spare port (4190+), in a temporary `scripts/.tmp-*.mjs` file;
  - drive it with `openBrowser` from `@remotion/renderer` (`page._client().send('Page.captureScreenshot',…)`, response `r.data ?? r.value.data`);
  - delete the temporary script before committing.
- **Editing:**
  - use the editor tool or `node scripts/fod-apply-edits.cjs`;
  - never put regex backslashes or `\n` through Bash heredocs or `node -e` (this broke edits several times);
  - for multi-step doc edits, write a .cjs file to the scratchpad and run it.
- **Stills:** frame numbers from `<id>-prepared/timeline.json` (sample ÷ 1600). Then `ffmpeg -i film.mp4 -vf "select='eq(n,F1)+…',scale=216:384,tile=Nx1" -frames:v 1 <scratchpad>/x.png`.
