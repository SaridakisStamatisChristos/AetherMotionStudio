# AGENTS.md — AetherMotion Studio
## Mission
Build a local-first, CPU-capable procedural video system. Keep Remotion as an external pinned dependency; do not modify upstream internals. Use local Kokoro for narration. Prefer compact validated data to LLM-generated code.

## Forward-only workflow
Read README, docs/ROADMAP.md, docs/ARCHITECTURE.md and the nearest relevant source/tests. Inspect current branch/CI. Work on the next unmet gate; do not repeatedly reread old video outputs or rewrite accepted components. Preserve binding decisions and canonical examples. Record new evidence and unresolved failures. Never call a feature complete without actual test/render evidence.

## Commands
`npm test`; `npm run validate -- examples/robot-treasure.json`; `npm run render -- examples/robot-treasure.json`.
Python scripts need a venv, requirements, FFmpeg, eSpeak NG and Kokoro models. v1.0 scoped release campaign: user explicitly requests both CPU and Three.js at exactly 30 seconds. Default CI runs fast tests and one shared-plan/shared-speech native release pair; no unrelated legacy renders. v0.9 predecessor 509976b, run 45364949340, artifact 14906287274, scoped pass (Studio HTTP save/edit/inspect, 1500-frame native CPU film, export); user approved continuation. v0.8 predecessor d17e90c, run 45363159018, artifact 14905862385, scoped pass (1500 frames, one accepted camera repair, 0 errors/0 warnings, review findings remain); user approved continuation. v0.7 predecessor d8816f5, run 45361307457, artifact 14904319584, scoped pass (1800 frames, native CPU, subtitle and audio verification); user approved continuation. Five reading-speed outliers recorded, estimated word timing remains estimated. v0.6 predecessor 24210f9, run 45359000856, artifact 14902619722, scoped pass (1500 frames, native CPU, Kokoro); user approved continuation. v0.5 predecessor 8217443, run 45356660809, artifact 14902667298, scoped pass (1800 frames, native CPU, Kokoro); user approved continuation. v0.4.3 scoped predecessor fd6cbdd, run 45355048931, artifact 14902251836, passed; user accepted current visual quality for forward development. Defer advanced motion and artistic polish. Do not call v1.0 accepted until the actual release pair, shared timeline/audio checks, decoded media reports and exact 900-frame outputs pass; browser interaction and full legacy matrix remain separate verification surfaces. No automatic release publication or merge. Loopback-only local server, explicit revision checks, immutable job snapshots and no shell execution from requests. Camera repair is opt-in, bounded, never rewrites protected content or invokes extra native renders; subjective review and unverified checks must stay explicit. Estimated word timing must never be called forced alignment; keep measured phrase boundaries authoritative. Identity libraries are immutable recipe-versioned data; never overwrite appearance outside authorized variants. Preserve all prior fixtures and Three.js; manual suite=full restores complete matched render gate at the end. Use the same tests for new template changes. Keep models, generated audio/video, node_modules and secrets out of git.

## Engineering invariants
- Scene JSON is untrusted; validate before using IDs/paths or rendering.
- No network or wall-clock access inside draw functions; deterministic frame addressing.
- No silent TTS fallback, audio truncation, or fake CI success.
- Do not claim native rendering from an alternative renderer.
- Add adversarial tests for contract changes; separate structural validation from visual/audio quality evaluation.
- Do not expose credentials, introduce paid API requirements or change project licensing without authorization.
- Both CPU Canvas and Three.js WebGL are mandatory first-class backends. Follow [binding dual-backend preservation policy](docs/DUAL_BACKEND_POLICY.md). Preserve original and polished fidelity profiles and matched regression fixtures. The user-authorized temporary CPU-only render scope is documented in DUAL_BACKEND_POLICY.md. GPU-specific features must remain optional; no backend may be removed without explicit user authorization.
- Do not copy entire upstream repositories into this project.
- When adding agent guidance, link official Remotion skills (https://github.com/remotion-dev/skills); don't claim installed skills unless actually installed.

## Foundry campaign AF-01
Successor to accepted v1.0 main db54822d6b785375f47f18f50555ffccbf9eef16 (CI 45375807857). Use docs/foundry/STATUS.md as the forward-only checkpoint. Default pushes: fast tests + one polished AF-01 CPU film only. Manual release-pair/full remain runnable; no native Three.js Foundry render without authorization. Legacy geometry/profile unaffected by opt-in geometryProfile. No automatic merge.

## Foundry AF-02 successor
AF-01 accepted for continuation at 4e0a2eb (run 45387263982, 125 tests, artifact 14916512944). Default scope now AF-02 fast tests and one polished CPU material study; retain AF-01 evidence and manual full native gate. Use docs/foundry/MATERIALS.md and STATUS.md. No auto merge.
