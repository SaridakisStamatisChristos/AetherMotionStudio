# v0.4.2 Universal Asset Library

330 catalog entries: 250 object presets (247 new + three legacy), 50 motion presets and 30 effect presets. The new objects are low-poly procedural assemblies built from common parametric box/rod/ring families. They are not 250 independent model engines, photorealistic meshes, or external models. Each object ID selects a structural recipe. Motion presets are named keyframe sequences, and effect presets are named configurations of the existing glow/orbit/sparkles algorithms, not 30 new VFX algorithms.

| Category | Objects |
|---|---:|
| Characters and robots | 20 |
| Technology and electronics | 50 |
| Everyday objects | 50 |
| Buildings and architecture | 30 |
| Nature | 20 |
| Vehicles | 20 |
| Science and mathematics | 30 |
| Business and finance | 30 |

Both CPU Canvas and Three.js consume exactly the same shared box emitter. New assets support optional `params` with primary, secondary and accent hex colors and width/height/depth multipliers in [0.7,1.3]. The three original assets retain their original contract. A named `motion` preset can be selected per asset; explicit tracks override its channels. Effects may use `{"preset":"cyan-aura","target":"item-2"}` or their original explicit type/color/window. Some motion channels apply only to compatible articulated objects; root translation, yaw and scale apply to all. All data are validated before rendering, and no arbitrary code, remote models or paid API are required.

Discover the catalog with `npm run catalog` (machine-readable JSON). Authoring examples: `examples/asset-showcase-cpu-polished.json` and its matched Three.js counterpart. The showcase is 32 seconds, 8 categories, 24 selected objects; the automated unit tests exercise all 250 geometry presets, both matched contracts, all motion/effect presets and malformed inputs. The showcase is not visual validation of every object.

## Scoped CI decision (2026-11-24)

Per user authorization, development pushes render only the polished CPU showcase plus fast unit tests. Both renderers and all earlier fixtures remain intact. Full native render and matched comparisons are deferred until the end of refinement. Manually dispatch Core workflow with suite=full to restore the complete 11-video matrix, including both new showcase variants. Do not claim new Three.js rendering verified from CPU evidence. Prior v0.4.1 verified baseline: run 45350601641. Original v0.4 archived release remains unchanged.
