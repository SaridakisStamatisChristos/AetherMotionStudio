# Forward-only handoff: plan complete; owner guide and finished-film panel (owner types only "fod continue")

Date: 2026-11-26. Keep reports short and plain.
Checkpoint: branch `feature/studio-finished` from **main ee4fbbc** (PR #41 merged). The owner authorized merging this PR after its CI ("then merge pr 41... or pr 42 whatever order you use").

## Plan being executed (owner, 2026-11-26)
| # | Step | State |
|---|---|---|
| 1 | Fix A: film length follows the speech; silence-v1 | MERGED (PR #38) |
| 2 | GEN-15 look accepted; cleanup step 2 | DONE |
| 3 | GEN-15 step 2 (sets, pieces, glass and metal, alternating arms, CPU eye fix) | MERGED (PR #39) |
| 4 | Studio UI refinement: simple view, auto-clean, length choices, speaker-names checkbox | MERGED (PR #40 → 4487805, "merge 40") |
**The plan is complete. Nothing else is authorized.**

## Follow-up: owner guide and finished-film panel
- **Finished-film panel and the owner guide** (owner: "write an md file with instructions on how to start the studio etc. then add the finished film with download button"):
  - STUDIO_GUIDE.md (repository root, for the owner): start, make a film, get the finished film, stop, troubleshooting.
  - A finished job shows **Your film is ready**: the film, **Download film (MP4)**, **Captions (.srt)** and one plain line (src/studio/finished.js `finishedSummary`: length, size, checks). The render log and all files fold away below; the page scrolls to the panel once.
  - In the simple view the draft preview hides once the film is ready (`body.has-film`).
  - Downloads are named after the film (studio-server.mjs `downloadName`): `<project id>.mp4/.srt/.vtt`, other files `<project id>-<file>`.
  - Click tests (agent, headless Chrome, fresh Studios from the branch, vulkan):
    - job studio-0e63bc8fcae50c78d99c: the panel appeared at 74 s with "65.0 s · 1080×1920 (vertical) · checks passed (13 review notes)", and the download returned the 49.6 MB MP4. That download was still named film.mp4, which led to `downloadName`.
    - job studio-7529a4a8064bd4d9e7f8: Content-Disposition film-mwxgyee6.mp4 and film-mwxgyee6.srt; the draft preview hidden; the screenshot shows the panel only.
  - The prompt box's step 3 now says extras are removed automatically.
- Tests: 385 JS (0 fail, 1 skip).

## Studio UI refinement: what changed
| File | Change |
|---|---|
| studio/index.html | `body.simple`; the Advanced button; `adv` tags on the workspace, Save/Export, the library, Foundry, the preview mode, timeline, the production toolbar, jobs, the inspector, "Generate project only" and Profile; `narrator-only` fields; "Generate & render film" is the first (primary) button; the title "Your film" and plain empty-stage text |
| studio/app.js | `setMode` (simple by default) and narrator-only visibility |
| studio/style.css | Simple-view rules; `.narrator-only[hidden]` |
| tests/studio01.test.js | "Studio UI refinement" test (9 tests in the file) |
| docs/STUDIO.md | "Simple 'Make a film' view" section and evidence |

## Evidence (this checkpoint)
- Digests unchanged with `--exclude talk04,talk05,gen01,gen09,gen12,fixa`: graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935.
- Tests: 381 JS (0 fail, 1 skip); 56 Python OK.
- Click-through (agent, headless Chrome on a fresh Studio from the branch code, vulkan):
  - the simple view opened by default;
  - the topic and the forest script were filled in (136 words, "Good length"), and "Generate & render film" was clicked;
  - job studio-ddb5f4a61d08ce9e740e succeeded in about 65 s (speech cached; render 49.6 s);
  - the finished film and the download links appeared in the page;
  - film df90f17e13d52492…: 1800 frames, glitch clean, −16.0 LUFS; PASS lines; QUALITY errors 0, warnings 0; crafted-v2, forest-set, alternateArms.
- The screenshot exposed a bug: "Narrator voice" stayed visible with the interview cast, because `label {display:grid}` overrode `hidden`. Fixed with `.narrator-only[hidden]{display:none!important}`, tested and re-checked by screenshot.
- **The owner has not tried the new view.**
- **Owner's first Studio film** ("great for the first production through pipeline looks great"):
  - Job studio-69cffc5969ccc5a3504e, bees, 65 s: 1950 frames, pace 0.92 kept, longest pause 1.2 s, all checks 0, glitch clean, −16.0 LUFS.
  - Agent inspection found a content bug: Claude's "Topic: …" line (which the prompt asks for) was pasted without Clean up and spoken. Every turn shifted, so the Student explained and the Explorer asked.
  - **Fix:** the page now cleans the script automatically on Generate (`autoClean` → `cleanScript`). The word count counts only what will be spoken and flags pasted extras.
  - **Length advice follows Fix A:** a long dialogue script says "set Seconds to N to keep the calm pace" (N = words ÷ 2.33, rounded up to 5 s); a short one says "the film will be about N s". Narrator films keep the old advice.
  - Click re-test with the owner's exact answer at 60 s (job studio-cae85f1ea275cb3c4224): the Topic line was removed on click, 138 spoken words, "Good length". The Student asks and the Explorer explains. 60.0 s, glitch clean, −16.0 LUFS.
  - Pace 0.92 was not kept at 138 words / 60 s: the 120–140 range may be slightly generous (owner decision; unchanged).
- **Checkbox "Speaker names in captions"** (owner: "it writes who is who in the captions … is that intentional?" → "i prefer a checkbox"):
  - Names have been intentional since TALK-01/02: with more than one speaker, the name shows above each caption and as "Name: " in the .srt/.vtt.
  - New opt-in `speech.captions.speakerNames: false` (src/core/speech.js) hides them in burned-in captions (draw-film.js) and in the sidecars. One shared `caption_labels` (scripts/speech_plan.py) feeds the writer and both checkers (verify.py, quality_media.py).
  - Studio: the checkbox is ticked by default; unticked, `directorRequest` adds the speech setting for dialogue casts (narrator requests are unchanged).
  - Click test with the box unticked (job studio-35d588b054e8486b020f, bees script): job succeeded (verify passed); 0 speaker names in captions.srt and captions.vtt; burned-in captions show words only (agent frames 100, 400 and 900).
  - Tests: tests/studio01.test.js and tests/test_caption_labels.py (3).
- **Length choices instead of a tighter range** (owner: "instead of tighten the word range why not give a list of advice … so whoever uses it could be able to choose"):
  - `scriptHelp` sorts a script into zones using the calm rate `CALM_WORDS_PER_SECOND` 2.15, which separates the measurements (138 words / 65 s kept the 0.92 pace; 136–139 words / 60 s did not):
    - calm: "Good length, calm pace";
    - tight: within 120–140 per 60 s but faster than calm;
    - long: over the range;
    - short.
  - Tight and long offer **Use N s** (N = words ÷ 2.15, rounded up; for dialogue films the length still follows the speech) and **Keep**. Long also hints **Shorten** (about K words; for dialogue films, remove a question and its answer together).
  - Short dialogue scripts say "the film will be about N s". Short narrator scripts offer Use N s or Keep.
  - The page renders the choices under the word count: "Use" sets Seconds; "Keep" closes the choice for this script and length. The 120–140 range is unchanged.
  - Browser check (agent): the bees script at 60 s showed "Use 65 s / Keep 60 s". Clicking Use set 65 s and showed "Good length, calm pace".
- The Studio started by the launcher earlier in this session (port 4173) runs older server code. The owner should restart it (close its window, double-click the launcher) to get Fix A and GEN-15 step 2 in Studio films.

## Pending owner decisions
1. None open: the guide and finished-panel PR is merged on the owner's prior word once its CI passes.
3. Later options (not scheduled): a render progress bar, a finished-film panel, remembered settings; GEN-16 policy; the Instagram test upload (deferred to the very end).

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
  - `npm test` fail 0 (385 tests, 1 Windows skip);
  - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` 59 OK.
- After that the owner's plan is complete. Ask what comes next; offer the later options above. Do not start anything unasked.
- Never merge without the owner's word and a passing PR CI. Never stack branches.
