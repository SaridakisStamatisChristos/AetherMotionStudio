# Claude Code — Forward-Only Development Directive

> **Installation:** Append the section below to the project's existing `CLAUDE.md`. Do **not** replace other project instructions. Adjust only actual path names to match the repository. This file is a ready-to-copy directive, not a claim of an installed Claude Code skill.

---

## FORWARD-ONLY DEVELOPMENT — MANDATORY PROJECT POLICY

**Goal:** Continue from the latest verified project state without repeatedly rereading completed units or chat history. Optimize token consumption **subject to unchanged correctness, continuity, and quality**.

### Session bootstrap

1. Read this `CLAUDE.md` and identify the active unit (book/chapter, issue, feature, milestone).
2. Read the approved **cumulative state** (literary: `state/SERIES_CONTINUITY.md`, `state/CHARACTERS.md`, `state/TIMELINE.md`, `state/OPEN_THREADS.md`; software: architecture/contracts/decisions/release state).
3. Read the handoff for the **immediately preceding accepted unit**, when one exists.
4. Read the **current unit plan/outlines**, its acceptance criteria, and only relevant active files.
5. Check tracker/acceptance status. Do not infer a `revised` artifact is `approved`.
6. State the next action and dependencies, then execute. Do not read all previous manuscripts or scan all historical code/logs by default.

### Historical reads

- **Never automatically reread entire completed books, full conversation logs, or the full repository history just because a new session begins.**
- A targeted historical read is allowed and required when a concrete continuity conflict, unknown fact, failing test, interface contract, editorial requirement, or user instruction warrants it.
- Use the narrowest useful source: locator → passage/file → adjacent context → broader archive only if needed.
- Record the reason and any resulting correction to canonical state.
- Never assert that a prior artifact was reread or reverified if only its handoff was loaded.

### Development behavior

- Work on the earliest unfinished authorized unit, not previously accepted units.
- Preserve accepted decisions, fixed facts, compatibility constraints, and unresolved obligations.
- Do not invent missing historical facts; mark them `UNKNOWN` and look them up when material.
- Maintain exact chronology, quantities, identifiers, and promised future resolutions.
- Keep critical claims traceable to source chapters, files, decisions, commits, or test evidence.
- Freeze completed work by default. Retroactive changes need an explicit scoped backport and impact analysis.

### Unit completion is a gated operation

Before declaring an entire unit accepted or moving to the next one:

1. Verify the active artifact using the unit's actual agreed criteria.
2. Update cumulative canon/contract state with all material deltas; retain earlier valid obligations.
3. Reconcile contradictions and record unresolved uncertainty.
4. Write `state/HANDOFF_<UNIT>.md` or the project's existing equivalent with: status, exact changes, continuity/contract deltas, remaining issues, provenance, verification evidence, and next-unit instructions.
5. Update status tracker using distinct states; for literary chapters: `planned → drafted → revised → approved`.
6. Commit/checkpoint the artifact, state, handoff, and verification record coherently when Git is available and changes are authorized.
7. Only then proceed to the next unit.

**Do not claim that tests ran, CI passed, commits were made, PRs merged, or books approved unless verified.**

### Literary specialization

For Book N, load:
- Current approved cumulative series state (covering Books 1 ... N-1).
- `HANDOFF_BOOK_(N-1).md`.
- Series plan plus Book N outline.
- Relevant current chapter/draft.

**Do not load all manuscript text of Books 1 ... N-1 by default.** The rolling canon must retain old constraints that still matter in later books. Do not replace it with only the last book's synopsis.

### Response discipline

At session start, report succinctly: `Active unit | Prior acceptance | State files read | Missing prerequisites | Next action`. During work, prioritize producing actual files and verification over long retrospective summaries. At close, report: `Completed | Validated | State updated | Handoff updated | Next unit | Blockers`.

**Operating rule:** *Preserve the past as verified state; develop the present; advance only after a coherent handoff.*
