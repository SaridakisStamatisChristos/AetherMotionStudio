# v0.8 quality evaluation and bounded repair (candidate)

## Scope and commands
- npm run quality -- examples/quality-cpu-polished.json [--repair] prints diagnostics and proposed project, never overwrites input.
- npm run render -- examples/quality-cpu-polished.json --quality --repair runs measured audio compilation, preflight, explicitly authorized camera repair, one native Remotion render, existing verify.py and read-only decoded-media audit. --quality without --repair is inspection-only. --prepare also supports preflight without video.
- npm run director -- --request REQUEST.json --render --quality --repair applies identical optional quality layer to Director output.
- All earlier inputs and rendering paths remain unchanged without the flags. No external inference or new dependency.

## Preflight
Nine deterministic normalized progress samples per graph shot. Actual procedural box corners, attachment/assembly transforms and shared projection; measured speech-envelope resampling when timeline available. Reports nonfinite/near-plane geometry, empty geometry, viewport crop, protected title/caption region risk, small subject and low projected center motion. Safe region is a heuristic (x=24..696, y=310..1040 in 720x1280 logical space). Does not infer occlusion, renderer-specific visibility or intent. Duplicate headings and exact normalized narration phrases advisory; no semantic factual verification. Legacy v1 is contract-only before native decode.

Opt-in camera search: at most 20 candidate evaluations default, one pass (bounded API maximum 40 and two). Five camera-only proposals per problematic shot. Validate project and measured timeline at each proposal, reject increased near-plane/nonfinite/crop/small-subject risk, strictly improve lexicographic geometry objectives. Do not rewrite asset identities, narration, timings, backend, effects, layers, user script, captions or audio. Protected non-camera digest invariant, original project and before/after observations, exact accepted patches and rejected candidates recorded. Intentional camera crops may be legitimate: review first or omit --repair. No claim global optimum. Preflight repair reuses compiled audio and avoids additional native renders. Selective native scene rerender not implemented because current Remotion composition and audio are integrated; changed shot IDs recorded for later editor/cache work. Post-render findings are advisory proposals or blocking errors; no automatic second render in development campaign.

## Native media evaluation
Existing verification performs exact frame count, H.264/AAC, full decode, narration sample checks. Additional audit decodes every fifth frame (6 fps) to RGB 180x320, groups by shot, excludes transition frames plus guard. Flags sustained nearly black or flat frames, low central-geometry motion and large near-white regions; thresholds are diagnostic proxies, not artistic scores. Contact sheet is assembled from one decoded midpoint per shot, no second render. Audio independently decodes AAC to mono 48kHz PCM and checks sample count tolerance, RMS, saturation and within-phrase low-energy intervals; not LUFS, true peak, or intelligibility. Subtitle independent parser checks order, intervals and exact decoded payload against canonical cue plan; reports reading rate and short cues; actual word timestamps still estimated. Caption-speed findings remain unresolved if fixing them would require changing binding narration or phrase timing. Report includes hashes, sampled observations, error/warning/review findings, actual render seconds and bytes, human review checklist. Structural/media blocking failures fail run; warnings do not certify artistic quality.

## Evaluation and acceptance
Predecessor v0.7 run 45361307457 verified native 60s video, subtitle exports and 5 reading-speed outliers. New independent scripted topic How a Forest Grows has five shots, mixed fixed/automatic 50s timeline, deliberately problematic but contract-valid camera on shot 3, and matched CPU/Three.js fixtures. Tests explicitly challenge cropping across human/technology, transport, science and nature groups, malformed inputs, no-repair identity, deterministic repair, budgets, protected-content preservation and matched graph state. These predeclared structural challenge cases are not a sealed model benchmark. Python tests exercise transition exclusion, sustained run detection and independent subtitle parsing. Native CPU acceptance requires a real MP4, quality report and contact sheet; human visual review remains required. Full native Three.js and prior-fixture head-to-head deferred. No automatic merge.

## POLISH-02 composition gate composition-v1 (2026-11-25)
- `compositionGate(shot)` in src/quality/composition.js applies policy `composition-v1` and returns bounded warnings (at most 16, with a `truncated` flag). It flags:
  - any back-to-camera samples;
  - pairwise overlap with a mean above 0.40 or a peak above 0.85;
  - a subject whose mean height is outside 0.08–1.1 of the safe area.
- Bounds are regression ceilings taken from the accepted fixtures (highest observed: mean overlap 0.37, peak 0.80). They are not an aesthetic verdict.
- It is separate from preflight, so historical quality reports and repair behaviour are unchanged. tests/polish-02.test.js runs it on every cinematic shot of every example on both backends (≥150 shots), plus negatives.

## GEN-01 motion-speed-v1 and visibility-v1 (2026-11-25)
Two checks run automatically on every production (`quality-checks.json` in each output, a `CHECKS:` log line, and `production.json` `checks`). They also run in Studio Inspect on drafts, with line timing marked `estimated`. They are diagnostic and versioned, and kept separate from preflight so historical reports and digests are unchanged. Source: src/quality/motion-check.js.
- **motion-speed-v1** measures peak frame-to-frame speed per character over every frame:
  - it measures body turn (yaw), nod and head tilt;
  - TALK-02 listener turns, TALK-03 body language and `aim.phrase` windows are applied from the measured timeline;
  - warnings: `FAST_TURN` above 120°/s, `FAST_NOD` above 35°/s, `FAST_TILT` above 10°/s.
  - It turns the scratch measurement of TALK-03/05 into a check. The talk05 r2 shelf turn (224°/s) would have been flagged automatically.
- **visibility-v1** measures how much of each asset's projected box is covered by boxes of assets nearer the camera (12×12 grid, depth margin 0.15 m, attachment parent/child pairs excluded).
  - Warning: `HIDDEN_ASSET` when the mean coverage is above 0.85.
  - Box-based, so it over-estimates coverage for thin shapes; it is a screening check.
  - Calibration: hidden objects measure 1.0 (talk04 r1 set pieces; the TALK-02/03/05 tables). The worst ordinary case is about 0.70 (overlapping shoulders in line-ups).
- Example sweep (tests/gen01.test.js), where new examples must add no findings. The known findings are all in older accepted films, kept unchanged:
  - fast turns: the hand-off receiver in art01-handoff, art02-studio and art05-workshop (174°/s); workshop-extended toolbox, steps, teach, shelf and handoff (178–289°/s);
  - hidden: the TALK-02/03 meeting table.
