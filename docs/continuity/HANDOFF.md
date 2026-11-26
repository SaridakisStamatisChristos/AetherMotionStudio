# Forward-only handoff: Campaign A start (2026-11-26)

Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized; next milestone **DUAL-00** (baseline and capability audit).
Checkpoint: **main 6c71875** (PRs #44–#48 merged; main CI 45837801078 passed). The continuity docs for this checkpoint are on `chore/record-units-1235` (PR #49, docs only). If #49 is still open, its content is the latest canon: ask the owner to merge it (the session permission check refused the agent's merge of this docs-only PR), or merge it on the owner's word.
Status: Campaign A **PLANNED, DUAL-00 NEXT**. No product code changed since 6c71875.
Date: 2026-11-26. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Campaign status: CAMPAIGN_A.md. Earlier handoffs: the git history of this file.

## What the owner asked
"Execute the attached AetherMotion Studio Dual-Backend Finalization Directive … Begin with DUAL-00. Inspect existing implementations before building anything. Reuse all completed capabilities and extend only what is missing. Preserve both backends, all accepted features and the existing production workflow. Execute the milestones sequentially with appropriate positive, negative, regression and actual local rendering tests. Maintain persistent handoffs so I can resume through 'fod continue'. Do not begin the GPU expansion campaign until the final dual-backend release has been verified, accepted and tagged." Also: "update the claude.md, agents.md and etc with fod architecture in mind so i can start from a new session" (done in this checkpoint).

## Previous session in one table (all MERGED)
| PR | Unit |
|---|---|
| #44 | Studio render progress bar; global `[hidden]` fix |
| #45 | Remembered Make-a-film choices; Reset choices |
| #46 | Make Reels cover in the finished panel (OPEN-5 closed) |
| #47 | Far backdrops that fit the place; sets topic-v3 is the dialogue default |
| #48 | Titles none and no speaker names by default for new dialogue films; Studio checkboxes unticked |

- Renders behind them: far-forest-r1 (source f59a19b) and clean-top-r2 (source 67f296d). All gates passed on both backends; agent stills only.
- **The owner has not watched these films or tried the new Studio features.** No film has been rendered from main 6c71875 itself.

## Next action for "fod continue": DUAL-00
Follow CAMPAIGN_A.md "DUAL-00 work plan" exactly. In short:
1. Bootstrap and record: start commit, open PRs and tags, the environment, and the WebGL identity for swangle and vulkan.
2. Run the tests and digests below; record skips.
3. Write the capability audit as docs/CAMPAIGN_A_AUDIT.md: one row per directive capability, each marked existing / partial / missing / out of scope, with source paths. No product code in DUAL-00.
4. Make one baseline matched film from the current main with a new `dual00-…` ID: a dialogue film through Director defaults, showing topic-v3 and titles none together. Use vulkan; record the gates.
5. Fix the campaign fixture ID scheme and protocol file; frozen AF09 stays untouched.
6. Branch `chore/dual-00-audit` from main. Open a PR; merge only on the owner's word. Run FOD CHECKPOINT. Then report the audit to the owner in a short table, with the owner decisions CAMPAIGN_A.md lists for later milestones, before starting DUAL-01.

## Open issues carried into Campaign A
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12; ask before closing. PR #43 (old handoff) is superseded by #49; ask before closing it.
- OPEN-7 disk: out/ holds the agent test jobs and far-forest-r1*, clean-top-r1*/r2*; ask before deleting anything.
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main 6c71875, or later if #49 was merged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the directive section of the active milestone).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
   - `npm test` must give fail 0 (412 tests at 6c71875, 1 Windows skip);
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
