# Local installation, rendering and debugging
Use the repository's real entry points; do not invent commands or claim this PC is verified. Baseline: Ubuntu 24.04 x86_64, Node 22, CPython 3.11. Windows and macOS are not certified by previous CI. Choose the actual host; do not assume Windows/WSL/Linux. For desktop GPU rendering prefer native OS when driver/browser support is verified; WSL GPU access does not by itself prove Chromium WebGL acceleration.

## Clone / update
```bash
git clone https://github.com/SaridakisStamatisChristos/AetherMotionStudio.git
cd AetherMotionStudio
git status --short --branch
git rev-parse HEAD
```
Already cloned: use `git pull --ff-only` only when clean and authorized; never reset user changes. Start Claude Code at repo root (VS Code terminal or extension). Repo-local CLAUDE.md is loaded by Claude Code, subject to its normal instruction-loading behavior. Run the startup prompt in START_CLAUDE.md; inspect loaded instructions if needed.

## Prerequisites and setup
Check `node --version`, `npm --version`, Python 3.11, `ffmpeg -version`, `ffprobe -version`, eSpeak NG, free disk, NVIDIA driver and GPU if present. Install missing prerequisites with user permission. Initial internet required for npm/Python wheels, models and Remotion Chromium. Never paste credentials into repo.
Ubuntu:
```bash
# Only if required, with owner approval:
sudo apt-get install -y ffmpeg espeak-ng python3-venv
python3.11 scripts/release_setup.py
source .venv/bin/activate
npm test
PYTHONPATH=scripts python -m unittest discover -s tests -p 'test_*.py'
node scripts/foundry-qualify.mjs plan
python scripts/release_setup.py --verify-models
```
Use actual Python 3.11 installation if unavailable from host package manager. On Windows PowerShell (candidate path, not previously qualified):
```powershell
py -3.11 scripts/release_setup.py
# No activation required when invoking Python explicitly:
$env:PYTHON = (Resolve-Path .venv/Scripts/python.exe).Path
npm test
$env:PYTHONPATH = "scripts"
& $env:PYTHON -m unittest discover -s tests -p "test_*.py"
node scripts/foundry-qualify.mjs plan
& $env:PYTHON scripts/release_setup.py --verify-models
```
Install FFmpeg/ffprobe and eSpeak NG separately if required. Inspect errors, shell quoting and PATH; do not bypass PowerShell execution policies or change system security settings. If release_setup fails on a Windows-specific dependency, isolate the minimal compatibility fix and test it; don't discard dependency/model pins. On Linux, activate venv or set PYTHON explicitly. Repo supports AETHER_FFMPEG, AETHER_FFPROBE, PYTHON, KOKORO_MODEL_DIR, AETHER_GL. If lock absent setup resolves npm lock; preserve resolved versions in evidence, review before committing lock changes. `python scripts/setup_models.py` downloads required models; don't re-download valid weights.

## First local baseline — short and controlled
Run a small existing film; `out/<scene-id>/film.mp4` contains output; avoid reuse of IDs if original evidence exists. Copy the fixture with only a fresh safe ID if needed. For known shared-speech pair use produce's unique ID:
```bash
npm run validate -- examples/cinematic-cpu-polished.json
npm run render -- examples/cinematic-cpu-polished.json
# 30s matched CPU/Three release pair only after local baseline / user approval:
npm run produce -- --request examples/release.request.json --backend both --repair --id local-baseline-01
```
Check `scripts/produce.mjs` for exact flags before customizing. The production pair uses one prepared plan/audio; not all legacy fixtures use it yet. No routine full-suite re-render. Direct render CLI re-synthesizes independently, so its separate CPU and Three invocations are not controlled matched benchmarks. `npm run render -- examples/foundry-af09-cpu-polished.json` and corresponding Three fixture render the 30s product; output IDs are existing fixture IDs.

## GPU rendering (opt-in)
Actual helper scripts/native-render.mjs uses `AETHER_GL || 'swangle'`, fixed concurrency 2 and passes --gl only for Three. Remotion v4 desktop ANGLE is a supported candidate; check [GL options](https://www.remotion.dev/docs/gl-options) and pinned CLI help, not v5 defaults. GPU use must be observed. Software swangle remains portable fallback chosen explicitly, not hidden. Do not modify backend defaults globally. On Linux:
```bash
nvidia-smi
npx --no-install remotion gpu --gl=angle
AETHER_GL=angle npm run render -- examples/cinematic-three-polished.json
```
PowerShell:
```powershell
nvidia-smi
npx --no-install remotion gpu --gl=angle
$env:AETHER_GL = "angle"
npm run render -- examples/cinematic-three-polished.json
Remove-Item Env:AETHER_GL
```
Check actual renderer/vendor via WebGL/Chromium diagnostics, driver and GPU usage/VRAM during render; distinguish SwiftShader from RTX. If GPU mode fails, record evidence and diagnose; no automatic substitution. On long runs monitor RAM/VRAM; Remotion documents potential ANGLE memory growth. Begin small; don't change concurrency, resolution, hardware encoding or rendering algorithm mid-benchmark. Candidate alternative modes only after verifying supported flags and target system. Do not interpret fast render alone as GPU evidence.

### Verified owner PC profile (Windows 11, hybrid RTX 4060 Laptop + Radeon 610M) — LOCAL-01, 2026-11-24
`npx remotion gpu` fails in headless shell 158 (chrome://gpu ERR_FAILED); identify GL via WebGL WEBGL_debug_renderer_info instead. On this hybrid laptop `angle` selects the AMD iGPU and `angle-egl` the Microsoft Basic Render Driver; only `vulkan` reached the RTX. Per-process environment used for verified renders (PowerShell, repo root):
```powershell
$env:PYTHON = (Resolve-Path .venv/Scripts/python.exe).Path
$env:AETHER_FFMPEG = (Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path
$env:AETHER_FFPROBE = (Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path
$env:AETHER_GL = "vulkan"   # opt-in RTX path for Three.js; omit for default swangle
npm run render -- examples/cinematic-three-polished.json
```
Confirm GPU use each time with `nvidia-smi` (chrome-headless-shell.exe listed as C+G, nonzero utilization). The Windows per-app GPU preference route for `angle` was not tried (system setting). See CURRENT_STATE for measured evidence.

## Studio and authoring
`npm run studio:local` → http://127.0.0.1:4173; local validated projects and native render jobs. `npm run studio` is Remotion Studio; `npm run prepare-audio -- examples/cinematic-cpu-polished.json` prepares audio before preview when appropriate. See docs/STUDIO.md and docs/DIRECTOR.md.
```bash
npm run director -- --topic "How computers send messages across a network" --seconds 60
npm run produce -- --topic "How a molecule is built" --seconds 30 --backend cpu --id local-molecule-01
```
Offline Director is curated/deterministic, not an LLM. External providers optional. Keep input safe and validated; review actual source before enabling. Model/API keys only in local environment; no mandatory API.

## Troubleshooting / acceptance
- Start with exact error and failed command; inspect path, versions, actual process exit, relevant source/tests, GL, audio and ffprobe logs. Don't repeatedly rerun 48 expensive jobs.
- Verify scene, timeline, narration, captions and actual film resolution/frames/duration/streams/full decode via scripts/verify.py and ffprobe. Open film and review motion, camera, occlusion, intelligibility. Hash exact compared inputs; for a matched pair use one preparation with same normalized scene/profile. Keep failed outputs separately.
- Record source SHA, dependency/model versions, hardware, OS/browser/driver and GL identity, concurrency, frame count, actual timing and peak memory if available. Compare same hardware and repeated measurements, not incomparable GH runners. Distinguish render+encode elapsed from pure drawing. Never claim GPU or SOTA from timings alone.
- Test-only CI remains automatic. Native manual workflow only when explicitly requested. No release/merge/push without owner approval.
