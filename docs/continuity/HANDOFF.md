# Forward-only handoff: session 2026-11-26 (owner units 1, 2, 3 and 5)

Unit: owner "implement 1-2-3 and 5 leave 4 for next cause i am planning to do a lot in three.js … lets finish this dual cpu gpu functionality we have now"
Checkpoint: **main 6c71875** (PRs #44–#48 merged; main CI 45837801078 passed). This record: `chore/record-units-1235` (docs only; it also carries the previous handoff commit of PR #43).
Status: **MERGED** on the owner's word ("merge . after merging wait for my instructions"); each PR merged after its PR CI test job passed. **Waiting for the owner's new plan.**
Date: 2026-11-26. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Earlier handoffs: the git history of this file (previous: ef20c93 on `chore/handoff-session-end`, PR #43 still open).

## Scope completed (all MERGED; branches 2, 3 and 6 rebased on main before their PRs)
| Unit | Branch (head) | What the owner gets |
|---|---|---|
| 1 | PR #44 → 8c214f6 (CI 45835503444) | Progress bar under Production: step, %, frame N of M, about how long is left, time so far; orange with the step on failure. Fix: no empty "Your film is ready" panel while rendering |
| 2 | PR #45 → e29dd99 | The Make-a-film choices and the view come back next time (this browser); **Reset choices** |
| 3 | PR #46 → 18378bf | **Make Reels cover** under the finished film: cover picture, Download cover (JPG), the Reels check in plain words (OPEN-5 closed) |
| 5 | PR #47 → 49f5354 | Dialogue films get a backdrop that fits the place (sets topic-v3 default): tree line on hills, lit street, lab, tech, office and home walls (OPEN-2, part 1) |
| 6 | PR #48 → 6c71875 (main CI 45837801078 passed); the "Titles on top" choice is also remembered | Owner chose after seeing far-forest-r1: **no speaker roles in captions** and **no big titles** for new films (checkboxes "Speaker names in captions" and "Titles on top", both unticked by default). Matched clean-top-r2: all gates pass, 0 names in subtitles |
| 4 | — | GEN-16 Three cinematic profile: **held for the owner's Three.js instructions** |

## Evidence (all observed in this session)
- Bootstrap baseline at 8a74721: digests 3d33fbaee198acad / 14dec244d171dc56 / e3f80439a292f21a / 2cbf9916e65da935; `npm test` 385 tests, 0 fail, 1 skip; Python 59 OK.
- Per branch, `npm test` 0 fail (1 Windows skip): progress 392, remember 391, reels 389, far-backdrop 389. Digests unchanged on far-backdrop.
- Agent click tests (headless Chrome, fresh Studio from the branch, vulkan, forest script):
  - progress: studio-fd9f43a10cb0e33f5109, studio-d4cf9677b63034074a3e;
  - reels: studio-5e27ef2535fc0429316e (cover frame 189, first single, 1080×1920; the NOT_REELS_LAYOUT note shown);
  - remember: browser storage check (set, reload, restored, reset, defaults).
- Matched production **far-forest-r1** (examples/gen12-forest-script.request.json, Director defaults, source f59a19b, sourceDirty false, vulkan, concurrency 8; 254 s with speech prepared once):
  - PASS on CPU and Three, and the matched comparison (shared hashes exact);
  - CHECKS 0 on both (talk 0.79); QUALITY errors 0, warnings 0;
  - frame_glitch clean on both; −16.0 LUFS on both;
  - layers forest-set-2, look crafted-v2; nvidia-smi peak 64 % (167 samples).
- Human review: **none this session.** The owner has not seen the new panel features or far-forest-r1. The agent reviewed stills and draft frames only.
- Not run: CI (nothing pushed), the full native matrix, a GPU benchmark.

## Contract deltas (all additive)
- Studio API: `POST /api/jobs/<id>/reels`; job files `reels-cover.jpg` and `reels-report.json` (served from `<job>/reels/`); `createStudio({reelsExport})` for tests. The job contract is otherwise unchanged.
- scripts/reels-export.mjs: `exportReels(dir,{explicit,reuse,ffmpeg,extract})`, `ffmpegFrame`. CLI behaviour unchanged (refuses an existing export).
- Layers `lab-set-2`, `tech-set-2`, `forest-set-2`, `office-set-2`, `street-set-2`, `home-set-2` (LAYERED_ENVIRONMENTS); `request.sets` adds `'topic-v3'`, the dialogue default.
- Browser-only: localStorage `aethermotion.studio.settings.v1`.

## Open issues and risks
- Rebases before the PRs: the conflicts in studio/app.js, studio/index.html, studio/style.css and docs/STUDIO.md were resolved by taking main and re-applying each unit's edits. Tests after each rebase: 398, 402, 406 and 412 JS tests, 0 fail. Headless-browser smoke tests of the merged page: choices restored, titles remembered, finished panel hidden, no console errors.
- Not re-rendered after the merges: the films were rendered from the unit branches (far-forest-r1 at f59a19b, clean-top-r2 at 67f296d). A new film from main combines the new backgrounds with the clean top; that combination has not been rendered yet.
- Human review: none this session. The owner has not watched far-forest-r1 or clean-top-r2, or tried the new Studio features.
- OPEN-2 part 2 (glass and metal subtle at phone size); OPEN-1, OPEN-3, OPEN-4, OPEN-6 as before. OPEN-7: out/ grew by agent test jobs (studio-d99e3445…, studio-fd9f43a1…, studio-d4cf9677…, studio-5e27ef25…), far-forest-r1* and clean-top-r1*/r2*; ask before deleting anything.
- PR #43 (previous handoff) is still open; its commit is included in this record branch.

## Next action for "fod continue"
1. Bootstrap (below). Expect main 6c71875 or later.
2. **Wait for the owner's new plan** (owner: "after merging wait for my instructions. i have created a new plan that i will feed it to you"). Do not start anything unasked. GEN-16 (Three cinematic profile) is reserved for the owner's Three.js instructions.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state all --limit 6`. Expect main 8a74721 unless the owner merged something.
2. Read AGENTS.md, CURRENT_STATE.md, this file and NEXT_UNITS.md.
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` must print the digests above;
   - `npm test` must give fail 0 (412 tests, 1 Windows skip);
   - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` must give 59 OK.

## Owner working agreement and taste (binding; see also auto-memory)
- **Delegation:**
  - the owner delegates whole units and wants plain-language reports with short tables;
  - stop only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo, or changing accepted films.
- **Branches and merges:**
  - one branch per unit, always from main, never stacked;
  - push the branch and open a PR (the owner allowed pushes: "i allow pushes");
  - **merge only on the owner's explicit word, after PR CI passes**;
  - docs-only records go on `chore/…` branches, which get no CI by design.
- **Choices over silent changes:** the owner prefers being offered choices in the UI over silent rule changes ("give a list of advice … so whoever uses it could be able to choose"). When a threshold is uncertain, offer options and say what the measurement shows.
- **Old films:** "for old videos there is no problem if they remain as they are. the last videos are those that count". New behaviour goes on the Director/Studio path as an opt-in default; accepted films stay unchanged.
- **Generalize:** every fix must work for every video automatically. Prove it with a fresh Director or Studio request and no hand edits.
- **Vertical video:**
  - films go to 9:16 feeds;
  - characters must read large;
  - **no character may ever be cut by the frame edge**. A character wholly outside the frame (for example the listener during a single) is fine.
- **Calm, sparse motion:** about 1 small nod and 2 arm beats per character per 17 s, now alternating arms; turns about 0.8 s; camera pans well under 30°/s; at most one single per shot.
- **Scripts:** the owner writes scripts in Claude chat with the Studio's prompt box (docs/SCRIPT_FORMAT.md). Claude-drafted lines are drafts.
- **Wording and claims:**
  - never call loudness-driven mouths "lip-sync" or "alignment";
  - never claim a human review, GPU use, a passing test or a merge that was not observed;
  - say "clicked through in a headless browser" for agent UI tests, never that the owner did it.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- **Studio for the owner:** double-click `Start-AetherMotion-Studio.cmd` (from a terminal: `.\Start-AetherMotion-Studio.cmd`).
  - It sets the render env below for its window, starts the Studio on 127.0.0.1:4173 and opens the browser.
  - If the agent starts it, use `Start-Process <launcher>` (a visible window), **never a background task of the session**. A hidden Studio confused the owner. Stop a stray one by the PID on port 4173.
- **Render session:** `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); the repo default stays swangle.
  - Sample the GPU with an nvidia-smi loop.
  - Use a Stopwatch, not `Measure-Command`.
- **Production:** `node scripts/produce.mjs --request <file> --backend both --id <new id>`. Commit every input first (`sourceDirty false`).
- **Gates to report:**
  - produce PASS lines;
  - the `CHECKS:` line (motion-speed-v1, visibility-v2, crowding-v1, silence-v1 with talk share, and reels-v1 in Reels mode);
  - `python scripts/frame_glitch.py <film>`, which **needs `AETHER_FFMPEG` set**;
  - ebur128 loudness (about −16 LUFS);
  - speech-report.json `pace`, `fit` and `alignment.maxCps`.
- **Agent UI tests:**
  - start a temporary Studio from the working tree with `createStudio()` on a spare port (4190+), in a temporary `scripts/.tmp-*.mjs` file;
  - drive it with `openBrowser` from `@remotion/renderer` (`page._client().send('Page.captureScreenshot',…)`, response `r.data ?? r.value.data`);
  - delete the temporary script before committing.
- **Editing:**
  - use the editor tool or `node scripts/fod-apply-edits.cjs`;
  - never put regex backslashes or `\n` through Bash heredocs or `node -e` (this broke edits several times);
  - for multi-step doc edits, write a .cjs file to the scratchpad and run it.
- **Stills:** frame numbers from `<id>-prepared/timeline.json` (sample ÷ 1600). Then `ffmpeg -i film.mp4 -vf "select='eq(n,F1)+…',scale=216:384,tile=Nx1" -frames:v 1 <scratchpad>/x.png`.
