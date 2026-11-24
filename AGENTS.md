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

## AF-03 successor
AF02 accepted for continuation at 81b10e6, CI 45389538842, 132 tests. Default fast tests + AF03 benchmark + one CPU polished film. No automatic LOD downgrades on budget failure; selected detail must be shot-stable and reported. Preserve prior fixtures and native Three. See docs/foundry/LOD.md and STATUS.md.

## AF-04 successor
AF03 accepted for continuation at 7fd75bc (run 45391188524, 137 tests). Default tests + AF04 inspection sheets and single narrative CPU film. Preserve original 250 IDs, explicit premium-only new IDs, AF01–03 and matched Three. No aesthetic acceptance from automation alone; see docs/foundry/HERO_ASSETS.md.

## AF-05 successor
AF04 verified at 477a3fa (run 45396749173, 143 tests). Default tests + local import corpus + one AF05 CPU polished film. Source import only through bounded local staging; no network/archive/executable input; quarantine uncertain licenses; no silent unsupported feature conversion. Preserve previous fixtures and both renderers.

## AF06 successor
AF05 verified at 10d0432 (run 45400775233, 148 tests). Default fast tests + bounded still inspection batch + one AF06 CPU film. Human review requires explicit scores and matching content/evidence digests, never automated approval. Native Three and full gate deferred. See docs/foundry/INSPECTOR.md.

## AF07 successor
AF06 verified at d45e075 (run 45405168868). Default tests + AF07 generation evaluation and exactly one polished CPU film; matched native Three fixture retained for manual full. No automatic promotion, merge or release. See docs/foundry/GENERATOR.md.

## AF08 successor
AF07 verified at ba69402 (run 45409971516); default fast tests + AF08 pack acceptance evidence + one CPU polished film. Both renderers and all prior fixtures preserved. Native Three/full only on explicit authorization; no merge. See docs/foundry/PACKS.md.

## AF09 successor
AF08 verified at cd5ba5b (run 45415008666). Freeze benchmarks/foundry-final-v1.json before final native runs. Default tests + protocol evidence + AF09 CPU product. Manual suite=full only on explicit authorization. No merge/release. See docs/foundry/QUALIFICATION.md.

## Current CI policy — local-first rendering (2026-11-24)
User authorizes merging the Asset Foundry implementation with routine CI restricted to fast JavaScript and Python tests, protocol planning and Python syntax checks. No automatic native renders or comparisons on pushes to feature branches or main. Manual workflow dispatch retains CPU showcase, matched release pair and complete native matrix. Historical recovery workflows are archived as documentation, not active triggers. Both backends, all fixtures, all original comparison assertions and prior evidence remain intact. Green routine CI does not signify full native qualification. The original full matrix rendered all 48 jobs; final AF09 nine-pair comparison passed following two targeted audio repairs; historical regression remains pending final Speech recovery and comparison. Native visual/performance validation moves to local hardware. Future matched benchmark work must prepare shared narration once per pair. No automatic release publication.

This current policy supersedes earlier default CI render scopes; do not reinstate automatic native renders without explicit authorization.

## Persistent local-development handoff (current)
Use [CLAUDE.md](CLAUDE.md) and [docs/continuity/README.md](docs/continuity/README.md) for project-local forward-only continuation. The compact bootstrap set is CURRENT_STATE.md, HANDOFF.md, LOCAL_DEVELOPMENT.md and NEXT_UNITS.md in docs/continuity/. Canon is authoritative; context compression may not discard binding facts. The upstream FODP v1.0 specification is vendored at the pinned source revision documented there. Earlier default-render and premerge status notes above remain historical. Current routine CI is test-only; no automated native renders, no automatic push/merge/release. Both backends and all fixtures remain first-class. Verify real evidence and update cumulative state and handoff on each authorized unit. Current first unit LOCAL-01, local setup and baseline, not yet verified on owner's PC. Update 2026-11-24: LOCAL-01 and LOCAL-02 (authored `--project` matched production) verified locally on branch local-dev, awaiting owner acceptance; LOCAL-03 prepared. See docs/continuity/CURRENT_STATE.md.
