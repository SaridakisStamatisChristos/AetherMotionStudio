# AetherMotion Studio

Local-first procedural video production with native Remotion 4.0.546 and Kokoro ONNX. The LLM writes scene data rather than rendering frames. No paid inference API is required by the core.

## v0.2 (candidate)
Three original templates, a strict compact JSON scene contract, frame-addressed canvas rendering, local neural narration, procedural score/SFX, music ducking, a one-command renderer, tests and CI artifacts. The first template preserves the previously verified Robot Treasure choreography; the second is an independent blockchain explainer. Robot Lab reuses the robot rig and adds a new energy-core asset with independent cinematic choreography. See [asset library](docs/ASSET_LIBRARY.md). Both currently use a fixed 12-second, 1080×1920, 30 fps format. Captions are authored timed phrases, not automatic word alignment. No general 3D renderer or AI director is claimed yet.

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
```
First setup needs internet for dependencies, weights and Remotion's browser download; subsequent synthesis/rendering can be offline with assets and browser cached. On Windows install FFmpeg/eSpeak NG separately and use a Python venv; Windows is not yet tested.
The output is `out/<scene-id>/film.mp4` plus narration, report, probe and review frames. For Studio preview, run `npm run prepare-audio` before `npm run studio`. The default Studio composition uses Robot Treasure. CLI rendering accepts any registered template through JSON.

## Author new content
Copy an example, give it a unique lowercase id, choose an allowed template and voice, and edit the copy, narration windows and captions. Run `npm run validate -- path/to/scene.json`, then render. No generated executable code is necessary for supported templates. Do not use the same ID concurrently. The GitHub workflow runs all three examples and publishes downloadable artifacts on success.

## Architecture and status
See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [scene contract](docs/SCENE_V1.md), [agent instructions](AGENTS.md), and [provenance](docs/PROVENANCE.md).
The Remotion dependency has its own license; this repository does not relicense Remotion. No project license has been selected yet. Refer to https://www.remotion.dev/docs/license and the Kokoro/model licenses before redistribution or commercial deployment.
