# Latest handoff — ART-01 slices 1–2 (choreography; opt-in flow/hold)
Checkpoint: branch `feature/art-01-motion` from main 4d053cc (LOCAL-03 merged via PR #15). Commits d42512a (record LOCAL-03 merge), 5dc65cf (slice 1), plus this checkpoint commit (slice 2). Not pushed. Date 2026-11-25.
Status: ART-01 ACTIVE. Slice 1 owner-reviewed (motion OK). Slice 2 implemented + tested + rendered, not human-reviewed. Not pushed, no PR.

## This session
- Owner review of slice 1: "motion is ok"; owner sees Three.js output as visually better than CPU (recorded; CPU stays first-class).
- Slice 2 (contract additions, all opt-in): `assets[].interpolation` {channel: 'ease'|'flow'}, `shots[].cameraInterpolation` (graph shots only), `actions[].hold: true` (not with loop). Files: src/core/motion.js (flowKeyframes, interpolate, INTERPOLATIONS), src/core/graph.js (validation + sampling), src/core/cinematography.js (sampleCameraRig modes, validateActions/composePose hold), src/core/timeline.js (shot field whitelist), docs/CINEMATOGRAPHY.md.
- Default-unchanged proof: temporary worktree at 5dc65cf vs working tree, graph-state sha256 over all 48 examples (980 evaluations, 140 graph shots) identical a8db8a25ce7b…3d944. Worktree removed (node_modules there was a copy, not a link; repo node_modules intact).
- Tests: tests/art01-engine.test.js 9 tests (flow properties, ease-equivalence, camera rig path, hold semantics, negatives with field paths, flow fixture). Fixed one wrong assertion of mine (zoom compared at a non-zoom key) and one vacuous negative (v1 fixture) → now uses blockchain-60s v2 chapter shot. `npm test` 184 tests, 183 pass, 0 fail, 1 skip.
- Demo fixture examples/art01-flow-{cpu,three}-polished.json (product choreography + flow x/camera + held hover lift). Note: first attempt used `rise-in` with hold, which ends at base (y 0) so hold had no effect — replaced by `hover` once (ends off-base). Production: `$env:AETHER_CONCURRENCY="8"; $env:AETHER_GL="vulkan"; node scripts/produce.mjs --project examples/art01-flow-cpu-polished.json --pair examples/art01-flow-three-polished.json --backend both --id art01-flow-r1` → succeeded 39.1 s, all gates PASS, frame-glitch clean both.

## Next action
1. Owner (optional): watch out/art01-flow-r1-three-polished/film.mp4 vs out/art01-product-r1-three-polished/film.mp4 — difference is the flowing drift/push-in and the floating end pose.
2. With owner authorization: push branch, test-only CI, PR, merge.
3. Remaining ART-01 roadmap items (contacts, rig attachments, multi-actor interaction) or move to ART-02 (composition/framing — small subject) — owner's choice.

## Environment (PowerShell, repo root)
PYTHON=.venv python; AETHER_FFMPEG=absolute .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).

## Unresolved risks
- Slice 2 visuals are agent-reviewed only.
- Director/Studio do not author the new fields (no UI exposure yet); they remain valid for hand-authored projects.
- Kept from LOCAL-03: Three/vulkan not bit-exact (gate by PSNR); keep frame_glitch on GPU renders; measure performance only on a settled machine.
