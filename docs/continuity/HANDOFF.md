# Forward-only handoff — TALK-03 (body language while talking)

Unit: TALK-03
Checkpoint: branch `feature/talk-03`, stacked on `feature/talk-02` (PR #23, TALK-02, not merged; the owner did not ask to merge it). Commits: e3ddfd5 (TALK-03), plus this checkpoint commit. Pushed; PR with base `feature/talk-02`. Merge #23 first, then retarget this PR to main. Not merged.
Status: IMPLEMENTED + TESTED + RENDERED; agent-reviewed only.
Approved by: owner "yes please implement talk-03" (2026-11-25).
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. Check whether PRs #23 and the TALK-03 PR are merged; record merges and main CI in CURRENT_STATE on a new branch.
2. Read AGENTS.md, CLAUDE.md, CURRENT_STATE (Active unit), this file, NEXT_UNITS (TALK track), and docs/SPEECH.md (TALK-01..03).
3. Procedures: as in the POLISH-02 handoff (`git show 8d9a82b:docs/continuity/HANDOFF.md`).
   - Gate commits on `# fail 0`; mirror CI's bare Python.
   - Set AETHER_FFMPEG in the same command as frame_glitch.py.
   - Stacked PRs: merge the base first, then retarget the dependent PR to main.

## Scope completed
- src/core/body.js:
  - `validateBodyLanguage` (called from validateProject; shot field `bodyLanguage`);
  - `emphasisPeaks` (cached per timeline), `beatEligible`, `bodyAt`, `applyBody`.
- draw-film.js and draw-graph.js: `bodyAt` is passed with the TALK-01 talk values and applied in `world()`.
- catalog.js:
  - `primitive().headed(pre)`;
  - `headRoute` (head-region routing for human and robot recipes when `pose.nod` or `pose.tilt` is present);
  - human eye blink.
- Example talk03-body-* (scripts/talk03-body.mjs; derived from the TALK-02 generator).

## Evidence
- Tests: `npm test` ran 290 tests: 289 pass, 0 fail, 1 skip. tests/talk03.test.js has 7 tests. Python bare mirror OK.
- Defaults vs aacab42 identical:

  | Probe | Digest |
  |---|---|
  | graph (180 shots, excluding the new example) | 9629764b6193cf5c |
  | geometry | 14dec244d171dc56 |
  | human detail 2 | e3f80439a292f21a |
  | director | 2cbf9916e65da935 |

- Beat density on the measured TALK-02 timeline: 16 peaks, 2–3 per line (tuned down from 26).
- Render `talk03-body-r1` (e3ddfd5 clean): CPU 39.2 s, Three 24.6 s, RTX peak 31 %; all gates PASS; 2 caption reading-speed findings.
  - Films: CPU 6df5a6ca5b8ae8aa…, Three 48c209810bf6afbe….
  - Agent side-by-side against TALK-02 shows the beat, the listener nods and the sway.

## Open issues
- No idle weight shift: the rigs have no hip joint, so head sway is used instead.
- Beats follow loudness peaks, not stressed words (no word-level alignment is claimed).
- Arm beats are additive arm pitch only; there are no hand or finger gestures yet.

## Next action
- Owner: watch out/talk03-body-r1-cpu-polished/film.mp4; decide on #23 and then this PR.
- Then TALK-04 (director dialogue authoring) or TALK-05 (talking showcase film), per the roadmap.
