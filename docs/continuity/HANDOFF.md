# Forward-only handoff: Fix A done, GEN-15 step 2 next (owner types only "fod continue")

Date: 2026-11-26. Keep reports short and plain.
Checkpoint: branch `feature/fix-a` from **main 135dbcc** (not stacked). It also carries the STUDIO-01 merge record (cherry-picked from PR #37, docs only; close #37 when this merges). Earlier handoffs: git history of this file. Binding facts are in CURRENT_STATE.md.

## Plan being executed (owner, 2026-11-26)
"do these: Fix A … Accept the GEN-15 look … ui refinement will be the last not in this step put it in a later step at the end of handoff we are executing"
| # | Step | State |
|---|---|---|
| 1 | Fix A: film length follows the speech; silence-v1 | IMPLEMENTED + TESTED + RENDERED on `feature/fix-a`. PR pending. **Merge only on the owner's word, after PR CI.** |
| 2 | GEN-15 look accepted; cleanup step 2 | DONE. The owner confirmed the exact deletion list. |
| 3 | GEN-15 step 2: richer sets; part materials (metal trims, glass screens) | AUTHORIZED. Next, on a new branch from main **after Fix A is merged** (no stacking). Plan: docs/LOOK.md "Next steps". Known input: in fixa-sky-r1 the topic-set props do not fit the topic (a DNA helix for the sky). Code: src/visual/crafted.js, src/director/sets.js (GEN-12), catalog part colours. Rules: opt-in or default-proven-unchanged (fod-digests); both backends; tests with negatives; a matched render from a clean commit; stills review. |
| 4 | **Last: Studio UI refinement** | Later; not in this step. |

## Fix A: what changed
| File | Change |
|---|---|
| scripts/speech_plan.py | `fit_target`: FIT_GAP 0.18 s, FIT_TAIL 0.5 s, FIT_END 1 s; at least 180 frames; fixed shots kept; capped at the target |
| scripts/speech_pipeline.py | The target comes from `fit_target` at each ladder step and in the readable-captions rerun. The report gets `fit {mode, requestedFrames, actualFrames}`. |
| src/core/speech.js | `speech.fit` contract, `SPEECH_FIT`, `fitsTarget`. The timeline check allows 180 frames up to the target only with fit. |
| scripts/verify.py, scripts/matched_inventory.py, scripts/produce.mjs | Films without fit keep the exact length. Fitted films may run from 180 frames up to the target. produce records `requestedFrames` and uses the measured length. |
| src/director/dialogue.js | Dialogue films default to `fit: 'speech-v1'` unless the request's speech says `'none'`. |
| src/quality/silence.js (new), produce.mjs | silence-v1 on every production (CHECKS line); a gate before rendering for fitted films |
| tests/fix-a.test.js, tests/test_speech_fit.py | Contract, defaults, opt-out, silence cases, produce wiring, fit_target |
| docs/SPEECH.md, docs/QUALITY.md | Fix A sections and evidence |

## Evidence (this checkpoint)
- Digests unchanged: graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935.
- Tests: 372 JS (0 fail, 1 skip); 56 Python OK.
- `fixa-script-r1`, from clean e6dc717 (the owner's forest script):
  - CPU 93324d88432897bb…, Three 9d6034c9e7c6084f…; **byte-identical to forest-script-r1** (the script fills 60 s);
  - silence-v1 0 warnings, talk 79 %;
  - all gates PASS, glitch clean, −16.0 LUFS.
- `fixa-forest-r1` (gen12-forest placeholder lines): fitted to 716 frames, but stopped before rendering by the first silence-v1 rule (talk share 58 % < 60 %). Its partial outputs are kept. The rule became report-only in 563f228.
- `fixa-forest-r2`, from clean 563f228:
  - **716 frames, 23.9 s instead of 60 s**;
  - silence-v1 0 warnings, longest pause 2.0 s;
  - CPU 5f485de3f3477351…, Three c48f204a136a4e1a…;
  - all PASS, QUALITY pass, matched hashes exact, glitch clean, −16.0 LUFS, vulkan.
- `fixa-sky-r1` (owner: "add a script and re render … for 60 with script"; Claude-drafted script, examples/fixa-sky-script.request.json, 14 lines, 139 words), from clean ea34277: 1800 frames (the script fills 60 s), silence-v1 0, longest pause 1.15 s, talk 77 %, 4 lines slowed for readable captions. CPU 5d2236d14f330b38…, Three 8b40c327165b1928…. All PASS, matched hashes exact, glitch clean, −16.0 LUFS. Agent stills: the topic-set props do not fit the sky topic (a DNA helix, a dotted bar); recorded for GEN-15 step 2 (richer, topic-fitting sets). No human review.
- Before Fix A, silence-v1 on gen15-forest-r2: 6 warnings, longest pause 12.9 s, talk 23 %.
- The agent looked at stills of fixa-forest-r2: it ends calmly on the last line. **No human review.**

## Pending owner decisions
1. Merge the Fix A PR (after its CI), then close PR #37 (its commit is included).
2. GEN-16 policy. The Instagram test upload is deferred to the very end.

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


## Next action
- "fod continue": bootstrap and baseline:
  - `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state all --limit 5`;
  - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935 (dialogue examples are excluded because their output follows the dialogue defaults);
  - `npm test` fail 0 (372 tests, 1 Windows skip);
  - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` 56 OK.
- If the Fix A PR is open: report its CI and ask the owner to merge.
- After the merge: start GEN-15 step 2 on `feature/gen-15-step2` from main.
- Studio UI refinement stays last.
- Never merge without the owner's word and a passing PR CI. Never stack branches.
