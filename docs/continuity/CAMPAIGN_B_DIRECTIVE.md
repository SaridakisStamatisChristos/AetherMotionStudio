# AetherMotion Studio — Campaign B: GPU-First Cinematic Expansion

**Proposed master directive v1.0 | 2026-11-26**  
Repository: https://github.com/SaridakisStamatisChristos/AetherMotionStudio  
Target: AetherMotion Studio v2.0 (proposed). Prerequisite: owner-approved stable Campaign A release and explicit authorization to change future backend feature-parity requirements. Do not begin while Campaign A is incomplete.

## 1. Mission

Build a high-quality local GPU cinematic renderer on top of the existing universal production engine. Keep the CPU Classic and existing Three.js Standard modes functional while introducing a genuinely more capable Three.js Cinematic profile. Focus on visual identity, characters, environments, materials, animation and artistic direction rather than replacing working production infrastructure. RTX 4060 Laptop 8 GB is the initial measured target; no assumption that another OS/GPU works until tested.

## 2. Policy and architecture

The existing dual-backend policy currently requires both backends to be first-class. Campaign A's acceptance does not silently repeal that rule. The owner must explicitly approve an ADR replacing future graphical feature parity with shared-core compatibility and explicit capability negotiation. Preserve the stable dual tag and all its accepted functionality.

```
                  Existing Studio + Director
                            |
          Shared contracts, measured audio, timeline,
          content primitives, asset IDs, job orchestration
                            |
                 Capability negotiation
              /              |              \
       CPU Classic       GPU Standard      GPU Cinematic
       legacy renderer    legacy profile    opt-in new graphics
              \              |              /
             Existing encode / verify / export
```

These are user-facing profiles, not a requirement for three independent implementations. Reuse Three.js code and extend through bounded profile capabilities. CPU is not required to implement GPU-exclusive graphical features. An unsupported Cinematic scene submitted to CPU must return a precise diagnostic with explicit user-controlled alternatives, never silently strip effects, substitute assets, switch renderers or change story semantics. Shared content modes remain portable as long as they use common capabilities. Maintain legacy formats and accepted defaults; new graphics use opt-in versioned schema/profile additions. Preserve frame addressing and deterministic animation given the same input; do not promise byte-identical GPU pixels across drivers/OS. Store render/profile/asset versions and actual device identity in reports.

## 3. Bootstrap and execution rules

- Read `CLAUDE.md`, `AGENTS.md`, continuity files, current dual policy, Campaign A evidence and release tag. Inspect actual HEAD and current worktree. No reset or rewrite. Verify CPU/Standard baseline on representative examples and capture canonical digests.
- Keep existing Asset Foundry, Director, Studio, local job flow, audio/caption prep, encoder and verification. Reuse or extend existing material, camera, animation and rig code. Audit before building each feature.
- Record proposed dependency changes and license implications for owner approval before implementation. Remotion, model weights, external assets and fonts have separate license obligations; do not promise redistribution rights. No mandatory paid APIs. No arbitrary executable scene or asset content.
- Use existing FOD protocol. Local render tests, routine CI test-only, focused branches, evidence, approved merges. No unauthorized full CI matrix, system changes, dependency upgrades, silent default changes or automatic publication.

## 4. GPU expansion milestones

### GPU-00 — Architecture transition and measurable budget
- Owner-approved ADR: preserve CPU Classic and GPU Standard; GPU Cinematic may introduce GPU-only capabilities. Define shared vs exclusive features and typed renderer capability requirements. Validate profile compatibility at preflight, before expensive rendering.
- Inventory actual Three.js renderer, asset caches, resource lifetime, color pipeline, shadows, render settings, GPU route, existing Foundry and graph APIs. Establish reference scenes (portrait character, product hero, environment, scientific visualization) with Standard output and fixed prepared audio/timeline.
- Record RTX 4060 memory, process RAM, render wall time and frame throughput on cold/warm runs (at least three repeated measured runs on selected fixtures), actual WebGL renderer, concurrency and encoder. Establish explicit budgets for reference resolution, frame rate, duration and quality tiers. Proposed initial targets to validate, not guaranteed: 1080×1920 at 30 fps; Cinematic ≤6 GiB total observed GPU memory for selected 60-second reference workloads, ≥2 GiB nominal headroom on 8 GiB device subject to measured OS use; ≤3× Standard median render wall time for a comparable reference. Tune or revise with documented owner approval if evidence warrants. Do not trade away quality or hide failures to meet budget.
- **Exit:** policy approved, baseline reproducible, profile validation and capability errors tested, budgets agreed, no changes to legacy renders.

### GPU-01 — Physically based rendering and color management
- Audit current shaders/materials first; extend with GPU-specific PBR material presets (metal, glass, wood, fabric, plastic, ceramic, stone) using physically plausible roughness/metalness and controlled transmission where supported. Explicit linear/sRGB handling, consistent tone mapping/exposure, deterministic seeds. Document transparency sorting and clipping constraints.
- Preserve Standard and CPU defaults; Cinematic materials opt-in. Create a reference material swatch scene with controlled lights and camera. Validate all ranges and reject nonfinite inputs.
- **Exit:** reference film/stills visibly distinguish materials, numerical color-space checks, measured budget, no regression in existing profiles.

### GPU-02 — Lighting, shadows and environment illumination
- Directional/key/fill/rim lighting, soft shadow configuration, contact shadows, bounded ambient occlusion where compatible, local HDR or procedural environment lighting with documented provenance, environment reflections. Use baked/static alternatives where useful. Expose artistic lighting presets (warm interior, neutral studio, forest daylight, night, scientific dark).
- Carefully handle temporal stability, shadow acne, light leaks, saturation and dark faces; sample camera motion and character movement. Limit shadow maps/lights by profile; no mandatory external HDR downloads during render.
- **Exit:** matched Standard/Cinematic comparison on interior/product/character fixtures, human/agent review of silhouettes, contacts, brightness and flicker; resource measurements.

### GPU-03 — Procedural texture and material library
- Versioned deterministic local texture generation: wood grain, brushed metal, fabric weave, concrete, bark, ground, normals/roughness maps. Use shared texture cache keyed by recipe/version/seed/resolution; bounded texture dimensions and memory, explicit disposal. Provide quality tiers, mipmap/filtering settings and approved local texture import with license metadata.
- Avoid duplicate assets that differ only by arbitrary naming. Preserve old material IDs. Expand Foundry rather than introduce a second registry.
- **Exit:** reusable material pack and reference gallery, repeated seeds reproduce recipes, hostile dimensions and invalid maps rejected, VRAM and resource lifecycle tests.

### GPU-04 — External 3D assets and reusable high-detail geometry
- Extend Foundry quarantine and manifest model for local GLB/glTF. Prefer self-contained GLB initially; if supporting glTF sidecars, enforce strict relative path sandbox and reject network/remote resources. Validate file and decoded sizes, mesh/vertex/triangle/node/texture counts, transforms, animation lengths, supported extensions, material properties, recursion and resource budgets. No executable extensions. Decoder dependencies require owner approval. Test malformed and compressed/decompression-bomb cases within supported format policy.
- Coordinate conventions, units, pivot/origin, asset IDs and revision digests, LODs, bounds, semantic tags, rig compatibility and thumbnails. Asset promotion remains explicit; no unlicensed asset bundling. Add carefully selected high-detail procedural models for hero props.
- **Exit:** validated original/licensed fixture assets render in Cinematic, correct orientation and materials, safe rejection of unsupported or hostile data, no silent substitution, deterministic asset resolution.

### GPU-05 — High-fidelity character system
- Develop a coherent stylized character art direction. Extend existing rig and identity model with body proportions, face features, hands, hair, clothing and reusable character variants. Separate stable character identity from costume/expression/action. Support modular meshes and a bounded skeleton, morph targets when needed, joint constraints, attachment anchors and LODs. Imported rigs mapped through explicit adapters; no arbitrary automatic retargeting claims.
- Preserve existing simple characters as a valid style. Begin with 2–3 hero characters and consistent silhouettes rather than hundreds of shallow variants.
- **Exit:** recurring character stays visually identifiable across shots and contexts, full-body framing and contact/attachment constraints pass, character review and budget report.

### GPU-06 — Animation, dialogue and facial performance
- Skeletal animation clips and deterministic blending, inverse kinematics for hand/foot contacts, natural walk/turn/reach, gaze and listener behavior, subtle breathing and gestures. Reuse existing measured phrase boundaries, body-language policies and identity/prop continuity. Keep calm sparse motion as an available style, avoid robotic overgesticulation.
- Preserve amplitude-driven mouth motion as its own honest mode. Optional phoneme/viseme timing only via a verified local alignment pipeline if dependencies are approved; otherwise use clearly labeled estimated cues, not claims of true lip-sync. Support expressions, blinks and eye gaze with bounded rates. Validate rig limits, clip duration and missing bindings.
- **Exit:** 60–90 s dialogue/action film with coherent gestures and contacts, no clipping, frame-addressed playback and measurable speech synchronization; compare visual quality against Standard and verify unchanged shared audio/captions.

### GPU-07 — Rich environments and scene dressing
- Build reusable coherent sets (laboratory, classroom, workshop, urban street, forest, architectural interior), procedural environmental layouts with seeded variation and semantic placement. Use instancing, LOD, frustum-aware culling where applicable, bounded lights/texture pools, collision-aware placement and clear sightlines. Add foreground/midground/background depth, hero props and controlled visual storytelling.
- Director chooses assets from semantic catalogs and budgets; not a random object generator. Maintain continuity of environment identities and object placement between shots. Provide style themes and presets, with density appropriate to portrait framing.
- **Exit:** fresh topics select meaningfully different environments without hand edits; repeated scene identity preserved, no overlapping/cut subjects, coherent visual storytelling and measured resource budget.

### GPU-08 — Cinematic camera and post-processing
- Reuse existing camera and composition system; add opt-in focal/depth-of-field profiles, tasteful bloom, vignette/color grading, depth/fog/haze and physically motivated effects where supported. Camera tracks and post-process parameters frame-addressed and bounded. Motion blur optional only after testing temporal behavior; no expensive effect enabled by default.
- Render color tests and diagnose halos, exposure pumping, flicker, transparency and caption legibility. Captions and essential overlays must stay readable and not inherit inappropriate depth blur or grading. Include per-effect toggles and documented quality impact.
- **Exit:** comparison hero film shows artistic benefit, no post-process/caption regressions, profile costs measured separately.

### GPU-09 — Scientific and non-character cinematic modes
- Extend Campaign A primitives, not duplicate them. 3D mathematical surfaces, vector fields, molecular/atomic illustrations with labeled simplifications, mechanical cutaways, network graphs, orbits, data landscapes and particles. Maintain actual numerical meaning and units; use authoritative input or explicitly illustrative values. Build semantic visual recipes, validated parameters and deterministic motion.
- Avoid claiming physical simulation fidelity without validated models; no fictional science disguised as factual. Use optional GPU instancing and procedural geometry to scale dense diagrams within budgets. Keep all existing CPU-friendly educational modes.
- **Exit:** at least two fresh character-free cinematic films (scientific and mathematical/technical), readable data and labels, numeric checks, verified local render.

### GPU-10 — Performance and adaptive quality profiles
- Instrument frame graph evaluation, CPU-to-GPU transfer where measurable, texture/geometry upload, frame capture, encode, wall time, process RAM and observed GPU memory. Measure leaks across repeated jobs and longer projects; deterministic resource disposal and cache ownership. Preserve exact scene meaning and measured media timing.
- Define explicit Draft/Standard/Cinematic quality tiers and optional adaptive resource-budget plan. Quality reductions must be declared in preflight/report and must not silently alter accepted content, resolution, frame rate, asset identity or backend. Owner chooses defaults. Test invalid configurations and GPU unavailable/out-of-memory paths; clear diagnostics and explicit retry options. GPU hardware acceleration for encoding optional and separately measured.
- **Exit:** reproducible benchmark table for all tiers with device/backend identity, median and range, visual review, memory headroom and no hidden fallback. Stress 30/60/90 s and at least one long supported workload; document unverified devices.

### GPU-11 — Intelligent visual direction and Studio integration
- Extend existing Director prompts/IR and deterministic offline planner with profile-aware capabilities, semantic asset retrieval, style packs, visual continuity, camera staging, scene complexity budgets and content-appropriate shot variety. LLM generates data, never executable render code. Preserve compact script workflow and older prompt versions; avoid injecting full asset catalog repeatedly.
- Simple UI offers Classic / Standard / Cinematic, visual style, content mode and quality. Advanced editor exposes materials/lights/camera/asset controls; existing jobs, reports and downloads stay intact. Show capability and performance warnings before render. Local only by default.
- **Exit:** browser click-through and real renders for all three profiles, invalid profile/asset combinations explained, fresh scripts produce coherent varied scenes without hand edits, existing user workflow preserved.

### GPU-12 — Final cinematic showcase and v2.0 qualification
- Make at least four original showcase films: character dialogue, environment-led narrative, scientific/mathematical explainer, product/technical visualization. Include vertical and landscape. Use stable approved assets; actual shared script/timeline/audio for Standard vs Cinematic comparisons where meaningful. Include one long-duration reliability case and repeated local jobs.
- Score via explicit rubric (composition, character identity, animation, lighting/materials, environment variety, audio intelligibility, legibility, continuity and defects); owner decides artistic acceptance. Automated checks cannot prove aesthetics or audience performance. Archive evidence and representative examples, not gigabytes of generated MP4s in Git. Report actual resource costs and limits.
- Run legacy CPU/Standard regression gates from Campaign A, new Cinematic suite, dependency/asset licensing inventory, local import/security checks, clean setup verification where available. Confirm no shared-core semantic regressions and profile-specific failures are explicit.
- Write user guide, profile capability matrix, quality presets, benchmark/replay documentation, known limitations, release notes and FOD handoff. Owner-approved merge and proposed `v2.0-gpu-cinematic` tag only after passing required gates. No publication or commercial-readiness claim without separate approval and evidence.

## 5. Every milestone: evidence and stop conditions

- Reuse existing implementation; no duplicate pipeline or default changes by accident. Update contract docs for additions. Preserve prior digests outside explicitly versioned affected behavior.
- Tests: unit, negative, boundary, deterministic, integration, and actual local render evidence as appropriate. Visual inspection is separate from tests. Report exact commands, commit, test counts/skips, fixture IDs, quality findings, GPU route, timing and limitations. Do not invent coverage, GPU use or visual approval.
- New dependencies, asset licensing, policy changes, destructive changes, system settings, merge/tag and publication require explicit owner approval under existing rules. No automatic branch stacking. No unauthorized historical full CI runs.
- Keep FOD handoff compact and authoritative, recording next unit and unresolved blockers. No unrelated feature development. If a budget cannot be met, isolate hotspot and evaluate alternatives with measured tradeoffs; never weaken acceptance silently.

## 6. Scope exclusions

No mandatory cloud rendering or paid inference, no generative diffusion video engine, no replacement of Remotion/Three.js without separate architectural approval, no mandatory photorealism, no automatic social posting. Apple Silicon or other GPU platforms may be evaluated later via separate measured compatibility units; not guaranteed by this campaign. CPU-exclusive extensions and unrelated SaaS features are out of scope. Shared compatibility/security fixes remain allowed.

## 7. First command to Claude Code (only after Campaign A acceptance)

Read this directive and the final dual-backend qualification handoff. Follow FOD. Verify the approved stable dual tag, preserve it, and begin GPU-00. Prepare the owner-approved backend-policy ADR before introducing any GPU-exclusive scene capability. Use the existing Three.js renderer and production infrastructure; implement each milestone additively, prove legacy compatibility and collect actual local visual/performance evidence. Continue through delegated units, but request approval at existing merge, dependency and architecture boundaries. Never start a rewrite or weaken existing acceptance criteria.
