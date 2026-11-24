# Forward-Only Development — Handoff and State Templates

Use these as **structures**, not literal completed records. Do not fabricate missing evidence.

---

## A. Rolling state (`state/SERIES_CONTINUITY.md`)

```markdown
# Series continuity — cumulative approved canon

Checkpoint: <book/chapter, Git commit or version>
Updated: <date>
Authority: <approved manuscripts and explicit author decisions>

## Governing world and narrative constraints
- <rule; when introduced; provenance>

## Stable identities and relationships
- <person/role; current approved status; provenance>

## Timeline and fixed quantities
- <event; day/date; exact quantity; source>

## Cumulative developments
- Book I: <only enduring, future-relevant facts>
- Book II: <approved new enduring facts>

## Open plot obligations
- ID: <THREAD-001>
  Origin: <book/chapter>
  State: OPEN | RESOLVED | INTENTIONALLY_AMBIGUOUS
  Constraint: <what future writing must preserve>
  Required resolution: <if already agreed>

## Contradictions or unknowns
- <explicitly unresolved; verification needed>

## Canon revision log
- <date/checkpoint; changed fact; source; reason>
```

**Do not truncate valid earlier canon merely because it originated many books ago.**

---

## B. Unit handoff (`state/HANDOFF_BOOK_02.md` or `HANDOFF_MILESTONE_02.md`)

```markdown
# Forward-only handoff — <unit name>

Unit: <unit ID>
Checkpoint: <Git commit / version>
Status: <DRAFTED | VERIFIED | APPROVED | HANDED_OFF>
Approved by: <who/what authority; if known>
Date: <date>

## Scope actually completed
- <deliverables>

## Evidence and acceptance
- <check name or command; result; whether actually run>
- <editorial acceptance, if provided>
- Unrun/unverified: <explicit list>

## Material persistent deltas
- <fact/contract; source chapter/file; implications>

## Timeline / characters / architecture changes
- <exact values and references>

## Open issues, threads, and debts
- <ID; why it matters; due point if specified>

## Known tensions or uncertainty
- <contradictions/unknowns; how to verify>

## State files updated
- <path; substantive changes>

## Next authorized unit
- <specific unit>
- Required input: <outline/plan, active files, cumulative state>
- Starting instruction: <one concrete next task>
- Historical lookups allowed if needed: <specific topics, not broad prefetch>
```

---

## C. Chapter tracker (`state/CHAPTER_TRACKER.csv`)

```csv
book,chapter,status,last_verified_checkpoint,notes
01,01,approved,<commit-or-version>,Accepted
01,02,approved,<commit-or-version>,Accepted
02,01,planned,,Next active chapter
```

Use actual statuses, not optimistic guesses. A revised chapter does not automatically become approved.

---

## D. Targeted historical lookup record

```markdown
### Archive lookup <date>
Active unit: <unit>
Question: <precise missing/contradictory fact>
Reason past source is necessary: <concrete dependency>
Files/passages read: <smallest relevant subset>
Finding: <with provenance>
State correction: <path and description or NONE>
Impact: <current-unit changes, prior-unit backport, or NONE>
```

---

## E. Fresh-session acceptance checklist

```markdown
- [ ] Active unit established
- [ ] Previous unit accepted/handoff verified, or correctly marked incomplete
- [ ] Cumulative state loaded
- [ ] Prior handoff loaded
- [ ] Current plan and acceptance criteria loaded
- [ ] No unnecessary full-history read
- [ ] Missing information marked unknown, not invented
- [ ] Current work tested/edited as required
- [ ] Persistent changes reconciled into state
- [ ] Source references/evidence retained
- [ ] Handoff and checkpoint updated before advancing
```

---

## F. Copy/paste: Book II opening instruction

```text
Continue with Book II using our Forward-Only Literary Memory System.
Use the approved rolling SERIES_CONTINUITY, character and timeline ledgers,
open-thread ledger, Book I handoff, and Book II/series outlines. Do not
reread Book I's 40 chapters or old chats by default. Preserve the exact
chapter states and all accepted decisions. If a specific old detail is
missing or contradicts the ledger, inspect only that source passage,
record the lookup, and reconcile it. Verify Book I's handoff status,
identify the first unfinished Book II task, and execute forward.
```

## G. Copy/paste: software milestone opening instruction

```text
Continue at the next unfinished milestone under the Forward-Only
Development Protocol. Load the architecture/contract ledger, last verified
handoff, active issue/plan, and only current relevant code/tests. Do not
replay all historic PRs, CI runs, or previous sessions. Inspect old code or
commits when required by a concrete dependency or failure. Implement,
verify, update state and contracts, write an evidence-backed handoff,
and commit only when authorized and checks are complete.
```
