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
| DUAL-02 | Typography and motion graphics | **MERGED** (PR #52 → 17ebecd, owner: "Yes, merge #52") | `feature/dual-02-typography` | docs/COMPOSITION.md "Typography", "DUAL-02 evidence" below |
| DUAL-03 | Mathematics, geometry and algorithm visualization | **MERGED** (PR #53; canonical correction 2026-11-27: this row still said "PR open" although HANDOFF and CURRENT_STATE record the merge) | `feature/dual-03-maths` | [docs/MATHS.md](../MATHS.md), "DUAL-03 evidence" below |
| DUAL-04 | Charts, diagrams and data storytelling | **COMPLETE: MERGED** (PR #55 → e520e4a, owner: "Approved. Merge PR #55"; two repair passes; third independent audit verified the repairs) | `feature/dual-04-charts` | [docs/CHARTS.md](../CHARTS.md), "DUAL-04 evidence" below |
| DUAL-05 | Local media and illustration integration | **MERGED** (PR #57 → main aacfac6, owner "merge pr 57 and close pr 56 as superseded"; CI 45961923535 green on 90eed63, 491/491) | `feature/dual-05-media` | [docs/MEDIA.md](../MEDIA.md), "DUAL-05 evidence" below |
| DUAL-06 | Formats, themes and audio controls | **COMPLETE: MERGED** (slice 1 #59 → 0072c5a; slice 2 #60 → f062de4, owner "all good merge"; owner reviewed the DUAL-06 videos) | `feature/dual-06-formats`, `feature/dual-06-themes-audio` | [docs/FORMATS.md](../FORMATS.md), [docs/THEMES_AUDIO.md](../THEMES_AUDIO.md), "DUAL-06 evidence" below |
| DUAL-07 | Universal Director and Studio integration | **COMPLETE: MERGED** (PR #61 → 0e83826, owner "merge"; CI 45989203443 green on 14a4a9a, 522/522; independent audit repaired; owner inspected the Studio) | `feature/dual-07-studio` | [docs/AUTHORING.md](../AUTHORING.md), docs/STUDIO.md, "DUAL-07 evidence" and "DUAL-07 audit repair" below |
| DUAL-08 | Optional bounded batch production | **MERGED** (PR #63 → 527df34, owner "merge and continue"; CI 46000524327 green on de41362, 546 tests; repair pass R1–R13) | `feature/dual-08-batch` | [docs/BATCH.md](../BATCH.md), "DUAL-08 evidence" below |
| DUAL-09 | Final qualification and release (proposed tag v1.2-dual-backend-final) | **MERGED** (PR #64 → main 79f76d7, owner "merge and finilize"; CI 46033308643 green on 7cabbf6, 560 tests; owner reviewed the films; **tag pending the owner's word**) | `feature/dual-09-qualification` | [docs/RELEASE_1_2.md](../RELEASE_1_2.md), "DUAL-09 evidence" below |

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

## DUAL-03 evidence (2026-11-26)
- **Owner decision:** maths typesetter: "Maths library now", then "MathJax 4.1.3 (Recommended)". `@mathjax/src` 4.1.3 pinned exactly (Apache-2.0; dependencies Apache-2.0/MIT/ISC; ~100 MB in node_modules). Node-only; a test proves neither browser bundle imports it.
- **What:** bounded expression parser (src/core/expr.js); TeX allowlist + outline validation + arithmetic checks (src/core/math.js); Node MathJax compiler to flattened outlines (src/director/math-compile.js); compose-v2 items `equation`, `plot` (geometry, functions; out-of-range data refused), `graph` (BFS verified), `array` (Euclid verified) with phrase-timed steps (src/core/diagrams.js, src/visual/draw-diagrams.js); Director `request.visuals` (authored compositions attached to script sentences; visuals define their shots; cue/cues; src/director/visuals.js); maths report in stages and manifest. Equations are compiled for Director films and authored `--project` films.
- **Tests:** 453 JS (452 pass, 0 fail, 1 skip), Python 61 OK; 10 new tests in tests/maths.test.js (parser adversarial inputs, TeX allowlist and tampered outlines, MathJax errors, true/false/unverifiable claims, plot range and pathological functions, BFS/Euclid wrong claims, visuals conflicts, browser-bundle isolation). Legacy digests unchanged.
- **Films** (vulkan; agent stills only, **no owner review**), all from 74e8b9c clean, all PASS on both backends, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0/0, glitch clean, −16.0 LUFS:
  | ID | Content | Maths report | Frames | CPU / Three |
  |---|---|---|---|---|
  | dual03-pythagoras-r2 | triangle construction, a²+b²=c², checked 3²+4²=9+16=25, c=√25=5 | 1 verified, 2 not checked (symbolic) | 1800 → 1207 | c45c286e812a6f7f… / 6c37214fb61cf7d2… |
  | dual03-euclid-r2 | three checked division steps, Euclid array, checked gcd(48,18)=6 | 5 verified | 1800 → 1282 | 2072a9217fcbc0aa… / f0cda0109acdb646… (byte-identical to r1: deterministic) |
  | dual03-bfs-r2 | six-node graph, levels 0–3 | BFS verified | 1200 → 622 | c46142a969568efa… / 82511f7119023a2d… |
- r1 of all three (fe0fa1b) passed the same gates; plot labels were small → 30 px labels, 20 px ticks (74e8b9c).
- **Agent stills:** crisp MathJax outlines on both backends; triangle with right-angle mark and labels; equations accumulate with the speech; array (12, 6) → (6, 0); BFS levels light up in verified order; identical aids on CPU and Three.js.
- **Not done (recorded):** accented letters inside TeX `\text` (rejected; use a label); arrows from a diagram to a 3D object; proofs are explained, not formally verified (only arithmetic, BFS and Euclid claims are machine-checked).
- **Investigation (owner asked, 2026-11-26):** why DUAL-02 typography films were blocked: the v0.8 preflight (d17e90c) treats "no visible 3D geometry" as a broken shot (EMPTY_GEOMETRY), correct while every shot had to hold 1–8 objects. DUAL-02 made object-free shots legal; the agent dry-ran the other checks but not preflight. Fix (DUAL-02): only compose-v2 shots with zero assets are exempt (TYPOGRAPHY_SHOT review note); every other empty shot still blocks; both cases tested.

## DUAL-04 evidence (2026-11-26)
- **What:** compose-v2 `chart` (bar, line, area, scatter, pie; inline JSON or strict bounded CSV; finite values or explicit missing; bar/area include zero; explicit ranges never clip; axes fixed across steps; honest transitions; legends, units, highlights, annotations, value labels; pie percentages sum to 100), `timeline`, `flow`, `compare`; directed diagrams reuse `graph`. Visuals now claim narration phrases (planner shots split or merged). Planner suggests authored visuals for data/maths and never invents data (src/core/charts.js, src/visual/draw-charts.js, src/director/visuals.js, aids.js).
- **Tests:** 461 JS (460 pass, 0 fail, 1 Windows skip), Python 61 OK; 7 new tests in tests/charts.test.js (CSV injection/format/limits, NaN/Infinity/strings, missing data, truncated baselines, clipping, step consistency, pie rules, overflow, interpolation vs fade). Legacy digests unchanged.
- **Films** (vulkan; agent stills only, **no owner review**), from 215c2e1 clean, all PASS on both backends, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0/0, glitch clean, −16.0 LUFS:
  | ID | Content | Frames | CPU / Three |
  |---|---|---|---|
  | dual04-bakery-r2 | example data: bar + Friday highlight, week-2 transition with missing Wednesday ("no data"), pie 50/30/20 %, temperature scatter | 1800 → 1486 | 9cfced20e66fa45b… / 62e3d90f7fcfe077… |
  | dual04-bread-r2 | flowchart, timeline, comparison cards, directed supply diagram | 1800 → 1274 | 0a82848b5be0e752… / 458b8153b302d6c8… |
- r1 (7b42aa4) passed the same gates; card, timeline, "no data" and node text were small → larger sizes (215c2e1). Node radius change also affects graph items rendered by DUAL-03 code (its evidence stays tied to 74e8b9c).
- **Agent stills:** values and labels identical on CPU and Three.js; Wednesday shows "no data" (not zero) after the week-2 transition; pie labels "Bread 1,500 euros 50%"; flow/timeline/cards/supply diagram readable.
- **Not done (recorded):** loading CSV from a file path (CSV is inline text by design; no file system access from scene data); stacked bars; log scales.

## Repair pass after the independent audit (2026-11-26, on PR #55)
Owner: "An independent adversarial code audit identified the following defects. Perform a dedicated repair pass … Rebase or reconcile PR #55 after PR #54, run the complete test suite with installed dependencies, and produce matched CPU and GPU validation films before requesting merge approval." PR #54 was merged first (owner: "Merge PR #54"; main 5145f50), then main was merged into `feature/dual-04-charts` (b8f17a1; docs-only conflicts).

| # | Defect (reproduced before fixing) | Fix | Regression test |
|---|---|---|---|
| 1 | arithmetic check accepted 1000000000 = 1000000001, 1/10000000000 = 0, 9007199254740992 = 9007199254740993 (float tolerance) | exact BigInt rational arithmetic (src/core/exact.js); anything non-exact is unverifiable, never true | repair.test.js 1 |
| 2 | line-chart opening scaled values by a growth factor (points outside nonzero axis ranges) | wipe reveal of the plotting area; coordinates never scaled | 2 (intermediate frames) |
| 3 | subnormal values gave NaN ranges and no ticks; narrow / closely spaced large ranges not refused | drawable-range rule (span ≥ 1e-9 and ≥ 1e-9 of magnitude; non-zero values ≥ 1e-9); finite scales and increasing ticks validated (charts and plots) | 3 |
| 4 | CSV categories skipped the duplicate/count rule | one `categoriesOf` rule for CSV and JSON | 4 |
| 5 | scatter annotation crashed with a TypeError | explicit validation error (scatter and pie take no annotations) | 5 |
| 6 | compiled outlines trusted when the key matched | production boundary (math-loader) regenerates every equation from TeX | 6 |
| 7 | value labels and pie percentages showed the next state while geometry was interpolated | only exact states drawn; element-wise crossfade; labels fade with their own geometry | 7 (mid and final) |
| 8 | missing ↔ value transitions popped at half way and interpolated invented values | "no data" mark and real bar crossfade; no in-between values | 8 (mid and final) |
| 9 | absolute 1e-9 tolerances accepted points 5× outside tiny ranges; unary/power chains escaped the depth limit; steps/annotations mapped before size checks | span-relative tolerances; depth checked on every recursion; sizes checked first | 9 |
| — | found in the validation stills: charts/arrays appeared only at their first cued step (initial state barely visible) | charts and arrays appear at their own start; cues time only the steps | "found in validation stills" |

- Tests 2, 7 and 8 were run against the pre-repair drawing code and **fail** there; they pass on the repaired code.
- **Tests:** 470 JS (469 pass, 0 fail, 1 Windows symlink skip), Python 61 OK, all with installed dependencies (MathJax tests run). Legacy digests unchanged.
- **Validation films** (vulkan; agent stills only, **no owner review**), all PASS on both backends, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0 errors 0 warnings, glitch clean, −16.0 LUFS:
  | ID | Source | CPU / Three |
  |---|---|---|
  | dual04-bakery-r4 | ab693a3 | befdef54a58c6981… / f01f06ea87941d88… |
  | dual03-euclid-r4 | ab693a3 | c83a1e2346f62a26… / 2bc1a3e65bebb3ba… |
  | dual04-bread-r3 | 886e702 | 0a82848b5be0e752… / 458b8153b302d6c8… (byte-identical to r2; no chart or array, unaffected by later commits) |
  | dual03-pythagoras-r3 | 886e702 | 13e4127f387fb056… / 0ab02f9e855bde5f… (no chart or array) |
- dual04-bakery-r3 and dual03-euclid-r3 (886e702) passed all gates but showed the late-appearance defect in stills; superseded by r4.
- **Agent stills (bakery-r4):** week-1 chart on screen before the cue; mid-transition frame shows only the two real states crossfading (no in-between heights or labels); final week-2 state with "no data" on Wednesday. Euclid-r4: (48, 18) shown before the first step.

## Second repair pass (second independent audit, 2026-11-26, on PR #55)
Owner: "The independent second audit confirms that the original counterexamples have been repaired and CI passes … Before merging PR #55, perform one additional targeted repair pass … Do not expand the scope or redesign the architecture."

| # | Defect (reproduced before fixing) | Fix |
|---|---|---|
| 1 | `2^12=4096` accepted, although TeX renders an unbraced superscript as one token (2¹2); also `\sqrt{x^{9}}` was never converted (nested braces) | ambiguous superscripts (`2^12`, `2^-1`, `2^(3)`, unbraced commands) are unverifiable; nested constructs convert innermost first |
| 2 | `\sqrt{(40-digit)^{9}}` threw RangeError (float start of isqrt overflowed to Infinity) | pure-BigInt Newton integer square root |
| 3 | explicit axis [0, 1e-9] produced ticks up to 2e-9 (absolute 1e-9 tolerance) in charts.js and diagrams.js | ticks inside the range; tolerance = 1e-6 of the tick step |
| 4 | small values displayed as "0.000"; layout and rendering used different formatters | one adaptive formatter (`chartNumber`, `tickLabel`) for measurement and drawing; scientific notation outside 0.001…1e9 |
| 5 | six pie slices shared a four-colour palette | six distinct colours per theme, each ≥ 3:1 against the plate |

- **Tests:** tests/repair2.test.js (5 tests: rendered labels on intermediate and final frames, tick containment, large exact arithmetic, pie colours). Totals 475 JS (474 pass, 0 fail, 1 Windows skip), Python 61 OK, legacy digests unchanged, font metrics current.
- **Validation films** from 5a786a3 (vulkan; agent checks only, **no owner review**): dual04-bakery-r5 PASS both backends, **byte-identical to r4 on CPU and Three.js** (befdef54a58c6981… / f01f06ea87941d88…): unaffected behaviour preserved. dual03-euclid-r5 PASS both backends; CPU byte-identical to r4 (c83a1e2346f62a26…); Three 86cddfe31cf594ac… differs from r4 by GPU rasterization noise only (scene.json identical apart from its id; PSNR average 64.4 dB, minimum 56.7 dB): the vulkan route is not bit-reproducible across runs (earlier r1/r2 happened to match).

## DUAL-05 evidence (2026-11-27)
- **What:** local raster images, opt-in compose-v2 item `image` (docs/MEDIA.md). Owner rules followed: PNG, JPEG and static WebP only; no SVG, remote fetching or animated formats; **no new dependency** (Node zlib, the existing local ffmpeg and the renderer's Chromium only).
  - src/core/media.js: pure header parser shared by Node and the renderer (signatures, PNG chunks + CRCs, JPEG segments, WebP RIFF chunks), bounds (8192 px per side, 64 MB decoded per image, 32 MB per file; per film 12 images and 256 MB), APNG and animated WebP refused, EXIF orientation, fit/crop/pan-zoom maths (`imageRects`).
  - src/director/media-loader.js: library `public/media/<id>.<ext>` + `media.lock.json` (`media-lock-v1`; local data, git-ignored); safe paths (ID regex, no links, the folder must be a real folder, realpath inside); at the production boundary (Director compile and `--project` load) every image item's `source` is **overwritten** from the lock after SHA-256 and structure checks (PNG data inflated in full).
  - scripts/media-import.mjs: the only way in (`add`, `verify`, `list`); provenance (licence, source, attribution for CC-BY); immutable IDs; ffmpeg strict decode and Chromium decode with the upright size checked.
  - src/index.jsx: before frame 0 each image is fetched, SHA-256 and structure re-checked, decoded with createImageBitmap and its upright size checked; any failure cancels the render. src/visual/media-registry.js: drawing an image that was not loaded throws; only the Studio preview shows a labelled placeholder (media serving is DUAL-07).
  - Planner: picture words give `AUTHORED_VISUAL_SUGGESTED` with import advice (was `VISUAL_AID_NOT_YET_SUPPORTED`); images are never invented.
- **Measured in the renderer's browser (Chromium 158, 2026-11-27):** EXIF orientation is applied to JPEG and PNG (`eXIf`) but **ignored for WebP** → rotated WebP is refused. Damaged or truncated JPEG scan data decodes **without an error** (grey or garbage) → the import runs a strict ffmpeg decode (`-xerror -err_detect explode`), which catches it; ffmpeg does not catch damaged WebP, Chromium's createImageBitmap does.
- **Tests:** 491 JS (490 pass, 0 fail, 1 Windows symlink skip, as before), Python 61 OK, legacy digests and Director digest (7 requests 2cbf9916e65da935) unchanged, font metrics current. tests/media.test.js (16): every truncation of every format, every PNG byte flip, PNG data cut short or too long, bombs (8000×8000 in < 200 bytes), APNG/animated WebP, EXIF 1–8 (JPEG, PNG) and rotated WebP, spoofed signatures, SVG/GIF, URLs, IDs with traversal, links (file link where the OS allows; folder junction), changed bytes, missing files, forged sources overwritten at the boundary, fit/crop maths (contain never cuts, cover always fills, never stretched), pan/zoom on intermediate and final frames, per-film limits, planner hint.
- **Our own fixtures:** scripts/dual05-gallery-media.mjs draws five illustrations procedurally in the renderer's Chromium (seeded, no clock) and imports them through the real tool: lighthouse (JPEG, stored with orientation 6), harbour map (PNG, orientation 8), compass (transparent PNG), lens (WebP), storm (JPEG, orientation 3). Licence own-work. No third-party media.
- **Film** `dual05-gallery-r1` (examples/dual05-gallery.request.json; typography-v1, Merriweather, paper-v1; 4 authored image visuals incl. a lower-layer map with a transparent overlay, counters and labels), from 10d9cb1 (sourceDirty false), vulkan (RTX 4060 observed in use: 13 %, 1.3 GB), concurrency 8. Agent stills only, **no owner review**.
  | ID | Frames | CPU / Three | Gates |
  |---|---|---|---|
  | dual05-gallery-r1 | 1800 → 1273 (speech-fitted) | 03388c511e7e90d6… / f0b2611d110e8f48… | both PASS, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0 errors 0 warnings, glitch clean, −16.0 LUFS, maxCps 18.0 |
- **Owner review (2026-11-27):** "i inpsected the files produced by dual05 and i like them" (OWNER-REVIEWED; recorded separately from the agent checks).
- **Agent stills (both backends):** identical pictures, crops and timing; only the 3D backdrop behind the plates differs. Orientation correct (lighthouse and storm upright; map text reads normally, north up). Pan/zoom slow and smooth (lighthouse push-in to 1.25, map to 1.8 towards the reefs, storm pull-out). The compass overlay sits on the lower-layer map; labels and counters appear on their cues.
- **Real-tool negatives:** the import tool refused a damaged JPEG and a truncated JPEG (ffmpeg), a damaged WebP (Chromium), a rotated WebP, a JPEG named .png, an SVG named .png, an APNG, a missing file and a URL, each with a plain message; the library was unchanged. The **renderer** refused a tampered SHA-256 ("differs from its verified SHA-256") and a missing file ("missing public/media/dual05-ghost.png (HTTP 404)") and rendered the untouched scene (still at frame 500).
- c960694 (after the film) changes only the planner's diagnostic for picture words; Director project digests are unchanged.
- **Not done (recorded):** SVG, animated and remote images (owner rules); WebP with orientation metadata (refused); images in the Studio preview (placeholder until DUAL-07).

## DUAL-06 evidence, slice 1: formats (2026-11-27)
- **Split (agent decision, recorded):** DUAL-06 is done in two slices, one PR each: (1) output formats; (2) themes, audio controls and an explicit silent mode. Slice 2 starts from main after slice 1 is merged.
- **What (slice 1):** opt-in project/request field `format`: `vertical-v1` (default, absent = unchanged), `landscape-v1` 1920×1080, `square-v1` 1080×1080, all 30 fps (src/core/formats.js, docs/FORMATS.md). The 3D world is drawn in vertical-equivalent coordinates through one transform that keeps the vertical field of view (wider formats see more at the sides; nothing visible in 9:16 is cut; the Three.js camera already behaved this way). Composition regions, caption box and progress bar reflow per format; text re-wraps, never stretched. Per-format item boxes `formats:{<id>:{box}}`. Only tested combinations: cinematic-graph shots with titles "none", no overlays, no Foundry geometry, no Reels delivery; Director requests need a content mode. `produce.mjs --format`. Remotion output size per format; verify.py, compare_release.py, quality_media.py per format (scripts/formats.py mirrors the JS table, tested). aids-v1 maps plates into vertical-equivalent space; the other frame checks keep the vertical frame (stricter for wider formats).
- **Tests:** 500 JS (499 pass, 0 fail, 1 Windows skip), Python 63 OK, legacy and Director digests unchanged, font metrics current. tests/formats.test.js (9): table and Python mirror; layout safety in every format; the world transform (identity for 9:16; the whole vertical frame inside every format); vertical drawing identical with absent and explicit vertical-v1 (recorded canvas calls); landscape/square transform, caption and progress positions; refused combinations; per-format boxes and bad overrides; a too-tall authored graph refused in landscape/square and fixed by a per-format box; --format.
- **Director dry run:** every DUAL-01…05 example request plans in all three formats except two honest refusals (dual04-bread graph node labels and the dual05-gallery counter do not fit the shorter panels; explicit messages; per-format boxes fix them, tested).
- **Films** (examples/dual06-harbour.request.json = the DUAL-05 gallery content plus per-format boxes; vulkan; concurrency 8). All PASS on both backends, shared hashes exact, CHECKS 0 incl. aids-v1, QUALITY 0/0, glitch clean, −16.0 LUFS, 1273 frames:
  | ID | Format, size | Source | CPU / Three |
  |---|---|---|---|
  | dual06-harbour-v-r1 | vertical 1080×1920 | 724e905 | 03388c511e7e90d6… / 0f83bf762747b6da… |
  | dual06-harbour-l-r1 | landscape 1920×1080 | 724e905 | b3e7af0fbe47fe8f… / 413e1b828968e35d… |
  | dual06-harbour-s-r2 | square 1080×1080 | f304357 | 00c9a3289ce089ac… / c5b567e16ad9b59a… |
  - **The vertical CPU film is byte-identical to dual05-gallery-r1** (03388c511e7e90d6…): the vertical path is unchanged.
  - **Audio and captions are identical across the three formats** (mix.wav 2b1a46fd843a58b2…, timeline.json ce5b897b293c5ec1…, captions.srt 9c9806d7699af7fe…).
  - dual06-harbour-s-r1 (724e905) passed the same gates; its stills showed the square counter covering the lighthouse lamp → square box moved (f304357), r2.
- **Agent stills (both backends; no owner review yet):** landscape puts the pictures in a left panel with counters and labels beside them; square stacks them; captions re-wrap in their own boxes; pictures, crops and timing identical on CPU and Three.js (only the 3D backdrop differs).
- **Not done (recorded):** Studio format chooser and a matching preview (DUAL-07); characters read smaller in landscape/square (vertical field of view kept, no automatic re-framing).

- **Slice 1 merge record:** the first PR CI run (45966405775, head ac66658) failed 1 test: tests/formats.test.js 9 used the dual06-harbour request, whose images exist only in the local (git-ignored) media library. Fixed in 81482e1 (a request without images; the whole suite re-run locally with public/media hidden, as in CI); CI 45966855494 green, 500/500. Owner reviewed the videos ("great looks good the videos for the scope") and gave the merge word; PR #59 MERGED → main 0072c5a.

## DUAL-06 evidence, slice 2: themes, caption styles, silent soundtrack (2026-11-27)
- **What:** composition theme `contrast-v1` (black plates, ≥ 7:1, six chart colours; listed last so established messages keep their wording); `speech.captions.style` `box-v1` (default, historical) / `paper-v1` / `contrast-v1` (≥ 7:1, thicker edge); `speech.soundtrack: "silent"` (narration still sets timing and captions; delivered mix is digital silence; speech_pipeline writes zeros and skips mastering; verify.py requires exact silence; quality_media.py reports "silent (requested)", raises NOT_SILENT if sound decodes and skips SILENT_AUDIO/INAUDIBLE_DECODED_PHRASE only when silence was requested); request shortcuts `captionStyle` and `soundtrack` (src/director/index.js `withSoundOptions`). Existing audio controls (voice, pace, fit, mix gains/ducking/master, caption mode/highlight/speaker names) were already reachable through `request.speech`; Studio controls are DUAL-07. Contract: docs/THEMES_AUDIO.md.
- **Tests:** 506 JS (505 pass, 0 fail, 1 Windows skip; run with public/media hidden as in CI), Python 63 OK, legacy and Director digests unchanged, font metrics current. tests/themes.test.js (6): contrast of every theme tone and caption style (7:1 for contrast), box-v1 equals the historical colours, absent and box-v1 caption drawing identical, other styles change only colours/edge, refused unknown styles/soundtracks, shortcuts land in the project and are refused without speech, Python silent contract.
- **Films** (vulkan; agent stills only, no owner review) from 80e511c (sourceDirty false):
  | ID | Content | Frames | CPU / Three | Gates |
  |---|---|---|---|---|
  | dual06-contrast-r2 | dual04-bakery charts, contrast-v1 theme + caption style, vertical | 1486 | 77e5b23477baed40… / 1fbd32051ec1defa… | both PASS, shared hashes exact, CHECKS 0, QUALITY 0/0, glitch clean, −16.0 LUFS |
  | dual06-silent-r2 | dual02-eureka typography, landscape, paper-v1 theme + captions, silent soundtrack | 1522 | bcfd2ac2613e45a3… / 5927381e4f9274a5… | both PASS incl. "requested silent soundtrack (digital silence)", shared hashes exact, CHECKS 0, QUALITY 0 errors / 1 warning, glitch clean, decoded peak −91 dB (meter floor), −70 LUFS (meter floor) |
  - The one warning: CAPTION_READING_SPEED, one cue at 18.15 characters/s (limit 18), from the existing eureka narration; it matters more in a silent film (viewers read). Recorded, not changed.
- **Render stall (recorded):** the first attempt (dual06-contrast-r1, 80e511c) stalled at frame 90/1486 of the CPU pass for about 20 minutes with idle browser tabs; no error. Single-frame renders of the same prepared scene around the stall (frames 10, 91, 186, 200, 372, 560) all rendered in about 2 s, so it is not a drawing failure. The agent stopped its own render job (no other processes touched) and re-ran with a 3-minute stall watchdog: r2 completed normally. Cause unknown (possibly a transient headless-browser stall); watch for a repeat. dual06-silent-r1 never started.
- **Agent stills:** contrast: black plates with white edges, yellow bars, black caption box with white edge and yellow highlight; CPU and Three.js identical apart from the backdrop. Silent: landscape, paper plates and captions, readable.
- **Old renders cleared (owner choice 2026-11-27, "Superseded revisions"):** 27 superseded runs deleted from the git-ignored out/ (129 paths, about 1.7 GB; out/ 5.6 → 3.9 GB): dual01-explainer-r1–r3, dual01-mixed-r1, dual02-eureka-r1–r3, dual02-forest-r1–r2, dual03-bfs-r1, dual03-euclid-r1–r3, dual03-pythagoras-r1–r2, dual04-bakery-r1–r3, dual04-bread-r1–r2, dual06-harbour-s-r1, gen15b-sky-r1–r3, gen15-forest-r1, clean-top-r1, fixa-forest-r1. Kept: latest film per milestone, pre-campaign finals, Studio jobs, bench, speech cache, public/audio and public/media (owner did not choose those). Their hashes and findings stay in the docs.

- **Slice 2 merge and cleanup (2026-11-27):** owner asked why the silent films were silent (they demonstrate the requested silent soundtrack; every other DUAL-06 film measured −19.9 to −20.3 dB mean), then: "all good merge. after merge clean everything until the dual 06 … no need to accumulate videos all the time". PR #60 MERGED → main f062de4 (CI 45973159839 green, 506/506). Deleted from out/: every render before DUAL-06 (dual00…dual05 films, pre-campaign finals, Studio jobs, bench videos, dual05 sources and stills), dual06-contrast-r1 (stalled) and debug stills (125 entries); public/audio emptied (170 temporary soundtracks). out/ 3.9 GB → 421 MB. Kept: the DUAL-06 films (harbour v/l/s, contrast-r2, silent-r2), out/speech-cache, polish0x fixture folders, public/media (picture library). Standing rule saved: after each merged milestone, clear older renders.

## DUAL-07 evidence (2026-11-27)
- **What:** the Studio's "Make a film" now chooses **content mode** (classic, Characters + visual aids, Explainer, Typography), **format**, **theme**, **caption style**, **sound** (normal or silent) and **music** (soft, off, louder); Advanced adds the **font**, authored **visuals JSON** (data, equations, pictures) and the **picture library** list. Impossible combinations are refused in the form with the fix to make. Choices are remembered (settings v1, field-by-field checks). The Director gained the `music` shortcut. **One speech rule** (src/studio/production.js `requestSpeech`) for produce.mjs and the Studio: content-mode Studio films are now fitted to their speech and mastered like CLI films (before, the Studio path skipped this). The Studio server serves the bundled fonts and library pictures read-only by safe names (`/fonts/…`, `/media/…`) and lists the library (`/api/media`); the preview loads the film's own fonts and pictures and takes its format (360×640, 640×360, 360×360). The Claude-chat prompt names the chosen shape and, for content modes, asks for on-screen-friendly lines. docs/AUTHORING.md: how to write each kind of film, with examples (the chart example is validated by the Director).
- **Prompts:** provider prompt versions and digests unchanged (director digest 2cbf9916e65da935); content mode, visuals, format, look and sound are applied after the IR, so no new provider prompt version was needed. Offline planning stays deterministic.
- **Tests:** 513 JS (512 pass, 0 fail, 1 Windows skip; run with public/media hidden as in CI), Python 63 OK, legacy and Director digests unchanged. tests/studio07.test.js (7): form mapping and refusals, the shared speech rule equals the earlier CLI rule, music levels, server fonts/pictures/listing with 11 hostile paths refused, prompt wording, fitted length advice. Earlier Studio tests extended for the new defaults (the original defaults assertion kept unchanged on the original keys).
- **Clicked through in a headless browser** (agent; Remotion's Chromium driving a temporary Studio from the working tree on port 4191; not the owner):
  | Case | Result |
  |---|---|
  | A Typography, landscape, paper theme and captions, CPU: generate & render | film ready, downloaded (200, video/mp4, 4.3 MB), 1920×1080, preview canvas 640×360, QUALITY 0/0, mean −20.4 dB |
  | B Interview + visual aids, vertical, high contrast, Three.js (vulkan): generate & render | film ready, downloaded (200, video/mp4, 13.1 MB), 1080×1920, QUALITY 0/0, mean −19.9 dB |
  | C Explainer, square, silent: generate only | preview canvas 360×360, no load errors |
  | D Interview cast + Explainer | refused: "\"Explainer (no characters)\" cannot use a character cast: choose the cast …" |
  | E Advanced: picture library + authored image visual | library lists the five dual05 pictures; the preview draws the real lighthouse picture |
  - Findings fixed during the click-through: the cast refusal repeated itself; the Claude-chat prompt said "vertical" for square; the length advice warned of long silences for content-mode films that are fitted (case A's screenshot). The first B attempt was a harness error (it read case A's still-visible film panel); the harness now waits for a new download link; B re-run passed. B's interrupted first job folder was deleted.
- **Not done (recorded):** Advanced timeline editing of compositions item by item (visuals are edited as validated JSON); a format chooser for imported/authored projects in the Advanced inspector (format comes from the request or the project file).

## DUAL-07 audit repair (independent adversarial audit, owner 2026-11-27, on PR #61)
| # | Finding | Reproduced? | Root cause | Repair | Evidence |
|---|---|---|---|---|---|
| 1 | Classic narrator + music / caption style / silent rejected | **Yes** (Director: "request.music: needs speech settings"; the render button masked it by adding default speech, "Generate project only" failed) | the form created speech only for dialogue-without-names or content modes; classic narrator speech is built nowhere else | a classic narrator request with any of these options gets the default narrator speech (exact length, no fitting: the same speech the render button always added); dialogue and content modes unchanged | audit07 F1: 84 combinations (3 casts, 4 content modes, names on/off, 6 option sets); historical classic request still has no speech; classic targetFrames = seconds × 30 |
| 2 | Preview registry kept decoded images across projects | **Yes** (headless browser: after 5 single-picture projects the registry held 6 images) | the preview registered every loaded picture and never released or closed any | src/visual/preview-media.js owns preview pictures: keeps only the current film's, closes released and stale bitmaps, merges concurrent loads, per-film decoded budget; the registry closes what it removes | audit07 F2a–d (incl. 300 random rapid switches with delays: only the last film's pictures remain, every bitmap registered or closed, peak within budget, nothing in flight); browser stress test below |
| 3 | Preview registered images under the expected hash unverified | **Yes** (headless browser: a project claiming a forged SHA-256 got the lighthouse registered under the forged hash, no message) | the preview decoded fetched bytes and registered them by the source's claimed hash | one verification for native and preview (src/core/media.js `verifyImageBytes`, `checkDecoded`); unverified pictures are never registered; explicit diagnostics; diagnostics of replaced films ignored | audit07 F3a/F3b (forged, replaced, missing, corrupt, oversized, mis-decoded); browser: forged hash now refused with "differs from its verified SHA-256" |
| 4 | "Three.js (RTX)" label assumed hardware | **Yes** (static: studio/index.html) | hard-coded label | label "Three.js (WebGL)"; preview names its own WebGL adapter (only for Three.js films); native renders record the adapter measured for their GL route (scripts/gl-probe.mjs, Remotion's Chromium with the same gl option) in render-timing.json, else "unknown"; the finished panel states backend, GL route and adapter. Render time is measured before the probe. | audit07 F4/F4b; dual07-narrator-r2 Three: adapter "ANGLE (NVIDIA, Vulkan 1.3.289 (NVIDIA … GeForce RTX 4060 Laptop GPU …))"; probe swangle → SwiftShader; browser: finished panel B names the RTX route while the headless preview names SwiftShader |
| 5 | DUAL-08 boundary | assessment only (below) | — | — | static review of scripts/studio-server.mjs and scripts/cli.mjs |

- **An attempt that did not work (recorded):** the first finding-4 repair printed the adapter from inside the native render (console.log). Remotion relays browser warnings with empty text and does not relay console.log at the default level, so the line never reached the log; it was removed and replaced by the measured probe.
- **Tests:** 522 JS (521 pass, 0 fail, 1 Windows skip; run with public/media hidden as in CI), Python 63 OK, legacy and Director digests unchanged, font metrics current. tests/audit07.test.js (9).
- **Validation films** (vulkan; agent checks):
  | ID | Source | What it proves | CPU / Three |
  |---|---|---|---|
  | dual07-harbour-v-r1 | 006725d | the native loader refactor (shared verification) leaves output **byte-identical**: CPU equals dual05-gallery-r1 and dual06-harbour-v-r1; Three equals dual06-harbour-v-r1 | 03388c511e7e90d6… / 0f83bf762747b6da… |
  | dual07-narrator-r1 / r2 | 006725d / c29652b | the form-made classic narrator request with paper captions and music off renders on both backends (exact 900 frames; captions.style paper-v1; mix.music 0); r2 records the measured adapter; r1 and r2 are byte-identical | 189f01d09043ce31… / 3087c27c2c523303… |
  - Both PASS on both backends, shared hashes exact, QUALITY 0 errors, glitch clean. Narrator: −20.3 LUFS (classic narrator films have never used the mix-v2 master; unchanged by design); CHECKS diagnostics motion 1 (OFF_FRAME shot-2/object-2) and silence-v1 2 (exact-length classic film with a short script), not gates.
- **Clicked through in a headless browser** (agent, temporary Studio from the working tree): cases A–E all pass again; A's finished panel "rendered with CPU Canvas"; B's "rendered with Three.js (WebGL, GL route vulkan, adapter ANGLE (NVIDIA, … RTX 4060 …))"; the headless preview reports SwiftShader (preview and native identities differ and both are stated). Found and fixed: the preview line kept a Three.js adapter on CPU films.
- **Project-switching stress test** (browser, 40 switches, three of every four 150 ms apart): the registry always held exactly the current film's pictures (1 or 2); decoded picture memory followed the current film (6.9–12.2 MB, never cumulative); page JS heap 2.6 → 3.3 MB (flat). Before the repair the registry kept every picture shown. Decoded bitmaps live outside the JS heap; their size is measured from the registry.
- **Limits (recorded):** the budget bounds **registered** decoded pictures; loads already in flight for replaced films still run to completion (then their bitmaps are closed), so transient memory during very rapid switching between many large-image projects is not hard-bounded (DUAL-09 hardening item); the 300-switch unit test and the 40-switch browser test used five or six small pictures, so they show the registry lifecycle, not a process-wide memory bound (owner review 2026-11-27). The preview's verification costs one SHA-256 per picture per film switch (small library pictures: milliseconds); native GPU identity is measured just after the render with the same route, not from inside the render tabs.

## DUAL-08 boundary assessment (audit finding 5; static review, no implementation)
Current Studio job model (scripts/studio-server.mjs, scripts/cli.mjs):
- jobs live in an in-memory Map (trimmed to MAX_JOBS); a restart loses every job record; the immutable snapshot files in studio-data/jobs survive but no state file records progress;
- exclusion is one in-process `active` flag: a second Studio, a CLI `produce.mjs` or a batch runner on the same machine can render at the same time (GPU, CPU and the shared public/audio and out/speech-cache are contended);
- snapshots are written atomically (`wx` + rename) and never change: a good base for idempotent jobs;
- the runner spawns `node scripts/cli.mjs`, which spawns Remotion, Chromium tabs and ffmpeg; there is no cancel, and killing only the node child would orphan Chromium and ffmpeg (Windows has no process groups);
- cli.mjs creates out/<id> with `recursive:true` (an existing folder is reused), unlike produce.mjs, which refuses existing outputs.
Requirements for DUAL-08:
1. **Durable state transitions:** one append-only, atomically rewritten manifest per batch and per job (queued → preparing → rendering → verifying → succeeded | failed | cancelled), each transition written before the side effect it announces; terminal states immutable.
2. **Cross-process exclusion:** an exclusive lock file per output root (create with `wx`, holder PID and start time, stale-lock detection that checks the PID is gone), honoured by the Studio, produce.mjs and the batch runner.
3. **Atomic persistence and restart recovery:** on start, jobs found in a non-terminal state are marked "interrupted" with their partial folder kept (never reused); recovery re-queues them only under a new attempt folder.
4. **Process-tree cancellation:** cancel kills the whole tree (Windows `taskkill /T /F`; POSIX detached process group, then SIGTERM/SIGKILL with a timeout); verify no chrome-headless-shell or ffmpeg child remains; record "cancelled" only after the tree is gone.
5. **Partial failure recovery:** a failed job never blocks the rest of a batch; its folder and logs stay for diagnosis; per-job error summaries in the batch manifest.
6. **Idempotent resume:** a job whose verified outputs (film SHA-256 in its manifest, quality report, probe) already exist is skipped, never re-rendered; resume never overwrites a succeeded job; retries are bounded (explicit count, no automatic infinite retry).
7. **Preservation of successful outputs:** outputs are written in an attempt folder and moved into place only after verification; cleanup never touches succeeded outputs (the owner's render-cleanup rule applies after milestones, not inside a batch).
8. **Bounded resources:** one render at a time by default (or a measured bound), explicit AETHER_CONCURRENCY per job, a disk-space check before each job, bounded logs, speech-cache writes serialized by the same lock.

## DUAL-08 evidence (2026-11-27, `feature/dual-08-batch`, code e2f4831)
- **What:** `batch-v1` (docs/BATCH.md): `node scripts/batch.mjs create|run|resume|status|stop|cancel|verify`. It reuses `produce.mjs` unchanged as each job's engine.
  - Added: scripts/batch-lib.mjs (validation, snapshots, manifests, state machine, recovery, runner), scripts/render-lock.mjs (machine lock `out/.render.lock`), scripts/process-tree.mjs (tree cancel).
  - produce.mjs, cli.mjs prepare/render and each Studio job now hold the same lock. A second render is refused with the holder named (Studio: HTTP 409); children inherit it by token. No output change: dual08-narrator is byte-identical to dual07-narrator on both backends.
- **Boundary requirements 1–8, how each is met:**
  1. Per-batch and per-job manifests, rewritten atomically. Each transition is written before its step; history is append-only; terminal states are immutable (tested).
  2. Lock file with `wx`, PID, token and start time. Stale and reused-PID takeover runs under an exclusive guard; a 6-process race has exactly one winner.
  3. Restart recovery: interrupted attempts are set aside under attempts/ and the job is re-queued under a new attempt ID. Orphaned productions are ended first.
  4. Tree cancel: `taskkill /T /F` plus a Win32_Process walk on Windows, process groups on POSIX. "Cancelled" is recorded only after every member is confirmed gone.
  5. A failure never blocks later jobs; folders and logs are kept, with per-job error summaries.
  6. Succeeded jobs are never re-run. A finished production found after a restart is verified, never re-rendered. Retries are bounded (≤ 3), as are interruptions (≤ 3) and attempts (≤ 50).
  7. Outputs are verified in the attempt folders, moved into films/<job>/ and verified again. `verify` re-hashes and never renders.
  8. One render at a time; per-job AETHER_CONCURRENCY is recorded; a disk check runs before each job; logs are capped at 8 MB. Speech-cache writes are serialized by the same lock.
- **Tests:** 534 JS (533 pass, 0 fail, 1 Windows skip; also run with public/media hidden as in CI); Python 63 OK; legacy and Director digests unchanged; font metrics current.
  - tests/batch.test.js has 12 tests. They use a production double (tests/fixtures/fake-produce.mjs) that runs as real child processes with the real arguments, layout and lock inheritance.
  - Covered: 27 invalid batch definitions; snapshot immutability; illegal transitions; a mixed batch (success, retried failure, flaky recovery, film-hash lie); cancel of a hanging job with a grandchild; stop and resume; a real runner kill with the orphan ended on restart; salvage without re-render and completion of an interrupted placement; bounded interruptions; low disk; log cap; a changed snapshot; lock exclusivity, inheritance, stale/reused-PID/corrupt takeover and the race; produce.mjs, cli.mjs and the Studio refused while the lock is held; killTree.
- **Real batch `dual08-small-r1`** (examples/batches/dual08-small.batch.json; vulkan, RTX 4060, concurrency 8, source e2f4831, sourceDirty false):
  | Job | Fixture | Outcome |
  |---|---|---|
  | dual08-narrator (both, vertical) | success | PASS on both backends; CPU 189f01d09043… / Three 3087c27c2c52…, **byte-identical to dual07-narrator-r1/r2**; −20.3 LUFS (classic narrator, unchanged by design); glitch clean; CHECKS diagnostics as in DUAL-07 (motion 1 OFF_FRAME, silence-v1 2) |
  | dual08-missing (cpu) | real failure | failed after 2 attempts (retries 1): "dual08-not-in-library is not in the media library"; both attempts kept in attempts/ |
  | dual08-cancel (three) | cancel mid-render | `batch.mjs cancel --job` while frames rendered. An independent snapshot showed a 17-process tree (12 chrome-headless-shell, 1 ffmpeg, 2 node, 2 conhost); **0 alive afterwards**. The runner then started the next job. |
  | dual08-square (both, square-v1) | restart recovery | the runner was killed (Stop-Process) mid-render; the next run recorded attempt 1 as interrupted and attempt 2 passed every gate: 1273 frames, comparison PASS with shared hashes exact, QUALITY 0/0, CHECKS 0, −16.0 LUFS, glitch clean; CPU 00c9a3289ce089ac… / Three c5b567e16ad9b59a…; Three adapter "ANGLE (NVIDIA, Vulkan 1.3.289 (… RTX 4060 …))" |
  - `verify`: both succeeded jobs OK; the lock was released after the run.
  - **Observed on Windows:** killing only the runner also ended its 18-process render tree, because libuv puts non-detached children in a kill-on-close job object. It left a stale lock and a "rendering" job, which recovery handled. The orphan-kill path (POSIX, detached processes) is covered by the tests.
  - Agent stills of the square pair (frames 120, 420, 760, 1150): pictures framed whole in 1:1, captions inside the frame, the same content on both backends. **No owner review.**
- **Limits (recorded):** one render at a time (no parallel mode); a cancelled or stopped pair re-renders both backends; the Studio honours the lock but does not list batches and is not restart-recovered (CLI-first); PID-reuse detection needs PowerShell (Windows) or `ps -o etimes` (Linux); the runner's own kill count (7) differs from the independent snapshot (17) because Chromium tabs come and go. The proof is the snapshot: 0 alive.
- **Changed after the films (printout only):** `verify` says "no film (failed|cancelled)" instead of "not finished".

## DUAL-08 repair pass (owner 2026-11-27: "do a repair pass on dual -08 code before merging")
Adversarial review of the DUAL-08 code at d5b099f. Each defect has a test in tests/batch-repair.test.js. Ten of those tests failed on d5b099f. R10 and R11 were found by reading the code and need a test hook to show; their tests were added with the fixes. R13 changes no behaviour.
| # | Defect | Reproduced | Repair |
|---|---|---|---|
| R1 | batch.json fields (input path, output suffixes, backend, format) trusted on load | yes: tampered values loaded | every field checked against what the code writes; "Corrupt batch manifest" |
| R2 | job manifests trusted: recovery renamed whatever folder an attempt named | yes: an out/ folder outside the batch was accepted for moving | attempt IDs, folders, logs and outputs checked; "Corrupt job manifest"; nothing moved |
| R3 | after a cancel that could not stop the tree, late child output crashed the runner | yes: EBADF uncaught | the log ignores writes after close |
| R4 | orphan identity used a 2 s window around the attempt time; a slow spawn hid a live orphan | yes: the orphan survived recovery | start time measured at spawn; the PID is saved first, then the start time (the first version saved both after the ~1 s measurement, which widened the window with no PID; found by the test and corrected) |
| R5 | requests were read only while a job ran: a stop between jobs was lost, or killed the next job | yes: the next job ran | requests read before every attempt |
| R6 | reserved names and node_modules/.git compared case-sensitively | yes: NODE_MODULES, CON.json accepted | compared in lower case |
| R7 | disk space that could not be measured crashed the runner and left the batch "running" | yes | the batch stops with the reason (fail closed) |
| R8 | at the history limit the entry was added before the error | yes | checked first |
| R9 | a half-created batch folder was reported as "already exists" | yes | named as incomplete |
| R10 | an attempt ID whose folders already existed became a production failure | by reading (produce.mjs refuses existing outputs) | a new tag is drawn (at most 20 draws) |
| R11 | Windows tree kill reported "gone" when the process table could not be read | by reading | fail closed: "unknown descendants" |
| R12 | a takeover guard still being written was treated as stale and deleted | yes | respected while fresh (10 s), as for the lock |
| R13 | films hashed by reading the whole file | by reading | 1 MB chunks |
- **Tests:** 546 JS (545 pass, 0 fail, 1 Windows skip; run with public/media hidden), Python 63 OK, digests unchanged. The batch tests passed three times in a row; no test process was left running.
- **Pre-repair evidence still valid:** dual08-small-r1 loads under the new manifest checks; `verify` OK.
- **Real smoke run `dual08-repair-r1`** (examples/batches/dual08-repair.batch.json; source 724727e, clean):
  - the CPU narrator film is PASS and **byte-identical to dual07-narrator** (189f01d09043ce31…), QUALITY pass 0/0, with PID and start time recorded;
  - the missing-picture job failed once (retries 0) with the library message;
  - verify OK, lock released.
- **Not changed:** product rendering code; produce.mjs, cli.mjs and Studio behaviour (lock only, as before).

## DUAL-09 evidence (2026-11-27, `feature/dual-09-qualification`)
Full release notes, capability matrix, film table, performance, limitations, environments, licence inventory, security review and evidence index: [docs/RELEASE_1_2.md](../RELEASE_1_2.md). Summary:
- **Preview hardening (owner review item):** src/visual/preview-media.js bounds what is in flight (2 concurrent fetch/verify/decode slots; obsolete fetches aborted; waiting obsolete loads never start; obsolete loads never decoded; `previewMemoryBound()` 448 MB). tests/dual09-preview.test.js H1–H7 fail on the DUAL-07 loader. Real Chromium (scripts/preview-memory-bench.mjs, 24 × 64 MB pictures, 96 switches, 2 rounds): peak browser memory above idle +1221/+1372 MB before, +676/+596 MB after; measurement, not a hard process cap.
- **Baselines:** 554 JS (0 fail, 1 Windows skip), Python 63 OK, legacy digests identical to DUAL-00 (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 2cbf9916e65da935), fonts current. Clean install (fresh clone fee87d8, `npm ci`, fresh venv): 554 JS / Python 63 OK.
- **Matrix** (vulkan, concurrency 8): `dual09-matrix-r2` + `dual09-final-r1`: dialogue, narrator, mixed, typography, maths, charts, pictures, a 235.7 s explainer; vertical, landscape and square; 30/60/90 s; every pair PASS with shared hashes exact and quality 0 errors. reg-narrator07 byte-identical to DUAL-07 on both backends; reg-harbour06 CPU byte-identical to DUAL-06, shared audio/timeline/captions identical.
  - `dual09-matrix-r1`: render environment variables not set; every job failed fast (2 tries each, 26 s); kept.
  - The session window closed mid-matrix; `resume` recovered the interrupted attempt and kept 7 finished pairs (real restart recovery).
- **Found and fixed** (reproduced by failing tests first): (1) the batch refused a passing long production (504 KB quality report > 256 KB request limit) and re-rendered it → production reports read with their own 32 MB bound (0aa339b); (2) the planner drew lists with the first item missing ("tomatoes", "rain") → no list unless the first item is unambiguous (fee87d8; 77 example plans compared, only the two new fixtures change); (3) charts fixture pie legend repeated the percentage (fixture). Films dual09-long-r1 and dual09-charts-r1 carry defect (2) and are superseded by dual09-final-r1.
- **Determinism finding:** Three.js on the RTX route is not byte-stable run to run (3 renders, 3 hashes; 60 dB average PSNR, worst frame 51.5 dB). CPU Canvas (3 runs, 1 hash = recorded) and Three.js swangle (3 runs, 1 hash) are byte-stable. Recorded as a known limitation; owner to accept or make it a gate.
- **Performance** (reg-harbour06, 1273 frames): CPU 28.5 fps (46.9 s cold, 44.4–46.7 s warm); Three vulkan 44.3 fps, 1.59 GB peak GPU memory; Three swangle 3.4 fps; ~2.4–3.3 GB extra RAM.
- **Agent inspection:** four stills per film on both backends, plus the two repaired list moments; **owner review pending**. Security, licence inventory and troubleshooting: RELEASE_1_2.md (GPL-3.0 parts in the speech chain, Remotion company-size licence, no project licence; no redistribution claims).
- **Owner review changes (2026-11-27, after the films; no re-render by the owner's decision: "the films are quite good as they are … we can fix anything in cpu in later stages"):** (1) CPU crafted painter keeps a person's eyes, brows, nose and mouth in front of the head (`CRAFTED.detailBias` 0.10; owner: "one eye visible and one invisible"; 5b104a9; tests/dual09-human-eyes.test.js); (2) no light beams in new Director films (optional `fidelity.lightShafts`, Director writes 0; owner: "those lights should be removed"; Director digest 2cbf9916e65da935 → 8a0ad025b6c9f6d6, graph/geometry/detail2 unchanged; native stills before/after on both backends; tests/dual09-light-shafts.test.js). 560 JS (0 fail, 1 skip), Python 63 OK. The qualification films predate both changes.

## Remaining work plan (DUAL-05 … DUAL-09)
Written at the DUAL-04 close (main e520e4a). Each milestone follows the FOD loop in HANDOFF.md: one branch from main, tests including adversarial ones, fresh `dual<NN>-…` matched films, a checkpoint, a PR, and a merge only on the owner's word. Reuse first: extend the existing seams named here; no duplicate engines.

### DUAL-05: local media and illustration (MERGED #57; the plan below was followed, see "DUAL-05 evidence")
- **Owner rules (binding):**
  - raster only: PNG, JPEG and **static** WebP;
  - no external SVG, no remote fetching, no animated formats, no new dependencies without approval;
  - file signature verification, bounded dimensions and decoded memory, safe paths, content hashing, provenance, correct orientation, deterministic fit/crop.
- **Reuse:** the import quarantine and provenance ideas (src/foundry/import-bundle.js, scripts/import-sources.mjs, scripts/import-png.mjs `decodePNG`); the font loader pattern (src/visual/fonts.js plus src/index.jsx: load before frame 0, fail the render on error); compose-v2 items and `request.visuals`.
- **Design sketch:**
  1. **Media folder:** `public/media/<id>.<ext>`, with `public/media/media.lock.json` holding per-file id, sha256, format, width, height, orientation, licence, attribution and source. The lock is the only way an image gets in.
  2. **Node-side header parser (no dependency):**
     - signatures: PNG 89 50 4E 47; JPEG FF D8 FF; WebP RIFF….WEBP;
     - dimensions: PNG IHDR, JPEG SOFn, WebP VP8 / VP8L / VP8X;
     - **reject animation:** PNG `acTL` (APNG), WebP VP8X animation flag / `ANIM` / `ANMF`, multi-frame;
     - read EXIF orientation (JPEG APP1, WebP EXIF chunk);
     - bounds: each side ≤ 8192, decoded RGBA ≤ 64 MB;
     - reject truncated or malformed headers.
  3. **Safe paths:** project-relative ids only; reject `..`, absolute paths, drive letters, NUL and backslashes; resolve real paths and refuse symlinks or anything escaping `public/media`.
  4. **compose-v2 item `image`:** `{id, type:'image', box, media:'<id>', fit:'contain'|'cover', crop?:[x,y,w,h] normalised, focus?:[x,y], move?:{from:{x,y,zoom}, to:{x,y,zoom}} (bounded pan/zoom), alt (required text), caption?, start/phrase/cue}`. The layout computes the exact source rectangle → destination rectangle (deterministic, orientation applied first). Layers follow item order.
  5. **Rendering:** load the used images before frame 0 (like fonts) with `createImageBitmap(blob, {imageOrientation:'none'})`, apply the parsed orientation ourselves, and draw with drawImage on the shared 2D path, so both backends are identical. A failed decode fails the render.
  6. **Validation of the request:** the media id must be in the lock and the file's sha256 must match at the production boundary (Node). Missing, corrupt or hostile files are explicit errors.
  7. **Planner:** keep `VISUAL_AID_NOT_YET_SUPPORTED` for image words unless the request supplies authored visuals; never invent images.
- **Tests:** signature spoofing (a .png containing JPEG bytes); truncated files; zero or huge dimensions; decompression-bomb sizes; APNG; animated WebP; EXIF orientations 1–8; traversal, symlinks, absolute and backslash paths; a sha mismatch; a missing file; crop and fit maths; pan/zoom bounds; mid-move frames.
- **Fixtures:** create original test images with a deterministic script (e.g. procedural PNG/JPEG/WebP written by our own code, or rendered frames from our own films). Record licence "own work" in the lock. No third-party media.
- **Exit:** a narrated illustration/history-style film (e.g. `dual05-gallery`) whose images have the same identity, crop and timing on both backends; corrupt, missing and hostile imports fail clearly.
- **Owner check if needed:** JPEG and WebP decode in Chromium without any dependency; if a Node-side pixel decode turns out to be needed, ask first.

### DUAL-06: formats, themes and audio controls
- **Formats:** keep 1080×1920 at 30 fps as the default. Add opt-in presets 1920×1080 (landscape) and 1080×1080 (square).
  - Today everything assumes a 720×1280 logical canvas: draw-graph.js, draw-film.js, overlays, captions, src/core/reels-layout.js, composition regions, the camera aspect in three-backend.js, and the quality checks' 720×1280 frames.
  - Introduce a versioned format descriptor (logical width and height, safe area, caption box, regions) and **reflow** layouts. Never stretch or crop.
  - Only tested combinations are valid; invalid presets are rejected.
- **Themes:** versioned visual themes (colours, typography, backgrounds, caption style, contrast) built on the existing `THEMES` (aether-v1, paper-v1) and environments. Established defaults are retained.
- **Audio:** expose existing controls that aren't in the Studio yet: speech `mix` (music, ambience, sfx, duck), voice, pace, caption mode and highlight. Add an explicit **mute/silent** mode that is reported as silent, never disguised as a speech failure.
- **Exit:** the same authored content in all three aspect ratios on both backends; safe-area checks; sampled visual review; valid media probes; audio and caption semantics; invalid presets rejected.
- **Owner decisions:** promoting any preset or theme to a default.

### DUAL-07: universal Director and Studio integration
- **Director:** select content mode, visuals, theme and format from validated capabilities. Keep pasted plain scripts, auto-clean, length advice and dialogue behaviour, and optional remote adapters (never mandatory). Prompts stay compact and versioned; old prompt digests are preserved.
- **Studio:**
  - Simple UI: topic, cast/content mode (dialogue, narrator, explainer, mixed, typography), duration, format, backend, theme, font, script, essential audio, generate/render.
  - Advanced UI: timeline, plus data, equation and media editing (the visuals JSON with validation messages), and asset browsing.
  - Reuse the job queue, progress bar, finished panel, downloads and Reels cover.
  - **Known gap to close:** the Studio server does not serve `public/fonts` (or the future media), so its preview shows substitute fonts. Serve them read-only with safe paths, and load them in the preview.
- **Docs:** an authoring guide with example scripts for each content mode (update STUDIO_GUIDE.md and docs/SCRIPT_FORMAT.md).
- **Exit:**
  - the agent clicks through representative modes in a headless browser (say "clicked through in a headless browser", never that the owner did);
  - at least one render and download on each backend;
  - actionable validation errors;
  - no source changes per video;
  - no UI regressions.

### DUAL-08: optional bounded batch production (**owner decides first**)
- Ask the owner: before the freeze, or deferred?
- **If doing it:**
  - a local queue of validated requests or projects, with explicit backend, preset and output root, unique IDs and per-job manifests;
  - sequential or measured bounded concurrency; persistent minimal job state; cancel and resume; restart recovery;
  - failures reported per job; never silently re-render accepted outputs or retry indefinitely;
  - no SaaS, scheduling or posting.
- **If deferred:** document it as a future shared service.
- **Exit:** mixed success, failure and cancel fixtures, restart recovery, no lost outputs, bounded resources.

### DUAL-09: final qualification and release (proposed tag `v1.2-dual-backend-final`)
- **Hardening item from the DUAL-07 audit review (owner 2026-11-27; not a reopening of the repair):** Studio preview picture loading must also bound what is *in flight*: a limit on concurrent fetch/decode operations, cancellation of obsolete fetches when the film changes (AbortController; decodes of replaced films skipped where possible), and a measured peak **process** memory (not only the registry and JS heap) under rapid switching between many projects with large, distinct pictures near the per-image and per-film limits.
- **Consolidate and test:** merged branches only; all routine JS and Python tests and negative suites; compare legacy compatibility and digests against DUAL-00.
- **New versioned qualification matrix** (`campaign-a-protocol-v1` final matrix; no Cartesian product):
  - one fresh fixture each for dialogue, narrator-only, mixed, typography, maths/algorithm, charts/diagrams and image-based content, on both backends;
  - all three aspect ratios, 30, 60 and 90 s, and one project near 300 s;
  - selected accepted historical examples;
  - frozen AF09 untouched; the full historical CI render only on the owner's word.
- **Verify:**
  - shared scene, timeline, audio and caption identity for matched pairs;
  - probes: frame count, dimensions, fps, codecs, duration, audio decode, glitch frames, clipping, caption sync;
  - cold and warm timing, peak RAM and VRAM on repeatable fixtures;
  - the actual WebGL route (no silent software substitution).
- **Review:** security boundaries (local server, imports, paths, render snapshots, logs, cancellation); a dependency, model and licence inventory (MathJax Apache-2.0, OFL fonts, Kokoro, Remotion licence terms); setup and launcher docs; troubleshooting; recovery.
- **Deliver:** release notes, final capability matrix, evidence index, known limitations, user guide and a clean continuity handoff. A clean-install test where available, separating verified from unverified OS/GPU combinations.
- **Exit:** the owner reviews representative final films and accepts the known limitations; the required gates pass. **The owner approves the merge and tag; tag the exact accepted commit; no automatic release publication.**
- **After the tag:** Campaign B (GPU-only graphics) may start only with the owner's explicit authorization to revise docs/DUAL_BACKEND_POLICY.md.

## Decisions the owner must make (ask when the milestone reaches them, not before)
- DUAL-02: fonts: **decided** (bundle the four open families).
- DUAL-03: maths typesetter: **decided** (MathJax 4.1.3, Node-only).
- DUAL-05: **decided** (owner 2026-11-26): raster-only local imports, PNG, JPEG and static WebP. No external SVG, remote fetching, animated formats or new dependencies without approval. Require file signature verification, bounded dimensions and decoded memory, safe paths, content hashing, provenance, correct orientation and deterministic fit/crop.
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
- 2026-11-26: DUAL-02 MERGED (PR #52 → main 17ebecd, PR CI 45865359538 passed) on the owner's word.
- 2026-11-26: DUAL-03 tested and rendered on `feature/dual-03-maths` (74e8b9c): pythagoras-r2, euclid-r2, bfs-r2 all gates PASS on both backends; PR open, not merged. DUAL-04 next.
- 2026-11-26: PR #53 CI run 45876257187 FAILED (34 tests): the CI test job runs npm test without npm install and the Director imported MathJax at load time. Fixed in 86d1af4: src/director/math-loader.js loads MathJax only when installed and needed; films without equations never need it; uncompiled equations without it fail with "run npm install". CI run 45876723838 PASSED: 454 tests, 449 pass, 5 skipped (the MathJax tests, reason stated), 0 fail. Locally all 454 run (453 pass, 1 Windows symlink skip). Adding npm ci to the CI test job is a workflow change for the owner to decide.
- 2026-11-26: DUAL-03 MERGED (PR #53 → main 1b1543b) on the owner's word ("merge and yes"); npm ci in the CI test job approved ("yes") and verified on `feature/ci-npm-ci` (PR #54, CI 45879799972: 454/454, 0 skipped), not merged.
- 2026-11-26: Owner: "continue" (not a merge word for #54, which stays open). DUAL-04 tested and rendered on `feature/dual-04-charts` (215c2e1): bakery-r2 and bread-r2 all gates PASS on both backends; PR open, not merged. DUAL-05 next.
- 2026-11-26: Owner: "Merge PR #54 … Do not merge PR #55 yet … dedicated repair pass". PR #54 MERGED (main 5145f50). Main merged into feature/dual-04-charts (b8f17a1). Repair pass 886e702, appearance fix 78df15d/ab693a3; 470 tests (469 pass, 1 skip); validation films bakery-r4, euclid-r4, bread-r3, pythagoras-r3 all PASS on both backends. Merge approval for #55 requested. DUAL-05 rules recorded (raster only).
- 2026-11-26: Owner (second audit): one more targeted repair pass before merging #55. Done in 5a786a3: TeX superscript semantics, BigInt isqrt, tick containment, adaptive formatter, six pie colours; 475 tests (474 pass, 1 skip); bakery-r5 byte-identical to r4, euclid-r5 PASS. Merge approval requested again.
- 2026-11-26: Owner: "Approved. Merge PR #55 after confirming that CI is green on the current head 9959720. The third independent audit successfully verified the targeted arithmetic, numerical range, formatting and palette repairs. Record DUAL-04 and both repair passes as complete." CI confirmed green on 9959720 (run 45889745389, 475/475, 0 skipped); PR #55 MERGED → main e520e4a. **DUAL-04 and both repair passes COMPLETE.** Handoff for DUAL-05…09 written (chore/fod-handoff-dual05-09). DUAL-05 next.
- 2026-11-27: Owner: "fod continue". DUAL-05 implemented, tested and rendered on `feature/dual-05-media` (10d9cb1, c960694; PR #57 open, not merged): local PNG/JPEG/static WebP library with import checks, boundary and render-time verification, compose-v2 `image` item; dual05-gallery-r1 PASS on both backends. Continuity docs of PR #56 (still open, docs only) carried into this branch as the base. Next: owner review and merge word for #57, then DUAL-06.
- 2026-11-27: Owner: "merge pr 57 and close pr 56 as superseded". CI confirmed green on 90eed63 (run 45961923535, 491/491, 0 skipped); PR #57 MERGED → main aacfac6. PR #56 closed as superseded. **DUAL-05 MERGED.** Next: DUAL-06.
- 2026-11-27: owner review 2026-11-27: "i inpsected the files produced by dual05 and i like them". Owner: "merge" (PR #58, docs record). DUAL-05 OWNER-REVIEWED.
- 2026-11-27: Owner: "fod continue". DUAL-06 slice 1 (formats) implemented, tested and rendered on `feature/dual-06-formats` (724e905, f304357): dual06-harbour in vertical, landscape and square PASS on both backends; vertical byte-identical to dual05-gallery-r1. PR open, not merged. Next: owner merge word, then slice 2 (themes, audio, silent mode).
- 2026-11-27: Owner: "great looks good the videos for the scope. now merge and proceed to slice 2. but we also need to clear old renders too". PR #59 MERGED → 0072c5a (CI 45966855494 green). Owner chose "Superseded revisions" for cleanup: 27 runs deleted. DUAL-06 slice 2 implemented, tested and rendered (80e511c): dual06-contrast-r2 and dual06-silent-r2 PASS on both backends (r1 contrast render stalled, re-run). PR open, not merged. Next: owner merge word, then DUAL-07.
- 2026-11-27: Owner: "all good merge. after merge clean everything until the dual 06 and continue". PR #60 MERGED → f062de4; renders before DUAL-06 cleared. DUAL-07 implemented, tested and clicked through in a headless browser on `feature/dual-07-studio` (d9f8d8f, e38b33f, dc618e3): Studio renders and downloads on CPU and Three.js. PR open, not merged. Next: owner merge word; then DUAL-08 (owner decides: now or deferred).
- 2026-11-27: Owner (UI choices): PR #61 "Not yet" (the owner tries the Studio first); DUAL-08 "Build it now" (before the v1.2 freeze). DUAL-08 starts from main only after #61 is merged (branches are never stacked).
- 2026-11-27: Owner sent an independent adversarial audit of PR #61 ("before doing anything"). Findings 1–4 reproduced (narrator audio options; preview registry retention; unverified preview registration; RTX label) and repaired on `feature/dual-07-studio` (006725d, c29652b + follow-ups); finding 5 assessed (DUAL-08 boundary requirements recorded, nothing implemented). Validation films dual07-harbour-v-r1 (byte-identical to earlier films) and dual07-narrator-r1/r2 PASS on both backends; click-through and a 40-switch stress test passed. PR #61 updated, not merged; DUAL-08 not started.
- 2026-11-27: Owner review of the audit repair: the 256 MB budget bounds registered pictures, not outstanding fetch/decode work; transient memory under very rapid switching between many large-image projects is not hard-bounded, and the tests used few small pictures. Recorded as a DUAL-09 hardening item (bounded concurrent decoding, cancellation of obsolete fetches, measured peak process memory); the repair campaign is not reopened.
- 2026-11-27: Owner asked for a better-formatted "Make a film" panel (done on PR #61, 14a4a9a: four sections, no overflow, sticky actions), then: "merge and also give a new fod continue handoff … i want to start fresh". PR #61 MERGED → 0e83826 (CI green on 14a4a9a). Renders older than DUAL-07 cleared (32 entries, 14 temporary soundtracks; out/ 634 → 266 MB). **DUAL-07 COMPLETE.** Fresh handoff written for DUAL-08 (chore/fod-handoff-dual08).
- 2026-11-27: Owner: "fod continue" (handoff PR #62 already merged, main 79e4396). DUAL-08 implemented and tested on `feature/dual-08-batch` (e2f4831): batch-v1 CLI, machine render lock (produce, cli, Studio, batch), tree cancel, restart recovery; 534 JS tests (0 fail). Real batch dual08-small-r1 on vulkan: success (byte-identical to DUAL-07), real failure with bounded retry, real mid-render cancel (17-process tree, 0 left), real runner kill then resume (interrupted, re-run, PASS). PR open, not merged. Next: owner merge word, then DUAL-09.
- 2026-11-27: PR #63 CI first failed on Linux (532/534: POSIX kill counts) → fixed (d5b099f), CI 45996579348 green 534/534. Owner: "do a repair pass on dual -08 code before merging". Repair pass R1–R13 on `feature/dual-08-batch` (724727e): reproduced, repaired, 546 tests (0 fail); real smoke batch dual08-repair-r1 byte-identical CPU narrator. PR #63 updated, not merged.
- 2026-11-27: Owner: "merge and continue". PR #63 (DUAL-08) merged → main 527df34; renders older than DUAL-08 cleared (179 MB). DUAL-09 started on `feature/dual-09-qualification`.
- 2026-11-27: DUAL-09 TESTED + RENDERED: preview in-flight hardening, qualification matrix (dual09-matrix-r2 + dual09-final-r1), two defects found and fixed (batch report size, incomplete lists), GPU-route determinism measured, release notes docs/RELEASE_1_2.md. PR opened; merge and tag only on the owner's word after review.
- 2026-11-27: Owner review of DUAL-09 films: CPU far eye on turned heads repaired; light beams removed from new Director films (Director digest recorded). No re-render (owner).
- 2026-11-27: Owner: "merge and finilize". PR #64 (DUAL-09) merged → main 79f76d7 (CI 46033308643 green on 7cabbf6). Renders older than DUAL-09 and superseded DUAL-09 batches cleared (1,465 MB); kept out/batches/dual09-matrix-r2, dual09-final-r1, out/bench/d09-*, out/dual09-preview-mem/result.json. Campaign A milestones DUAL-00…09 all merged; the tag `v1.2-dual-backend-final` waits for the owner's word.
