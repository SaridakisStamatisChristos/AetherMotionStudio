# Forward-only handoff — TALK-04 done (PR pending), TALK-05 next (owner types only "fod continue")

Unit: TALK-05 (talking showcase film), stacked on TALK-04
Checkpoint: `feature/talk-04` (from `chore/record-talk-02-03` 33193e6 on main 85d7a37): TALK-04 commits 0fd4824, 8d69270, 7fb7beb plus a docs/checkpoint commit. Pushed, PR against main.
Status: TALK-04 IMPLEMENTED + TESTED + RENDERED (agent-reviewed), PR open, not merged. TALK-05: AUTHORIZED, next; branch `feature/talk-05` from `feature/talk-04`, stacked PR with base `feature/talk-04`.
Approved by: owner, 2026-11-25 (see the previous handoff text below: "… i would need to type only fod continue").
Date: 2026-11-25

## TALK-04 checkpoint (this session)
- Changed files:
  - src/director/dialogue.js (new); src/director/schema.js, offline.js, index.js;
  - src/studio/model.js; studio/app.js, index.html;
  - examples/talk04-dialogue.request.json;
  - tests/talk04.test.js (new); tests/polish-02.test.js (PROMPT_VERSIONS assertion narrowed);
  - docs/DIRECTOR.md, SPEECH.md, STUDIO.md; continuity docs.
- Commands and results:
  - `npm test`: 301 tests, 300 pass, 0 fail, 1 skip.
  - Python unittest OK; foundry-qualify plan OK.
  - `node scripts/fod-digests.mjs . --exclude talk04`: identical to the 85d7a37 baseline.
  - The v1.1/v1.2 prompt digest 5570443b9a8ebe03 is pinned in tests/talk04.test.js.
  - Headless Studio exercise observed working (scratch script; it drives the Speakers panel in Remotion's headless Chrome).
  - `talk04-dialogue-r2` (7fb7beb, clean): all gates PASS. Numbers are in CURRENT_STATE and docs/SPEECH.md TALK-04.
- Unresolved risks:
  - The offline dialogue reuses long explanatory sentences, which gives 2 caption reading-speed warnings. Provider prompts ask for short lines.
  - The draft (silent) Studio preview shows no listener turns, because it has no measured phrases.
  - Editing a dialogue shot's line count is rejected until its line speakers match. This is explicit, not automatic.
  - No human review of the TALK-04 film.

## Original TALK-04/05 instructions (TALK-04 steps 1–5 are done)
1. Bootstrap (CLAUDE.md):
   - `git status --short --branch`; `git rev-parse HEAD`. Expect branch `chore/record-talk-02-03`, clean. Never discard user changes.
   - Read AGENTS.md, CLAUDE.md, docs/continuity/CURRENT_STATE.md (Active unit = TALK-04), this file, and docs/continuity/NEXT_UNITS.md ("Plan for TALK-04 and TALK-05": the binding scope).
   - Report: active unit | prior checkpoint | state loaded | blockers | next action.
2. `git fetch`. If main has moved past 85d7a37, rebase the plan on it and re-take the digest baseline (step 4).
3. `git checkout -b feature/talk-04 chore/record-talk-02-03`, so the record commits ride along, as with earlier units.
4. Baseline: `node scripts/fod-digests.mjs .` must print the values in CURRENT_STATE (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 2cbf9916e65da935). Keep these lines identical for every opt-in change; new example files are excluded with `--exclude talk04` (file-name prefixes).
5. Implement TALK-04 per NEXT_UNITS. Commit in slices: request+IR → offline dialogue → compile/staging → prompt v1.3 → Studio. Then evidence, docs, checkpoint, push, PR against main, wait for CI.
6. Do not wait for the merge: branch `feature/talk-05` from `feature/talk-04` (stacked PR, base `feature/talk-04`) and build the showcase film.
7. Report to the owner in plain language: what changed, measured numbers, what to watch, which PRs to merge in order. Stop and ask before merging. Only the owner says "merge"; then merge the base PR first, retarget the stacked PR to main and merge it, watch main CI on the merge commit, and record the merges on a new record branch.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- Per render session (PowerShell, repo root):
  `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); swangle stays the repo default.
  - Set AETHER_FFMPEG in the same command as `scripts/frame_glitch.py`.
- Matched production:
  - Authored projects: `node scripts/produce.mjs --project examples/<x>-cpu-polished.json --pair examples/<x>-three-polished.json --backend both --id <new-id>`.
  - Requests: `node scripts/produce.mjs --request <file> --backend both --id <new-id>`.
  - IDs must be new; existing outputs are refused. Use a fresh suffix (r2, r3 …) and never delete old outputs.
  - Outputs land in `out/<id>-production|prepared|cpu-polished|three-polished/`.
- Gates to report:
  - produce's PASS lines: speech verify, native verify, quality, compare_release with shared hashes exact;
  - `python scripts/frame_glitch.py <film>` on both films;
  - loudness: `ffmpeg -i film.mp4 -vn -af ebur128=peak=true -f null -` (delivered target about −16 LUFS with mix-v2);
  - GPU: a `Start-Job` loop of `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader`, collected with `Receive-Job -Wait` after the render (stopping it early yields no data).
- Stills: `ffmpeg -i film.mp4 -vf "select='eq(n\,F1)+eq(n\,F2)',scale=…,crop=…,tile=…" -frames:v 1 <scratchpad>/x.png`, then view the PNG. Compare against an earlier render side by side with `hstack`.
- Tests:
  - `npm test` must report `# fail 0`; gate every commit on it (`grep -q "^# fail 0"`). A grep exit code alone once let a failing commit through.
  - Python: `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py'`.
  - CI mirror without numpy: `PYTHONPATH=scripts py -3.11 -m unittest discover …`, which must say OK with skips. New Python tests that need numpy use `unittest.skipUnless(importlib.util.find_spec('numpy'))`.
  - `node scripts/foundry-qualify.mjs plan`.
- Editing:
  - Working-copy files are mixed CRLF/LF. Use the editor tool or `node scripts/fod-apply-edits.cjs <file> <edits.cjs>` (exact strings, CRLF-safe).
  - Never use sed or `node -e` with backticks or `\n` escapes in code edits.
  - Helper argument orders differ: `fields(x, allowed, path, required)` in src/core/cinematography.js versus `fields(x, required, path, optional)` in src/core/timeline.js.
- CI: GitHub runs tests only (render/compare skipped by policy). After a merge, wait for the run whose headSha is the merge commit (`gh run list --branch main --json databaseId,headSha`).

## Where things are (TALK foundation already merged)

| Area | Files | Contract |
|---|---|---|
| Speech project config | src/core/speech.js `validateSpeechConfig`, scripts/speech_pipeline.py, scripts/speech_plan.py | `speakers`, `shotSpeakers` (speaker per phrase), `placement` ('center' \| 'lead'), `mix.master` ('mix-v2'), captions with speaker names |
| Mastering | scripts/audio_master.py | phrase levelling across speakers, −16 LUFS delivered, −1 dBTP |
| Speaking faces (TALK-01) | src/core/talk.js, scripts/speech_envelope.py | `shot.speakerAssets {speakerId: assetId}` (detail-2/3 humans or catalog robots); `timeline.speechEnvelope` (prepared once, hashed, required when bound) |
| Dialogue (TALK-02) | src/core/dialogue.js, src/core/graph.js (face chains) | `shot.dialogue {listen, turn, cheat}`; listeners look at the active speaker from measured phrase bounds |
| Body language (TALK-03) | src/core/body.js, src/visual/catalog.js (`headed`, `headRoute`, human blink) | `shot.bodyLanguage {beats, nods, blinks, sway}`; calm per-shot event plan (`bodyPlan`) |
| Render wiring | src/core/draw-film.js → src/visual/draw-graph.js `world()` | dialogueShot before evaluation; `talkAt` + `bodyAt` applied after evaluation on both backends |
| Examples and generators | scripts/talk01-faces.mjs, talk02-dialogue.mjs, talk03-body.mjs | patterns for speech projects, staging, cheats and turnSteps |
| Director | src/director/index.js (`compile`, `buildPrompt` v1.1/v1.2, PROMPT_VERSIONS), schema.js (`request`, `validateIR`), offline.js (`baseline`, `offlineIR`, `literalCast`), src/core/staging.js | TALK-04 extends these |
| Studio | src/studio/model.js (transactional edits), src/studio/production.js (`defaultSpeech`), studio/app.js + index.html; `npm run studio:local` → http://127.0.0.1:4173 (docs/STUDIO.md) | TALK-04 speaker editor |
| Docs to extend | docs/DIRECTOR.md, docs/SPEECH.md (TALK sections), docs/SHOWCASE.md | — |

Other opt-in tools available for the films: `aim`, `turnSteps`, `params.reach`, `restOn`, attachment `offset:'auto'`, place onto `{surface}`, `solveReach` (docs/CINEMATOGRAPHY.md); `params.detail: 3` (docs/IDENTITY.md); composition gate composition-v1 (docs/QUALITY.md).

## Owner working agreement and taste
- The owner delegates whole units and prefers executed recommendations explained in plain language, with no jargon and short tables. Return with a PR and green CI, then ask for review and merge.
- Stop early only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo.
- Motion taste, from three TALK-03 reviews ("heads move too fast", "too many movements and nods", "still … especially nodding"): keep motion calm and sparse.
  - Measure per-character counts (beats, nods, turns) and peak angular speeds before showing a render.
  - Accepted level: about 1 small nod and 2 arm beats per character per 17 s; turns at 0.8 s.
  - Every behaviour is switchable per shot.
- Copy the owner may edit (narration lines, film outline) is drafted by Claude and must be flagged as a draft for approval.
- Never claim a human review, GPU use, a passing test or a merge that wasn't observed.

## Evidence trail of the merged TALK work
- TALK-01 PR #22 → 7f121e7: `talk01-faces-r2`, all gates PASS.
- TALK-02 PR #23 → e17870c: `talk02-dialogue-r2`, all gates PASS.
- TALK-03 PR #24 → 85d7a37: final `talk03-body-r5` at cb74c7b, all gates PASS; nods 1 per character and 5 % of the time.
- Main CI 45603403014 on 85d7a37: test PASS.
- Owner accepted TALK-03 "for now"; amounts may be revisited.
- Full details: docs/SPEECH.md (TALK-01..03) and CURRENT_STATE "Previous unit" sections.

## Known open issues (not blockers)
- Lip motion follows loudness only (no viseme alignment); beats follow loudness peaks, not stressed words.
- No idle weight shift: the rigs have no hip joint.
- Caption reading-speed findings appear on fast lines (≤18 characters per second); keep TALK-05 lines short.
- An interrupted render left `out/talk03-body-r3-*` incomplete; it is superseded and left untouched.

## Next action
- TALK-05 per NEXT_UNITS "TALK-05": branch `feature/talk-05` from `feature/talk-04`, generator scripts/talk05-first-words.mjs, Claude-drafted lines flagged for owner approval, matched render `talk05-first-words-r1` from a clean commit, stacked PR. Then report and ask the owner to merge the TALK-04 PR first.
