# Latest handoff — LOCAL-03 Phase B concurrency complete (clean-boot rerun done)
Checkpoint: branch `feature/local-03-performance` from main 43e0c2e (LOCAL-01/02 merged via PR #14). Commits 4b01f2b (bench), d24a943 (glitch scanner, opt-in seam), 73ce93f (pre-reboot checkpoint), plus this checkpoint commit. Not pushed. Date 2026-11-24 ~23:55.
Status: LOCAL-03 ACTIVE — Phase A done; Phase B concurrency sweep done including clean-memory c4/c8 rerun (b3); browser-reuse, NVENC and AF01 confirmation not started. Details: CURRENT_STATE.md "Active unit"; table docs/performance/local-03-bench-report.md.

## This session
- Reboot verification: owner's first two "reboots" were Fast Startup resumes (System log Kernel-Boot event 27, boot type 0x1; HiberbootEnabled=1) and kept the 2.2 GB non-paged pool. True cold boot at 23:36:37 (boot type 0x0): non-paged pool 0.73 GB, 3.54 GB free 2.5 min after boot. For future clean measurements use Restart or `shutdown /r /t 0`, not Shut down. Fast Startup setting left unchanged (owner's system setting).
- Commands (env as below): `node scripts/perf-bench.mjs --source out/local-02-cinematic-r2-{cpu,three}-polished --id b3-cin-{cpu,three-vk}-c{8,4} --concurrency {8,4} [--gl vulkan] --warmup 1 --runs 2`; `node scripts/perf-report.mjs` → copied to docs/performance/local-03-bench-report.md with a conditions note.
- Results (mean of 2 measured runs, cinematic 360 f): CPU c4 21.0 s, c8 19.0 s (18.4–19.7; stable, unlike pressured 18.4–25.1), bit-identical to reference; Three/vulkan c4 11.0 s, c8 10.3 s, VRAM 0.86 / 1.36 GB. All 12 runs (incl. warmups) verify PASS, quality pass, frame-glitch clean; Three min PSNR 56.26–56.31 dB.
- Changed files: docs/performance/local-03-bench-report.md, docs/continuity/CURRENT_STATE.md, docs/continuity/HANDOFF.md. No source changes; tests not rerun (docs-only).

## Resume steps
1. `git switch feature/local-03-performance`; `git status` clean expected. Check boot type (event 27) and free RAM; record.
2. Environment (PowerShell): PYTHON=.venv python; AETHER_FFMPEG=absolute path to .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute path to node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required).
3. Next experiments, one variable at a time, on clean-boot conditions: (b) --reuse-browser at c8 (and c4 for CPU if c8 memory headroom is a concern); (c) --hw-encode if-possible (NVENC) at chosen concurrency — judge by temporal glitch scan + PSNR/bitrate vs x264 reference, quality-affecting opt-in only; (d) confirm chosen settings on AF01 900 f (out/local-03-af01-{cpu,three}-polished).
4. Phase C: choose by throughput, stability, memory, correctness (not GPU util). Expose only via AETHER_CONCURRENCY/AETHER_GL/AETHER_HW_ENCODE (already implemented, defaults unchanged); document profile in LOCAL_DEVELOPMENT.md; update CURRENT_STATE/HANDOFF/NEXT_UNITS; push feature branch for test-only CI; PR only with owner authorization; then prepare ART-01 (input: LOW_PROJECTED_MOTION on AF01 `product` shot).

## Current provisional recommendation (not yet accepted)
CPU: AETHER_CONCURRENCY=8 now stable on clean memory (19.0 s vs 21.0 s at c4, ~10%; RAM Δ 2.6 vs 1.8 GB) — c4 remains the safer choice when the machine is memory-pressured. Three: AETHER_GL=vulkan with AETHER_CONCURRENCY=8 (10.3 s vs 11.0 s at c4). Defaults stay concurrency 2 / swangle. Margins rest on 2 measured runs each; AF01 900 f confirmation pending.

## Unresolved risks
- Rare Vulkan frame corruption observed once (serial-encode diagnostic); keep frame_glitch scan on any GPU-profile render until more evidence.
- Three/vulkan output is not bit-exact across runs (≥56 dB); reproducibility gates for Three must use PSNR, not hashes.
- Memory pressure recurs with long uptime / Fast Startup (suspected driver or WSL kernel-side growth); performance numbers are condition-dependent — compare only within the same condition group.
