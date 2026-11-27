# AetherMotion Studio v1.2 — Universal Dual-Backend (Campaign A)

Status: **release candidate** (DUAL-09). Proposed tag `v1.2-dual-backend-final`; the owner tags the exact accepted commit. No automatic publication.

AetherMotion Studio makes narrated short films on your own computer: you write a script (or a Director request), and it prepares the speech once and renders the same film on two permanent backends, **CPU Canvas** and **native Three.js**. Everything runs locally; no paid API is required.

## What v1.2 adds (DUAL-00 … DUAL-09, all opt-in; accepted films unchanged)
| Area | What you can do | Guide |
|---|---|---|
| Content modes | characters only (classic), characters + visual aids (`mixed-v1`), explainer without characters (`explainer-v1`), large animated text (`typography-v1`) | [AUTHORING.md](AUTHORING.md) |
| Typography | four bundled open fonts (Inter, Merriweather, JetBrains Mono, Noto Sans), `compose-v2` text layout | [COMPOSITION.md](COMPOSITION.md) |
| Maths | MathJax equations with exact arithmetic checks, plots, graphs and verified algorithms (BFS, Euclid) | [MATHS.md](MATHS.md) |
| Charts and diagrams | bar, line, area, scatter, pie; timelines, flowcharts, comparison cards; no misleading scales | [CHARTS.md](CHARTS.md) |
| Pictures | a local, verified PNG/JPEG/static-WebP library with fit, crop and pan/zoom | [MEDIA.md](MEDIA.md) |
| Formats, looks, sound | vertical 9:16 (default), landscape 16:9, square 1:1; dark, paper and high-contrast themes; caption styles; music off/louder; a declared silent soundtrack | [FORMATS.md](FORMATS.md), [THEMES_AUDIO.md](THEMES_AUDIO.md) |
| Studio | all of the above in "Make a film", a picture library, a preview with the film's own fonts and pictures | [STUDIO.md](STUDIO.md) |
| Batches | a local queue of films with cancel, stop/resume, restart recovery and a machine-wide render lock | [BATCH.md](BATCH.md) |

## Quick start (user guide)
1. Setup once: [LOCAL_DEVELOPMENT.md](continuity/LOCAL_DEVELOPMENT.md) (Node 22, Python 3.11 venv, `python scripts/setup_models.py`).
2. Studio: `npm run studio:local`, then **Make a film** → **Generate & render film**, then download from "Your film is ready".
3. Command line: `node scripts/produce.mjs --request examples/dual09-maths.request.json --backend both --id my-maths-r1`.
4. Several films: `node scripts/batch.mjs create examples/batches/dual09-matrix.batch.json`, then `node scripts/batch.mjs run out/batches/<id>`.
5. Faster Three.js on an NVIDIA GPU (opt-in): `$env:AETHER_GL='vulkan'` (check with `nvidia-smi`). The default route is software (`swangle`).
Script rules: [SCRIPT_FORMAT.md](SCRIPT_FORMAT.md). Troubleshooting: see below.

## Final capability matrix
"Matched" = one speech preparation, the same scene, timeline, narration, mix and captions (hash-checked) on both backends; pixels may differ by backend.
| Capability | CPU Canvas | Three.js | Formats | Verified by |
|---|---|---|---|---|
| Characters, dialogue (2–3 speakers) | yes | yes | vertical | tests; matrix d09-dialogue |
| Narrator (classic, exact length) | yes | yes | vertical | tests; d09-narrator, reg-narrator07 (byte-identical to DUAL-07) |
| Characters + visual aids (`mixed-v1`) | yes | yes | all three | d09-mixed (landscape) |
| Explainer (`explainer-v1`) | yes | yes | all three | d09-long (235.7 s) |
| Typography (`typography-v1`), 4 fonts | yes | yes | all three | d09-typography (square) |
| Equations, plots, algorithms | yes | yes | all three | d09-maths (square) |
| Charts, timelines, flowcharts, cards | yes | yes | all three | d09-charts (landscape) |
| Library pictures with crop and pan/zoom | yes | yes | all three | d09-gallery; reg-harbour06 (CPU byte-identical to DUAL-06) |
| Themes, caption styles, music, silent soundtrack | yes | yes | all three | DUAL-06 films; tests |
| Studio "Make a film", preview, downloads | yes | yes | all three | DUAL-07 headless-browser click-through; tests |
| Batches, render lock, cancel, restart recovery | yes | yes | all three | DUAL-08 films; matrix r2 survived a real crash |
Not in v1.2 (Campaign B or later, by policy): PBR/HDR lighting, post-processing, skeletal rigs, imported animated models, GPU particles, GPU-only features.

## Qualification (DUAL-09, `campaign-a-protocol-v1` final matrix)
**Automated:** 560 JS tests (0 fail, 1 Windows-only skip; the PR CI run is recorded in CAMPAIGN_A.md), Python 63 OK, legacy digests identical to DUAL-00 (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a); the Director digest changed once, on purpose (2cbf9916e65da935 → 8a0ad025b6c9f6d6: no light beams, below), font metrics current.
**Films** (batch `dual09-matrix-r2`, RTX route `AETHER_GL=vulkan`, concurrency 8; every pair: one speech preparation, shared hashes exact, full decode, quality 0 errors):
| Film | Content | Format | Length (frames) | CPU / Three.js SHA-256 | Render s (CPU / Three) |
|---|---|---|---|---|---|
| d09-dialogue | interview dialogue, characters | vertical | 60.0 s (1800) | e0d0f4f3eb939b20… / c7754a5983cb7346… | 404 / 63 |
| d09-narrator | narrator only (classic) | vertical | 30.0 s (900) | 50b01a727525017f… / 75ab8ef5227405cb… | 54 / 40 |
| d09-mixed | characters + aids | landscape | 58.4 s (1752) | 67ce11f3a19f1952… / 293aa38a5679601d… | 221 / 64 |
| d09-typography | typography, Noto Sans | square | 28.5 s (855) | 9de2aa0e64eb8b0b… / f30e79352f27c83d… | 38 / 26 |
| d09-maths | equations, parabola, Euclid | square | 84.2 s (2527) | d90edc02dd4a33f5… / a5d33213b3a04ba4… | 68 / 58 |
| d09-charts (final-r1) | bar, line with a missing value, pie, timeline, flow, cards; paper | landscape | 90.0 s (2700) | 3c94bb6b2459e18c… / 57acb799ad4fc0f7… | 116 / 97 |
| d09-gallery | five library pictures; paper | vertical | 60.0 s (1800) | da406b00e0418d26… / da23ee3fe54ff09b… | 85 / 60 |
| d09-long (final-r1) | explainer, near the 300 s limit | vertical | 235.7 s (7071) | e631ac2ffd9db475… / d835143f173e2855… | 217 / 164 |
| reg-narrator07 | DUAL-07 narrator again | vertical | 30.0 s (900) | 189f01d09043ce31… / 3087c27c2c523303… | **both byte-identical to DUAL-07** |
| reg-harbour06 | DUAL-06 harbour again | vertical | 42.4 s (1273) | 03388c511e7e90d6… / c1e18776d97b7489… | **CPU byte-identical to DUAL-06**; Three.js visually identical (GPU route, see limitations) |
Shared speech, timeline and captions of reg-harbour06 equal DUAL-06 exactly (mix.wav 2b1a46fd843a58b2…, timeline.json ce5b897b293c5ec1…, captions.srt 9c9806d7699af7fe…). The 235.7 s film is the longest the 290 s request produced: content-mode length follows the narration.
**Found and fixed by the qualification** (each reproduced by a failing test first):
- the batch refused a passing 235.7 s production because its 504 KB quality report exceeded the 256 KB request JSON limit, and the retry re-rendered it (production reports now have their own 32 MB bound);
- the planner drew lists with their first item missing ("planted tomatoes, beans, lettuce and squash" → Beans, Lettuce, Squash; "rain, snow, sleet or hail" → Snow, Sleet, Hail); now the whole sentence is shown instead. All 77 example plans compared: only the two new DUAL-09 fixtures change;
- the charts fixture's pie legend repeated the percentage (fixture fixed; kg values).
**Owner review changes (after the films; not re-rendered, owner's decision: "the films are quite good as they are")**:
- **No more light beams** (owner: "those lights should be removed. they dont offer anything"): the diagonal light shafts of the atmosphere effect are gone from every new Director film, on both backends (new optional idelity.lightShafts, Director writes 0; dust and lighting unchanged; authored projects unchanged). Checked on native stills of d09-dialogue, CPU and Three.js, before and after.
- **Both eyes on turned heads (CPU)** (owner: "the turning person in some frames with one eye visible and one invisible"): a person's eyes, brows, nose and mouth now sort in front of the head on the crafted CPU painter (CRAFTED.detailBias 0.10), like the robot-eye repair. Tested over 6,000+ head poses and cameras; Three.js was never affected.
- The qualification films above were rendered **before** these two changes, so they still show the beams and, on CPU, the occasional missing far eye. New films get both changes.
**Crash recovery, for real:** the session window closed during the matrix (runner killed mid-render). `batch.mjs resume` set the interrupted attempt aside and re-ran it; the seven finished pairs were kept untouched.
**Agent inspection:** four stills per film (15/40/65/90 %), both backends: characters large and uncut, captions in their boxes, aids and pictures identical across backends. **Owner review: pending.**

## Performance (this laptop; repeatable fixture reg-harbour06, 1273 frames, 42.4 s, concurrency 8; run 1 cold, runs 2–3 warm)
| Route | Total per run | Frames/s | Peak GPU memory | Peak extra RAM | Byte-stable over 3 runs |
|---|---|---|---|---|---|
| CPU Canvas | 46.9 s / 44.4 s / 46.7 s | 28.5 | — | 2.5 GB | **yes** (= recorded film) |
| Three.js, RTX (`vulkan`, opt-in) | 31.6 s / 30.9 s / 30.5 s | 44.3 | 1.59 GB | 2.4 GB | **no** (visually identical, see limitations) |
| Three.js, software (`swangle`, default) | 372 s / 372 s / 378 s | 3.4 | — | 3.3 GB | **yes** |
The cold run differs mainly in composition selection (CPU 1.8 s cold vs 0.45 s warm). The GPU route was read from the render (ANGLE Vulkan on the RTX 4060) and `nvidia-smi`; there is no silent software fallback.
**Studio preview pictures (hardening):** at most two picture loads at once, obsolete loads aborted. Real Chromium, 24 pictures at the 64 MB limit, 96 rapid switches: peak browser memory above idle +1221/+1372 MB before, **+676/+596 MB after**; the loader's own bound is 448 MB of picture memory.

## Known limitations
- **Three.js on the GPU route is not byte-identical from run to run** (three renders: three hashes; average 60 dB PSNR, worst frame 51.5 dB: invisible). CPU Canvas and the software Three.js route are byte-identical. Matched pairs therefore compare shared inputs and semantics, never Three.js film bytes; this was first recorded at DUAL-04 (≈ 64 dB between identical scenes) and is confirmed here; earlier identical Three.js hashes were not a guarantee.
- One render at a time on a machine (render lock); no parallel batch mode.
- The Studio keeps its own job list in memory; it honours the render lock but does not list batches and its jobs are not restart-recovered.
- A cancelled or stopped pair re-renders both backends.
- Landscape and square need a content mode; classic character films are vertical only.
- Classic narrator films keep their exact length; content-mode films follow the narration (about 2.2 words per second).
- The planner never invents data, formulas or pictures: charts and equations come from `visuals`, pictures only from the local library.
- Preview picture memory is bounded in the loader, not hard-capped for the whole browser process.
- "Loudness-driven mouths" are not lip-sync.
- The process-memory bench samples Windows only; PID-reuse detection uses start times on Windows and Linux only.

## Environments
| Environment | Status |
|---|---|
| Windows 11 Home, AMD Ryzen 9 7845HX, 15 GB RAM, RTX 4060 Laptop (driver 566.07), Node 22.17.0, Python 3.11.9 | **verified**: tests, all renders, both GL routes |
| Ubuntu (GitHub Actions) | **verified for tests only** (every PR: JS, Python, syntax, frozen protocol); no automatic renders by policy |
| Windows 11 clean install (fresh clone of fee87d8, `npm ci` 19 s, fresh venv + `pip install -r requirements.txt` 17 s) | **verified for tests**: 554 JS (0 fail, 1 Windows skip), Python 63 OK; models and renders not repeated from the clean clone |
| macOS, other GPUs, AMD/Intel GPU routes | **not verified** |

## Dependencies, models and licences (inventory; no redistribution claims)
| Component | Version | Licence (as stated) | Note |
|---|---|---|---|
| Remotion (`remotion`, `@remotion/cli`, `@remotion/media`) | 4.0.546 | Remotion License | free for individuals and companies up to 3 employees; a company licence is required above that — check before commercial use |
| three | 0.180.0 | MIT | |
| react, react-dom | 19.2.0 | MIT | |
| @mathjax/src | 4.1.3 | Apache-2.0 | Node-only |
| Fonts: Inter, Merriweather, JetBrains Mono, Noto Sans | see fonts.lock.json | SIL OFL 1.1 | unmodified, hashes checked |
| kokoro-onnx | 0.6.1 | not stated in installed metadata | check upstream |
| Kokoro model files (`kokoro-v1.0.int8.onnx`, `voices-v1.0.bin`) | model-files-v1.0 | check upstream | downloaded by `scripts/setup_models.py`, not in Git |
| espeakng-loader (bundles eSpeak NG) | 0.2.4 | not stated in metadata; eSpeak NG is GPL-3.0 upstream | **GPL: check before redistributing a bundle** |
| phonemizer | 3.6.0 | GPL-3.0-or-later | **GPL: check before redistributing a bundle** |
| onnxruntime | 1.32.0 | MIT | |
| numpy, scipy, soundfile, imageio-ffmpeg | 2.2.6, 1.15.3, 0.14.0, 0.6.0 | BSD | the FFmpeg binary inside imageio-ffmpeg has its own licence |
| Picture library (`public/media`) | dual05-* | own work (procedural) | |
The project itself has **no licence selected**. Nothing in this release claims commercial redistribution rights.

## Security review (DUAL-09)
| Boundary | Protection | Tests |
|---|---|---|
| Local Studio server | binds 127.0.0.1; Host and Origin checked (DNS rebinding, cross-site requests refused); 1 MB request bodies; CSP, nosniff, no-referrer, same-origin resources | Studio server tests |
| Untrusted JSON | size and depth bounds; `__proto__`/`constructor`/`prototype` keys refused (requests, projects, batch manifests, production reports) | schema, batch and repair tests |
| Paths and imports | safe IDs (reserved Windows names refused), realpath containment, links refused, picture signatures, sizes and hashes verified | media, batch and Studio tests |
| Render snapshots | immutable input snapshots with SHA-256; Studio jobs render snapshots, not live files | batch and Studio tests |
| Logs | capped (Studio 40 kB per job, batch 8 MB per attempt with a cut marker) | batch tests |
| Cancellation | whole process tree ended and verified gone (Windows Win32_Process walk + taskkill; POSIX process groups); fail closed if the tree cannot be listed | batch and repair tests |
| Equations | TeX allowlist; outlines regenerated from TeX at the trusted boundary | maths tests |
No network service is exposed beyond the local machine; remote Director adapters stay optional.

## Troubleshooting and recovery
| Symptom | Fix |
|---|---|
| "Install FFprobe or set AETHER_FFPROBE" | set the render session variables (LOCAL_DEVELOPMENT.md: `PYTHON`, `AETHER_FFMPEG`, `AETHER_FFPROBE`) |
| "Another render is running on this machine: …" | wait for the named holder; a lock left by a crashed process is taken over automatically |
| A batch was interrupted (crash, closed window) | `node scripts/batch.mjs resume <batch>`: finished films are kept, the interrupted attempt is set aside and re-run |
| Three.js renders are slow | opt in to the GPU route: `AETHER_GL=vulkan` (NVIDIA; check `nvidia-smi`) |
| "text overflow …" / "equation overflow …" | shorten the text or enlarge the item's box (per-format boxes allowed) |
| A picture is refused | import it with `node scripts/media-import.mjs add …`; only PNG, JPEG and static WebP |

## Evidence index
- Batches (git-ignored, on the owner's machine): `out/batches/dual09-matrix-r2` (9 verified pairs + the failed long job's attempts), `out/batches/dual09-final-r1` (charts and long, final), `dual09-long-r1` and `dual09-charts-r1` (superseded by final-r1: the list defect), `dual09-matrix-r1` (setup error, every job failed fast). `node scripts/batch.mjs verify <batch>` re-hashes every film.
- Benches: `out/bench/d09-harbour-three`, `d09-harbour-cpu`, `d09-harbour-three-swangle` (results.json each); `out/dual09-preview-mem/result.json` (`node scripts/preview-memory-bench.mjs --old <DUAL-07 preview-media.js>`).
- Fixtures: `examples/dual09-*.request.json`, `examples/batches/dual09-*.batch.json`.
- Milestone records: docs/continuity/CAMPAIGN_A.md ("DUAL-09 evidence") and the per-milestone evidence sections there for DUAL-00 … DUAL-08.
