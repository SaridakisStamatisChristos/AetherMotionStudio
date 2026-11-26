# Forward-only handoff: GEN-15 step 2 done, Studio UI refinement last (owner types only "fod continue")

Date: 2026-11-26. Keep reports short and plain.
Checkpoint: branch `feature/gen-15-step2` from **main 8e65805** (Fix A merged as PR #38; #37 closed, included). Earlier handoffs: git history of this file. Binding facts are in CURRENT_STATE.md.

## Plan being executed (owner, 2026-11-26)
| # | Step | State |
|---|---|---|
| 1 | Fix A: film length follows the speech; silence-v1 | MERGED (PR #38). The owner watched fixa-sky-r1 ("great i seen the video"). |
| 2 | GEN-15 look accepted; cleanup step 2 | DONE |
| 3 | GEN-15 step 2: dressed sets, word-matched pieces, glass and metal parts | IMPLEMENTED + TESTED + RENDERED on `feature/gen-15-step2`. PR pending. **Merge only on the owner's word, after PR CI.** |
| 4 | **Last: Studio UI refinement** | Next after step 3 is merged, on a new branch from main. The owner said it is practical now; ask what they want refined (layout, wording, prompt box) before starting. |

## GEN-15 step 2: what changed
| File | Change |
|---|---|
| src/visual/crafted.js | `LOOKS` + 'crafted-v2', `isCrafted`, `MATERIALS`, `partRole`, `mixColor` |
| src/visual/catalog.js | Every recipe part passes its role as an extra `box` argument (`primitive(..., family)`) |
| src/visual/mesh.js, src/visual/three-backend.js | crafted-v2 glass sheen and metal highlight (CPU); glass and metal materials (Three); crafted lighting for both crafted looks |
| src/core/cinematography.js | `DRESSED_SETS` (lab, tech, forest, office, street, home) added to `LAYERED_ENVIRONMENTS`; `emitEnvironment` draws catalog dressing behind the speakers |
| src/director/sets.js | `SETS_V2`, `PIECE_WORDS`, `topicSetFor`, `fitPiecesFor` (topic-v1 functions unchanged) |
| src/director/index.js, schema.js | Dialogue defaults topic-v2 and crafted-v2; v1 and none selectable; negatives |
| src/core/body.js, src/director/index.js | `bodyLanguage.alternateArms` (owner: "the characters move their left hand only" → "add it now"; old videos may stay as they are): beats alternate right/left; the dialogue default |
| src/visual/crafted.js `litBias`, src/visual/mesh.js | CPU eye fix in the crafted looks (owner: "the robot has one eye") |
| tests/gen15b.test.js (new, 8); tests/talk04.test.js (bodyLanguage now includes alternateArms); tests/gen12.test.js, tests/gen15.test.js | v1 behaviour is now pinned by name (the default moved to v2) |
| docs/LOOK.md, docs/SETS.md | Step 2 sections, topic table, evidence |

## Evidence (this checkpoint)
- Digests unchanged with `--exclude talk04,talk05,gen01,gen09,gen12,fixa`: graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935.
- Tests: 378 JS (0 fail, 1 skip); 56 Python OK.
- Render `gen15b-sky-r1` (the sky script, 60 s), from clean 6dea830: CPU 6769a5630b61c789…, Three 07af439d90e3aa2f…. All PASS; CHECKS 0 (silence-v1 0, talk 77 %); QUALITY pass-with-findings, errors 0, warnings 0; matched hashes exact; glitch clean; −16.0 LUFS; vulkan. Render time: CPU 131.6 s (fixa-sky-r1 113.3 s, +16 % from the dressing), Three 55.0 s (56.0 s). Agent stills: the lab-set dressing shows behind the speakers, the pieces match the words, and both backends agree. **No human review.**
- Render `gen15b-sky-r2` (alternating arms), from clean a189015: CPU b5698d35a2e5fdf4…, Three 5849347e0ae35f46…. All PASS; CHECKS 0; matched hashes exact; glitch clean; −16.0 LUFS. Beats per character alternate right and left (Student and Explorer 7 each). Agent frames 336 and 632: the Explorer lifts its left arm, then its right arm, mirrored. **No human review.**
- **Robot eyes on CPU** (owner: "in some frames in cpu rendering the robot has one eye"):
  - Cause: the CPU painter sorts flat polygons by average depth. On a turned head the far eye sat deeper than the centres of the head block and face panel and was painted over. This also affects the historical painter.
  - Fix in the crafted looks only (`CRAFTED.litBias` 0.18 m): glowing surface details (eyes, lights, mouths) sort nearer. 0.08 was not enough: gen15b-sky-r3 frame 1620 showed only the bevel strips of one eye. 0.16 is the smallest value that keeps every eye front visible for head turns up to ±0.9 rad and side cameras.
  - Three has a depth buffer and is unaffected. The historical painter is unchanged.
  - Render `gen15b-sky-r4`, from clean 751174a: CPU 096dbab2fcefe1e8…, Three 5849347e0ae35f46… (byte-identical to r2). All PASS; CHECKS 0; glitch clean; −16.0 LUFS. Agent frames 585, 1620, 1665 and 1710 show both eyes (r2 showed one). Gesture frames show nothing glowing through the arms. **No human review.**
- Preview stills (agent, Studio page drawing at 360×640, not native): the tech set (server racks, control panels, dark glassy screens) and the forest set (trees, fern, rocks) on both backends.
- Known:
  - glass and metal are subtle at feed size;
  - the far skyline blocks remain behind the dressing;
  - "How do bridges carry trucks?" still shows no set piece (GEN-06 singles; recorded in GEN-12).

## Pending owner decisions
1. Watch gen15b-sky-r4 (out/gen15b-sky-r4-cpu-polished/film.mp4 and the Three film; r4 = step 2 + alternating arms + the CPU eye fix) and compare it with fixa-sky-r1; then merge the GEN-15 step 2 PR (after its CI).
2. Studio UI refinement (last): what to refine.
3. GEN-16 policy. The Instagram test upload is deferred to the very end.

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
  - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` must print the digests above;
  - `npm test` fail 0 (378 tests, 1 Windows skip);
  - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` 56 OK.
- If the GEN-15 step 2 PR is open: report its CI and ask the owner to merge.
- After the merge: Studio UI refinement (the last step); ask what to refine first.
- Never merge without the owner's word and a passing PR CI. Never stack branches.
