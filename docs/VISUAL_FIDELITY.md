# v0.4.1 visual fidelity

Opt-in `fidelity` object on cinematic-graph shots. Every control is a finite [0,1] scalar; omitted object means v0.4 look, omitted controls within the object use bounded defaults. Both CPU and Three.js support the shared controls. Original matched examples remain unchanged. Polished fixtures differ only by ID and fidelity object.

| Control | Implementation |
|---|---|
| bloom | Downsampled luminance-threshold soft-knee highlight mask, blurred additive/screen glow |
| atmosphere | Procedural screen-space light shafts and drifting dust (not physical volumetric scattering) |
| contactShadow | CPU projected contact shadow approximation; Three.js stronger directional/hemisphere contrast with existing shadow maps (not SSAO) |
| surfaceDetail | CPU clipped face gradients and edge highlights; Three.js procedural roughness map and PBR parameter variations |
| depthOfField | Low-resolution peripheral defocus with protected central subject region (not depth-buffer/physical bokeh) |
| motionBlur | Two deterministic shutter subframe samples composited before typography/captions; zero disables extra sample |
| grain | Seeded changing film-grain tile |
| grade | Warm/cool soft-light grade |
| particles | Deterministic projected trails and atmospheric dust |
| typography | Entrance motion, title depth, restrained graphic accents |

No external media, shader packages, paid services or GPU-only features required for CPU. Three.js remains explicit. Full physical volumetric lighting, depth-aware bokeh, texture authoring and SSAO are future enhancements, not claimed here. This phase prioritizes bounded CPU-compatible cinematic improvements. Shared effects use reusable offscreen canvases and lower-resolution postprocessing. Unit tests validate malformed profiles, shutter endpoints, threshold and noise. Nine render fixtures plus matched baseline comparisons are required; visual review remains separate. Compare times on the same workflow, not cross-run as a rigorous benchmark.

Original v0.4 verified evidence is archived at https://github.com/SaridakisStamatisChristos/AetherMotionStudio/releases/tag/v0.4-render-baseline.
Commands: npm run render -- examples/cinematic-cpu-polished.json ; npm run render -- examples/cinematic-three-polished.json.
