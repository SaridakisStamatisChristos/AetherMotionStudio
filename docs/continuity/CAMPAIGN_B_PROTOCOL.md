# campaign-b-protocol-v1 (frozen at GPU-00, 2026-11-27)

Binding for every Campaign B milestone. Tracker: [CAMPAIGN_B.md](CAMPAIGN_B.md). Profiles and diagnostics: [ADR-001](../adr/ADR-001-render-profiles.md) (Accepted). A later version (`-v2`) may only add to this file; it never rewrites recorded evidence.

## IDs and fixtures
- Films: `gpu<NN>-<slug>-r<n>`, never reused; a failed attempt keeps its ID. Requests: `examples/gpu<NN>-<slug>.request.json`.
- Matched comparisons share one preparation (speech, timeline, captions, mix; hashes verified). They compare Standard vs Cinematic, or CPU vs Standard for regressions.

## Per-milestone exit evidence
1. Clean committed source (`sourceDirty false`).
2. `npm test` fail 0 and Python OK, with new positive, negative and adversarial tests.
3. Legacy digests unchanged (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6), unless a versioned opt-in change records its new digest and the reason.
4. CPU Classic and GPU Standard regressions: byte-identical where they were (CPU, `swangle`), visually identical on `vulkan`.
5. Fresh `gpu<NN>` films with GL route, WebGL renderer string, profile, GPU memory, wall time and fps.
6. Agent stills from named frames on every profile; the owner's review is recorded separately.
7. Measurements reported against the budget below, on the reference workloads of the milestone.

## Benchmarks
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
- **Enforcement:** the automatic preflight estimate and the RP-06 check (device memory and free RAM before rendering) are GPU-10 work. Until then, budgets are checked from perf-bench measurements at each milestone.

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
