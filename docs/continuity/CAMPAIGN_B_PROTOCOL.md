# campaign-b-protocol-v1 (frozen at GPU-00, 2026-11-27)

Binding for every Campaign B milestone. Tracker: [CAMPAIGN_B.md](CAMPAIGN_B.md). Profiles and diagnostics: [ADR-001](../adr/ADR-001-render-profiles.md) (Accepted). A later version (`-v2`) may only add to this file; it never rewrites recorded evidence.

## IDs and fixtures
- Films: `gpu<NN>-<slug>-r<n>`, never reused; a failed attempt keeps its ID. Requests: `examples/gpu<NN>-<slug>.request.json`.
- Matched comparisons share one preparation (speech, timeline, captions, mix; hashes verified). They compare Standard vs Cinematic, or CPU vs Standard for regressions.

## Per-milestone exit evidence
1. Clean committed source (`sourceDirty false`).
2. `npm test` fail 0 and Python OK, with new positive, negative and adversarial tests.
3. Legacy digests unchanged (**director is f5b5104977219fdf since FIX-NR**: no lower-third caption boxes, narrator group framing; graph, geometry and detail2 as below), measured with `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual,gpu`. **Correction (GPU-01):** `gpu` must be excluded like `dual`, because the script also hashes new example fixtures; without it, the gpu00 requests and the gpu01 swatch film change the graph and director lines. Values: (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6), unless a versioned opt-in change records its new digest and the reason.
4. CPU Classic and GPU Standard regressions: byte-identical where they were (CPU, `swangle`), visually identical on `vulkan`. **Exception (FIX-RS, 2026-11-28):** bloom is now blurred in JavaScript, so polished re-renders differ from pre-FIX-RS renders by at most 3 levels on about 1 % of pixels. The byte baseline for later milestones is the FIX-RS merge, not v1.2.
5. Fresh `gpu<NN>` films with GL route, WebGL renderer string, profile, GPU memory, wall time and fps.
6. Agent stills from named frames on every profile; the owner's review is recorded separately.
7. Measurements reported against the budget below, on the reference workloads of the milestone.

## Benchmarks
- **Owner revision (2026-11-28): "timed turns only at the milestones. not every time. we need fast implementations."** Routine units and fix units: tests, quality checks (frame_glitch, stale scan) and one render; **no perf-bench runs**. The 3-run benchmarks below apply only at the budget milestones: GPU-10 (performance and the owner's budget configuration), GPU-12 (final qualification), or when the owner asks.
- At least 3 measured runs per fixture with `scripts/perf-bench.mjs`, from hash-checked prepared inputs. Report median and range.
- The production render is the first (cold) run. Bench runs open a fresh browser each time (`reuseBrowser false`).
- Never compare across different inputs, machines, GL routes or concurrency without saying so.

## Budget (owner delegated the choice, 2026-11-27: "what you propose since this is not the only computer that will use the program")
The owner asked for a budget that is not tied to one laptop. So every limit is **relative to the machine that renders**, and this laptop is only the reference machine on which Campaign B evidence is qualified.

| Limit | Rule for GPU Cinematic | On the reference laptop (RTX 4060 Laptop 8 GB, 15.2 GB RAM) |
|---|---|---|
| GPU memory (peak observed, device total) | ≤ 75 % of the device's GPU memory, which always leaves ≥ 25 % headroom | ≤ 6 GiB of 8 GiB (directive target) |
| Wall time | ≤ 3 × the GPU Standard median for the same film, on the same machine and settings (a ratio, so it holds on any machine) | portrait reference: ≤ 163 s (3 × 54.2 s) |
| System RAM growth during the render | ≤ the free RAM measured before the render, minus 1 GB safety margin, and never more than 3 GB at the reference settings | ≤ 3 GB (about 3.4 GB was free with 11.8 GB in use) |
| Resolution / frame rate | 1080 × 1920 at 30 fps (vertical reference); other formats are measured separately | same |

- **Never silent:** a film over budget is reported, never quietly cut down. The owner decides: keep it, make the feature optional, or revise the budget.
- **Lower concurrency** (fewer parallel tabs) is the only allowed way to fit RAM. It is chosen explicitly, declared in the report and measured.
- **Machines that cannot be measured:** no `nvidia-smi` (AMD, Intel, Apple) or software GL means GPU memory is unknown. That gives an "unverified device" warning, not a refusal, and the report says so.
- **Enforcement:** the automatic preflight estimate and the RP-06 check (device memory and free RAM before rendering) are GPU-10 work. **GPU-10 must first ask the owner to configure it** (owner 2026-11-27; see CAMPAIGN_B.md GPU-10). Until then, budgets are checked from perf-bench measurements at each milestone.

## Reference workloads and the GPU Standard baseline (GPU-00)
- Source commit 7e8945c, `sourceDirty false`. GL `vulkan` → "ANGLE (NVIDIA, Vulkan 1.3.289, NVIDIA GeForce RTX 4060 Laptop GPU)", three.js 0.180.0, concurrency 8, software encode (h264), profile `gpu-standard`.
- Machine: AMD Ryzen 9 7845HX (24 threads), 15.2 GB RAM, Windows 11, Node 22.17.0, NVIDIA driver 566.07.

| Reference | Request | Frames | Production render (cold) | Bench wall time, median (range), 3 runs | fps median (range) | Peak GPU memory, median (max) | RAM growth, median (max) | Film hashes over 3 runs |
|---|---|---|---|---|---|---|---|---|
| Portrait character (interview) | gpu00-portrait | 1800 | 62.9 s | 54.2 s (53.9–55.3) | 34.8 (33.9–35.8) | 1365 MiB (1421) | 2.34 GB (2.38) | 2 distinct |
| Product hero (laptop) | gpu00-product | 1800 | 54.7 s | 49.3 s (48.8–51.5) | 37.7 (36.6–38.2) | 1436 MiB (1454) | 2.24 GB (2.45) | 2 distinct |
| Environment (harbour market) | gpu00-environment | 1637 | 50.7 s | 51.4 s (46.7–52.7) | 33.3 (32.4–37.0) | 1397 MiB (1437) | 2.47 GB (2.81) | 2 distinct |
| Scientific (vaccine explainer) | gpu00-science | 1409 | 46.1 s | 41.9 s (41.3–42.6) | 35.0 (34.5–36.1) | 1421 MiB (1437) | 2.19 GB (2.23) | 1 distinct |

- **Production gates:** all four passed (speech, captions, native MP4 full decode).
  - CHECKS warnings: portrait, environment and science 0.
  - Product: motion-speed 3, `OFF_FRAME` object-2 in shots 2, 5 and 6, silence 5. The laptop also reads small in frame.
  - These are the GPU Standard baseline as the Director plans it today, recorded, not fixed in GPU-00.
- **Durations:** speech fitting gave 54.6 s (environment) and 47.0 s (science) instead of 60 s; budgets scale per frame.
- **Not byte-stable:** GPU frames on `vulkan` differ run to run (known since DUAL-04), so Cinematic comparisons are visual and structural.
- **Not run on these reference films:** `frame_glitch.py`, ebur128 loudness, and CPU or `swangle` runs.
- **Evidence (git-ignored, local):** `out/gpu00-*-r1-three-polished`, `out/gpu00-*-r1-production`, `out/bench/gpu00-*-r1-bench/results.json`.

## GPU-01 measurements (pbr-v1 vs GPU Standard, same prepared film)
- gpu01-portrait-r2 (1800 frames, 60 s; one shared preparation via `--compare standard`; commit b6dad1a, sourceDirty false; vulkan; concurrency 8). Three runs each.

| Side | Wall time median (runs) | fps median | Peak GPU memory (runs) | RAM growth (runs) |
|---|---|---|---|---|
| GPU Standard | 56.9 s (56.9, 56.9, 53.5) | 33.0 | 1389–1445 MiB | 2.06–2.79 GB |
| GPU Cinematic (pbr-v1) | 53.3 s (53.3, 51.9, 54.1) | 35.3 | 1503–1519 MiB | 2.00–3.23 GB |

- **Against the budget:**
  - wall time 0.94 × Standard (limit 3 ×; the difference is run-to-run noise);
  - GPU memory about +100 MiB, 1.5 GB of the 6 GiB limit;
  - RAM: median 2.49 GB, but one Cinematic run reached 3.23 GB, over the 3 GB reference cap. The Standard side ranges up to 2.79 GB on the same film, so this looks like system noise, not a pbr-v1 cost. Reported, not hidden; GPU-10 re-measures with the device-relative rule.
- **Brightness (tuning stills, mean luma of the picture band):** Cinematic 3–5 % below Standard with slightly higher contrast (portrait 69.4 vs 71.5; product 56.9 vs 59.8).
- **Regression:** GPU Standard stills on swangle are byte-identical between main and this branch (3 frames, 2 films). CPU is covered by the unchanged digests and tests.
- **Glitch scan:** gpu01-portrait-r2 Standard and Cinematic clean; gpu01-swatches-r2 both flag frame 480 (pre-existing cut flash, FIX-RS).

## GPU-02 measurements (env-light-v1 + pbr-v1 vs GPU Standard, same prepared film)
- gpu02-portrait-r1 (1800 frames; `--compare standard`; commit f46c097, sourceDirty false; vulkan; concurrency 8; FIX-RS included, hence lower fps than GPU-01). Three runs each.

| Side | Wall time (runs) | fps median | Peak GPU memory (runs) | RAM growth (runs) |
|---|---|---|---|---|
| GPU Standard | 66.0, 66.2, 62.9 s | 28.2 | 1452–1508 MiB | 2.13, 3.04, 2.88 GB |
| GPU Cinematic (pbr-v1 + env-light-v1) | 66.3, 64.8, 66.0 s | 28.2 | 1849–1857 MiB | 2.86, 3.40, 3.13 GB |

- **Against the budget:**
  - wall time 1.0 × Standard (limit 3 ×);
  - GPU memory about +350 MiB (2048 px shadow map, fill light), 1.8 of 6 GiB;
  - **RAM over the 3 GB reference cap:** Cinematic median 3.13 GB, max 3.40 GB. The Standard side of the same film reached 3.04 GB too, so the reference laptop's free RAM (about 3.4 GB) is the real constraint. Reported, not hidden. It goes to the owner's GPU-10 budget configuration (lower concurrency is the declared remedy there).
- **Flicker:** median frame-to-frame change identical on both sides (0.51/0.51 portrait, 0.49/0.51 product, 0.40/0.41 environment). The 95th–99th percentiles are 10–25 % higher in Cinematic: cuts and fades with more contrast. frame_glitch is clean on all 6 films; no stale frames.
- **Regression:** GPU Standard swangle stills byte-identical to main (portrait frame 726). Digests unchanged.

## GPU-03 measurements (pbr-v1 + env-light-v1 + proc-texture-v1 vs GPU Standard)
- gpu03-portrait-r1 (1800 frames; `--compare standard`; commit d998721, sourceDirty false; vulkan; concurrency 8). These runs had already started when the owner limited benchmarks to milestones. GPU Standard: wall 79.7/74.6/73.3 s (median 74.6), 24.9 fps, peak GPU 1492–1516 MiB, RAM growth 2.52/2.94/2.89 GB; Cinematic: wall 77.8/77.6/93.6 s (median 77.8), 23.8 fps, peak GPU 1963–1979 MiB, RAM growth 2.01/2.51/3.68 GB.
- Glitch and stale scans are clean on all 6 films (portrait, product, environment; both sides). GPU Standard stills are byte-identical to main.
