# Latest handoff — LOCAL-01 verified locally (Windows PC, RTX via vulkan)
Checkpoint: source HEAD 1e0adcd2b451db41b772590191a74453d2d11679 (main) + uncommitted continuity doc edits. Date 2026-11-24. Previous handoff (AF09 merged → local development) is superseded; its evidence remains in CURRENT_STATE.md.
Status: LOCAL-01 IMPLEMENTED + VERIFIED locally, awaiting owner acceptance. One open environmental item (symlink test). No commit, push, merge or release.

## Verified this session
- Machine: Windows 11 Home 10.0.26300; Ryzen 9 7845HX; 15.2 GB RAM; RTX 4060 Laptop 8 GB (driver 566.07) + AMD Radeon 610M iGPU; ~81 GB free.
- Owner-approved: Python 3.11.9 system install (`winget install --id Python.Python.3.11 -e`). Owner choice: Remotion-bundled ffprobe. Owner: use the GPU.
- `py -3.11 scripts/release_setup.py` → exit 0: npm install, pinned pip set, pip check clean, Kokoro models SHA-256 verified.
- `npm test` → 157/158; failure tests/foundry-import.test.js:17 symlinkSync EPERM (Windows privilege). Python 11/11 on .venv 3.11.9; compileall OK; `node scripts/foundry-qualify.mjs plan` → 9 pairs.
- GL identity (WEBGL_debug_renderer_info via Remotion openBrowser): swangle=SwiftShader; angle=AMD Radeon 610M; angle-egl=Microsoft Basic Render Driver; vulkan=RTX 4060 Laptop.
- Renders (env per LOCAL_DEVELOPMENT.md "Verified owner PC profile"; verify.py PASS each: 360 frames, 12 s, full decode, Kokoro audio):
  - examples/cinematic-cpu-polished.json → 55.9 s render, sha256 45A364E01D38C2FEB2B554511E21E549E9BE6E5892A70F804FC5923977BCB4F6.
  - examples/cinematic-three-polished.json, AETHER_GL=vulkan → 34.3 s, sha256 4B12D823BF21B41DB5DCA650FEC4B165791647AAAB87D68B4D5D08386343B68D; nvidia-smi: chrome-headless-shell.exe C+G on RTX, util peak 42%, VRAM peak 424 MiB. Copy at out/local01-three-vulkan.
  - Same fixture, swangle → 155.7 s, sha256 0D5065A387511627B5BBE5F28D4AB4D88E8C7725FBC9C3992A98832213D397C5; 0% RTX util. Copy at out/local01-three-swangle.
- Stills at 6.0 s checked by agent: both backends coherent. Not human/audio reviewed. Not a matched shared-speech pair; single uncontrolled timings.

## Changed files
docs/continuity/CURRENT_STATE.md, HANDOFF.md, LOCAL_DEVELOPMENT.md. Untracked local: package-lock.json (review before committing). Ignored: node_modules/, .venv/, models/, out/, public/audio/.

## Resolved after owner decision (same day)
- Symlink test: capability-aware skip (win32+EPERM only, explicit reason, negative-tested); JS now 160 tests / 159 pass / 0 fail / 1 skip. No Windows setting changed.
- package-lock.json reviewed (cross-platform optional binaries incl. Linux x64, registry-only, integrity complete, `npm ls --all` clean, re-resolve no-op) and committed. Note: transitive versions are those resolved 2026-11-24, not necessarily those historical CI used.

## Open items
1. `vulkan` route verified on one fixture only; longer/multi-shot Three renders, VRAM growth and controlled repeat timings belong to LOCAL-03.
3. Whether to commit package-lock.json (Windows-resolved) is an owner decision.

## Next executable action
Owner accepts LOCAL-01 (or defers the symlink item), then picks next unit: LOCAL-02 (shared-speech matched comparison), LOCAL-03 (GPU performance engineering), or a creative ART unit / direct feature request. No push/merge without authorization.
