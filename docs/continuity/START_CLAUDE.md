# Session start prompt (current: Campaign B)

Open Claude Code in the AetherMotionStudio repository root and type:

```text
fod continue
```

CLAUDE.md makes that a full bootstrap: Git state, AGENTS.md, CURRENT_STATE.md, HANDOFF.md, CAMPAIGN_B.md, then the HANDOFF "Next action" (the earliest unfinished Campaign B milestone; at 2026-11-28 that is GPU-08, starting with the owner's choice of effects (was GPU-05, starting with the owner's art-direction choice). A longer form, if a session needs it:

```text
FOD RESUME. Continue Campaign B (docs/continuity/CAMPAIGN_B_DIRECTIVE.md, status and plan in CAMPAIGN_B.md) from the earliest unfinished milestone, following CLAUDE.md, AGENTS.md, CURRENT_STATE.md and HANDOFF.md. Preserve the tag v1.2-dual-backend-final and keep CPU Classic and GPU Standard unchanged. ADR-001 is accepted: GPU-exclusive work only in the opt-in GPU Cinematic profile. Fast implementations; benchmarks only at milestones; delete renders after each merge. Inspect existing implementations before building; reuse and extend, never rebuild. Real tests, local RTX renders and measured budgets only; checkpoint state, handoff and the campaign tracker after each verified transition. Merge or tag only on my word.
```

Before context runs out: "FOD CHECKPOINT".
---

## Original one-time prompt (LOCAL-01, 2026-11-24; historical)

Open Claude Code in the cloned AetherMotionStudio repository root and paste:

```text
Take over AetherMotion Studio locally using the permanent project instructions and our Forward-Only Development Protocol v1.0.

Read CLAUDE.md, AGENTS.md, docs/continuity/CURRENT_STATE.md, docs/continuity/HANDOFF.md, docs/continuity/LOCAL_DEVELOPMENT.md and docs/continuity/NEXT_UNITS.md. The complete upstream FODP specification, directive and templates are already vendored under docs/continuity/. Preserve these files and use them as persistent project state, not as disposable chat context. Canon is authoritative; context compression must not discard binding facts.

Inspect git status and actual HEAD, OS, Node, Python, media tools, GPU and driver. Start LOCAL-01 from the merged AF01–AF09 baseline. Establish what is installed, what is missing, and run fast local tests. Make any required local setup changes only within the project and with approval for external/system installs. Verify GPU acceleration rather than assuming it. Run at most a small existing local baseline when authorized; no full render matrix or expensive remote CI runs.

Do not reread all old commits, old conversations, historical CI logs or reimplement accepted work. Inspect actual code and relevant tests only when a concrete dependency or failure warrants it. Preserve both native CPU Canvas and Three.js backends, all examples, stable IDs, frozen qualification evidence, offline-first design, shared-audio contracts and all existing validation. Routine GitHub CI stays test-only. No automatic pushes, merges, releases, authentication or cloud services.

After each authorized unit, run real tests, record results and uncertainties, update the cumulative CURRENT_STATE.md and HANDOFF.md coherently with changed source/contracts, and preserve prior canonical facts. Stop at any unresolved gate unless I explicitly defer it. Do not claim unobserved success. For next sessions, resume from these local files, not chat history.

First report Active unit | Git HEAD/status | prior verified evidence | actual environment | blockers | next action. Then perform LOCAL-01 setup inspection and fast validation. After that, follow my next feature request.
```

Future fresh sessions: "FOD RESUME — continue the earliest unfinished authorized unit using CLAUDE.md and the current state/handoff. Do not replay history." Before context exhaustion: "FOD CHECKPOINT — record verified results, canonical deltas, open blockers and next executable action in the persistent files."
