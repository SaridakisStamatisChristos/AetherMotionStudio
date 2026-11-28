# Campaign B: GPU-First Cinematic Expansion (status tracker)

**Requirements:** [CAMPAIGN_B_DIRECTIVE.md](CAMPAIGN_B_DIRECTIVE.md), stored verbatim (owner's master directive v1.0, dated 2026-11-26, received 2026-11-27; sha256 of the file as received 91772ac73a4c1bb85b1736e6124875bdf9c86d5c1a829a0a077b95b985218eb3, 19,073 bytes). This file holds only **status, decisions, the FOD plan and evidence pointers**. If the two disagree, the directive and the owner's latest word win; record the correction here.

**Authorization (owner, 2026-11-27):** after Campaign A was merged and tagged, the owner supplied the directive: "this is the plan. i want you to update claude.md, agents md, and any relevant files and also make the plan with fod principles so i will start in a new session." The campaign may start at GPU-00 in a new session.
- **GPU-00's first gate is an owner-approved ADR.** Until the owner approves it, [docs/DUAL_BACKEND_POLICY.md](../DUAL_BACKEND_POLICY.md) stays exactly as it is ("both backends first-class"), and **no GPU-exclusive scene capability may be implemented**.
- Before that approval, GPU-00 may only do inventory, measurement, baseline and drafting work.

**Starting point:**
- Campaign A is complete. Tag `v1.2-dual-backend-final` → main 2cb82ef (PR #64 code, CI 46033308643 green, 560 tests; PR #65 record).
- The tag is **preserved forever**: never moved, deleted or rewritten.
- Release notes: [docs/RELEASE_1_2.md](../RELEASE_1_2.md).
- Campaign B setup (this file, CLAUDE.md, AGENTS.md, continuity) on `chore/campaign-b-setup`.

## Milestones (strictly in order; one branch and one PR per milestone, or per coherent slice of one)
Status words: PLANNED · NEXT · ACTIVE · IMPLEMENTED · TESTED · RENDERED · OWNER-REVIEWED · MERGED · VERIFIED EXISTING · DEFERRED (owner) · BLOCKED.

| ID | Milestone | Status | Branch / PR | Evidence |
|---|---|---|---|---|
| GPU-00 | Architecture transition (ADR) and measurable budget | **MERGED** (PR #67 → dac8f8d; ADR-001 Accepted; protocol-v1 frozen) | `feature/gpu-00-architecture` / PR #67 (open) | ADR-001, CAMPAIGN_B_AUDIT.md, CAMPAIGN_B_PROTOCOL.md, tests/gpu00-profiles.test.js, out/bench/gpu00-*-r1-bench |
| GPU-01 | PBR materials and colour management | **MERGED** (PR #68 → 936d0cb) | `feature/gpu-01-pbr` | src/visual/pbr.js, tests/gpu01-pbr.test.js, tests/test_profile_pair.py, out/gpu01-{swatches,portrait}-r2-*, out/bench/gpu01-portrait-r2-* |
| FIX-RS | Render stability: random striped frames and the one-frame flash at cuts with parallel tabs (pre-existing, GPU Standard too) | **MERGED** (PR #70 → 3a59a65) | `feature/fix-render-stability`, PR #70 | FIX-RS section below; out/gpu01-swatches-r3-*, out/bench/fixrs2-* |
| GPU-02 | Lighting, shadows and environment illumination | **MERGED** (PR #71 → 9f2d909) | `feature/gpu-02-lighting` | src/visual/cinematic-lights.js, tests/gpu02-lights.test.js, out/gpu02-{portrait,product,environment}-r1-*, out/bench/gpu02-portrait-r1-* |
| GPU-03 | Procedural texture and material library | **TESTED + RENDERED** (PR open, not merged) | `feature/gpu-03-textures` | src/visual/pbr-textures.js, tests/gpu03-textures.test.js, out/gpu03-*-r1-* |
| FIX-NR | Narrator films: no extra caption box; subjects large and never cut (Director, all new films) | **NEXT** (owner 2026-11-28: "Separate unit after GPU-03"; "we dont need extra caption box at all") | `feature/fix-narrator` (planned) | FIX-NR section below |
| GPU-04 | External 3D assets (GLB) and high-detail geometry | PLANNED | — | — |
| GPU-05 | High-fidelity character system | PLANNED | — | — |
| GPU-06 | Animation, dialogue and facial performance | PLANNED | — | — |
| GPU-07 | Rich environments and scene dressing | PLANNED | — | — |
| GPU-08 | Cinematic camera and post-processing | PLANNED | — | — |
| GPU-09 | Scientific and non-character cinematic modes | PLANNED | — | — |
| GPU-10 | Performance and adaptive quality profiles | PLANNED | — | — |
| GPU-11 | Intelligent visual direction and Studio integration | PLANNED | — | — |
| GPU-12 | Final cinematic showcase and v2.0 qualification (proposed tag `v2.0-gpu-cinematic`) | PLANNED | — | — |

## Binding rules for this campaign (directive + standing owner rules)
- **Three user-facing profiles, one engine:**
  - **CPU Classic** is the existing CPU Canvas backend, every look included;
  - **GPU Standard** is the existing Three.js backend, exactly as at v1.2;
  - **GPU Cinematic** is a new opt-in, versioned profile on the same Three.js renderer.
  - These are not three implementations: extend `src/visual/three-backend.js` through bounded profile capabilities.
- **CPU Classic and GPU Standard keep every accepted film.** Old scenes, IDs, defaults and digests stay unchanged, and so do the frozen AF09 evidence and the Campaign A release.
  - Cinematic features are opt-in and versioned (schema/profile additions).
  - Any default change is the owner's decision.
- **Capability negotiation, never silent change.**
  - Preflight checks profile compatibility before expensive work.
  - A Cinematic scene sent to CPU (or to Standard) gets a precise diagnostic, with explicit, user-controlled alternatives.
  - The system never strips effects, substitutes assets, switches renderer or changes story semantics on its own.
  - Shared content modes (Campaign A) stay portable while they use shared capabilities.
- **Determinism, stated honestly.** Frame-addressed state and animation are deterministic for the same input.
  - GPU pixels are **not** byte-stable, even run to run on the same machine. Campaign A measured it on the RTX route (`vulkan`): 3 renders gave 3 hashes, average PSNR 60 dB, worst frame 51.5 dB. CPU Canvas and Three.js `swangle` are byte-stable.
  - Never promise byte-identical GPU pixels. Store renderer, profile and asset versions plus the measured device identity in every report.
- **Shared core stays shared:** audio and caption preparation (measured speech, prepared once per matched pair), timeline, content primitives, asset IDs, job orchestration (produce, batch, render lock), encode, verify and export. Reuse, never fork.
- **Data, not code:** scene and asset data are declarative and bounded. Never execute scene/asset content, GLB extensions or LLM output; no network inside renders.
- **Dependencies and licences:**
  - Any new npm/pip dependency, decoder, model or external asset needs the owner's approval first, recorded with its licence.
  - Many needed pieces (GLTFLoader, DRACO/KTX2 decoders, EffectComposer passes, PMREMGenerator, RoomEnvironment) ship inside the pinned `three@0.180.0`. Using them is still recorded, but they are not a new dependency. GPU-00 verifies exactly which files exist in `node_modules/three`.
  - Licences: no redistribution claims. Remotion, model weights, assets and fonts carry their own obligations. The speech chain includes GPL-3.0 parts (see RELEASE_1_2.md).
- **Owner taste (binding across campaigns):**
  - vertical 9:16 default, with characters large and never cut by the frame edge;
  - calm, sparse motion (few gestures, slow turns);
  - fixes must generalize to every film, never one film;
  - loudness-driven mouths are never called "lip-sync";
  - no gimmicky effects: the owner removed the atmosphere light beams ("they dont offer anything"), so post effects are tasteful, opt-in and justified by a before/after comparison;
  - the owner writes scripts in Claude chat.
- **GPU route:** RTX 4060 Laptop 8 GB (driver 566.07) via opt-in `AETHER_GL=vulkan` (verify with `nvidia-smi`).
  - `angle` goes to the AMD iGPU and `swangle` is software. The repository default stays `swangle` unless the owner changes it.
  - Hybrid graphics: always record the actual WebGL renderer string.
- **Workflow (unchanged FOD):**
  - one branch per unit from main, never stacked;
  - routine CI is test-only;
  - merge only on the owner's word after the PR CI test job passes;
  - no tags or publication without the owner;
  - after each merged milestone, delete older renders in out/ and public/audio (keep the latest milestone's films, out/speech-cache, public/media, and evidence the handoff names).

## Reuse map (what exists at v1.2 — audit, then extend; GPU-00 confirms each line against the source)
| Area | Existing seam | Notes |
|---|---|---|
| Three renderer | `src/visual/three-backend.js` (60 lines) | WebGLRenderer, PerspectiveCamera, Hemisphere + 2 Directional lights, Fog, shadowMap, tone mapping, outputColorSpace, MeshStandardMaterial, DataTexture, explicit `dispose` (17 sites); draws the shared box stream (`emitGraph`) |
| Looks and materials | `src/visual/crafted.js` (crafted-v1/v2: chamfered boxes, palette, glass/metal roles, Three roughness/metalness); `src/foundry/materials.js`, `material-three.js` (material keys, 96 MB texture budget, `createTextureCache`) | GPU-01/03 extend these; no second registry |
| Geometry and assets | Foundry: `geometry.js` (lathe/extrude/sweep/subdivide), `hero-recipes.js`, `generator.js`, `import-bundle.js` (quarantine, digests), `packs.js` (`PackRegistry`), `lod-policy.js` (hard budgets, no silent LOD change), `inspection.js` | GPU-04/05/07 extend; asset promotion stays explicit |
| Characters and motion | `src/visual/catalog.js` (human/robot recipes, detail 2/3 faces, `headed` pre-transform), `catalog-rig.js`, `src/core/cinematography.js` (camera rigs, actions, attachments, assemblies, dressed sets), `core/body.js`, `core/talk.js` (loudness mouth), staging | GPU-05/06 build skeletal/morph on top, keep the box style as a valid style |
| Lighting parity and effects | `visual/lighting-parity.js` (parity-v1 floor/shadows), `visual/fidelity-effects.js` + `core/fidelity.js` (bloom, atmosphere dust, DOF, grain, grade, motion blur on the shared 2D path; `lightShafts` 0 from the Director) | GPU-02/08 add GPU-side passes; the 2D path stays for CPU/Standard; captions never inherit blur/grade |
| Content primitives | Campaign A: compose-v1/v2, typography, maths (MathJax), charts/diagrams, media library, formats, themes | GPU-09 extends them in 3D; never duplicates |
| Director and Studio | `src/director/*` (planner, IR, visuals, catalog), Studio (`scripts/studio-server.mjs`, `studio/app.js`) | GPU-11 adds profile awareness; prompts versioned |
| Production and measurement | `scripts/produce.mjs` (matched pairs, shared speech), `scripts/batch.mjs` (batch-v1), render lock, `scripts/perf-bench.mjs` (cold/warm, nvidia-smi GPU memory, re-render from hash-checked prepared inputs), `scripts/gl-probe.mjs`, `scripts/preview-memory-bench.mjs`, quality checks, `frame_glitch.py` | GPU-00/10 reuse these for budgets and benchmarks |

Known Campaign A facts that bound this campaign:
- RTX vulkan reg-harbour06 (1273 frames, concurrency 8): 44.3 fps, 1.59 GB peak GPU memory.
- On the same fixture, CPU ran 28.5 fps and swangle 3.4 fps.
- A field-name collision exists: `profile` already means the fidelity profile (`original`/`polished`). The Cinematic profile needs a distinct, versioned name, decided in the ADR (for example `renderProfile: 'cinematic-v1'`).

## Protocol (FROZEN 2026-11-27 as `campaign-b-protocol-v1`: CAMPAIGN_B_PROTOCOL.md governs; the text below is the setup proposal)
- Fixture and film IDs: `gpu<NN>-<slug>-r<n>` (never reused; a failed attempt keeps its ID). Request fixtures: `examples/gpu<NN>-<slug>.request.json`.
- Matched comparisons use one shared preparation (speech, timeline, captions hashed) and render Standard vs Cinematic, or CPU vs Standard for regressions.
- Per-milestone exit evidence:
  1. clean committed source (`sourceDirty false`);
  2. `npm test` fail 0 and Python OK, with new positive, negative and adversarial tests;
  3. legacy digests unchanged (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6), unless a versioned opt-in change records its new digest and reason;
  4. CPU Classic and GPU Standard regression films byte-identical where they were (CPU; swangle) or visually identical (vulkan) to v1.2;
  5. fresh `gpu<NN>` films with GL route, WebGL renderer string, GPU memory, wall time and fps;
  6. agent stills from named frames on every profile, with owner review recorded separately;
  7. budgets reported against the agreed table.
- Benchmarks: at least three measured runs per selected fixture (cold, then warm), median and range, from hash-checked prepared inputs (`perf-bench.mjs`). Never compare across different inputs.

## FOD plan per milestone
Each milestone:
1. reads only its directive section, this plan and the named seams;
2. audits before building (mark VERIFIED EXISTING when a seam already meets the gate);
3. implements the smallest additive, versioned change;
4. tests positive, negative and adversarial cases, including intermediate frames for anything that moves;
5. renders fresh `gpu<NN>` films locally on the RTX route;
6. checkpoints (CURRENT_STATE, HANDOFF, this file's row and ledger) and opens a PR.

It merges only on the owner's word, then the render cleanup follows.

### GPU-00: architecture transition and measurable budget (NEXT)
1. **Bootstrap and baseline.**
   - Verify the tag `v1.2-dual-backend-final` → 2cb82ef and the clean main.
   - Run `npm test`, Python and the digests (values above), plus the font check.
   - Run perf-bench on reference fixtures, for CPU and Standard (vulkan; swangle only where the time allows), ≥ 3 runs each.
2. **Inventory (read-only):**
   - three-backend.js: renderer settings, colour pipeline (outputColorSpace, toneMapping, exposure), shadows, lights, materials, caches, disposal;
   - Foundry material/texture/LOD APIs;
   - graph and box-stream APIs;
   - GPU route; Remotion render settings (concurrency, gl, encoder);
   - which `three/examples/jsm` modules exist at 0.180.0 (loaders, decoders, postprocessing, environments).
   - Write `docs/CAMPAIGN_B_AUDIT.md`: scope map per milestone, existing vs missing, as for CAMPAIGN_A_AUDIT.md.
3. **ADR draft:** `docs/adr/ADR-001-render-profiles.md` (status *Proposed*).
   - The three profiles; shared vs exclusive capabilities.
   - A typed capability vocabulary (for example `pbr-v1`, `env-light-v1`, `glb-v1`, `skeletal-v1`, `post-v1`).
   - The profile field name and versioning; the preflight negotiation contract (diagnostic codes, user choices).
   - The determinism statement; what DUAL_BACKEND_POLICY.md keeps (CPU and Standard first-class for all shared features, all prior sections binding) and what it replaces (graphical feature parity for future Cinematic-only capabilities).
   - **Ask the owner to approve it (UI choice).** After approval: status *Accepted*, and a new section in DUAL_BACKEND_POLICY.md pointing to it (earlier sections stay).
4. **Profile skeleton (after approval only):**
   - the versioned profile field, validation, and the capability table;
   - preflight checks that refuse an incompatible profile/backend pair with precise diagnostics;
   - report fields (profile, version, device identity).
   - No visual change yet: Cinematic = Standard pixels until GPU-01. Tests prove legacy renders and digests are unchanged and that wrong pairings fail before rendering.
5. **Reference scenes** (committed fixtures, one prepared audio and timeline each): portrait character, product hero, environment, scientific visualization. Run them on Standard with perf-bench (cold/warm ×3): wall time, fps, peak GPU memory (nvidia-smi), process RAM, WebGL renderer, concurrency, encoder.
6. **Budget table:** proposed resolution, fps, duration and quality tiers.
   - Directive targets, to validate: Cinematic ≤ 6 GiB observed GPU memory for 60 s references, ≥ 2 GiB headroom, ≤ 3× Standard median wall time.
   - The owner agrees or revises them. Freeze `campaign-b-protocol-v1`.
- **Exit:** ADR approved; baseline reproducible; profile validation and capability errors tested; budgets agreed; no change to legacy renders.

### GPU-01: PBR materials and colour management
- **Audit:** crafted materials, `material-three.js`, the colour pipeline found in GPU-00.
- **Build:** Cinematic-only material presets (metal, glass, wood, fabric, plastic, ceramic, stone) using MeshPhysicalMaterial/MeshStandardMaterial with bounded, physically plausible ranges.
  - Controlled transmission where supported.
  - Explicit linear/sRGB handling; one tone-mapping and exposure contract; deterministic seeds.
  - Documented transparency-sorting and clipping limits.
- **Tests:** range validation (non-finite and out-of-range refused); colour-space numeric checks (known swatch values through the pipeline); Standard/CPU unchanged.
- **Evidence:** a reference swatch scene (fixed lights and camera), stills and a short film; budget measured.

### FIX-RS: render stability (owner-authorized 2026-11-27, option 1 "Separate unit next"; before GPU-02)
Found during GPU-01 on the Three.js route (vulkan). Both defects appear in GPU Standard, whose code is byte-identical to main, so they are pre-existing in the shared pipeline.
- **Striped frames:** vertical stripes and dark patches on the floor and background (shadow-map-like) over contiguous blocks of frames.
  - They come and go between renders of the same film: gpu01-swatches-r1 had them in Standard about 3–8 s and in Cinematic about 2–4.5 s; an 8-tab re-render had none; a 1-tab re-render had them on every frame (out/bench/gpu01-swatch-c8, -c1).
  - Single stills (one page per frame) showed none. Suspect uninitialised or stale GPU state per tab, most likely the shadow map.
- **One-frame flash at a cut:** gpu01-swatches (fade from shot 2 to shot 3).
  - Render frame 480 shows shot 2 without the fade's dark overlay, although shotAt/transitionAlpha give alpha 1 there.
  - Reproduced with 8 tabs (r1 both films, r2 both films, c8 re-render); absent with 1 tab (c1). `frame_glitch.py` flags it.
  - The GPU-00 references and the gpu01-portrait films are clean.
- **Plan:**
  1. Reproduce both deterministically (fixed tab count, repeated renders, frame hashes per tab).
  2. Find the cause in the shared pipeline (index.jsx draw timing, three-backend shadow map and render state, Remotion tab chunking).
  3. Fix minimally; prove the fix with repeated multi-tab renders on CPU, swangle and vulkan, plus frame_glitch on every film.
  4. Re-render the swatch film as gpu01-swatches-r3 to show it clean.
- **Result (2026-11-28, `fix/render-stability`, TESTED + RENDERED, PR open, not merged):**
  - **Cut flash: root cause.** The canvas held the right pixels when the frame was captured (full-canvas readback at draw time), but the capture returned an older picture while the GPU was still busy.
    - 1 tab: frame 480 = 478; 8 tabs: 480 = 464; reproduced on a 0–490 `renderFrames` PNG run (not the encoder).
    - **Fix:** a 1-pixel `getImageData` right after `drawFilm` (src/index.jsx).
    - Alternatives tested and rejected:
      - two requestAnimationFrame holds (still stale);
      - a WebGL-only `readPixels` (still stale);
      - a CPU-backed main canvas (clean with 1 tab, stale with 8).
  - **Stripes: root cause.** Chrome's canvas filter `blur(3px)` on the bloom canvas, just written with `putImageData`, returns a striped picture for a whole tab whenever `selectComposition` ran in the same browser first. That is how produce (Remotion CLI) and perf-bench render.
    - Reproduced 2/2 on 0–90 renders. Bloom 0 or no blur removed it; grain, atmosphere, grade and contact shadow did not; willReadFrequently canvases did not.
    - Depth of field (also a blur filter, normal canvas source) is unaffected (tested). The parity floor-shadow blur draws shapes, not putImageData data.
    - **Fix:** `blurRGBA` (src/core/fidelity.js), a separable Gaussian, sigma 3, premultiplied, transparent outside: the same operation as the filter, in JavaScript.
  - **Verification:** 4 full swatch re-renders (1 tab ×2, 8 tabs ×2) are all clean (frame_glitch, stripe score 0.02, no stale frames). gpu01-swatches-r3 (Standard + Cinematic, commit 1725227, sourceDirty false) is clean on all three checks.
  - **Cost, measured (8 tabs, same film):** about 28 fps with the fixes vs 38.4 without the read. The read costs about 26 % on the RTX route; the JS blur costs nothing measurable. The read is kept because no cheaper alternative was reliable.
  - **Pixel change (deliberate, measured):** polished films' bloom glow differs from the canvas filter by at most 3 levels on about 1 % of pixels (CPU stills, PSNR 71–77 dB). Re-renders of polished films after FIX-RS are therefore **not byte-identical** to earlier renders, on CPU too. That is the new byte baseline. Old film files are untouched; digests unchanged.
  - **Tests:** tests/fixrs-capture.test.js (6: read after draw, no hacks left, blurRGBA behaviour and refusals, bloom never uses the filter). `npm test` 590 (0 fail, 1 skip); Python 70 OK.

### FIX-NR: narrator films (owner-authorized 2026-11-28; before GPU-04)
Found by the owner in gpu03-product-r1. The same plan exists in gpu00-product-r1, before any Campaign B graphics, so the Director's narrator path (no dialogue, no content mode) is the cause.
- **Two captions:** every narrator shot carries a `lower-third` overlay repeating the spoken sentence above the speech captions. **Owner: "we dont need extra caption box at all"**, so new Director films get no lower-third caption overlay in any mode. The speech captions are the only caption.
- **Subjects too small and partly off-frame:** narrator shots frame one subject at `medium` with fixed camera moves (the laptop is small; the robot is off-frame in 3 shots, `OFF_FRAME` warnings). Dialogue films use `group`/`single` framing that fits everyone large. Narrator shots get group framing over all their subjects, with the same calm moves; nobody is cut by the frame edge.
- **Scope:** Director planning only, applied to every new Director film (generalized). The Director digest changes deliberately (record the new value). Old film files are untouched.
- **Evidence (fast, per owner):** tests including negatives; one fresh narrator film (product request) with the checks clean (no OFF_FRAME, one caption). No timed benchmark runs.

### GPU-02: lighting, shadows and environment illumination
- **Audit:** the current light rig, shadowMap, lighting-parity, fog.
- **Build:**
  - presets (warm interior, neutral studio, forest daylight, night, scientific dark): key/fill/rim, soft shadows, bounded counts per profile;
  - contact shadows and bounded AO where compatible;
  - environment light from PMREM and a procedural RoomEnvironment or a local HDR with recorded provenance (no download during render).
- **Watch:** temporal stability, acne, leaks, saturation and dark faces, under moving cameras and characters.
- **Evidence:** matched Standard vs Cinematic on interior, product and character fixtures (shared audio and timeline); intermediate-frame flicker checks; resources measured.

### GPU-03: procedural texture and material library
- **Build:**
  - versioned deterministic generators (wood grain, brushed metal, fabric weave, concrete, bark, ground; normal and roughness maps);
  - one shared texture cache keyed by recipe, version, seed and resolution, extending the Foundry cache (no second registry);
  - bounded dimensions and memory with explicit disposal; quality tiers with mipmaps and filtering;
  - local texture import with licence metadata through the existing quarantine ideas.
- **Tests:** same seed gives the same texture (hash); hostile dimensions and invalid maps refused; VRAM and lifecycle (create/dispose counts across repeated jobs).
- **Evidence:** a material pack and reference gallery.

### GPU-04: external 3D assets (GLB) and high-detail geometry
- **Owner decisions first:** the GLB loader and decoders (inside `three`; DRACO/meshopt/KTX2 need explicit approval); the format policy (self-contained GLB first).
- **Build:**
  - extend Foundry quarantine and manifests for local GLB: file and decoded sizes, mesh/vertex/triangle/node/texture counts, transforms, animation lengths, extension allowlist, recursion and resource budgets;
  - no network and no executable extensions; strict relative-path sandbox if glTF sidecars are ever allowed;
  - units, pivots, IDs and revision digests, LODs, bounds, tags, rig compatibility, thumbnails;
  - explicit promotion; no unlicensed bundling.
- **Tests:** malformed files, decompression bombs, path escapes, unsupported extensions, oversize inputs.
- **Evidence:** original or licensed fixtures render correctly oriented with correct materials; asset resolution is deterministic.

### GPU-05: high-fidelity character system
- **Owner decision first:** art direction (stylized; owner taste above).
- **Build:**
  - extend the identity and rig model (body proportions, face, hands, hair, clothing, variants);
  - stable identity separate from costume, expression and action;
  - modular meshes, a bounded skeleton (SkinnedMesh), morph targets where needed, joint limits, attachment anchors, LODs;
  - imported rigs through explicit adapters only.
  - Start with 2–3 hero characters; the box characters stay a valid style.
- **Evidence:** identity held across shots, full-body framing never cut, contacts and attachments pass; character review sheet and budget.

### GPU-06: animation, dialogue and facial performance
- **Build:**
  - skeletal clips with deterministic blending; IK for hand and foot contacts; walk, turn and reach;
  - gaze and listener behaviour, breathing, sparse gestures on measured phrase boundaries (reuse body.js and talk.js policies);
  - the loudness-driven mouth stays as its own honest mode; expressions, blinks and gaze at bounded rates.
  - **Visemes only with an approved local aligner**; otherwise clearly labelled estimated cues, never "lip-sync".
- **Tests:** rig limits, clip durations, missing bindings, frame-addressed playback (intermediate frames).
- **Evidence:** a 60–90 s dialogue/action film, Standard vs Cinematic, with identical shared audio and captions verified.

### GPU-07: rich environments and scene dressing
- **Build:**
  - reusable sets (laboratory, classroom, workshop, urban street, forest, architectural interior), extending dressed sets and Foundry packs;
  - seeded semantic layouts with instancing, LOD and frustum-aware culling, bounded light and texture pools;
  - collision-aware placement with clear sightlines; foreground, midground and background depth;
  - the Director picks from semantic catalogs and budgets; environment identity continues across shots; portrait-friendly density.
- **Evidence:** fresh topics select different sets without hand edits; no overlapping or cut subjects; resources measured.

### GPU-08: cinematic camera and post-processing
- **Build:**
  - reuse the camera and composition system; opt-in DOF profiles, bloom, vignette and grade, depth fog and haze via `three/examples` postprocessing (recorded);
  - frame-addressed, bounded parameters; per-effect toggles; nothing expensive by default;
  - motion blur only after temporal tests.
  - **Captions and overlays never inherit blur or grade**: they stay on the shared 2D path, drawn after post.
- **Tests:** colour tests; halos, exposure pumping, flicker, transparency; caption legibility at every format.
- **Evidence:** a hero comparison film showing real artistic benefit (owner: no gimmicks); the cost of each effect measured separately.

### GPU-09: scientific and non-character cinematic modes
- **Build:** extend Campaign A primitives in 3D: surfaces, vector fields, molecules (labelled simplifications), cutaways, network graphs, orbits, data landscapes, particles (instanced).
  - Real numbers and units; authoritative or explicitly illustrative values.
  - No simulation-fidelity claims; CPU-friendly modes kept.
- **Evidence:** two fresh character-free films (scientific; mathematical/technical) with readable labels and numeric checks.

### GPU-10: performance and adaptive quality profiles
- **FIRST STEP, MANDATORY (owner 2026-11-27: "please put in the roadmap to ask me in the gpu-10 for configuration in order to be sure we dont forget it"):**
  - Before building the RP-06 pre-render budget check, ask the owner to configure it (UI choice, every option explained in plain words).
  - Topics: the GPU-memory share (75 % proposed), the wall-time ratio (3 × Standard), the RAM rule (free − 1 GB, ≤ 3 GB at reference settings), whether over-budget warns or refuses, whether the limits are user-adjustable (Studio setting or env var), and how unmeasurable devices are treated.
  - The current values are only the GPU-00 proposal in CAMPAIGN_B_PROTOCOL.md.
- **Build:**
  - instrument graph evaluation, uploads, capture, encode, wall time, RAM and GPU memory;
  - leak tests across repeated jobs and long projects; deterministic disposal and cache ownership;
  - Draft/Standard/Cinematic tiers (owner picks defaults);
  - any quality reduction declared in preflight and in the report (never a silent change of content, resolution, fps, asset identity or backend);
  - GPU unavailable or out of memory gives a clear diagnostic and explicit retry options;
  - hardware encoding optional and separately measured.
- **Evidence:** a benchmark table for all tiers (device identity, median and range); 30/60/90 s plus one long workload; unverified devices listed.

### GPU-11: intelligent visual direction and Studio integration
- **Build:**
  - Director prompts and IR plus the offline planner become profile-aware (capabilities, semantic retrieval, style packs, continuity, staging, complexity budgets);
  - the LLM produces data only; old prompt versions preserved; no full catalog injection;
  - Studio simple UI: Classic / Standard / Cinematic, style, content mode, quality;
  - Advanced UI: materials, lights, camera, assets;
  - capability and performance warnings before render; local only.
- **Evidence:** clicked through in a headless browser; real renders on all three profiles; invalid combinations explained; fresh scripts give coherent, varied scenes without hand edits.

### GPU-12: final cinematic showcase and v2.0 qualification
- **Films:**
  - ≥ 4 original showcase films (character dialogue, environment narrative, scientific/maths explainer, product/technical), vertical and landscape;
  - shared script, timeline and audio for Standard vs Cinematic;
  - one long reliability case and repeated jobs.
- **Rubric score** (composition, identity, animation, lighting/materials, environment variety, audio intelligibility, legibility, continuity, defects): the owner decides artistic acceptance.
- **Gates:**
  - Campaign A legacy CPU/Standard regression gates, plus the new Cinematic suite;
  - dependency, asset and licence inventory;
  - import and security checks;
  - clean setup.
- **Deliverables:** user guide, profile capability matrix, quality presets, benchmark and replay docs, known limitations, release notes, FOD handoff.
- **Release:** merge, then the proposed tag `v2.0-gpu-cinematic`, only on the owner's word. No publication or commercial-readiness claim.

## Decisions the owner must make (ask when the milestone reaches them, not before)
- GPU-00:
  - approve ADR-001 (render profiles, capability negotiation, policy revision);
  - the profile field name;
  - the budget table (or revised targets).
- FIX-RS: none beyond the authorization (owner chose the separate unit).
- GPU-01/02: Cinematic look references, if the owner wants to steer (otherwise the agent proposes a before/after for review).
- GPU-03: approval for importing local textures carrying third-party licences.
- GPU-04: GLB support scope and the use of `three/examples` loaders and decoders (DRACO/meshopt/KTX2); any external asset licence.
- GPU-05: character art direction; the first 2–3 hero characters.
- GPU-06: any local alignment dependency for visemes (otherwise estimated cues, labelled).
- GPU-10: **configuration of the pre-render budget check (RP-06), asked first, before building it** (owner 2026-11-27); quality tier defaults.
- GPU-11: Studio default profile.
- GPU-12: artistic acceptance, merge, the `v2.0-gpu-cinematic` tag.

## Ledger (append one line per verified transition)
- 2026-11-27: Campaign A complete (tag `v1.2-dual-backend-final` → 2cb82ef). Owner supplied the Campaign B master directive and asked for the FOD setup ("so i will start in a new session"). Directive stored verbatim; tracker, CLAUDE.md, AGENTS.md and continuity updated on `chore/campaign-b-setup`. Next: GPU-00 (ADR first; no GPU-exclusive capability before the owner approves it).
- 2026-11-27: PR #66 merged (owner "merge pr 66 and start gpu-00") → main 69a3a5e. GPU-00 on `feature/gpu-00-architecture`: baseline green (560 tests, digests = v1.2); inventory → docs/CAMPAIGN_B_AUDIT.md; **ADR-001 Accepted by the owner** ("Approve as written"); DUAL_BACKEND_POLICY pointer section added (earlier sections unchanged); profile skeleton (`renderProfile: 'cinematic-v1'`, capability table `shared`, RP-01…RP-06) TESTED (572 tests, 0 fail, digests unchanged); 4 GPU Standard reference films + 12 bench runs on vulkan; budget delegated by the owner ("this is not the only computer that will use the program") → device-relative budget frozen in CAMPAIGN_B_PROTOCOL.md (campaign-b-protocol-v1). PR #67 open, not merged.
- 2026-11-27: PR #67 merged (owner "now merge and move to gpu-01") → main dac8f8d (CI green on d5eed73); GPU-10 "ask the owner to configure the budget check first" added to the roadmap (owner). Renders older than GPU-00 cleared (out/bench/d09-*, 236 MB).
- 2026-11-27: GPU-01 on `feature/gpu-01-pbr` — capability pbr-v1 (cinematic block), MeshPhysicalMaterial presets chosen per part, room light per material, steel-tinted metals, Standard-vs-Cinematic matched mode (`--compare standard`, compare_release --profiles). Tests 584 (0 fail), Python 70 OK, legacy digests unchanged (with `,gpu` excluded), GPU Standard stills byte-identical to main (swangle). Films gpu01-swatches-r2 and gpu01-portrait-r2 (PASS, sourceDirty false, b6dad1a). Defects found and recorded → owner chose a separate unit FIX-RS next.
- 2026-11-28: PR #68 (GPU-01) merged (owner "merge and start the fix") → main 936d0cb; renders older than GPU-01 cleared (518 MB, gpu01 r1). FIX-RS on `fix/render-stability`: both defects reproduced and root-caused (stale capture; Chrome canvas blur filter after putImageData), fixed (per-frame 1-pixel read; blurRGBA), verified clean on 4 re-renders and gpu01-swatches-r3; cost about −26 % fps on the RTX route; bloom pixels change by ≤ 3 levels (new byte baseline). PR open, not merged.
- 2026-11-28: PR #70 (FIX-RS) merged (owner "continue i agree with merge") → main 3a59a65; experiment renders cleared (221 MB). GPU-02 on `feature/gpu-02-lighting`: env-light-v1 (five presets, auto-v1 by environment, fill light, 2048 px key shadow), owner chose the "stronger" values over stills (Standard / subtle / stronger). Tests 596 (0 fail); digests unchanged; GPU Standard swangle still byte-identical to main. Films gpu02-{portrait,product,environment}-r1 (--compare standard, PASS, sourceDirty false, f46c097): frame_glitch clean, no stale frames, no added flicker (equal median frame-to-frame change). Contact shadows and AO deferred to GPU-08 (need post-processing). PR open, not merged.
- 2026-11-28: PR #71 (GPU-02) merged (owner "merge") → main 9f2d909; GPU-01 renders cleared (515 MB). GPU-03 on `feature/gpu-03-textures`: owner chose procedural textures only. proc-texture-v1 implemented: Foundry bark and ground patterns, recipes per surface/part/floor, box UVs; tuned calm on stills. Tests 602 (0 fail); digests unchanged; Standard stills byte-identical to main. Films gpu03-{portrait,product,environment}-r1 PASS (d998721, sourceDirty false), glitch and stale clean. Owner found two captions and small subjects in the product film (pre-existing narrator path) → FIX-NR next. **Owner rule:** timed benchmark runs only at milestones; fast implementations first. PR open, not merged.
