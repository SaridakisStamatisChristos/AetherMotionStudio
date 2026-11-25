# Forward-only handoff — after GEN-15 step 1 (owner types only "fod continue")

**Update (latest):** main 22ffec4 has GEN-15 step 1 and the Three tune (PRs #33 and #34 merged). Render cleanup step 1 is done (out/ 1.8 GB). Next action:
- bootstrap, then baseline with `--exclude talk04,talk05,gen01,gen09,gen12`;
- ask whether the owner accepts the GEN-15 look; acceptance triggers cleanup step 2 (delete the reference set, after confirming the list);
- continue with GEN-15 step 2 (richer sets, part materials) on `feature/gen-15-step2` from main;
- one branch per unit from main, never stacked; merge only on the owner's word and after PR CI.


Unit: GEN-12 (topic-fitting sets), plus a GEN-05b audit regression fix, is IMPLEMENTED + TESTED + RENDERED (agent-reviewed) on `feature/gen-12`. PR pending owner merge. main 3ac0f01 already has GEN-04..11 and the CPU robot mouth fix (PRs #29, #30 and #31 merged).
Authorized by: owner, 2026-11-25: "merge and continue" (after "lets do it seriallized. Gen10 and onwards").
Date: 2026-11-25

## What "fod continue" must do
1. Bootstrap (CLAUDE.md): git status and HEAD; read AGENTS.md, CURRENT_STATE.md, this file and NEXT_UNITS.md; report.
2. `git fetch`; check the GEN-12 PR with `gh pr list --state all --head feature/gen-12`. If it was merged, record it on a `chore/record-*` branch.
3. Baseline: `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12` (**gen12 is now excluded**) must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935.
   - `npm test` must give fail 0 (355 tests, 1 Windows skip).
   - `PYTHONPATH=scripts python -m unittest discover -s tests -p "test_*.py"` must give 51 OK.
4. Ask the owner, in plain language:
   - merge the GEN-12 PR (wait for its CI first);
   - GEN-13 music and sound: which local, licence-clear sources? Options: procedural music generated in code (no licences), or CC0 packs the owner downloads;
   - GEN-14 real dialogue writing: which local model and provider (a new local dependency).
   Do not start GEN-13 or GEN-14 without those answers. The look track GEN-15..18 follows; GEN-15 needs no decision.
5. The Instagram test upload is deferred to the end of everything (owner).

## Owner working agreement and taste (binding; see also auto-memory)
- **Delegation:** the owner delegates whole units and wants plain-language reports with short tables. Stop only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo, or changing accepted films.
- **Generalize:** every fix must work for every video automatically. Prove it with a fresh Director request and no hand edits.
- **Vertical video:**
  - films go to 9:16 feeds;
  - characters must read large; report speaker height as a share of the safe area;
  - **no character may ever be cut by the frame edge**. A character wholly outside the frame (for example the listener during a single) is fine.
- **Calm, sparse motion:** about 1 small nod and 2 arm beats per character per 17 s; turns about 0.8 s; camera pans well under 30°/s; at most one single per shot.
- **Wording and claims:**
  - never call loudness-driven mouths "lip-sync" or "alignment";
  - Claude-drafted lines are drafts;
  - never claim a human review, GPU use, a passing test or a merge that was not observed.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- Render session: `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); the repo default stays swangle.
  - Sample the GPU with a `Start-Job` nvidia-smi loop.
  - Do not wrap produce in `Measure-Command`, which swallows the log. Use a Stopwatch and capture the output.
- Production: `node scripts/produce.mjs --request <file> --backend both --id <new id>`. Commit every input first (`sourceDirty false`).
- Reels:
  - add `"delivery":"reels-v1"` to a request (see examples/gen09-reels.request.json);
  - after rendering: `node scripts/reels-export.mjs out/<id>-cpu-polished`, which writes reels/cover.jpg and reels-report.json.
- Gates to report:
  - produce PASS lines;
  - the `CHECKS:` line (motion-speed-v1, visibility-v2, crowding-v1, and reels-v1 when in Reels mode);
  - `python scripts/frame_glitch.py <film>`;
  - ebur128 loudness (about −16 LUFS);
  - speech-report.json `pace` and `alignment.maxCps`.
- Editing:
  - use the editor tool or `node scripts/fod-apply-edits.cjs <file> <edits.cjs>`;
  - write long test files with the editor tool: one Bash heredoc of a test file failed on quoting;
  - never use sed with code containing backticks or `\n`.
- Stills: frame numbers from `<id>-prepared/timeline.json` (segment sample midpoints ÷ 1600). Then `ffmpeg -i film.mp4 -vf "select='eq(n,F1)+…',scale=216:384,tile=Nx1" -frames:v 1 <scratchpad>/x.png`.

## Evidence trail (this checkpoint)
- Renders from clean 33e576f; all gates PASS, checks 0, glitch clean, −16.0 LUFS:
  - `gen06-interview-r3`: CPU 078f5ce03c69b457…, Three 480add012aa01cd7…;
  - `gen09-reels-r3`: CPU 8801f584fe865dcd…, Three bbc9eb9a8d774224…; reels-export PASS.
  - Max caption 17.94 cps, 0 outliers.
- Render from clean be66483: `gen11-interview-r1`, CPU 915190f9b5727d0a…, Three 23631d257648561a…; all gates PASS.
- Superseded: gen09-reels-r2. Interrupted: gen06-interview-r2. Both are kept on disk; ask before any cleanup.
- Human review: none of these films has been watched by the owner.

## Where things are (this branch)
| Unit | Files | Contract / note |
|---|---|---|
| GEN-04 crowding | src/quality/crowding.js, tests/gen04.test.js, docs/QUALITY.md | `crowding-v1`, `isCatalogCharacter`; known findings: cast line-ups and the "steps" walk-past in older films |
| GEN-05 pace | src/core/speech.js `SPEECH_PACE`, timeline.js, scripts/speech_pipeline.py, speech_plan.py `speed_ladder`, verify.py, src/director/dialogue.js, tests/gen05.test.js, test_speech_pace.py, docs/SPEECH.md | `speech.pace`, `request.dialogue.pace`; the report records `pace {requested, kept}` |
| GEN-06 singles | src/core/singles.js, cinematography.js (`framing:'single'`), timeline.js (`titleHold`), fidelity-effects.js, motion-check.js OFF_FRAME, director/index.js, tests/gen06.test.js, docs/CINEMATOGRAPHY.md | `singles-v1`; only true singles; `request.dialogue.singles` |
| GEN-08 visibility | src/quality/visibility.js, produce.mjs, studio-server.mjs, tests/gen08.test.js, docs/QUALITY.md | `visibility-v2`, threshold 0.70; v1 kept |
| GEN-12 sets | src/director/sets.js (`SETS`, `topicSet`, `applySet`, `fitPieces`), director/index.js, schema.js (`request.sets`), examples/gen12-forest.request.json, tests/gen12.test.js, docs/SETS.md | `topic-v1` |
| GEN-05b audit fix | scripts/quality_metrics.py `expected_subtitles`, quality_media.py reading speed, tests/test_captions_readable.py | holds honoured |
| GEN-10 mouths | scripts/visemes.py, speech_pipeline.py, src/core/talk.js (`VISEMES`, `visemeAt`, `validateVisemes`), catalog.js (`mouthWidth`), speech.js (`mouths`), timeline.js, production.js, tests/gen10.test.js, test_visemes.py, docs/MOUTHS.md | `viseme-estimated-v1`, `speech.mouths` |
| GEN-11 weight | src/core/body.js (`WEIGHT`, `weightAt`), catalog.js `headRoute` (`pose.hip`), director/index.js, tests/gen11.test.js, docs/IDLE.md | `bodyLanguage.weight` |
| GEN-05b captions | scripts/speech_plan.py (`balanced`, `phrase_speed`, holds), speech_pipeline.py, verify.py, speech.js (`readable`, `holdSample`, `cueAt`), timeline.js, tests/gen05b.test.js, test_captions_readable.py, docs/SPEECH.md | `captions.readable` |
| GEN-09 Reels | src/core/reels.js, reels-layout.js, cinematography.js (`safeArea`, `SAFE_AREAS`), draw-film.js, draw-graph.js, director schema/index, scripts/reels-export.mjs, tests/gen09.test.js, docs/REELS.md | `delivery:'reels-v1'`, `request.delivery`, `reelsProject`, `reelsCheck`; Director `AIM_BLEND` 0.12 |

## Evidence trail (GEN-04..09, first version)
- Renders from clean edd3a3d. All gates PASS, checks 0, frame-glitch clean, −16.0 LUFS:
  - `gen06-interview-r1` (default layout, 3 singles): CPU 8b3278cf336ca49e…, Three 14673933adf21772….
  - `gen09-reels-r2` (Reels): CPU 75f9259bf3391d68…, Three 5a9157feec85dba7…; reels-export PASS.
- Superseded (kept on disk; ask before any cleanup): `gen09-reels-r1` (19bd7e4), whose "singles" still showed the neighbour in view.
- Earlier accepted renders are unchanged (see CURRENT_STATE). Render cleanup plan: NEXT_UNITS (at the start of GEN-15).
- Human review: none of the GEN-04..09 renders has been watched by the owner yet.

## Open issues (not blockers)
- Questions 2–4 above (Reels size, the last fast caption, Instagram numbers).
- Three-speaker lines get no singles (neighbours 1 m apart), in either layout. Reels gets no singles with the Director spacing.
- Older accepted films keep their recorded findings (crowding, visibility-v2 cottage guide, off-frame, fast turns); GEN-07 was deferred.
- Still open from before: mouths follow loudness only (GEN-10); no idle weight shift (GEN-11); "Wrrrench" not heard by the owner; TALK-05 has a wide LRA.

## Next action
- Run "fod continue": bootstrap, the GEN-12 PR state, baseline (with gen12 excluded) and tests.
- Ask the owner: merge GEN-12? GEN-13 sources? GEN-14 model?
- Do not merge without the owner's word, and only after PR CI has reported.
