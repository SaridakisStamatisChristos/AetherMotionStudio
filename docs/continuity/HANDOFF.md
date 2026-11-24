# Latest handoff — LOCAL-03 implemented + measured, PR #15 merge authorized
Checkpoint: branch `feature/local-03-performance` from main 43e0c2e (LOCAL-01/02 merged via PR #14). Commits 4b01f2b (bench), d24a943 (glitch scanner, opt-in seam), 73ce93f (pre-reboot checkpoint), 4ed3e7d (clean-boot c4/c8), 56d8f82 (settled controls, reuse rejected), 9746236 (NVENC, AF01, profile), a547bf2 + this commit (PR/CI record). Pushed to origin; PR #15. Date 2026-11-25.
Status: LOCAL-03 IMPLEMENTED + MEASURED (Phases A–C). Owner authorized push, PR and merge 2026-11-25: PR #15, test-only CI run 45500133921 on 9746236 green (test pass; render/compare skipped by policy). Merged to main as 4d053cc (head d6ace0e CI 45500337539, main CI 45500478270 green, test-only). Formal acceptance of the profile values not separately stated beyond merge authorization. Details: CURRENT_STATE.md "Active unit"; table + NVENC quality section docs/performance/local-03-bench-report.md; profile docs/continuity/LOCAL_DEVELOPMENT.md "Recommended local performance profile".

## This session
- Reboot: owner's first two "reboots" were Fast Startup resumes (Kernel-Boot event 27, boot type 0x1; HiberbootEnabled=1) keeping the 2.2 GB non-paged pool. True cold boot 2026-11-24 23:36:37 (0x0): non-paged pool 0.73 GB. Fast Startup setting left unchanged. Low-RAM explanation given to owner (Windows "free"≈0 normal, available incl. standby 6.7 GB; pre-boot ~5–6 GB kernel-side growth, culprit not identifiable retroactively; poolmon/RAMMap need owner permission).
- b3 (5–15 min post-boot, settling): CPU c4 21.0 / c8 19.0 s; Three c4 11.0 / c8 10.3 s — c8 rows pessimistic.
- b4 (settled, interleaved): CPU c4 22.1 / c8 15.5–15.9 s; Three c4 11.0 / c8 8.9 s; --reuse-browser no gain → rejected.
- c1 NVENC (`--hw-encode required`, c8): CPU 13.1 s, Three 7.9 s; 2.06 Mbps Main vs x264 5.1/6.9 Mbps High; vs near-lossless CPU ref (`npx remotion render … --crf=1` → out/bench/c1-lossless-cpu-ref): x264 49.34/47.69 dB, NVENC 47.90/45.85 dB avg/min, SSIM 0.9958 vs 0.9936 → drafts-only opt-in.
- d1 AF01 900 f: CPU c2 78.6 → c8 33.5 s (bit-identical); Three/vulkan c2 44.6 → c8 21.8 s. All runs verify PASS, glitch clean, quality = reference finding only (LOW_PROJECTED_MOTION, `product`).
- End-to-end profile check: `$env:AETHER_CONCURRENCY="8"; $env:AETHER_GL="vulkan"; node scripts/produce.mjs --project examples/cinematic-cpu-polished.json --pair examples/cinematic-three-polished.json --backend both --id local-03-profile-c8` → succeeded 44.9 s, compare_release PASS, CPU film = reference 45a364e0…, Three glitch clean 56.31 dB; render-timing.json records concurrency 8. sourceDirty true (uncommitted bench-report doc). GPU not sampled in that run.
- Tests: `npm test` 168 tests, 167 pass, 0 fail, 1 skip (Windows symlink). Python tests not rerun (no Python changes).
- Changed files: docs/performance/local-03-bench-report.md, docs/continuity/{CURRENT_STATE,HANDOFF,LOCAL_DEVELOPMENT,NEXT_UNITS}.md. No source changes this session.

## Next action
1. Optional human visual check of an NVENC film vs x264 (out/bench/c1-cin-cpu-c8-nvenc/run-01/film.mp4 vs out/local-02-cinematic-r2-cpu-polished/film.mp4).
2. Done: pushed, PR #15, CI green, merge authorized.
3. Then prepare ART-01 (input: LOW_PROJECTED_MOTION on AF01 `product` shot). Bootstrap/inspection first, no speculative rewrite.

## Environment (PowerShell, repo root)
PYTHON=.venv python; AETHER_FFMPEG=absolute .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).

## Unresolved risks
- Rare Vulkan frame corruption observed once (serial-encode diagnostic); keep frame_glitch scan on any GPU-profile render.
- Three/vulkan output not bit-exact across runs (≥56 dB); Three reproducibility gates must use PSNR, not hashes.
- Memory pressure recurs with long uptime / Fast Startup; performance numbers are condition-dependent — compare only within the same condition group. c8 needs ~2.5 GB headroom.
- Speedups rest on 2 measured runs per config on one machine; NVENC not human-reviewed.
