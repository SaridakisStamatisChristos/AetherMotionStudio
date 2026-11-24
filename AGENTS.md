# AGENTS.md — AetherMotion Studio
## Mission
Build a local-first, CPU-capable procedural video system. Keep Remotion as an external pinned dependency; do not modify upstream internals. Use local Kokoro for narration. Prefer compact validated data to LLM-generated code.

## Forward-only workflow
Read README, docs/ROADMAP.md, docs/ARCHITECTURE.md and the nearest relevant source/tests. Inspect current branch/CI. Work on the next unmet gate; do not repeatedly reread old video outputs or rewrite accepted components. Preserve binding decisions and canonical examples. Record new evidence and unresolved failures. Never call a feature complete without actual test/render evidence.

## Commands
`npm test`; `npm run validate -- examples/robot-treasure.json`; `npm run render -- examples/robot-treasure.json`.
Python scripts need a venv, requirements, FFmpeg, eSpeak NG and Kokoro models. CI renders both canonical examples. Use the same tests for new template changes. Keep models, generated audio/video, node_modules and secrets out of git.

## Engineering invariants
- Scene JSON is untrusted; validate before using IDs/paths or rendering.
- No network or wall-clock access inside draw functions; deterministic frame addressing.
- No silent TTS fallback, audio truncation, or fake CI success.
- Do not claim native rendering from an alternative renderer.
- Add adversarial tests for contract changes; separate structural validation from visual/audio quality evaluation.
- Do not expose credentials, introduce paid API requirements or change project licensing without authorization.
- Preserve CPU mode. GPU-specific features must be optional.
- Do not copy entire upstream repositories into this project.
- When adding agent guidance, link official Remotion skills (https://github.com/remotion-dev/skills); don't claim installed skills unless actually installed.
