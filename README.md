# AetherMotion Studio

Local-first procedural video production with native Remotion 4.0.546 and Kokoro ONNX. The LLM writes scene data rather than rendering frames. No paid inference API is required by the core.

## v1.0 (release candidate)
Three original templates, a strict compact JSON scene contract, frame-addressed canvas rendering, local neural narration, procedural score/SFX, music ducking, a one-command renderer, tests and CI artifacts. The first template preserves the previously verified Robot Treasure choreography; the second is an independent blockchain explainer. Robot Lab reuses the robot rig and adds a new energy-core asset with independent cinematic choreography. See [asset library](docs/ASSET_LIBRARY.md). The original v1 format remains fixed at 12 seconds. New v2 films support multiple shots, frame-exact durations up to 300 seconds, or automatic durations measured from Kokoro; captions follow measured phrase boundaries. See [timeline](docs/TIMELINE_V2.md). A new composable cinematic graph supports explicit CPU and Three.js WebGL backends, shared assets, camera keyframes and effects. Both backends are permanent first-class options; see [dual-backend policy](docs/DUAL_BACKEND_POLICY.md). Optional fidelity controls add shared cinematic post effects and enhanced materials; see [visual fidelity](docs/VISUAL_FIDELITY.md). The [universal asset catalog](docs/UNIVERSAL_ASSETS.md) adds 250 procedural object presets, 50 motion presets and 30 effect presets. The additive [cinematography engine](docs/CINEMATOGRAPHY.md) adds shared camera rigs, bounded character actions, attachments, panel component animation, world layers, and data overlays. The [provider-neutral Director](docs/DIRECTOR.md) compiles a topic or supplied script into validated cinematic data. Offline planning is deterministic, curated and not an LLM; optional local and opt-in remote adapters or imported IR support model-assisted authorship. See [cinematic graph](docs/CINEMATIC_GRAPH.md).

## Local installation (Ubuntu, Node 22, Python 3.11)
```bash
sudo apt-get install -y ffmpeg espeak-ng python3-venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm install
python scripts/setup_models.py
npm test
npm run render -- examples/robot-treasure.json
npm run render -- examples/blockchain-explainer.json
npm run render -- examples/robot-lab.json
npm run render -- examples/blockchain-60s.json
npm run render -- examples/auto-robot.json
npm run render -- examples/cinematic-cpu.json
npm run render -- examples/cinematic-three.json
npm run render -- examples/cinematic-cpu-polished.json
npm run render -- examples/cinematic-three-polished.json
npm run catalog
npm run render -- examples/asset-showcase-cpu-polished.json
npm run render -- examples/asset-showcase-three-polished.json
```
First setup needs internet for dependencies, weights and Remotion's browser download; subsequent synthesis/rendering can be offline with assets and browser cached. On Windows install FFmpeg/eSpeak NG separately and use a Python venv; Windows is not yet tested.
The output is `out/<scene-id>/film.mp4` plus narration, report, probe and review frames. For Studio preview, run `npm run prepare-audio` before `npm run studio`. The default Studio composition uses Robot Treasure. CLI rendering accepts any registered template through JSON.

## Author new content
Copy an example, give it a unique lowercase id, choose an allowed template and voice, and edit the copy, narration windows and captions. Run `npm run validate -- path/to/scene.json`, then render. No generated executable code is necessary for supported templates. Do not use the same ID concurrently. Routine CI runs tests only. Manual suite=release-pair runs matched 30-second CPU and Three.js release films from one plan and soundtrack. Manual suite=full retains the full 48-job render matrix; do not run it without authorization.

## Architecture and status
See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [scene contract](docs/SCENE_V1.md), [agent instructions](AGENTS.md), and [provenance](docs/PROVENANCE.md).
The Remotion dependency has its own license; this repository does not relicense Remotion. No project license has been selected yet. Refer to https://www.remotion.dev/docs/license and the Kokoro/model licenses before redistribution or commercial deployment.

### CI setup
The feature/main workflow uses Python wheels (including Kokoro's bundled phonemizer), Remotion's packaged ffprobe and a separate imageio-ffmpeg binary for full decode and review stills. It does not invoke apt or sudo. System FFmpeg/ffprobe remain the default for local CLI verification unless AETHER_FFMPEG and AETHER_FFPROBE are configured. CI runs on main/feature pushes and manual dispatch, not again on every pull-request update; stale runs on the same ref are cancelled by workflow concurrency. Actual CI renders remain the acceptance gate.

## AI Creative Director
`npm run director -- --topic "How computers send messages across a network" --seconds 60 --render` produces a planned and measured cinematic project with local Kokoro narration. Omit `--render` for plan-only. See [Director](docs/DIRECTOR.md) for local model endpoints, opt-in providers and manual import.

## Persistent identities
`npm run director -- --request examples/continuity-cpu-polished.request.json --render` creates a five-shot story with named recurring robot Orion, a persistent carried prop, location change and authorized active state. Exported identity-library.json can be reused with `--library path --cast orion,repair-tool,launch-lab,city-station`. See [identity and continuity](docs/IDENTITY.md). `npm run audit-assets` emits full neutral geometry/capability audit JSON without rendering videos.

## Speech-first production
`npm run director -- --request examples/speech-cpu-polished.request.json --render` compiles a supplied script into a mixed fixed/automatic 60-second timeline with two local voices, estimated word-highlighted captions, SRT/WebVTT, procedural music/SFX, sample peak and timing reports. Use `--prepare` for audio preflight. See [Speech production](docs/SPEECH.md).

## Quality evaluation and bounded repair
`npm run quality -- examples/quality-cpu-polished.json --repair` performs a read-only geometric inspection and outputs a proposed repaired project. `npm run render -- examples/quality-cpu-polished.json --quality --repair` performs measured-timeline camera repair, one native render, decoded media audit and contact sheet. `npm run director -- --request REQUEST.json --render --quality --repair` enables the same pipeline for Director output. See [Quality](docs/QUALITY.md).

## Local visual Studio
After the normal local install, run `npm run studio:local` and open http://127.0.0.1:4173. Projects, offline Director, asset browser, editable shots, silent draft preview, measured audio preparation, native CPU/Three.js render jobs and quality/export reports share existing production contracts. `npm run studio` remains the original Remotion Studio. See [Local Studio](docs/STUDIO.md). Several films in a row: `node scripts/batch.mjs create <batch.json>` then `run`, one render at a time with cancel, resume and restart recovery; see [Batch production](docs/BATCH.md).

## One-click production (v1.0)
On a clean Linux x86_64 checkout with Node 22 and Python 3.11:
```bash
python3.11 scripts/release_setup.py
npm run produce -- --topic "How a molecule is built" --seconds 30 --backend cpu
# Matched pair with identical measured speech and timeline:
npm run produce -- --request examples/release.request.json --backend both --repair
# Matched pair from an existing authored v2 project (narration prepared once, no retiming):
npm run produce -- --project examples/cinematic-cpu-polished.json --pair examples/cinematic-three-polished.json --backend both --id my-pair
```
On Windows PowerShell, invoke `node scripts/produce.mjs ...` directly: PowerShell drops the bare `--` before npm sees it.
For a single visual workflow use `npm run studio:local` then **Generate & render film**. CLI output is under `out/<id>-<backend>-<profile>/film.mp4`; `out/<id>-production/` contains plan, dependency/model evidence and comparison for a pair. No remote inference required. Existing provider-neutral CLI remains available. See [release guide](docs/RELEASE_1_0.md) for limitations and replay.

## Current CI and local render policy
Routine pushes run JavaScript and Python tests, syntax checks and the frozen Foundry protocol planner only. Native rendering is opt-in via Actions → Core - Remotion and Kokoro → Run workflow (CPU showcase, release-pair or full). The original 48 render jobs succeeded; the final nine-pair Foundry comparison and all 15 historical phase comparisons passed after targeted recoveries in run 45447693269 (frozen source, not a clean full rerun from current main). See docs/foundry/STATUS.md. Archived one-off recovery workflows are under docs/foundry/ci-history/. Local development on a GPU-equipped PC is preferred for rendering and performance tests.

## Claude Code local continuation
The project already includes persistent [Claude Code instructions](CLAUDE.md), [forward-only continuity files](docs/continuity/README.md), [local setup/GPU guide](docs/continuity/LOCAL_DEVELOPMENT.md), [current state](docs/continuity/CURRENT_STATE.md), [handoff](docs/continuity/HANDOFF.md) and [startup prompt](docs/continuity/START_CLAUDE.md). Clone main, open Claude Code at the repository root, and use that prompt. No historical chat or full CI log replay required. Current development roadmap is proposed in NEXT_UNITS.md. Preserve both renderers and test-only CI. The prior release/CI descriptions are historical where they conflict with current policy.
