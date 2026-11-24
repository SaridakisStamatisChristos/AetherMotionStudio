# AetherMotion Studio

Local-first procedural video production with native Remotion 4.0.546 and Kokoro ONNX. The LLM writes scene data rather than rendering frames. No paid inference API is required by the core.

## v0.6 (candidate)
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
Copy an example, give it a unique lowercase id, choose an allowed template and voice, and edit the copy, narration windows and captions. Run `npm run validate -- path/to/scene.json`, then render. No generated executable code is necessary for supported templates. Do not use the same ID concurrently. The GitHub workflow generates and renders only the 50-second polished CPU identity continuity showcase on development pushes; manual suite=full runs all seventeen examples and publishes downloadable artifacts on success.

## Architecture and status
See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [scene contract](docs/SCENE_V1.md), [agent instructions](AGENTS.md), and [provenance](docs/PROVENANCE.md).
The Remotion dependency has its own license; this repository does not relicense Remotion. No project license has been selected yet. Refer to https://www.remotion.dev/docs/license and the Kokoro/model licenses before redistribution or commercial deployment.

### CI setup
The feature/main workflow uses Python wheels (including Kokoro's bundled phonemizer), Remotion's packaged ffprobe and a separate imageio-ffmpeg binary for full decode and review stills. It does not invoke apt or sudo. System FFmpeg/ffprobe remain the default for local CLI verification unless AETHER_FFMPEG and AETHER_FFPROBE are configured. CI runs on main/feature pushes and manual dispatch, not again on every pull-request update; stale runs on the same ref are cancelled by workflow concurrency. Actual CI renders remain the acceptance gate.

## AI Creative Director
`npm run director -- --topic "How computers send messages across a network" --seconds 60 --render` produces a planned and measured cinematic project with local Kokoro narration. Omit `--render` for plan-only. See [Director](docs/DIRECTOR.md) for local model endpoints, opt-in providers and manual import.

## Persistent identities
`npm run director -- --request examples/continuity-cpu-polished.request.json --render` creates a five-shot story with named recurring robot Orion, a persistent carried prop, location change and authorized active state. Exported identity-library.json can be reused with `--library path --cast orion,repair-tool,launch-lab,city-station`. See [identity and continuity](docs/IDENTITY.md). `npm run audit-assets` emits full neutral geometry/capability audit JSON without rendering videos.
