# Claude Code — AetherMotion Studio

Follow [AGENTS.md](AGENTS.md). Keep development forward-only (FODP v1.0, [docs/continuity/](docs/continuity/README.md)) and preserve canonical decisions.

## Active campaign
**Campaign A — Universal Dual-Backend Finalization** (owner-authorized 2026-11-26). Requirements: [CAMPAIGN_A_DIRECTIVE.md](docs/continuity/CAMPAIGN_A_DIRECTIVE.md) (verbatim). Status, decisions and evidence: [CAMPAIGN_A.md](docs/continuity/CAMPAIGN_A.md). Milestones DUAL-00 … DUAL-09 run strictly in order. **Campaign B (GPU-only graphics) must not start** until v1.2 is verified, owner-accepted and tagged.

## Mandatory session bootstrap ("fod continue" / FOD RESUME)
1. Run `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Never discard or overwrite user changes. Reconcile any stale handoff text with the actual Git state.
2. Read, in this order:
   - [AGENTS.md](AGENTS.md) (binding engineering rules);
   - [CURRENT_STATE.md](docs/continuity/CURRENT_STATE.md) (canon);
   - [HANDOFF.md](docs/continuity/HANDOFF.md) (latest checkpoint and the next action);
   - [CAMPAIGN_A.md](docs/continuity/CAMPAIGN_A.md) (milestone status);
   - the directive section of the active milestone only.
   - Use [LOCAL_DEVELOPMENT.md](docs/continuity/LOCAL_DEVELOPMENT.md) for setup and [NEXT_UNITS.md](docs/continuity/NEXT_UNITS.md) for the roadmap index.
   - Read only the current task's source, tests and their actual dependencies. Read the full [FODP specification](docs/continuity/FODP_PROTOCOL.md) when needed; its invariants below apply on every session.
3. Canon is authoritative; context compression must not discard binding canonical facts. Check source code and verified evidence when a conflict or dependency arises. Earlier historical docs describe their own milestones, not current CI policy. The latest user-authorized policy in CURRENT_STATE and DUAL_BACKEND_POLICY governs routine CI.
4. Report Active unit | prior verified checkpoint | state loaded | blockers | next action. Then execute HANDOFF "Next action": the earliest unfinished authorized milestone. With no authorized task, do bootstrap and baseline only; no speculative feature rewrite.
5. Do not reread historical PRs, artifacts, old chats, files or logs. A concrete failing test, contract, contradiction or the user's explicit request justifies a targeted lookup. Record the reason and the resulting canonical correction. Never assume missing history.

## Binding engineering and workflow rules
- Both CPU Canvas and native Three.js are permanent first-class backends. Preserve all examples, IDs, profiles, contracts and prior accepted evidence. No silent fallback or silent LOD change. Keep frame-addressed rendering deterministic and local-first.
- Core functionality first. No unsolicited auth, SaaS, telemetry, infrastructure, license change, dependency migration or renderer rewrite. No mandatory paid API. Respect local/opt-in providers.
- Automatic GitHub CI is TEST ONLY: JS/Python tests, Python syntax and the frozen protocol plan. No automatic video jobs; manual native suites only with explicit authorization. A green quick CI is not full render qualification.
- Local rendering: first inspect the machine, tool versions, GPU, drivers, models and dependency setup. The default Three GL is swangle; the owner's RTX route is opt-in `AETHER_GL=vulkan` (verify with nvidia-smi). Do not change system configuration or install global packages without permission; avoid the full matrix during bootstrap.
- For matched performance/visual comparisons prepare speech exactly once; share the measured timeline, narration PCM, mix and caption sidecars, and verify hashes. Preserve original gates; do not weaken tests or edit historical evidence to make results green.
- No claim of tests passed, CI green, render succeeded, GPU use, merged, released or user approval unless observed. Verify the actual source revision and media; keep structural evidence, agent inspection, human visual review, audio review and performance claims separate.
- Work on one authorized unit at a time. Implement minimal coherent changes, add tests including negatives, verify actual results and preserve old evidence. Keep generated media/models, dependencies, secrets and machine-specific data out of Git. New behaviour is opt-in or versioned until the owner promotes it; accepted films stay unchanged.
- Git: one branch per unit, always from main, never stacked. Push and open a PR (the owner allows pushes). **Merge only on the owner's explicit word, after the PR CI test job passes.** Docs-only `chore/…` branches get no CI by design. No tags or releases without the owner's word. No automatic changes to GitHub Actions policies.

## Owner working agreement (summary; full text in HANDOFF.md)
The owner types only "fod continue" and delegates whole units. Keep reports in plain language with short tables. Stop only for direction-changing or risky actions: new dependencies, defaults, deletions, system settings, licences, merge/tag, or changing accepted films. Offer choices in the UI rather than silent rule changes. Every fix must generalize to every video. Use vertical 9:16 with characters large and never cut by the frame edge; keep motion calm and sparse. Never call loudness-driven mouths "lip-sync". Say "clicked through in a headless browser" for agent UI tests.

## Tooling lessons (this machine; they cost real time)
- Do not pass regex backslashes or `\n` through Bash heredocs or `node -e`: they get mangled. Use the editor tool, or write a .cjs file to the scratchpad and run it.
- The working copies are CRLF. Multi-line string anchors must normalize `\r\n` first.
- Start temporary Studios from the working tree with `createStudio()` on a spare port (4190+) in `scripts/.tmp-*.mjs`, drive them with `openBrowser` from `@remotion/renderer`, and delete the script before committing. Never start the owner's Studio as a hidden background task.
- The session permission check has sometimes refused `git push` or merging a docs-only PR. Do not work around it; tell the owner.

## End-of-unit checkpoint (FOD CHECKPOINT)
- Update CURRENT_STATE.md (cumulative canon, active status, durable obligations), HANDOFF.md (current checkpoint, changed files, commands and results, unresolved risks, next action) and the CAMPAIGN_A.md row and ledger, coherently with the artifact. Update the roadmap and source-specific contracts when they change; do not erase earlier binding facts. Use the [templates](docs/continuity/FODP_TEMPLATES.md).
- Keep precise distinctions between planned, active, implemented, tested, accepted, merged and released.
- Keep a minimal history index rather than duplicating the archive.
- Never auto-advance a failed gate; document a separately authorized repair or deferred gate.
- On context pressure, checkpoint before starting a new session.

## Reusable commands (natural language, not external tools)
FOD RESUME — read the bootstrap set and resume current authorized work.
FOD CONTINUE — same as FOD RESUME (the owner usually types "fod continue"): bootstrap, then execute the "Next action" of docs/continuity/HANDOFF.md.
FOD CHECKPOINT — verify active changes and update state, handoff and CAMPAIGN_A.md.
FOD AUDIT <topic> — targeted source/evidence inspection.
FOD BACKPORT <reason> — scoped repair with impact assessment.
FOD NEXT — advance only after the current gate is accepted or explicitly deferred.
