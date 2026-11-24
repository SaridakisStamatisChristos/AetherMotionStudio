# Forward-Only Development Protocol (FODP) v1.0

**A persistent-state, bounded-context workflow for Claude Code and other coding/writing agents**  
**Status:** Formalized operational specification (November 2026)  
**Original application:** Forward-Only Literary Memory System for a five-book KDP series  
**Generalization:** Sequential writing, coding, research, documentation, and multi-phase engineering

---

## 1. Executive definition

**Forward-only development** is a workflow in which an agent advances from an accepted unit of work to the next **without repeatedly loading and reprocessing the complete history of previously completed units**. Instead, it carries forward a small, verified, versioned set of **canonical state artifacts** that preserve everything needed to continue correctly.

Its invariant is:

> **Past work is represented by approved artifacts, verified contracts, and explicit handoffs; the agent reads full historical sources only when a concrete issue requires a targeted lookup.**

This is **not** a promise never to go backward. It is a rule against **unnecessary retrospective full-context consumption**. Correctness, continuity, and the ability to repair mistakes always take priority over token savings.

The original literary form was named **Forward-Only Literary Memory System (FOLMS)**. FODP is its domain-neutral formalization, not a replacement of the underlying workflow.

### Objectives

1. Preserve continuity and accepted decisions across fresh Claude sessions.
2. Avoid the escalating cost of rereading Book I before Book II, Books I–II before Book III, and so on.
3. Keep the agent focused on the **current unit** and its immediate dependencies.
4. Make context state inspectable, auditable, version-controlled, and tool-independent.
5. Guarantee that a completed unit cannot silently become accepted without a verified handoff.
6. Allow **selective historical inspection** when ambiguity, contradiction, or a failed check demands it.

### Non-goals

- Do not replace authoritative manuscripts/source code with lossy summaries for *all* purposes.
- Do not assume Claude's chat memory or prompt cache is permanent storage.
- Do not forbid targeted reopens, regression checks, editorial reconsideration, or fixes.
- Do not treat an agent-generated summary as approved canon automatically.
- Do not claim zero-token overhead or perfect reconstruction of historical content.

---

## 2. The development model

A project consists of units `U1 ... Un`: books, chapters, milestones, issues, features, research epochs, or releases.

For unit `Ui`, define:

- `P_i`: current unit plan and acceptance criteria.
- `A_i`: complete unit artifact (manuscript, source, experiment, deliverable).
- `S_i`: verified cumulative state at the end of the unit.
- `H_i`: concise handoff written when the unit is completed.
- `V_i`: acceptance/verification evidence.

Then:

```text
START Ui:
  load verified S_(i-1)
  load H_(i-1) (if available)
  load P_i
  load only the relevant active-unit materials
  execute Ui
  verify Ui against acceptance criteria and inherited contracts
  extract and reconcile newly established facts/decisions
  write S_i and H_i, with evidence and provenance
  checkpoint/commit approved artifacts
  advance to U_(i+1)
```

**Important:** `S_i` is a curated, updated canonical state, not a blind concatenation of every prior handoff. In particular, `S_i` must retain constraints established long ago even when `H_(i-1)` does not mention them.

### Context tiers

| Tier | Contents | Default reading policy |
|---|---|---|
| 0 — governing rules | Project `CLAUDE.md`, rules, safety/quality gates | Read every session |
| 1 — rolling canon | Approved global state, constraints, contracts, open issues | Read every session |
| 2 — recent handoff | Last accepted unit summary, unresolved work, next action | Read on transition |
| 3 — active work | Current outline, changed files, relevant local tests, active drafts | Read as needed |
| 4 — targeted archive | Specific passages, old commits, earlier chapters | Only on explicit, logged justification |
| 5 — entire history | Full earlier manuscripts, broad repository archive, long chat history | **Not a normal startup step** |

The policy controls **what is loaded into the agent's working context**, not what remains stored on disk. All original files remain accessible and are never discarded merely to save tokens.

---

## 3. Canonical persistence: files, not chat memory

The system of record is **project-controlled files** in Git, not agent recollection. A fresh Claude Code session should be able to bootstrap entirely from the repository.

### Recommended directory structure for literary projects

```text
project/
├── CLAUDE.md                       # Main operational instructions; retain existing rules
├── AGENTS.md                       # Optional agent interoperability instructions
├── .claude/skills/                 # Optional workflow helpers
├── briefs/
│   ├── SERIES_PLAN.md
│   ├── BOOK_01_OUTLINE.md
│   ├── BOOK_02_OUTLINE.md
│   └── ...
├── canon/
│   ├── WORLD_RULES.md
│   ├── CHARACTER_BIBLE.md
│   └── STYLE_CONSTRAINTS.md
├── manuscripts/
│   ├── Book_01_The_Fall/
│   ├── Book_02_.../
│   └── ...
├── reports/                         # Editorial, checks, change records
├── scripts/                         # Chapter/project validators
└── state/
    ├── SERIES_CONTINUITY.md         # Global cumulative approved canon
    ├── CHARACTERS.md               # Identities, arcs, relationships, changes
    ├── TIMELINE.md                 # Chronology and temporal dependencies
    ├── OPEN_THREADS.md             # Unresolved obligations + payoffs
    ├── CHAPTER_TRACKER.csv         # planned/drafted/revised/approved
    ├── HANDOFF_BOOK_01.md          # One handoff per accepted book
    ├── HANDOFF_BOOK_02.md
    └── ...
```

These paths are **recommended conventions**; if the project already uses different names, use its actual files and establish a mapping. Do not create duplicate sources of truth.

For software projects, the equivalents are `ARCHITECTURE.md`, `API_CONTRACTS.md`, `DECISIONS.md`, `RELEASE_STATE.md`, `ISSUE_TRACKER.md`, acceptance test reports, and `HANDOFF_MILESTONE_N.md`. The same algorithm applies.

### Authority ordering

1. Explicit current user instruction and non-negotiable external constraints.
2. Actual verified artifact (manuscript or code) and passing evidence.
3. Approved cumulative canon/contract state derived from those artifacts.
4. Most recent signed-off handoff and current unit plan.
5. Old informal notes or agent recollection.

If a high-level state file conflicts with the underlying accepted artifact, **flag it** and reconcile using a targeted source lookup; do not silently rewrite history or assume either version is correct.

---

## 4. Lifecycle: one-way progress with controlled recovery

A unit's **operational** state follows:

```text
PLANNED -> ACTIVE -> DRAFTED -> VERIFIED -> APPROVED -> HANDED_OFF
                         \-> REWORK -> VERIFIED
```

For literary **chapter status**, keep the project's established sequence:

```text
planned -> drafted -> revised -> approved
```

Those are not identical state machines: chapter editorial status is a nested part of book-level acceptance.

### Opening a unit

- Check that the prior unit's acceptance and handoff exist.
- Read governing rules, cumulative canon, prior handoff, and current plan.
- Form a bounded reading plan: **which specific files are truly needed now?**
- List unresolved dependencies; do not infer missing canon.
- Work only on the current unit and approved explicit backports.

### Executing a unit

- Advance in small, coherent increments.
- Keep plans, accepted facts, and open threads aligned with actual changes.
- Track additions to continuity: character states, chronology, world constraints, promises, foreshadowing, design/API decisions, known limitations.
- Run the relevant local checks; preserve any earlier verified behavior.
- Do not revise earlier completed units merely because a new wording preference appears.

### Closing a unit — mandatory order

1. **Verify** the full current unit against its acceptance gates.
2. **Reconcile** new facts against previous canonical state.
3. **Update** the cumulative continuity/contract files; do not replace them with a shallow synopsis.
4. **Write** a compact, self-contained unit handoff.
5. **Record** evidence, unresolved items, and next-unit preconditions.
6. **Commit/checkpoint** the unit and its state files together.
7. **Mark** the unit `HANDED_OFF`, then open the next unit.

**Atomicity rule:** a manuscript/feature change and its corresponding state transition must not be treated as complete independently. A completed book with stale state is an incomplete transition.

---

## 5. What a correct handoff must contain

A handoff should contain **operational information**, not a prose retelling of the full work:

- Identity: unit, version, base commit/checkpoint, date.
- Status: what is verified, approved, and not yet approved.
- Canonical deltas: facts, relationships, constraints, character development, API changes.
- Exact relevant timeline/order and persistent quantities.
- Open threads/debts: who/what, origin, current condition, required resolution (if specified).
- Decisions with rationale: why an important implementation or literary choice is fixed.
- Risks and contradictions detected; unresolved uncertainties explicitly marked.
- Acceptance evidence: tests/checkers/editorial audit and what was **actually** run.
- Next unit's obligations and safe starting point.
- Provenance pointers: chapter/file and scene/section, or file path/commit/test identifier.

**Handoff quality test:** Could a new session continue the next unit correctly using the canon, this handoff, and the next plan, without needing to reread the entire previous artifact? If not, the handoff is incomplete.

### Continuity fields should be precise

Weak: `Elias has hidden supplies.`

Strong: `Elias's emergency store was inspected two winters earlier, removed from the register the following spring; its road remains deliberately unnamed. The 42 L water threshold is a fixed established detail. Sources: Book I Ch.18 (Day 11), Ch.24 (Day 16).`

This example illustrates the desired **precision and provenance**; it does not license later agents to add invented details.

---

## 6. Historical-read exception protocol

Past artifacts are **read-on-demand, not forbidden**. A reopen is permitted when:

- A contradiction between canon and a current draft is detected.
- An unresolved detail would materially change the result.
- A factual claim or exact dialogue/code contract needs confirmation.
- A regression test fails or a concrete defect points to old source.
- An editorial/thematic consistency check genuinely requires the original text.
- The user explicitly requests a retrospective audit/rewrite.

Use this escalating process:

```text
1. Consult rolling canon and prior handoff.
2. Search provenance, index, or locator for the specific fact.
3. Open the smallest relevant older passage/file/commit.
4. If insufficient, expand to adjacent section/chapter/module.
5. Only if necessary, authorize broader historical reading.
6. Record what was looked up, why, and any canon correction.
```

No agent should claim to have read or validated a prior book if it consulted only its continuity summary. The status is **continuity-based**, not a new full editorial audit.

---

## 7. Detailed application: the five-book series

This is the **original operational use case**.

### When starting Book II

**Default load:**

- `CLAUDE.md` and relevant style/quality rules.
- `state/SERIES_CONTINUITY.md` (all approved Book I facts that affect the future).
- `state/CHARACTERS.md`, `state/TIMELINE.md`, `state/OPEN_THREADS.md`.
- `state/HANDOFF_BOOK_01.md`.
- `briefs/SERIES_PLAN.md` and `briefs/BOOK_02_OUTLINE.md`.
- Current Book II working chapter and its immediately needed context.

**Do not automatically load:** all 40 chapters of Book I, the complete earlier conversation, or every editorial report from Book I.

### When starting Book III

Read the updated **cumulative** canon representing Books I–II, `HANDOFF_BOOK_02.md`, the Book III outline, and active files. **Do not** reread Books I and II just because a new session started.

### When starting Book IV or V

Use the same pattern. The cost of starting a fresh book should be mainly proportional to the **current relevant state**, rather than the combined length of every earlier manuscript.

### Chapter workflow

For each chapter: load the current outline and relevant canon, draft, revise, run the chapter checker, verify continuity and narrative obligations, then update `CHAPTER_TRACKER.csv`. Distinguish **approved** from **revised**; these labels are not interchangeable. Do not move the book to `HANDED_OFF` until its agreed book-level acceptance is satisfied.

### Continuity traps

- A rolling summary must not erase legal/world rules set in Book I that become relevant in Book IV.
- A detail deliberately unresolved (for example, an unnamed road or pending case) must not be arbitrarily "completed" by a later agent.
- An editorial revision in Book I can invalidate Book II's inherited facts: such an approved backport requires **impact analysis** and a new continuity checkpoint.
- Passing a word-count/checker threshold is not equivalent to a full literary or continuity acceptance.

---

## 8. Application to software engineering

For software, `Ui` might be a feature, PR, issue, algorithm stage, or release. The rolling state becomes the **architecture/contract ledger**, not a replacement for the repository.

**Recommended session inputs:** current task, architecture decisions, public interfaces, relevant dependency map, current code files, tests, and the last verified handoff. **Do not** begin every issue by reading the entire repository, all historic PRs, or every log.

**Mandatory exception:** source code is executable truth. If integration or debugging requires inspecting a dependency, do so. Forward-only development is about **selective inspection**, not blindly coding against summaries.

**Software unit acceptance:** tests, performance/semantic benchmarks where required, compatibility checks, clear commit/PR status, updated contracts and handoff. Distinguish `tests passed locally`, `CI green`, `merged`, and `released`.

**Backports:** if a bug in an accepted old unit must be fixed, branch to an explicit repair task; record affected contracts, apply tests, update rolling state, and return to the current forward track. Never disguise a retroactive change as current-unit-only work.

---

## 9. Fresh-session bootstrap procedure

The following is the **standard Claude Code bootstrap**:

1. Open the repository root in VS Code and launch Claude Code there.
2. Keep existing `CLAUDE.md` guidance; append the separate forward-only directive supplied with this package.
3. Tell Claude the **active unit** (for example, `Book II`, `Chapter 1`, or `Milestone v0.18`).
4. Instruct Claude to read only the bootstrap allowlist and report any missing/uncertain state.
5. Ask it to state the next permitted action and verify whether the previous unit is handed off.
6. Proceed with the next unit, producing incremental outputs and checkpoints.
7. At completion, require updated state + handoff + verification before advancing.

Example startup command:

```text
Continue the project under the Forward-Only Development Protocol.
Active unit: Book II, Chapter 1.
Read CLAUDE.md, the approved rolling continuity state,
HANDOFF_BOOK_01.md, the series plan, and the Book II outline.
Do not reread Book I's full manuscript or historical chats by default.
If a particular old fact needs verification, open only the relevant
passage and record the reason. First confirm the current unit status,
missing prerequisites, and the next executable action.
```

---

## 10. Verification and acceptance gates

The system is valid only if it **preserves correctness**. Review these gates at every handoff:

| Gate | Test | Pass condition |
|---|---|---|
| State completeness | Are all persistent deltas and unresolved obligations retained? | No known material omissions |
| Provenance | Can important state claims be traced to accepted artifacts? | Traceable references |
| Contradictions | Do cumulative state and current artifact disagree? | Resolved or explicitly blocked |
| Current unit | Did the agent stay within authorized scope? | No silent edits to accepted units |
| Validation | Are tests/editorial checks actually executed? | Evidence recorded; failures not hidden |
| Version coherence | Are artifact, canon, and handoff from the same approved checkpoint? | Consistent version/commit |
| Resume test | Can a clean session identify the next action from files alone? | Successful restart without chat history |

**Optional measurable indicators:** startup input tokens, fraction of historical text reread, number of continuity regressions, time to resume, number of archive exceptions, state/canon drift incidents. Optimize these against **the same quality and acceptance criteria**, not for low token count alone.

---

## 11. Failure modes and remedies

| Failure mode | Remedy |
|---|---|
| Summary gradually loses early details | Maintain cumulative canon plus thematic registries, not summary-of-summary compression |
| A handoff falsely claims tests passed | Record exact commands/results; mark unrun as unrun |
| Agent skips approval and advances | Block transition until acceptance and handoff are complete |
| Conflicting documents | Resolve against accepted source and record a canon repair |
| Context pack grows without bound | Separate stable canon, active obligations, archived evidence; index rather than duplicate |
| Overstrict rule prevents necessary debugging | Permit targeted archive reading under an explicit reason |
| Agent rewrites past books unexpectedly | Freeze completed units; require authorized backport workflow |
| New session hallucinates a missing detail | Mark `UNKNOWN` and perform targeted lookup before using it |
| Edited manuscript but outdated handoff | Block checkpoint; update both together |
| 'Approved' conflated with 'revised' | Preserve exact editorial state in tracker and reports |

---

## 12. Formal invariants

**FOD-01 — Persistent state:** Required context survives independently of the chat session.

**FOD-02 — Bounded startup:** Default bootstrap never requires entire accepted history.

**FOD-03 — Cumulative canon:** Global facts and constraints persist until changed through an explicit approved update.

**FOD-04 — Verifiable provenance:** Critical persistent claims link to accepted artifacts or explicit user decisions.

**FOD-05 — Honest status:** Unverified, revised, accepted, merged, and released are distinct states.

**FOD-06 — Controlled historical access:** Older source may be opened for a documented, scoped purpose.

**FOD-07 — Atomic checkpoint:** Work and state/handoff must represent the same verified revision.

**FOD-08 — Recovery:** Fresh sessions can resume from repository artifacts without relying on Claude's recollection.

**FOD-09 — No silent canon mutation:** A major reinterpretation or contradiction is surfaced rather than silently normalized.

**FOD-10 — Forward focus:** Default effort is spent on the earliest unfinished authorized unit, with no unsolicited rewrite of accepted units.

---

## 13. Recommended operating command library

These are natural-language commands, not assumed native Claude tools.

```text
FOD INIT [unit]
  Discover existing state/plan files, verify prior handoff, propose a bounded read plan.

FOD CONTINUE
  Resume the current unit without replaying accepted history.

FOD CHECKPOINT
  Verify current work, update state and provenance, write an incremental checkpoint.

FOD HANDOFF
  Close the current approved unit, update cumulative state, write next-unit handoff.

FOD AUDIT [topic]
  Perform a targeted historical lookup for a concrete dependency or contradiction.

FOD BACKPORT [reason]
  Explicitly reopen an accepted unit for a scoped fix with impact assessment.

FOD RESUME
  Simulate a clean-session restart using repository state only.
```

They can later become scripts or `.claude/skills/` commands, but this specification does **not** claim that executable automation already exists.

---

## 14. Operational principle

The objective is not to make Claude **forget the past**. It is to convert an ever-growing past into a **small, explicit, sufficient, verifiable working state**, while retaining original evidence on demand.

> **Freeze completed work; carry forward its verified consequences; load the next task; inspect the past only when a present dependency justifies it.**

This is the central pattern of the Forward-Only Literary Memory System, made reusable for long-running Claude Code projects.
