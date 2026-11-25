# Forward-only handoff — POLISH-02 complete (items 1–10)

Unit: POLISH-02
Checkpoint: branch `feature/polish-02` (from local record commit ed3fa4c on top of main 365a78e), PR #20. Items 1–4: 2535907, 7e847ea, 0087fa7, 52c01fd (+ docs fe3ee26, 32b6bf3, c2e9c6c). Items 5–10: a799ff0 (5+10), bf31ccd (6), 4e5e727 (9), 989b4ee + 593757c (7), ca9156d + b25b604 + 46ca532 (8), plus this checkpoint commit. Pushed. Not merged.
Status: items 1–10 IMPLEMENTED + TESTED (+ RENDERED where visual or audio); agent-reviewed only; awaiting owner acceptance and merge decision.
Approved by: owner "fod continue"; "continue until polish 3 … not ask me for polish 2"; "implement item 4 also"; "implement polish 5-10 … dont merge now. come for merging after polish 5-10 are finished" (2026-11-25).
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. If PR #20 is merged, record its merge commit + main CI in CURRENT_STATE on a new branch (never push directly to main).
2. Read AGENTS.md, CLAUDE.md, docs/continuity/CURRENT_STATE.md (Active unit), this file, docs/continuity/NEXT_UNITS.md. Read contract docs only for the area you touch: CINEMATOGRAPHY (aim, turnSteps, reach, surfaces, performance), IDENTITY (detail 3), DIRECTOR (prompt v1.2), QUALITY (composition-v1), SPEECH (mix-v2), SHOWCASE (film evidence).
3. Environment (PowerShell, repo root): `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`.
4. GPU sampling that works: a `Start-Job` loop of `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader` collected with `Receive-Job -Wait` after the render. Stopping the job early, or using `nvidia-smi -f`, produced no data in r2/r3.
5. Working agreement: owner delegates whole batches; stop at the agreed point with PR open + CI green and ask before merge; stop early only for direction-changing or risky actions.

## FOD principles applied (keep doing this)
- Opt-in contract additions with default-unchanged digests from a base worktree:
  - graph+preflight over every cinematic shot;
  - geometry of all 250 assets (plus detail 2 for humans);
  - director prompt, project and manifest over all request examples.
- Every commit is gated on the suite's own fail count (`grep "^# fail 0"`). In this unit one commit (989b4ee) went in with a failing ART-03 negative because the gate only checked grep's exit code. It was fixed forward in 593757c.
- When stills or measurements show a problem, fix it and re-render (r2→r3 readability; r4→r5→r6 mastering), and record the superseded runs.
- Probe and measurement sanity: a "perfect" 0 cm slip came from a probe bug; a ~3 dB loudness mismatch came from dual-mono stereo delivery. Check the instrument first.
- CI's Python test job has no numpy/scipy: mirror it locally with the system interpreter (`PYTHONPATH=scripts py -3.11 -m unittest discover -s tests -p 'test_*.py'`, which should report OK with skips) and guard new Python tests with `unittest.skipUnless(find_spec('numpy'))`. PR CI failed once on 8d9a82b for this reason and was fixed forward.
- Editing: working-copy files are CRLF. Use the scratchpad apply helper (exact old/new strings, CRLF-normalised) or the editor tool. No sed or `node -e` with backticks, `\n` or `\r\n` escapes.

## Scope completed in items 5–10
- 5+10: `request.promptVersion:'director-ir-v1.2'`, a compact prompt that also covers hold chains, handoff events and staging; v1.1 stays the default.
- 6: `compositionGate` (composition-v1) enforced in tests on every cinematic example.
- 7: `params.detail:3` for humans; lineup example polish02-cast-* (scripts/polish02-cast.mjs).
- 8: audio review plus opt-in `audio.master:'mix-v2'` (scripts/audio_master.py); the extended film opts in.
- 9: aim solver speed-up, aim memo, content-keyed locomotion and turn-step caches.

## Evidence
- Tests: `npm test` ran 267 tests: 266 pass, 0 fail, 1 skip. tests/polish-02.test.js has 36 tests. Python unittest: 32 OK, including tests/test_audio_master.py. foundry-qualify plan and py_compile are as in CI.
- Defaults vs ed3fa4c:

  | Probe | Digest | Result |
  |---|---|---|
  | graph+preflight (166 shots) | 65e1b3fdab341019 | identical |
  | geometry (250 assets) | 14dec244d171dc56 | identical |
  | human detail 2 | e3f80439a292f21a | identical |
  | director (7 requests) | 2cbf9916e65da935 | identical |

- Measured:
  - prompt v1.2 for 60 s: about 829 estimated tokens (was about 6,640);
  - film graph time 9.1 s → 0.5 s; teach shot cloned-per-frame 1.19 s → about 0.2 ms/frame;
  - audio r3 → r6: −19.8 → −16.0 LUFS delivered, LRA 13.6 → 11.7 LU, true peak −3.8 → −2.5 dBFS, phrase spread 6.6 → 0.3 dB.
- Renders:
  - `polish02-cast-r1` at 593757c: all gates PASS;
  - `workshop-extended-r6` at 46ca532 (clean): 1 preparation, CPU 100.8 s, Three/vulkan 58.6 s, RTX observed (peak 40 %, 1,436 MiB), verify PASS (2190 frames, 73 s), quality 0/0, compare_release PASS, frame-glitch clean; films CPU 70867e20fa4248d0…, Three e9eb27517f4dc71a…;
  - out/workshop-extended-r6-{cpu,three}-polished/film.mp4 is the film to watch.
- Not observed: owner visual and audio review; PR CI on the final head (see the PR page after push).

## Material persistent deltas (contracts)
- New opt-in fields this half:
  - `request.promptVersion`;
  - project `audio.master`;
  - `params.detail: 3` (humans).
- New exports: buildPrompt v1.2 path, estimateTokens and PROMPT_VERSIONS; compositionGate and COMPOSITION_POLICY; scripts/audio_master.py.
- The ART-03 negative "detail 3 invalid" now tests detail 4.
- No defaults, backends, dependencies or CI policy changed.

## Open issues and risks
- Audio: 1.6–3.1 s bed-only lead and tail per shot come from authored shot lengths. Tightening shot durations or adding narration is an authoring decision; a natural fit for TALK.
- `mix-v2` is not available for `speech` projects (they keep `speech.mix`). Merging the two mixers would be a separate decision.
- Detail 3 is subtle at lineup scale, and the film doesn't use it (continuity with the kept detail-2 shots).
- Carried over: robot in the engineer's line of sight (teach); shelf partly hides the robot during the reach; HAND TO HAND receiver pivot (kept shot, not opted in).
- v1.2 token counts are estimates (characters/4), not provider tokenizer counts; no live provider call was made.

## Next action
- Owner: watch out/workshop-extended-r6-cpu-polished/film.mp4 (or the -three- version), listen to the audio, and decide on merging PR #20.
- After merge: record the merge commit and main CI. The roadmap's next track is TALK (TALK-01 speaking faces).
