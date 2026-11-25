# Forward-only handoff — TALK-02 (dialogue scenes)

Unit: TALK-02
Checkpoint: branch `feature/talk-02` from main 7f121e7 (TALK-01 merge). Commits: 40fc324 (TALK-02), bd38377 (example pacing), plus this checkpoint commit. Pushed; PR against main. Not merged.
Status: IMPLEMENTED + TESTED + RENDERED; agent-reviewed only.
Approved by: owner "yes perfect. merge it and continue" (2026-11-25, after TALK-01: merge #22, then start the next TALK unit).
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. If the TALK-02 PR is merged, record the merge commit and main CI in CURRENT_STATE on a new branch.
2. Read AGENTS.md, CLAUDE.md, CURRENT_STATE (Active unit), this file, NEXT_UNITS (TALK track), and docs/SPEECH.md (TALK-01, TALK-02).
3. Procedures: as in the POLISH-02 handoff (`git show 8d9a82b:docs/continuity/HANDOFF.md`).
   - Gate commits on `# fail 0`.
   - Mirror CI's bare Python.
   - Set AETHER_FFMPEG in the same command as frame_glitch.py.
4. When polling main CI right after a merge, wait for the run whose headSha is the merge commit; the newest listed run may still be the previous one.

## Scope completed
- src/core/graph.js: `face` chains (2–16 sequential windows; contiguous windows blend from the previous target; validation).
- src/core/dialogue.js: `validateDialogue` (called from validateProject), `focusPlan`, `dialogueShot` (applied in draw-film.js after speechDrivenShot).
- src/core/timeline.js: shot field `dialogue`.
- Example talk02-dialogue-* (scripts/talk02-dialogue.mjs): three voices, six-line meeting, robot close-up.

## Evidence
- Tests: `npm test` ran 283 tests: 282 pass, 0 fail, 1 skip. tests/talk02.test.js has 6 tests. Python bare mirror OK.
- Defaults vs 7f121e7 identical:

  | Probe | Digest |
  |---|---|
  | graph+preflight (176 shots) | 5cc713071a6ddb6f |
  | geometry | 14dec244d171dc56 |
  | director | 2cbf9916e65da935 |
  | extended film | per-shot identical |

- Render `talk02-dialogue-r2` (bd38377 clean):
  - 600 frames, 20 s; CPU 39.3 s, Three/vulkan 23.1 s;
  - all verifies PASS, compare_release PASS, frame-glitch clean;
  - 2 CAPTION_READING_SPEED findings;
  - phrase timing: eng 14–90, sci 105–175, robo 191–237, eng 253–320, sci 335–394, robo 410–464, then robo 528–576 in the close-up;
  - RTX observed in r1 (peak 41 %).
- Agent stills (both backends), frames 60, 150 and 225: listeners face each active speaker, and the speaker's mouth is open.

## Open issues
- Looking is head-and-body yaw only (the rigs have no separate head yaw for catalog humans). Listeners in a line-up on one side of a speaker turn only slightly.
- Caption reading-speed findings: some lines are fast for 18 characters per second.
- No reaction gestures yet (nods, beat gestures): that is TALK-03.

## Next action
- Owner: watch out/talk02-dialogue-r2-cpu-polished/film.mp4 and decide on the PR.
- Then TALK-03, body language while talking: beat gestures on stressed words (estimated word timing, never called forced alignment), nods, blinks and idle weight shifts; bounded and deterministic.
