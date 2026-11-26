# Campaign A: Universal Dual-Backend Finalization (status tracker)

**Requirements:** [CAMPAIGN_A_DIRECTIVE.md](CAMPAIGN_A_DIRECTIVE.md), stored verbatim (owner's directive v1.0, 2026-11-26; sha256 b36c928d93ff0f4b…). This file holds only **status, decisions and evidence pointers**. If the two ever disagree, the directive and the owner's latest word win; record the correction here.

**Authorization (owner, 2026-11-26):** "Execute the attached AetherMotion Studio Dual-Backend Finalization Directive. Follow our existing forward-only development protocol, persistent repository instructions and continuity documents. Begin with DUAL-00. Inspect existing implementations before building anything. Reuse all completed capabilities and extend only what is missing. Preserve both backends, all accepted features and the existing production workflow. Execute the milestones sequentially with appropriate positive, negative, regression and actual local rendering tests. Maintain persistent handoffs so I can resume through 'fod continue'. Do not begin the GPU expansion campaign until the final dual-backend release has been verified, accepted and tagged."

**Starting point:** main 6c71875 (PRs #44–#48 merged; main CI 45837801078 passed). The continuity record PR #49 (docs) was open when this tracker was written. Existing tags: only `v0.4-render-baseline`. The proposed tags `v1.1…` and `v1.2-dual-backend-final` are free; assign them only with owner approval.

## Milestones (strictly in order; one branch and one PR per milestone, or per coherent slice of one)
Status words: PLANNED · ACTIVE · IMPLEMENTED · TESTED · RENDERED · OWNER-REVIEWED · MERGED · VERIFIED EXISTING · DEFERRED (owner) · BLOCKED.

| ID | Milestone | Status | Branch / PR | Evidence |
|---|---|---|---|---|
| DUAL-00 | Baseline and capability audit | **NEXT** | — | — |
| DUAL-01 | Character-free content and shared composition | PLANNED | — | — |
| DUAL-02 | Typography and motion graphics | PLANNED | — | — |
| DUAL-03 | Mathematics, geometry and algorithm visualization | PLANNED | — | — |
| DUAL-04 | Charts, diagrams and data storytelling | PLANNED | — | — |
| DUAL-05 | Local media and illustration integration | PLANNED | — | — |
| DUAL-06 | Formats, themes and audio controls | PLANNED | — | — |
| DUAL-07 | Universal Director and Studio integration | PLANNED | — | — |
| DUAL-08 | Optional bounded batch production | PLANNED (**owner decides** whether before the freeze) | — | — |
| DUAL-09 | Final qualification and release (proposed tag v1.2-dual-backend-final) | PLANNED | — | — |

## DUAL-00 work plan (what the next session does first)
1. Bootstrap (CLAUDE.md). Record the exact start commit, `git status`, open PRs, tags, Node, Python, ffmpeg/ffprobe, GPU and driver, and the WebGL renderer identity for swangle and vulkan (see LOCAL_DEVELOPMENT.md).
2. Run the routine tests: `npm test` and the Python unittest command. Record skips honestly, plus the canonical digests (`node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa`).
3. **Capability audit:** one table row per directive capability (DUAL-01…08), each marked existing / partial / missing / out of scope with source paths. Start from these known seams:
   - shared scene contract: src/core/timeline.js, graph.js, cinematography.js, speech.js;
   - drawing: src/core/draw-film.js, src/visual/draw-graph.js, draw-overlays.js, three-backend.js, mesh.js;
   - overlays/charts: search for `overlays` in graph.js, draw-overlays.js and templates;
   - text: draw-graph.js `text`/`polishedType`, captions in draw-film.js;
   - Director: src/director/ (schema, index, offline, dialogue, sets);
   - speech: scripts/speech_pipeline.py, speech_plan.py;
   - formats: src/core/reels*.js; 1080×1920 is the only size so far, so verify;
   - imports: src/foundry/ (import quarantine), scripts/import-*.mjs;
   - Studio: studio/, src/studio/, scripts/studio-server.mjs;
   - production: scripts/produce.mjs, native-render.mjs, verify.py, quality_media.py, frame_glitch.py.
4. Baseline matched film: reuse exact current-commit evidence if it satisfies the gate, else one fresh matched pair with a new ID (`dual00-…`). Note that no film has been rendered from 6c71875 itself yet, and the combination of topic-v3 backdrops with the titles-none clean top is unrendered.
5. Fix the campaign fixture ID scheme and the qualification protocol: new IDs prefixed `dual-`; a new versioned protocol file; frozen AF09 evidence untouched.
6. Write the audit as docs/CAMPAIGN_A_AUDIT.md (the scope map), update this table, then run FOD CHECKPOINT. DUAL-00 changes no product code.

## Decisions the owner must make (ask when the milestone reaches them, not before)
- DUAL-02: local font files (identity and licence) if the current Arial/system fonts are not enough.
- DUAL-03: a local math typesetter is a **new dependency** and needs approval; otherwise use a built-in declarative equation layout.
- DUAL-05: SVG support only with an approved sanitizer or offline rasterizer; otherwise raster formats only.
- DUAL-06: new sizes (1920×1080, 1080×1080) are opt-in presets; the default stays 1080×1920/30 fps.
- DUAL-08: do it before the freeze or defer it.
- DUAL-09: tag names, final acceptance, release notes. **No tag, merge or release without the owner's word.**

## Standing rules for this campaign (from the directive, binding)
- Reuse, don't rebuild. Mark VERIFIED EXISTING when a capability already meets its gate.
- Both backends first-class. Content semantics must match across backends; pixels may differ. A common 2D overlay path must be named in reports. Never render a GPU scene on CPU as an undeclared fallback.
- New behaviour is opt-in or versioned until the owner promotes it. Old scenes, IDs, defaults, accepted films and frozen evidence stay unchanged.
- No new dependencies, dependency version changes, renderer default changes, system changes or licence changes without approval. No cloud, no executable content from data, no eval.
- **Campaign B (GPU-only graphics: PBR, HDR/IBL, post, skeletal rigs, GLB, particles) is excluded** until v1.2 is verified, owner-accepted and tagged, and the owner explicitly authorizes revising DUAL_BACKEND_POLICY.md. The former "GEN-16 Three cinematic profile" proposal belongs to Campaign B.

## Ledger (append one line per verified transition)
- 2026-11-26: Campaign A authorized by the owner; directive stored; DUAL-00 next. No product code changed.
