# AetherMotion Studio — Campaign A: Universal Dual-Backend Finalization

**Proposed development directive v1.0 | 2026-11-26**  
Repository: https://github.com/SaridakisStamatisChristos/AetherMotionStudio  
Proposed release sequence: v1.1 universal capabilities → v1.2 final dual baseline. Version names are proposals; inspect existing tags before assigning them. This document authorizes no repository changes by itself. The owner authorizes execution when handing it to the coding agent.

## 1. Mission

Complete the CPU Canvas and Three.js production pipeline as a universal local-first engine for both character-based and character-free films. Preserve existing output, scene compatibility, user experience, measured narration and all accepted features. Finish with a documented, independently reproducible, stable release before any GPU-exclusive graphics expansion. This is not a renderer rewrite or a photorealism campaign.

## 2. Bootstrap and authority

- Use the existing forward-only protocol (`fod continue`), `CLAUDE.md`, `AGENTS.md`, `docs/continuity/CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_UNITS.md`, `docs/DUAL_BACKEND_POLICY.md`, and source contracts. Read only the current relevant slices; don't reread historical chats or all CI logs.
- Prior observed main merge `8a74721` (PR #42, 2026-11-26) is a historical reference, not an instruction to reset. Inspect current HEAD, worktree, remote status, PRs and existing tags. Preserve owner changes. Reconcile stale handoff text with actual Git state. Record exact starting commit and test outcomes.
- Existing core, AF01–AF09, LOCAL, ART, POLISH, TALK, GEN and Studio work are not to be reimplemented. Inventory actual code and documentation for the capabilities below. If a capability already meets its gate, mark it VERIFIED EXISTING and move forward; if partial, extend the existing seam. No duplicate engines or parallel catalogs.
- Keep established contracts: both renderers first-class; shared validated declarative IR, frame-addressed timeline, asset identities, measured narration, speech/caption sidecars and local-first setup. Preserve the supported legacy 12 s and v2 durations up to 300 s, subject to actual existing contracts. No untrusted executable content from scripts or imports. No cloud dependency.
- Preserve the simple Make a film interface and Advanced view, owner motion/style preferences, current default format and accepted film behavior. New functionality opt-in/versioned until explicitly promoted. Don't change dependency versions, renderer defaults, system settings, or licensing without owner approval. Do not start a GPU-exclusive feature in Campaign A.

## 3. Shared architecture

Extend existing seams, not necessarily these literal module names:

```
Topic / script / editable authored project
  -> existing Director + typed content intent
  -> shared scene contract + semantic content primitives
  -> deterministic layout, timing, style and capability validation
  -> shared measured audio/caption preparation
  -> CPU Canvas adapter OR Three.js adapter
  -> existing media encode, verification, report and export
```

Content semantics (data values, equations, labels, graph topology, images, timeline, narration, safe-area rules) must match across backends. Pixel-for-pixel parity is not required. New 2D content may use a shared deterministic compositing layer where appropriate and supported by the existing renderer architecture; do not render a GPU scene through CPU as an undeclared fallback. Explicitly identify any common overlay path in reports. Keep visual primitives declarative and bounded. No arbitrary JavaScript, HTML, shell commands or network fetching from scene data.

## 4. Milestones in execution order

### DUAL-00 — Baseline and capability audit
- Inventory current contracts, assets, chart/overlay/text support, Director, formats, speech and UI controls, imported asset paths, validators and existing tests. Create a capability table: existing / partial / missing / out of scope, with source paths.
- Run routine JS/Python tests, record skips honestly, capture existing canonical digest checks, verify one representative locally prepared matched film or reuse exact current-commit evidence if it satisfies the gate. Capture local hardware/tool versions and actual renderer identity.
- Establish new campaign fixture IDs and protocol; never overwrite frozen Foundry evidence or old accepted films. Record known issues separately.
- **Exit:** exact baseline and scope map, no unexpected changes, reproducible test and comparison plan.

### DUAL-01 — Character-free content and shared composition
- Add or extend content intent: existing character mode, narrator-only visual explainer, silent visual content when supported by media contract, and mixed shots (character plus visual aids). Do not require a character asset or speaker binding for narrator-only scenes.
- Shared composition primitives: title, panel/card, labels, arrows, callouts, backgrounds, shape groups, image slots and bounded reveal/transition actions. Reuse existing overlay and graph functionality. Support normalized safe areas, ordering, contrast and deterministic placement across shots.
- Director must plan scene changes and meaningful visual aids rather than merely removing characters. Unsupported content yields explicit diagnostic or editable plan, not an invented asset or silent fallback.
- **Exit:** fresh character-free explainer and mixed film both render on both backends, no unwanted cast, same measured timeline, no clipping/overflow in sampled frames, legacy fixture digests preserved.

### DUAL-02 — Typography and motion graphics
- Shared text layout with titles, quotations, emphasis, kinetic typography, bullet reveals, number counters and captions distinct from editorial overlays. Support deterministic wrapping, alignment, font fallback, safe areas, contrast and theme tokens. Use local, appropriately licensed fonts and record their identity; no remote font requests.
- Text reveal timing is anchored to measured phrase windows; any estimated word timing must remain labeled estimated. Escape untrusted text; support Unicode within verified font coverage, report missing glyphs. Do not silently truncate important text.
- **Exit:** 30–60 s typography-led film, visual review of dense/long text and Unicode, deterministic text content/order, both renderers pass, adversarial input/overflow tests.

### DUAL-03 — Mathematics, geometry and algorithm visualization
- Declarative equation primitives (fractions, powers, roots, matrices, labels and common notation; use a vetted local typesetter if approved), safe parsing/allowlisted commands, no executable macros or arbitrary markup.
- Shared coordinate systems, lines, circles, polygons, vectors, axes, plots, graph nodes/edges, trees, arrays and highlighted transformations. Versioned mathematical animations for step reveals, geometric construction, algorithm state transitions, and numerical examples.
- Do not let the Director invent mathematical correctness. Authored formulas/data are authoritative; validate numeric operations where possible, and report unverifiable claims. Any automatic plotting expression must use an allowlisted bounded parser, never eval.
- **Exit:** fresh geometry/proof explainer and algorithm visualization (e.g. Euclidean algorithm or BFS) with independently checked data and equations, CPU/Three renders, readable labels, finite-number and pathological-expression negatives.

### DUAL-04 — Charts, diagrams and data storytelling
- Shared chart definitions: bars, lines, scatter, simple area/pie only when appropriate; axes, ticks, legends, units, annotations, highlights, data transitions. Include flowcharts, directed diagrams, timelines and comparison cards. Use deterministic layout and collision mitigation; explicit overflow diagnostics.
- Accept validated local JSON data and optionally bounded CSV import; no automatic sourcing of factual data. Reject NaN/Infinity, malformed series and invalid ranges; preserve units, signs and categorical order. Explicitly document axis scaling and treatment of missing values. Never animate between incompatible values without a defined transition.
- **Exit:** fresh data explainer on both backends using known fixture data, identical values and label semantics, no misleading clipping or scaling, adversarial numeric/layout tests.

### DUAL-05 — Local media and illustration integration
- Extend existing asset registry/import quarantine if present. Support approved local raster formats (PNG/JPEG/WebP as supported), transparent overlays, illustrations, cropping/fit, pan/zoom and simple layered compositions. SVG only with strict sanitizer or trusted offline rasterization, if explicitly approved; no active SVG, external references or scripts.
- Use safe project-relative paths and validated manifests, content hashes, attribution/license metadata, dimensions/decoded-size bounds and explicit missing-file diagnostics. Reject traversal, symlink escapes, malformed media, excessive dimensions and unsupported types. No arbitrary URLs, automatic web scraping or new paid providers.
- Images are optional assets supplied by the user or approved local library; this is not an image-generation engine. Do not bundle third-party media without permission.
- **Exit:** narrated illustration/history-style film using licensed test assets, same image identity/crop/timing in both backends; corrupt, missing and hostile imports fail clearly.

### DUAL-06 — Formats, themes and audio controls
- Preserve existing vertical 1080×1920/30 fps and Reels settings. Add validated landscape 1920×1080 and square 1080×1080 presets where missing; layout must reflow, not merely stretch or crop. Keep FPS/resolution limits explicit and support only tested combinations.
- Versioned reusable visual themes: colors, typography, backgrounds, caption style, contrast. Retain all established defaults. Expose existing narration, voice selection, pacing, music gain/ducking, sound effects and caption toggles; add only missing controls. Mute or silent mode must be explicit, not disguised speech failure.
- **Exit:** same authored content in all three aspect ratios across both renderers, safe-area checks and sampled visual review; valid media probes and audio/caption semantics; invalid presets rejected.

### DUAL-07 — Universal Director and Studio integration
- Extend existing Director schema and planner to select content modes, visuals, themes and formats from validated capabilities. Support pasted plain scripts and optional structured sections; keep free-chat script workflow, auto-clean and length advice. Preserve original character dialogue behavior and optional remote adapters (never mandatory).
- Simple UI: topic, cast/content mode, duration, format, backend, theme, script, essential audio controls, generate/render. Advanced UI: timeline, data/equation/media editing, asset browsing, validation. Avoid feature clutter; reuse existing controls, job queue and finished-film/download panel.
- Make provider prompts compact and versioned, preserve old prompt digests. Offline planning remains deterministic, not advertised as a general LLM. Add a useful authoring guide with example scripts for each content mode.
- **Exit:** actual browser click-through on representative modes and at least one render/download for each backend; validation errors actionable; no source changes needed per video; no UI regressions.

### DUAL-08 — Optional bounded batch production
- Only if owner wants this before freeze. Queue validated scripts/projects locally with explicit backend, preset, output root, unique IDs and per-job manifests. Sequential or bounded concurrency based on measured hardware capacity; no simultaneous overwrite of project IDs.
- Persist minimal job state, allow cancellation/resume of unfinished jobs, preserve outputs and report failures individually. Never silently rerender accepted outputs or retry indefinitely. No SaaS, scheduling or posting integration.
- **Exit:** mixed successful/failing/cancelled batch fixtures, restart recovery, no lost outputs, bounded resources. If deferred, document it as a future shared service rather than a GPU requirement.

### DUAL-09 — Final qualification and release
- Consolidate only approved branches. Run all routine JS/Python tests and negative suites; compare legacy compatibility/digests against DUAL-00. No arbitrary coverage percentage without instrumented measurement; target all changed critical contracts and report actual coverage if collected.
- Run a new versioned local qualification matrix: at least one fresh fixture for each of dialogue, narrator-only, mixed, typography, mathematics/algorithm, charts/diagrams and image-based content on both backends; exercise all three aspect ratios, 30/60/90-second films and at least one near-300-second project within supported limits. Pair fixture preparation once, avoid Cartesian explosion. Include existing accepted examples and prior historical regressions selectively; frozen AF09 remains untouched. Full historical CI render rerun only with owner authorization.
- Verify exact shared scene/timeline/audio/caption identity for matched pairs where required; backend-specific pixels may differ. Probe frame count, dimensions, fps, codecs, duration, audio decode, missing/glitch frames, clipping, quality findings and caption synchronization. Inspect actual rendered frames/video; distinguish automated checks, agent inspection and owner review. Measure cold/warm timing and peak RAM/VRAM on selected repeatable fixtures. Record actual WebGL GPU route, no silent software substitution.
- Review security boundaries (local server, imports, paths, render snapshots, logs, cancellation), dependency and model/license inventory, setup/launcher documentation, troubleshooting and recovery. No claims of commercial redistribution rights until checked. Existing license restrictions apply.
- Produce release notes, final capability matrix, evidence index, known limitations, user guide, and a clean continuity handoff. Test clean installation on supported environments where available; distinguish verified from unverified OS/GPU combinations.
- **Exit:** owner reviews representative final films and accepts known limitations; required gates pass; owner approves merge/tag. Proposed tag `v1.2-dual-backend-final` if available. Tag exact accepted commit, not a dirty worktree. No automatic release publication. CPU renderer is now feature-complete for Campaign A; shared bug/security/compatibility work remains allowed.

## 5. Acceptance protocol for every milestone

1. Inspect relevant source + contract; identify exact files and baseline.
2. Implement minimal additive change; validate all untrusted inputs; preserve old defaults and IDs.
3. Run positive, negative, boundary and deterministic regression tests; fix failures, never weaken an assertion to hide defects.
4. For visual or audio changes produce fresh local films with new IDs and inspect actual output. Use shared preparation for matched comparisons; record hashes and commands. Do not claim tests/renders/human review that did not occur.
5. Update relevant contracts and continuity notes with commit, evidence, limitations and next milestone. Small focused branch/PR, no branch stacking unless explicitly authorized; merge only on owner instruction and passing required checks. Keep routine CI test-only.
6. Stop only for decision-changing changes (new dependencies, system changes, license choices, destructive operations, defaults, scope conflicts, merge/release approval). Continue within delegated unit otherwise. If blocked, record exact blocker and proceed with independent safe work.

## 6. Explicitly excluded from Campaign A

Advanced PBR, HDR/IBL, cinematic post-processing, high-detail 3D models, skeletal/morph rigs, imported animated GLB, complex GPU particles and GPU-exclusive rendering features. Do not force them into CPU parity. No hosted service, automatic publishing or external inference requirement. Campaign B begins only after owner-approved freeze and explicit authorization to revise the existing dual-backend policy.

## 7. First command to Claude Code

Read this directive and follow the existing FOD protocol. Start with DUAL-00 on the actual repository HEAD. Compare each milestone with existing implementation; reuse or verify rather than rebuild. Execute Campaign A in order, preserving current accepted behavior and all old scene formats. Produce real local evidence, keep handoffs short and authoritative, and stop for owner approval before merging or tagging according to existing repo policy. Do not begin Campaign B.
