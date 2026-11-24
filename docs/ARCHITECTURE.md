# Architecture v0.1

Scene JSON → validation → local Kokoro synthesis & score mix → Remotion composition → H.264/AAC MP4 → independent ffprobe/full-decode/voice checks.

- Contract owns accepted shapes, safe IDs, supported templates/voices and fixed format.
- Templates own visual geometry, choreography and frame-addressed drawing. Renderers are pure relative to frame and scene data; no wall-clock time or network.
- Audio owns model acquisition (explicit), utterance fitting (bounded retries, fail rather than clip), speech gain, music ducking and segment evidence. eSpeak NG is a phonemizer dependency only; no speech fallback.
- CLI owns validated paths, output isolation by scene ID and sequential orchestration. Same-ID concurrent renders are unsupported.
- Verification is separate from the renderer. Container metadata alone does not prove visual quality or semantic narration accuracy; review stills and listen to the film.

## Deliberate constraints
12 seconds only; 1080×1920, 30 fps. Two handcrafted templates, not a general scene graph. Project-provided caption timings are not word-level alignment. Initial downloads require network; dependencies are not fully locked yet. No service/auth/UI layer. No arbitrary generated executable code on the normal scene path.

## Next architecture
Version the contract before expanding it. Extract geometry/rigs, camera paths, effects, typography and transitions into composable registries. Add a real Three.js backend alongside CPU Canvas; do not replace working baseline without visual comparison. Separate semantic storyboard generation from deterministic compilation; provider adapters remain optional. Add audio timing driven by measured phoneme/word alignment and a duration-aware planner. Preserve old examples as regressions.

## v0.2 extraction
Shared CPU mesh projection, registered asset emitters, pose parameters, motion keyframes and drawing primitives are now separate from template choreography. The fixed-format v1 contract still selects a complete template; arbitrary asset graphs remain a later gate. See ASSET_LIBRARY.md.

## v0.3 timeline
See TIMELINE_V2.md. V2 separates authored shot intent from measured speech/frame plan; the validated compiled timeline drives native Remotion metadata and exact frame addressing. Legacy scenes remain on their original renderer/audio path.

## v0.4 graph
One declarative shot produces backend-independent sampled state and asset box commands. CPU and WebGL consumers share the graph, timeline and overlay. See CINEMATIC_GRAPH.md.

## v0.4.3 candidate
Additive shared cinematography sampler, rig-aware actions, deterministic attachments, world-depth layers, and screen-space data overlays. See CINEMATOGRAPHY.md. Native verification pending; old contracts and both renderer implementations preserved.
