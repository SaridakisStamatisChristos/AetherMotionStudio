# Campaign A: Universal Dual-Backend Finalization (status tracker)

**Requirements:** [CAMPAIGN_A_DIRECTIVE.md](CAMPAIGN_A_DIRECTIVE.md), stored verbatim (owner's directive v1.0, 2026-11-26; sha256 b36c928d93ff0f4b…). This file holds only **status, decisions and evidence pointers**. If the two ever disagree, the directive and the owner's latest word win; record the correction here.

**Authorization (owner, 2026-11-26):** "Execute the attached AetherMotion Studio Dual-Backend Finalization Directive. Follow our existing forward-only development protocol, persistent repository instructions and continuity documents. Begin with DUAL-00. Inspect existing implementations before building anything. Reuse all completed capabilities and extend only what is missing. Preserve both backends, all accepted features and the existing production workflow. Execute the milestones sequentially with appropriate positive, negative, regression and actual local rendering tests. Maintain persistent handoffs so I can resume through 'fod continue'. Do not begin the GPU expansion campaign until the final dual-backend release has been verified, accepted and tagged."

**Starting point:** main 6c71875 (PRs #44–#48 merged; main CI 45837801078 passed). The continuity record PR #49 (docs) was open when this tracker was written. Existing tags: only `v0.4-render-baseline`. The proposed tags `v1.1…` and `v1.2-dual-backend-final` are free; assign them only with owner approval.

## Milestones (strictly in order; one branch and one PR per milestone, or per coherent slice of one)
Status words: PLANNED · ACTIVE · IMPLEMENTED · TESTED · RENDERED · OWNER-REVIEWED · MERGED · VERIFIED EXISTING · DEFERRED (owner) · BLOCKED.

| ID | Milestone | Status | Branch / PR | Evidence |
|---|---|---|---|---|
| DUAL-00 | Baseline and capability audit | **MERGED** (PR #50 → 8e42d99, owner: "merge it") | `chore/dual-00-audit` | [CAMPAIGN_A_AUDIT.md](../CAMPAIGN_A_AUDIT.md), [protocol v1](CAMPAIGN_A_PROTOCOL.md), "DUAL-00 baseline" below |
| DUAL-01 | Character-free content and shared composition | **MERGED** (PR #51 → 14a1da6, owner: "merge pr51") | `feature/dual-01-composition` | [docs/COMPOSITION.md](../COMPOSITION.md), "DUAL-01 evidence" below |
| DUAL-02 | Typography and motion graphics | **TESTED + RENDERED** (PR open, not merged) | `feature/dual-02-typography` | docs/COMPOSITION.md "Typography", "DUAL-02 evidence" below |
| DUAL-03 | Mathematics, geometry and algorithm visualization | **NEXT** | — | — |
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

## DUAL-00 baseline (recorded 2026-11-26)
- **Start commit:** main d3982f5 (= 6c71875 product code + PR #49 docs). Worktree clean. Open PRs: only the old drafts #2–#12 (OPEN-6). Tags: `v0.4-render-baseline` only.
- **Environment:** Windows 11 Home 10.0.26300; Node 22.17.0, npm 10.9.2; Python 3.11.9 (.venv); ffmpeg 7.1 (imageio-ffmpeg), ffprobe n7.1 (Remotion compositor); RTX 4060 Laptop 8 GB, driver 566.07.
- **WebGL identity** (Remotion openBrowser, UNMASKED_RENDERER): swangle → `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)` (software); vulkan → `ANGLE (NVIDIA, Vulkan 1.3.289 (NVIDIA GeForce RTX 4060 Laptop GPU))`.
- **Tests:** `npm test` 412 tests, 411 pass, 0 fail, 1 skip ("reject symlinked import source": symlink creation not permitted for this Windows account). Python unittest 59 OK.
- **Digests:** graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935 (unchanged canon).
- **Baseline film `dual00-baseline-r1`:** `node scripts/produce.mjs --request examples/gen12-forest-script.request.json --backend both --id dual00-baseline-r1` (the request names no sets, look or titles, so the Director defaults apply), source d3982f5, sourceDirty false, vulkan, concurrency 8.
  - Planned: 13 shots, sets topic-v3 (`forest-set-2` far backdrop), look crafted-v2, titles none on every shot, speech fit speech-v1 (1800 → 1800 frames), 0 speaker names in captions.srt. This is the first render of topic-v3 + titles none together and the first from main 6c71875's product code.
  - Gates: both backends PASS (speech allocation, sidecars, 1800-frame native MP4, full decode); matched comparison PASS, shared hashes exact; CHECKS 0 warnings on both (motion-speed-v1, visibility-v2, crowding-v1, silence-v1; talk 0.79); QUALITY pass-with-findings, errors 0, warnings 0; frame_glitch clean on both; −16.0 LUFS on both; pace 0.92 not kept, maxCps 18.
  - Films: CPU dbf8eb94ac23ebd6… (render 136.5 s), Three c7cc7cace5c69327… (render 55.6 s, gl vulkan). Whole run 232 s; RTX peak 56 % util, 1445 MiB used.
  - Agent stills (frames 200, 700, 1200, 1700, both backends): clean top, forest backdrop, captions without names, characters whole in frame, same content on both backends. **No owner review.**
- **Audit result (short):** the shared 2D overlay path already exists on both backends and is the base for DUAL-01…05. Main gaps: shots need ≥ 1 asset; the narrator mode still adds a `retro-robot`; editorial text squeezes instead of wrapping; maths/charts are minimal overlays; no 2D images; output is fixed 9:16 (720×1280 logical space); no Studio audio-mix controls; no batch queue.

## DUAL-01 evidence (2026-11-26)
- **What:** opt-in `compose-v1` shot compositions (title, card, label, callout, arrow, shape, background; deterministic text layout; regions inside the Reels-safe area above captions; overlap, overflow, contrast and window rules), drawn by the **shared 2D overlay path (Canvas 2D, after the world pass)** on both backends. Director `request.content`: `explainer-v1` (narrator, no characters) and `mixed-v1` (cast plus aids). Aids are planned from each shot's own text (title, flow "A into B", list "A, B and C", quote card); unsupported content (charts, maths, images) and fallback objects are reported as diagnostics. Content-mode productions without their own speech are fitted (speech-v1) and mastered (mix-v2). New check `aids-v1`. Absent fields: unchanged output.
- **Not done (recorded):** shots with zero assets (camera checks assume one; DUAL-02); arrows to 3D objects; phrase-timed aids (DUAL-02); silent/mute (DUAL-06); Studio controls (DUAL-07).
- **Tests:** 426 JS (425 pass, 0 fail, 1 skip), 59 Python OK; 15 new tests in tests/composition.test.js (layout, 30+ negative/adversarial inputs, contrast, safe area, determinism, planner extraction, no invented text, modes, conflicts, diagnostics, aids-v1, fit/master, object variety). Legacy digests unchanged with `--exclude …,dual`.
- **Films** (vulkan, agent stills only, **no owner review**):
  | ID | Source | Result |
  |---|---|---|
  | dual01-explainer-r1 | 456b1dc clean | all PASS; silence-v1 3 pauses 3.0–4.0 s (not fitted); same tree in every shot; small text → fixed |
  | dual01-mixed-r1 | 456b1dc **dirty** (a doc was written during the render) | all PASS; superseded |
  | dual01-*-r2 | 686e156 | stopped by the agent before finishing (text too small); not evidence |
  | dual01-explainer-r3 | dd20c5a clean | all PASS, −18.7 LUFS (no master) → fixed |
  | **dual01-mixed-r3** | dd20c5a clean | all PASS both backends, shared hashes exact, CHECKS 0 incl. aids-v1 0, QUALITY 0/0, glitch clean, −16.0 LUFS, 1800 frames; CPU 0310f49069801341…, Three f4064c21ed14c6ad… |
  | **dual01-explainer-r4** | beb36af clean | all PASS both backends, shared hashes exact, CHECKS 0 incl. aids-v1 0 and silence-v1 0, QUALITY 0/0, glitch clean, −16.0 LUFS, fitted 1200 → 1008 frames; CPU da330b38ace00195… (45 s), Three 644ebe7229cb6ce9… (37 s) |
- **Agent stills:** explainer: no characters, title → "Carbon → Sugar and wood" → "Trunks · Roots · Forest soil" → quote card; objects change per shot; aids identical on CPU and Three.js; nothing clipped or overlapping captions. Mixed: aids in the clean top above the speakers; in the close-up the card ends just above the robot's head (aids-v1 0).

## DUAL-02 evidence (2026-11-26)
- **Owner decision:** fonts: "Bundle open fonts (Recommended)" and all four families ("can we download all?"). Bundled: Inter 4.1, Merriweather @4481226, JetBrains Mono 2.304, Noto Sans 2.015 (Regular+Bold, OFL-1.1, 2.8 MB, SHA-256 in public/fonts/fonts.lock.json).
- **What:** `compose-v2` (fonts with fallback chain and missing-glyph errors, weights, alignment, emphasis, `paper-v1` theme, quote, bullets, counter, kinetic text, phrase-anchored reveals from measured phrase windows); font metrics generated from the TTFs (scripts/font-metrics.mjs); the renderer loads faces before frame 0 (a failure fails the render); zero-asset typography shots; Director `typography-v1` and request `font`/`theme`; preflight `TYPOGRAPHY_SHOT` review note. compose-v1 unchanged.
- **Fixes found on the way:** two DUAL-01/02 regexes had lost their backslash (a backspace character; the "books" exception never matched) → fixed, plus a guard test against control characters in sources; every Python `read_text()` now reads UTF-8 (Windows cp1252 made verify.py fail on the Greek title, dual02-eureka-r2) + tests/test_utf8_reads.py; empty counter prefixes, number labels, sentence splitting at decimals, "only water" list items, BC dates.
- **Tests:** 443 JS (442 pass, 0 fail, 1 skip), Python OK (2 new); 17 new tests in tests/typography.test.js. Legacy digests unchanged with `--exclude …,dual`.
- **Films** (vulkan; agent stills only, **no owner review**):
  | ID | Source | Result |
  |---|---|---|
  | dual02-*-r1 | 4582d3f | blocked by preflight EMPTY_GEOMETRY before rendering → TYPOGRAPHY_SHOT rule |
  | dual02-eureka-r2 | 77ae96c | verify.py UnicodeDecodeError (Greek title) → UTF-8 fix |
  | dual02-forest-r2 / eureka-r3 | 77ae96c / b07bb0d | all PASS; bullets and counter labels too small → larger sizes |
  | **dual02-eureka-r4** | 1115855 clean | Inter, Greek title "Εύρηκα!"; all PASS both backends, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0 errors / 1 warning (CAPTION_READING_SPEED 18.15 cps vs 18, one cue), glitch clean, −16.0 LUFS, fitted 1800 → 1522 frames; CPU c1107a6da30c5472…, Three f406cdf3810b5fd2… |
  | **dual02-forest-r3** | 1115855 clean | Merriweather on paper-v1; all PASS both backends, shared hashes exact, CHECKS 0, QUALITY 0/0, glitch clean, −16.0 LUFS, 1350 → 1129 frames; CPU 5ba4a4767b26344c…, Three a7dc91f5b927761f… |
- **Agent stills:** both fonts render; Greek glyphs correct; title and sentences word by word; counters "1.8 times denser", "3 trillion trees", "100 kilograms of oxygen"; bullets "Water · Vessel · Pure gold"; flow "Carbon → Sugar and wood"; identical on CPU and Three.js; no overflow; nothing over the captions.
- **Not done (recorded):** Studio preview fonts and controls (DUAL-07); per-word forced alignment (never claimed); paragraphs longer than 220 characters (rejected explicitly).

## Decisions the owner must make (ask when the milestone reaches them, not before)
- DUAL-02: fonts: **decided** (bundle the four open families).
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
- 2026-11-26: DUAL-00 tested and rendered at d3982f5 (412/411/0/1 JS, 59 Py, digests unchanged, dual00-baseline-r1 all gates PASS); audit and protocol v1 written on `chore/dual-00-audit`. DUAL-01 next. No product code changed.
- 2026-11-26: DUAL-00 MERGED (PR #50 → main 8e42d99) on the owner's word.
- 2026-11-26: DUAL-01 tested and rendered on `feature/dual-01-composition` (beb36af): explainer-r4 and mixed-r3 all gates PASS on both backends; PR open, not merged. DUAL-02 next.
- 2026-11-26: DUAL-01 MERGED (PR #51 → main 14a1da6, PR CI 45856917978 passed) on the owner's word.
- 2026-11-26: DUAL-02 tested and rendered on `feature/dual-02-typography` (1115855): eureka-r4 and forest-r3 all gates PASS on both backends; PR open, not merged. DUAL-03 next.
