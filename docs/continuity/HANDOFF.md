# Latest handoff — LOCAL-03 paused mid Phase B (owner memory cleanup / reboot)
Checkpoint: branch `feature/local-03-performance` from main 43e0c2e (LOCAL-01/02 merged via PR #14). Commits 4b01f2b (bench), d24a943 (glitch scanner, opt-in seam), plus this checkpoint commit. Not pushed. Date 2026-11-24 ~22:00.
Status: LOCAL-03 ACTIVE — Phase A done, Phase B concurrency sweep done (c8 to be re-measured), remaining experiments not started. Details and numbers: CURRENT_STATE.md "Active unit"; table docs/performance/local-03-bench-report.md.

## Resume steps (after reboot)
1. `git switch feature/local-03-performance`; `git status` clean expected.
2. Check memory: free RAM should be well above 2 GB with Docker Desktop closed. Record it.
3. Environment per run (PowerShell): PYTHON=.venv python; AETHER_FFMPEG=absolute path to .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute path to node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe (absolute paths required: Windows CreateProcess rejects the relative form).
4. Bench command form: `node scripts/perf-bench.mjs --source out/<matched-output-dir> --id <new-id> --concurrency N [--gl vulkan] --warmup 1 --runs 2`; report: `node scripts/perf-report.mjs [id-prefix...]`. Sources: out/local-02-cinematic-r2-{cpu,three}-polished, out/local-03-af01-{cpu,three}-polished (git-ignored, must still exist; else re-create with produce --project, new id).
5. Next experiments, one variable at a time: (a) c8 rerun CPU and Three/vulkan on clean memory; (b) --reuse-browser at the best concurrency; (c) --hw-encode if-possible (NVENC) at best concurrency — judge by temporal glitch scan + PSNR/bitrate vs x264 reference, quality-affecting opt-in only; (d) confirm chosen settings on AF01 900 f.
6. Phase C: choose by throughput, stability, memory, correctness (not GPU util). Expose only via AETHER_CONCURRENCY/AETHER_GL/AETHER_HW_ENCODE (already implemented, defaults unchanged); document profile in LOCAL_DEVELOPMENT.md; update CURRENT_STATE/HANDOFF/NEXT_UNITS; push feature branch for test-only CI; PR only with owner authorization; then prepare ART-01 (input: LOW_PROJECTED_MOTION on AF01 `product` shot).

## Current provisional recommendation (not yet accepted)
CPU: AETHER_CONCURRENCY=4 (1.71x vs default, stable, bit-identical). Three: AETHER_GL=vulkan with AETHER_CONCURRENCY=4 (1.49x) or 8 (1.66x) pending clean-memory rerun. Defaults stay concurrency 2 / swangle.

## Unresolved risks
- Rare Vulkan frame corruption observed once (serial-encode diagnostic); keep frame_glitch scan on any GPU-profile render until more evidence.
- Three/vulkan output is not bit-exact across runs (≥56 dB); reproducibility gates for Three must use PSNR, not hashes.
- Machine memory pressure (~5.7 GB unattributed + 2.2 GB non-paged pool) — environmental, owner action.
