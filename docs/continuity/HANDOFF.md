# Latest handoff — ART-01 slice 1 (authored product choreography)
Checkpoint: branch `feature/art-01-motion` from main 4d053cc (LOCAL-03 merged via PR #15; head d6ace0e CI 45500337539, main CI 45500478270 green, test-only). Commits d42512a (record LOCAL-03 merge) plus this checkpoint commit. Not pushed. Date 2026-11-25.
Status: ART-01 ACTIVE. Slice 1 IMPLEMENTED + TESTED + RENDERED locally; not human-reviewed, not accepted, not pushed.

## This session
- Inspection: LOW_PROJECTED_MOTION (src/quality/preflight.js:54) = mean projected bbox-centre motion over 9 samples < 1 px (360×640). AF01 `product` = lone smartphone, single linear yaw track, camera tracks it → 0.83 px. Smartphone rig channels: x,y,z,yaw,scale only. ~50 motion presets + actions already exist (src/core/presets.js, cinematography.js) with once/loop/relative modes, weight, blend.
- Decision: no engine change in slice 1. ACTIONS keys are enumerated by src/director/catalog.js, schema.js, scripts/audit-assets.mjs and studio-server /api/catalog — adding action names would change director/audit outputs and evidence.
- Added examples/art01-product-{cpu,three}-polished.json (single `product` shot; identical identity/copy/look to AF01; tracks: yaw with counter-turn anticipation, overshoot, settle + x drift; actions: settle-in, reveal-spin (scale), emphasis (w .5), hover loop (w .3, blend .15); camera arc + push-in to zoom 1300).
- Added tests/art01-choreography.test.js (7 tests: pair contract, AF01 identity preserved, preflight clean and AF01 gate unchanged, per-frame continuity + out-of-order determinism, choreography beats, negative snap-back detection, negative validation).
- Commands/results: `npm test` → 175 tests, 174 pass, 0 fail, 1 skip. `$env:AETHER_CONCURRENCY="8"; $env:AETHER_GL="vulkan"; node scripts/produce.mjs --project examples/art01-product-cpu-polished.json --pair examples/art01-product-three-polished.json --backend both --id art01-product-r1` → succeeded 35.0 s, 1 prep, 2 renders (CPU 14.7 s, Three 10.3 s), verify PASS, quality pass 0/0, compare_release PASS; frame_glitch clean both. Agent viewed 8-beat strips (frames 0,12,30,75,120,140,160,179) for both backends: beats present and matched.
- Docs: docs/CINEMATOGRAPHY.md "ART-01 choreography authoring pattern"; CURRENT_STATE active unit; NEXT_UNITS status.

## Next action
1. Owner: watch out/art01-product-r1-cpu-polished/film.mp4 and out/art01-product-r1-three-polished/film.mp4 (compare with the product shot inside out/local-03-af01-cpu-polished/film.mp4) and judge the motion.
2. With owner approval: push branch for test-only CI / PR.
3. Candidate slice 2 (needs owner go-ahead; contract change, opt-in only, both backends): once-action `hold` so windows can end off-base without snap-back; optional flow-through keyframe interpolation (per-track, default smoothstep unchanged). Composition/framing (small subject) is ART-02.

## Environment (PowerShell, repo root)
PYTHON=.venv python; AETHER_FFMPEG=absolute .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).

## Unresolved risks
- Motion quality is an agent judgement only; no human visual review yet.
- Subject small in frame (inherited camera distance; zoom near 1350 limit).
- Kept from LOCAL-03: Three/vulkan not bit-exact (gate by PSNR); keep frame_glitch on GPU renders; measure performance only on a settled machine.
