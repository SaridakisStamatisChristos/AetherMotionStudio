# Forward-only handoff — POLISH-03 (narration placement, mix-v2 for speech projects)

Unit: POLISH-03
Checkpoint: branch `feature/polish-03`, stacked on `feature/polish-02` (PR #20, POLISH-02 items 1–10, not merged). Commits: 3dd64e6 (code, tests, film), plus this checkpoint commit. Pushed; PR opened with base `feature/polish-02`. If #20 merges first, retarget this PR to main. Not merged.
Status: MERGED. PR #20 (POLISH-02) → main 9054c7e; PR #21 (POLISH-03, retargeted to main) → main 01051f1; main CI 45585521976 test PASS on 01051f1. Owner accepted ("ok eferything fine . merge it 20 and 21", 2026-11-25), including the drafted lines.
Approved by: owner asked what to do about bed-only gaps and missing mix-v2 for speech projects; Claude proposed; owner: "yes do it" (2026-11-25). The extra narration lines were drafted by Claude and are open to the owner's edits.
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. Check whether PR #20 and the POLISH-03 PR are merged; record merges and main CI in CURRENT_STATE on a new branch.
2. Read AGENTS.md, CLAUDE.md, CURRENT_STATE (Active unit POLISH-03, previous POLISH-02), this file, NEXT_UNITS. The POLISH-02 handoff details (environment, GPU sampling, editing and CI-mirror lessons) are in git history: `git show 8d9a82b:docs/continuity/HANDOFF.md`.
3. Environment and procedures are unchanged from POLISH-02:
   - GPU sampling: `Start-Job` + `Receive-Job -Wait`;
   - edits: the CRLF-safe apply helper;
   - CI mirror: `PYTHONPATH=scripts py -3.11 -m unittest discover -s tests -p 'test_*.py'`;
   - commit only when `# fail 0`.
4. Lesson from this unit: `fields()` in src/core/cinematography.js takes `(x, allowed, path, required)`, while `fields()` in src/core/timeline.js takes `(x, required, path, optional)`. Check which helper a file imports before adding keys.

## Scope completed
- `allocate(lengths, frames, placement)` in scripts/timeline_plan.py and `slots(lengths, texts, frames, placement)` in scripts/speech_plan.py:
  - `center` is the default and unchanged;
  - `lead` starts speech after the pad, caps inter-phrase growth at 0.35 s, and puts the rest at the end of the shot.
- Validation:
  - project `audio.placement` (timeline projects; `audio` now needs master and/or placement);
  - `speech.placement` and `speech.mix.master` (speech projects; the `audio` field is still rejected there).
- scripts/speech_pipeline.py with mix-v2:
  - every speaker's phrases levelled to one RMS (`audio_master.level_phrase`);
  - phrase-cache key gains `level` only when enabled;
  - master → `mix.peak` cap → `audio-master.json`.
- Film: `audio: {master: 'mix-v2', placement: 'lead'}` plus these lines:
  - TOOLBOX: "Careful steps, steady hands, and the wrench changes hands."
  - LEARNING BY WATCHING: "Every gesture becomes a lesson."
  - HIGH SHELF: "No one shows it how this time."

## Evidence
- Tests: `npm test` ran 270 tests: 269 pass, 0 fail, 1 skip. New: tests/polish-03.test.js (3) and tests/test_placement.py (3, pure). The POLISH-02 film-audio expectation was updated for `placement`. Python: 35 OK in the venv; bare-Python CI mirror OK with 11 skipped.
- Film r7 (3dd64e6 clean): CPU 107.6 s, Three/vulkan 57.8 s, RTX util peak 55 %; verify, quality 0/0, compare_release PASS, frame-glitch clean on both.
  - Speech share 42 → 51 %; mean voice-free gap 4.31 → 2.69 s; longest gap across a cut 5.0 → 4.5 s.
  - Delivered −16.0 LUFS, LRA 11.2 LU, true peak −3.4 dBFS.
  - Films: CPU b3490129c3776acb…, Three e995ce1a64a41fac….
- Two-voice speech fixture (out/polish03-fixtures; baseline `cli prepare`, mastered `polish03-voices-r1`):
  - voice gap 2.6 → 0.4 dB; first phrase at 0.45 s;
  - delivered −16.02 LUFS; all speech and native verifies PASS;
  - 2 visual warnings, both already present in the source example.
- Not observed: owner listening review; PR CI (see the PR page).

## Open issues
- Long gaps remain after the reused shots PLAN, FIRST STEPS and HAND TO HAND. Their scripts are kept unchanged; the owner could approve extra lines there too.
- The extra lines are agent-written copy and need owner approval.

## Next action
- Done: owner accepted and both PRs are merged; this record lives on branch `chore/record-polish-02-03`.
- Then: the TALK track (TALK-01 speaking faces). Mix-v2 per-speaker levelling is ready for dialogue.
