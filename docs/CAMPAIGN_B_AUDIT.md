# Campaign B audit (GPU-00 inventory, read-only)

Source: `feature/gpu-00-architecture` from main 69a3a5e (tag `v1.2-dual-backend-final` → 2cb82ef). Date 2026-11-27. Every line below was checked against the source or a command run in this session. This is an inventory, not a design; the design is [ADR-001](adr/ADR-001-render-profiles.md).

## Baseline (observed on main 2cb82ef and again on this branch)
| Check | Result |
|---|---|
| `npm test` | 560 tests, 559 pass, 0 fail, 1 Windows skip |
| Python `unittest` | OK (matched native CPU / Three.js comparison PASS, shared hashes exact) |
| `node scripts/font-metrics.mjs --check` | up to date |
| Digests (`fod-digests.mjs --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual`) | graph 3d33fbaee198acad (204 shots), geometry 14dec244d171dc56 (250 assets, 6370 boxes), detail2 e3f80439a292f21a, director 8a0ad025b6c9f6d6 (7 requests); all equal the v1.2 values |

## Machine and GL routes
| Item | Observed |
|---|---|
| GPU | NVIDIA GeForce RTX 4060 Laptop GPU, driver 566.07, 8188 MiB, 0 MiB used at idle (`nvidia-smi`) |
| `vulkan` route | ANGLE (NVIDIA, Vulkan 1.3.289, RTX 4060 Laptop GPU), unmasked |
| `swangle` route (repo default) | ANGLE (Google, Vulkan 1.3.0, SwiftShader Device (Subzero)): software |
| `angle` route | ANGLE (AMD Radeon 610M, Direct3D11): the integrated GPU, not the RTX |
| three.js | 0.180.0 (pinned) |

## Three.js renderer (`src/visual/three-backend.js`, one module)
- **Renderer:** `WebGLRenderer({antialias:true, alpha:false, preserveDrawingBuffer:true, powerPreference:'low-power'})`, pixel ratio 1.
- **Colour:** `outputColorSpace = SRGBColorSpace`, `ACESFilmicToneMapping`, exposure 1.25 (+0.06 × fidelity.grade; × CRAFTED.three.exposure for crafted looks). Material colours are given as sRGB hex strings (three converts them to linear). No explicit colour-management test exists yet (GPU-01).
- **Lights:** one HemisphereLight (2.0, lowered by contactShadow), one shadow-casting key DirectionalLight (1024² PCFSoft map, ±5 ortho frustum, normalBias 0.025), one rim DirectionalLight with no shadow. Key position is moved by `materialLight()` for Foundry material profiles.
- **Environment:** `scene.environment` is set only by the Foundry premium material library (`createMaterialLibrary(renderer).begin(materialProfile)`); otherwise none. Linear `Fog(background, 14, 32)`. Floor plane 120×120 plus a GridHelper.
- **Materials:** `MeshStandardMaterial` only, cached in three maps (legacy, crafted, Foundry premium); one 64×64 procedural roughness DataTexture (hashNoise, seed 17).
- **Geometry:** a shared RoundedBoxGeometry for the box stream; crafted chamfered geometry cached by size (flushed above 4000 entries); Foundry meshes from `meshCommands()` → `toBufferGeometry()`, evicted per frame for `foundry-af05`.
- **Drawing:** one pooled `THREE.Mesh` per emitted box, `matrixAutoUpdate=false`. No instancing, no skinning, no post-processing, no render targets.
- **Disposal:** `dispose()` frees all caches, the shadow map and the renderer, then `forceContextLoss()`.
- **Device identity:** `adapter()` reads `WEBGL_debug_renderer_info` (DUAL-07); `native-render.mjs` also probes the route with `gl-probe.mjs` and stores `{renderSeconds, backend, gl, adapter, concurrency, hardwareAcceleration}` in timing.

## Shared scene and production seams
| Seam | Where | Relevance to Campaign B |
|---|---|---|
| Backend per shot | `validateGraph` (`src/core/graph.js:38`): `shot.backend` ∈ cpu, three | backend stays a shot field; the profile must not replace it |
| Project schema | `validateProject` (`src/core/timeline.js:16`): v2 film fields `version,id,title,voice,shots` + optional `identityLibrary,speech,audio,delivery,format` | the natural place for a new optional film-level field |
| Matched pairs | `matchedProject()` (`src/studio/production.js:29`) rewrites every shot's backend; `normalizedProject()` drops it; `produce.mjs --backend both` | a Cinematic film sent with `both` must be refused, not rewritten |
| Preflight | `repairProject()` / `inspectProject()` (`src/quality/preflight.js`), run per backend in `produce.mjs:86` **after** speech preparation | profile negotiation must run earlier, at option/plan time, before speech |
| Batch | `scripts/batch-lib.mjs:82,140`: backend ∈ cpu, three, both | gets the same profile check per job |
| Studio | `src/studio/director-form.js`, `settings.js`, `production.js` | profile choice later (GPU-11); validation reuse now |
| Director | `src/director/schema.js:79`: `request.profile` ∈ original, polished (the **fidelity** profile) | **name collision**: the new field cannot be called `profile` |
| Native render | `scripts/native-render.mjs`: `--codec=h264`, `--concurrency`, `--gl` (three only), optional `--hardware-acceleration`; settings from `perf-options.mjs` | report fields are added here |
| Benchmarks | `scripts/perf-bench.mjs` (re-renders a verified output from hash-checked prepared inputs; cold/warm; nvidia-smi samples), `gl-probe.mjs`, `preview-memory-bench.mjs` | GPU-00 reference measurements reuse these |

## Foundry (assets, materials, LOD)
- `material-three.js`: `createMaterialLibrary(renderer)` with a texture cache (`createTextureCache`), premium surfaces and an environment per material profile.
- `lod-policy.js`: `QUALITY_FLOOR` {hero 0, cinematic 1, efficient 2, preview 3}; `HARD_BUDGET` 160,000 triangles, 512 draw calls, 64 MiB geometry, `TEXTURE_BUDGET` textures; `enforceBudget()` fails visibly (no silent LOD change).
- `packs.js`: every asset row already carries `backends:['cpu','three']`. This is the place for a future per-asset capability list (GLB assets would be three-only).
- `import-bundle.js`: quarantine and digests (the GPU-04 base).

## `three/examples/jsm` at 0.180.0 (present in `node_modules`, part of the pinned dependency)
- **Loaders:** GLTFLoader, DRACOLoader, KTX2Loader, RGBELoader, HDRLoader, HDRCubeTextureLoader, EXRLoader, UltraHDRLoader.
- **Decoder libraries:** libs/draco (draco_decoder.js/.wasm), libs/basis (basis_transcoder.js/.wasm), meshopt_decoder.module.js, fflate, zstddec, ktx-parse.
- **Post-processing:** EffectComposer, RenderPass, OutputPass, UnrealBloomPass, BokehPass, SSAOPass, GTAOPass, SAOPass, SMAAPass, FXAAPass, TAARenderPass, SSAARenderPass, LUTPass, OutlinePass, ShaderPass, and others.
- **Environments:** RoomEnvironment, DebugEnvironment. **Utils:** SkeletonUtils, BufferGeometryUtils, SceneOptimizer and others.
- These need no new dependency, but each use is recorded when a milestone adopts it. Decoders (DRACO/KTX2/meshopt) need the owner's approval at GPU-04.

## Scope map per milestone (existing vs missing)
| Milestone | Existing | Missing |
|---|---|---|
| GPU-00 | backend field, adapter identity, perf-bench, gl-probe, preflight | render-profile field, capability table, early negotiation, reference scenes, budgets |
| GPU-01 | MeshStandardMaterial, sRGB output, ACES, crafted/Foundry roles | MeshPhysicalMaterial presets, colour-space tests, exposure contract |
| GPU-02 | 1 hemi + 2 directional, 1 PCFSoft shadow map, Foundry env per profile | presets, PMREM/RoomEnvironment for all scenes, contact shadows, AO |
| GPU-03 | 64² roughness texture, Foundry texture cache and budget | procedural texture generators (wood, metal, fabric…), tiers |
| GPU-04 | Foundry import quarantine and digests | GLB validation and loading |
| GPU-05/06 | box-character recipes, rig channels, loudness mouth, body/talk policies | SkinnedMesh, morphs, IK, clips |
| GPU-07 | dressed sets, packs | instancing, culling, set catalog |
| GPU-08 | 2D fidelity effects (shared path, captions excluded) | GPU passes via EffectComposer |
| GPU-09 | Campaign A 2D primitives | 3D scientific primitives |
| GPU-10 | perf-bench, LOD hard budgets | tiers, OOM diagnostics, leak tests |
| GPU-11 | Director, Studio | profile awareness |
