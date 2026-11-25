# Forward-only handoff — after GEN-04..09 (owner types only "fod continue")

Unit: GEN-04, 05, 06, 08 and 09 are IMPLEMENTED + TESTED + RENDERED (agent-reviewed) on `feature/gen-04-09`, with one PR against main. **Not merged.** GEN-07 was deferred by the owner.
Checkpoint: branch head is the checkpoint commit after edd3a3d (code at edd3a3d; renders from clean edd3a3d). main is still 4f588e3.
Status: AWAITING OWNER REVIEW AND MERGE.
Authorized by: owner, 2026-11-25: "execute gen-04 to gen9 for gen 5 speech a bit slower. gen 6 yes i want these cuts for gen 07 i dont think its needed". Then: "can the instragram be a mode and in case i want i can generate longer videos?" and "after gen 9 finishes . write a handoff for the new session using the fod continue principles."
Date: 2026-11-25
Earlier handoffs: git history of this file (record branches `chore/record-*`). Binding facts are in CURRENT_STATE.md.

## What "fod continue" must do (step by step)
1. Bootstrap (CLAUDE.md):
   - `git status --short --branch` and `git rev-parse HEAD`. Expect `feature/gen-04-09`, clean, or main if the owner merged in between. Never discard user changes.
   - Read AGENTS.md, CLAUDE.md, CURRENT_STATE.md ("Active unit"), this file and NEXT_UNITS.md ("Candidates after GEN-03", status block).
   - Report in plain language: active unit | checkpoint | state loaded | blockers | next action.
2. `git fetch`. Check the PR state with `gh pr list --head feature/gen-04-09 --state all`.
   - If it was merged, record the merge (merge commit, main CI) on a new record branch `chore/record-gen-04-09`, then go to step 5.
3. Baseline. `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09` must print:
   - graph 204 shots 3d33fbaee198acad
   - geometry 250 assets 6370 boxes 14dec244d171dc56
   - detail2 e3f80439a292f21a
   - director 7 requests 2cbf9916e65da935
   - `gen09` is now excluded too: examples/gen09-reels.request.json is a new dialogue request.
4. `npm test` must end with `# fail 0` (338 tests, 337 pass, 1 Windows skip). Python: 41 OK.
5. **Do not start a new unit on your own.** Ask the owner the open questions below, in plain language and with a short table. Only the owner says "merge".
   - On "merge": merge the PR, watch main CI on the merge commit, record it.
   - For a new unit: branch `feature/<unit>` from the record branch (or main) and follow the FOD loop:
     - opt-in or default-proven-unchanged (fod-digests);
     - tests including negatives;
     - a matched CPU/Three render from a clean commit;
     - frame-glitch and loudness checks;
     - agent stills at the middle of every spoken line, on both backends;
     - docs and checkpoint, push, PR, CI, report; ask before merging.

## Questions for the owner (open decisions)
| # | Question | Facts |
|---|---|---|
| 1 | Merge the GEN-04..09 PR? | All gates pass and all checks are 0 on both new films. Agent-reviewed only. |
| 2 | Reels mode makes characters smaller. Is that OK? | Keeping clear of Instagram's buttons and putting captions on top leaves the speaker at about 0.39 of the normal safe height (0.56 without Reels). The lower frame is mostly floor. Options: accept it; or let captions overlap the lower body; or a wider stage so Reels can have singles too (Reels currently gets no singles). |
| 3 | One caption is still a bit fast | Pace 0.92 brought the fastest caption from 20.0 to 19.1 characters per second (limit 18). Options: pace 0.85, or captions staying on screen a little longer (GEN-05 option b). |
| 4 | Instagram numbers | Meta publishes no single safe-area figure for organic Reels; guides disagree. The mode keeps top 220, bottom 420, left 60 and right 120 px clear on 1080×1920. Please check one test upload in the app. |
| 5 | Next unit | In the owner's order: GEN-10 mouth shapes (needs a local tool), GEN-11 idle weight shift (no owner decision needed, recommended), GEN-12 topic sets, GEN-13 music and sound, GEN-14 real dialogue writing, then the look track GEN-15..18. |

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

## Where things are (this branch)
| Unit | Files | Contract / note |
|---|---|---|
| GEN-04 crowding | src/quality/crowding.js, tests/gen04.test.js, docs/QUALITY.md | `crowding-v1`, `isCatalogCharacter`; known findings: cast line-ups and the "steps" walk-past in older films |
| GEN-05 pace | src/core/speech.js `SPEECH_PACE`, timeline.js, scripts/speech_pipeline.py, speech_plan.py `speed_ladder`, verify.py, src/director/dialogue.js, tests/gen05.test.js, test_speech_pace.py, docs/SPEECH.md | `speech.pace`, `request.dialogue.pace`; the report records `pace {requested, kept}` |
| GEN-06 singles | src/core/singles.js, cinematography.js (`framing:'single'`), timeline.js (`titleHold`), fidelity-effects.js, motion-check.js OFF_FRAME, director/index.js, tests/gen06.test.js, docs/CINEMATOGRAPHY.md | `singles-v1`; only true singles; `request.dialogue.singles` |
| GEN-08 visibility | src/quality/visibility.js, produce.mjs, studio-server.mjs, tests/gen08.test.js, docs/QUALITY.md | `visibility-v2`, threshold 0.70; v1 kept |
| GEN-09 Reels | src/core/reels.js, reels-layout.js, cinematography.js (`safeArea`, `SAFE_AREAS`), draw-film.js, draw-graph.js, director schema/index, scripts/reels-export.mjs, tests/gen09.test.js, docs/REELS.md | `delivery:'reels-v1'`, `request.delivery`, `reelsProject`, `reelsCheck`; Director `AIM_BLEND` 0.12 |

## Evidence trail
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
- Run "fod continue": bootstrap, PR state, baseline digests and tests.
- Then ask the owner questions 1–5 (merge first). Do not merge or start a unit without the owner's word.
