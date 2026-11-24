# Claude Code — AetherMotion Studio

Follow [AGENTS.md](AGENTS.md). Keep development forward-only and preserve canonical decisions.

## Mandatory session bootstrap
1. Run `git status --short --branch` and `git rev-parse HEAD`. Never discard or overwrite user changes.
2. Read [AGENTS.md](AGENTS.md) (binding engineering rules), [current state](docs/continuity/CURRENT_STATE.md), and [latest handoff](docs/continuity/HANDOFF.md). Use [local development guide](docs/continuity/LOCAL_DEVELOPMENT.md) for setup, [forward roadmap](docs/continuity/NEXT_UNITS.md) for planned work. Read only current task source/tests and their actual dependencies. Read the full [FODP specification](docs/continuity/FODP_PROTOCOL.md) when needed; its operational invariants below apply on every session.
3. Canon is authoritative; context compression must not discard binding canonical facts. Source code and verified evidence must be checked when a conflict or dependency arises. Earlier historical docs describe their own milestones, not current CI policy. The latest user-authorized policy in CURRENT_STATE and DUAL_BACKEND_POLICY governs routine CI.
4. Report Active unit | prior verified checkpoint | state loaded | blockers | next action. Begin the earliest unfinished authorized task. If no new task is specified, do local bootstrap and baseline inspection only; no speculative feature rewrite.
5. Do not reread all historical PRs, artifacts, old chats, files or logs. A concrete failing test, contract, contradiction or user's explicit request justifies a targeted lookup. Record reason and resulting canonical correction. Never assume missing history.

## Binding engineering and workflow rules
- Both CPU Canvas and native Three.js are permanent first-class backends. Preserve all examples, IDs, profiles, contracts and prior accepted evidence. No silent fallback or silent LOD change. Keep frame-addressed rendering deterministic and local-first.
- Core functionality first. No unsolicited auth, SaaS, telemetry, infrastructure, license change, dependency migration or renderer rewrite. No mandatory paid API. Respect local/opt-in providers.
- Automatic GitHub CI is TEST ONLY: JS/Python tests, Python syntax and frozen protocol plan. No automatic video jobs; manual native suites only with explicit authorization. A green quick CI is not full render qualification.
- Local rendering: first inspect machine, tool versions, GPU, drivers, model and dependency setup. Default Three GL is swangle; hardware angle is an opt-in to verify, not a guarantee. Do not change system configuration or install global packages without permission; avoid full matrix during bootstrap.
- For matched performance/visual comparisons prepare speech exactly once, share measured timeline, narration PCM, mix and caption sidecars, and verify hashes. Preserve original gates; do not weaken tests or edit historical evidence to make results green.
- No claim of tests passed, CI green, render succeeded, GPU use, merged, released, or user approval unless observed. Verify actual source revision and media; separate structural evidence, human visual review, audio review and performance claims.
- Work on one authorized unit, implement minimal coherent changes, add tests including negatives, verify actual results and preserve old evidence. Keep generated media/models, dependencies, secrets and machine-specific data out of Git. Do not push/merge/release without explicit user authorization; no automatic changes to GitHub Actions policies.

## End-of-unit checkpoint
Update CURRENT_STATE.md (cumulative canon, active status, durable obligations) and HANDOFF.md (current checkpoint, changed files, commands/results, unresolved risks and next action) coherently with the artifact. Update the roadmap and source-specific contracts when changed; do not erase earlier binding facts. Use [templates](docs/continuity/FODP_TEMPLATES.md). Maintain precise distinctions between planned, active, implemented, tested, accepted, merged and released. Keep a minimal history index rather than duplicating the archive. Never auto-advance a failed gate; a separately authorized repair or deferred gate must be documented. On context pressure checkpoint before starting a new session.

## Reusable commands (natural language, not external tools)
FOD RESUME — read the bootstrap set and resume current authorized work.
FOD CHECKPOINT — verify active changes and update state/handoff.
FOD AUDIT <topic> — targeted source/evidence inspection.
FOD BACKPORT <reason> — scoped repair with impact assessment.
FOD NEXT — advance only after current gate is accepted or explicitly deferred.
