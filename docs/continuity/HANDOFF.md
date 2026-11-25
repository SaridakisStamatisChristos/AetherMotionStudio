# Forward-only handoff — TALK-01 (speaking faces)

Unit: TALK-01
Checkpoint: branch `feature/talk-01` (from local record branch `chore/record-polish-02-03` 87ce2e9 on main 01051f1, which carries the POLISH-02/03 merge record). Commits: 87ce2e9 (merge record), da5ff50 (TALK-01), 18fe699 (readable mouths), plus this checkpoint commit. Pushed; PR against main. Not merged.
Status: IMPLEMENTED + TESTED + RENDERED; agent-reviewed only.
Approved by: owner "start talk-01" (2026-11-25), following the roadmap row and the plan after POLISH-01.
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. If the TALK-01 PR is merged, record the merge commit and main CI in CURRENT_STATE on a new branch.
2. Read AGENTS.md, CLAUDE.md, CURRENT_STATE (Active unit), this file, NEXT_UNITS (TALK track), and docs/SPEECH.md (POLISH-02 mix-v2, POLISH-03 placement, TALK-01).
3. Procedures and environment: as in the POLISH-02 handoff (`git show 8d9a82b:docs/continuity/HANDOFF.md`).
   - Gate commits on `# fail 0`.
   - Mirror CI's bare Python with `PYTHONPATH=scripts py -3.11 -m unittest discover -s tests -p 'test_*.py'`.
   - Set AETHER_FFMPEG in the same command as frame_glitch.py.

## Scope completed
- src/core/talk.js:
  - `mouthSupported` (detail-2/3 humans, catalog robots);
  - `validateSpeakerAssets` (called from validateProject);
  - `validateEnvelope` (called from validateTimeline; required when bound);
  - `speakerAt`, `talkAt` (1-2-1 smoothed envelope, speaker of the sounding phrase), `applyTalk`.
- Wiring: timeline.js adds the shot field `speakerAssets` and the timeline field `speechEnvelope`; draw-film.js passes `talkAt` into drawGraph; draw-graph.js applies it in `world()`, so CPU, Three and motion-blur subsamples all get it.
- scripts/speech_envelope.py: the per-frame envelope, added to timeline.json by both make_timeline_audio.py and speech_pipeline.py, only when a shot binds speakers.
- Geometry (src/visual/catalog.js): human dark inner mouth below the unchanged lip line; robot lit mouth bar under the eyes. Both only when `pose.mouth` is set (and above 0 for the human inner mouth).
- Example talk01-faces-* (scripts/talk01-faces.mjs).

## Evidence
- Tests: `npm test` ran 277 tests: 276 pass, 0 fail, 1 skip. tests/talk01.test.js has 7 tests. Python: 38 OK, including tests/test_speech_envelope.py; the bare mirror is OK with skips.
- Defaults vs 01051f1:

  | Probe | Digest | Result |
  |---|---|---|
  | graph+preflight (170 shots, excluding the new example) | 1b75bee2197e90db | identical |
  | geometry | 14dec244d171dc56 | identical |
  | human detail 2 | e3f80439a292f21a | identical |
  | director | 2cbf9916e65da935 | identical |

- Render `talk01-faces-r2` (18fe699 clean): CPU 32.0 s, Three/vulkan 21.3 s, RTX observed in r1 (37 %).
  - All verifies PASS; compare_release PASS (envelope shared); frame-glitch clean.
  - 1 CAPTION_READING_SPEED finding.
  - Films: CPU a4a144e160c8d0c8…, Three d7890d9760b474f8….
- Agent stills (both backends): engineer speaking with her mouth open and the robot closed; a pause with both closed; the robot speaking with a taller lit bar and the engineer closed.
- r1 (da5ff50) passed every gate, but its mouths were unreadable; fixed in 18fe699.

## Open issues
- Lip motion follows loudness only. True viseme or phoneme alignment would need an opt-in local aligner and must be labelled honestly.
- The TALK-01 example has one CAPTION_READING_SPEED finding (a fast phrase); this is the existing finding class.
- Listeners do not yet face the active speaker automatically, and captions already name speakers: that is TALK-02.
- The extended film does not use speaking faces, because its narration is third-person voice-over.

## Next action
- Owner: watch out/talk01-faces-r2-cpu-polished/film.mp4 (or the -three- version) and decide on the PR.
- Then TALK-02, dialogue scenes: listeners turn to the active speaker using phrase bounds, with turn-taking from measured phrases.
