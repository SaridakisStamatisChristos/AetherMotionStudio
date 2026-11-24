# Latest handoff — ART-02 slice 1 (composition report, hero framing)
Checkpoint: branch `feature/art-02-composition` from main c8663e7 (ART-01 merged via PR #16; head 3f83487 CI 45505372406, main CI 45505520943 green, test-only). Commits 92174cd (record ART-01 merge), 31ef9b0 (slice 1), plus this handoff commit. Not pushed. Date 2026-11-25.
Status: ART-02 ACTIVE. Slice 1 implemented + tested + rendered; agent-reviewed only.

## This session
- Camera inspection: plain camera (zoom 850–1350, fixed target [0,1.2,0]) kept the product small/low; rig auto-framing only reduces zoom; close-up preset capped at ~31% subject height; explicit rig tracks capped at 38% by zoom ≤1550.
- Added src/quality/composition.js (compositionReport, cameraAngle, SAFE). Widened RIG_CAMERA_LIMITS.zoom to [700,2400] (renderers use zoom generically: Three fov = 2·atan(640/zoom), CPU projection).
- Searched 24 telephoto configs (all crop-free); chose zoom 2000→2200, y 2.1, z 6 → subject 53% mean / 62% max of safe height.
- Fixture examples/art02-product-{cpu,three}-polished.json; tests tests/art02-composition.test.js (5).
- Default-unchanged proof: worktree at 92174cd vs working tree over 54 pre-ART-02 examples: graph ec27cb2fc6aaad4b, preflight 88250f78bae7db0c identical.
- `npm test` 198 tests, 197 pass, 0 fail, 1 skip. Production: `$env:AETHER_CONCURRENCY="8"; $env:AETHER_GL="vulkan"; node scripts/produce.mjs --project examples/art02-product-cpu-polished.json --pair examples/art02-product-three-polished.json --backend both --id art02-product-r1` → all gates PASS, frame-glitch clean; films CPU d17fcb27…, Three 57aba04e….
- Correction: engineer in art01-handoff faces camera at ~53°; the faceless human recipe misled the earlier agent review (asset detail → ART-03).

## Next action
1. Owner (optional): watch out/art02-product-r1-{cpu,three}-polished/film.mp4.
2. Next slice: CPU/Three lighting parity — CPU film is markedly darker (floor nearly invisible, weak contact shadow) than Three. Inspect src/visual/draw-graph.js environment/lighting and fidelity-effects before any change; CPU outputs are hash-pinned evidence, so any CPU look change must be opt-in (new profile) or explicitly authorized.
3. Push/PR/merge only with owner authorization.

## Environment (PowerShell, repo root)
PYTHON=.venv python; AETHER_FFMPEG=absolute .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).

## Unresolved risks
- Hero framing agent-reviewed only.
- CPU vs Three look gap (owner noted Three looks better); default CPU look is pinned by historical hashes.
- Kept: Three/vulkan not bit-exact (gate by PSNR); keep frame_glitch on GPU renders.
