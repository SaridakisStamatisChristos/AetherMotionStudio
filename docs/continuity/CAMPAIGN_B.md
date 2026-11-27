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
| GPU-00 | Architecture transition (ADR) and measurable budget | **NEXT** | — | — |
| GPU-01 | PBR materials and colour management | PLANNED | — | — |
| GPU-02 | Lighting, shadows and environment illumination | PLANNED | — | — |
| GPU-03 | Procedural texture and material library | PLANNED | — | — |
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

## Proposed protocol (frozen at GPU-00 as `campaign-b-protocol-v1` in CAMPAIGN_B_PROTOCOL.md)
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
- GPU-01/02: Cinematic look references, if the owner wants to steer (otherwise the agent proposes a before/after for review).
- GPU-03: approval for importing local textures carrying third-party licences.
- GPU-04: GLB support scope and the use of `three/examples` loaders and decoders (DRACO/meshopt/KTX2); any external asset licence.
- GPU-05: character art direction; the first 2–3 hero characters.
- GPU-06: any local alignment dependency for visemes (otherwise estimated cues, labelled).
- GPU-10: quality tier defaults.
- GPU-11: Studio default profile.
- GPU-12: artistic acceptance, merge, the `v2.0-gpu-cinematic` tag.

## Ledger (append one line per verified transition)
- 2026-11-27: Campaign A complete (tag `v1.2-dual-backend-final` → 2cb82ef). Owner supplied the Campaign B master directive and asked for the FOD setup ("so i will start in a new session"). Directive stored verbatim; tracker, CLAUDE.md, AGENTS.md and continuity updated on `chore/campaign-b-setup`. Next: GPU-00 (ADR first; no GPU-exclusive capability before the owner approves it).
