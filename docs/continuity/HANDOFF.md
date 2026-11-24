# Latest handoff — LOCAL-03 Phase B complete (concurrency + browser reuse)
Checkpoint: branch `feature/local-03-performance` from main 43e0c2e (LOCAL-01/02 merged via PR #14). Commits 4b01f2b (bench), d24a943 (glitch scanner, opt-in seam), 73ce93f (pre-reboot checkpoint), plus this checkpoint commit. Not pushed. Date 2026-11-24 ~23:55.
Status: LOCAL-03 ACTIVE — Phase A done; Phase B done: concurrency sweep incl. clean-boot (b3) and settled-machine interleaved controls (b4); browser reuse rejected. NVENC and AF01 confirmation not started. Details: CURRENT_STATE.md "Active unit"; table docs/performance/local-03-bench-report.md.

## This session
- Reboot verification: owner's first two "reboots" were Fast Startup resumes (System log Kernel-Boot event 27, boot type 0x1; HiberbootEnabled=1) and kept the 2.2 GB non-paged pool. True cold boot at 23:36:37 (boot type 0x0): non-paged pool 0.73 GB, 3.54 GB free 2.5 min after boot. For future clean measurements use Restart or `shutdown /r /t 0`, not Shut down. Fast Startup setting left unchanged (owner's system setting).
- Commands (env as below): `node scripts/perf-bench.mjs --source out/local-02-cinematic-r2-{cpu,three}-polished --id b3-cin-{cpu,three-vk}-c{8,4} --concurrency {8,4} [--gl vulkan] --warmup 1 --runs 2`; `node scripts/perf-report.mjs` → copied to docs/performance/local-03-bench-report.md with a conditions note.
- Results (mean of 2 measured runs, cinematic 360 f): CPU c4 21.0 s, c8 19.0 s (18.4–19.7; stable, unlike pressured 18.4–25.1), bit-identical to reference; Three/vulkan c4 11.0 s, c8 10.3 s, VRAM 0.86 / 1.36 GB. All 12 runs (incl. warmups) verify PASS, quality pass, frame-glitch clean; Three min PSNR 56.26–56.31 dB.
- Settled-machine b4 (interleaved controls): CPU c4 22.1 s vs c8 15.5–15.9 s; Three/vulkan c4 11.0 s vs c8 8.9 s; --reuse-browser no gain (CPU 15.4/15.7 s, Three 9.8 s) → rejected. b3 c8 was pessimistic (ran 5 min post-boot). All b4 runs verify/quality/glitch clean.
- Explained low RAM to owner: Windows "free"≈0 is normal (standby cache counts as available, 6.7 GB after boot); pre-boot shortage was ~5–6 GB kernel-side growth (non-paged pool 2.2 GB) preserved by Fast Startup; culprit driver not identifiable retroactively (poolmon/RAMMap would need owner permission to install).
- Changed files: docs/performance/local-03-bench-report.md, docs/continuity/CURRENT_STATE.md, docs/continuity/HANDOFF.md. No source changes; tests not rerun (docs-only).

## Resume steps
1. `git switch feature/local-03-performance`; `git status` clean expected. Check boot type (event 27) and free RAM; record.
2. Environment (PowerShell): PYTHON=.venv python; AETHER_FFMPEG=absolute path to .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute path to node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).
3. Next experiments, one variable at a time, on a settled machine (wait ≥15 min after boot): (c) --hw-encode if-possible (NVENC) at c8 — judge by temporal glitch scan + PSNR/bitrate vs x264 reference, quality-affecting opt-in only; (d) confirm chosen settings on AF01 900 f (out/local-03-af01-{cpu,three}-polished).
4. Phase C: choose by throughput, stability, memory, correctness (not GPU util). Expose only via AETHER_CONCURRENCY/AETHER_GL/AETHER_HW_ENCODE (already implemented, defaults unchanged); document profile in LOCAL_DEVELOPMENT.md; update CURRENT_STATE/HANDOFF/NEXT_UNITS; push feature branch for test-only CI; PR only with owner authorization; then prepare ART-01 (input: LOW_PROJECTED_MOTION on AF01 `product` shot).

## Current provisional recommendation (not yet accepted)
CPU: AETHER_CONCURRENCY=8 (15.5–15.9 s vs 22.1 s at c4 on settled machine; RAM Δ 2.4 vs 1.9 GB) — c4 safer when memory-pressured. Three: AETHER_GL=vulkan + AETHER_CONCURRENCY=8 (8.9 s vs 11.0 s). Browser reuse off. Defaults stay concurrency 2 / swangle. AF01 900 f confirmation pending.

## Unresolved risks
- Rare Vulkan frame corruption observed once (serial-encode diagnostic); keep frame_glitch scan on any GPU-profile render until more evidence.
- Three/vulkan output is not bit-exact across runs (≥56 dB); reproducibility gates for Three must use PSNR, not hashes.
- Memory pressure recurs with long uptime / Fast Startup (suspected driver or WSL kernel-side growth); performance numbers are condition-dependent — compare only within the same condition group.
