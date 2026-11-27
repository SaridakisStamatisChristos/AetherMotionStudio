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
| DUAL-03 | Mathematics, geometry and algorithm visualization | **TESTED + RENDERED** (PR open, not merged) | `feature/dual-03-maths` | [docs/MATHS.md](../MATHS.md), "DUAL-03 evidence" below |
| DUAL-04 | Charts, diagrams and data storytelling | **COMPLETE: MERGED** (PR #55 → e520e4a, owner: "Approved. Merge PR #55"; two repair passes; third independent audit verified the repairs) | `feature/dual-04-charts` | [docs/CHARTS.md](../CHARTS.md), "DUAL-04 evidence" below |
| DUAL-05 | Local media and illustration integration | **TESTED + RENDERED** (PR #57 open, not merged; owner review pending) | `feature/dual-05-media` | [docs/MEDIA.md](../MEDIA.md), "DUAL-05 evidence" below |
| DUAL-06 | Formats, themes and audio controls | **NEXT** (after #57 is merged) | — | — |
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
- **Agent stills (both backends):** identical pictures, crops and timing; only the 3D backdrop behind the plates differs. Orientation correct (lighthouse and storm upright; map text reads normally, north up). Pan/zoom slow and smooth (lighthouse push-in to 1.25, map to 1.8 towards the reefs, storm pull-out). The compass overlay sits on the lower-layer map; labels and counters appear on their cues.
- **Real-tool negatives:** the import tool refused a damaged JPEG and a truncated JPEG (ffmpeg), a damaged WebP (Chromium), a rotated WebP, a JPEG named .png, an SVG named .png, an APNG, a missing file and a URL, each with a plain message; the library was unchanged. The **renderer** refused a tampered SHA-256 ("differs from its verified SHA-256") and a missing file ("missing public/media/dual05-ghost.png (HTTP 404)") and rendered the untouched scene (still at frame 500).
- c960694 (after the film) changes only the planner's diagnostic for picture words; Director project digests are unchanged.
- **Not done (recorded):** SVG, animated and remote images (owner rules); WebP with orientation metadata (refused); images in the Studio preview (placeholder until DUAL-07).

## Remaining work plan (DUAL-05 … DUAL-09)
Written at the DUAL-04 close (main e520e4a). Each milestone follows the FOD loop in HANDOFF.md: one branch from main, tests including adversarial ones, fresh `dual<NN>-…` matched films, a checkpoint, a PR, and a merge only on the owner's word. Reuse first: extend the existing seams named here; no duplicate engines.

### DUAL-05: local media and illustration (TESTED + RENDERED on PR #57; the plan below was followed, see "DUAL-05 evidence")
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
