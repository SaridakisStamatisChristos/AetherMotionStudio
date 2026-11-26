# Forward-only handoff: Campaign A, DUAL-04 repaired after two independent audits (2026-11-26)

Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized.
- DUAL-00…03 and the CI `npm ci` step are **MERGED**; main is at 5145f50. PR #54 was merged on "Merge PR #54".
- DUAL-04 (charts, timelines, flowcharts, comparison cards) + **repair pass** after an independent adversarial audit: on `feature/dual-04-charts` (head after this checkpoint; product code ab693a3). **PR #55 open — owner: "Do not merge PR #55 yet."** Merge approval requested with the evidence below.
- **Next milestone: DUAL-05** (local raster media), only after #55 is merged (never stacked).

Date: 2026-11-26. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Evidence: CAMPAIGN_A.md ("DUAL-04 evidence" and "Repair pass after the independent audit"). Contracts: docs/COMPOSITION.md, docs/MATHS.md, docs/CHARTS.md. Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md.

## Repair pass in one table
| Item | Result |
|---|---|
| Defects | first audit: 9 items + 1 found in validation stills; second audit: 5 items (TeX superscripts, BigInt isqrt, tick containment, formatter, pie colours); each reproduced before fixing; see CAMPAIGN_A.md |
| Tests | 475 JS (474 pass, 1 Windows skip) with installed dependencies; Python 61 OK; tests/repair.test.js (10) and tests/repair2.test.js (5), drawing tests on intermediate and final frames |
| Films | dual04-bakery-r5 (byte-identical to r4) and dual03-euclid-r5 (5a786a3); dual04-bread-r3, dual03-pythagoras-r3 (886e702): all PASS both backends, −16.0 LUFS; agent checks only, **no owner review** |

## Next action for "fod continue"
1. Bootstrap. If PR #55 is open: report its CI result and ask the owner for merge approval (owner said not yet; never merge without the word).
2. After #55 is merged: branch `feature/dual-05-media` from main, `npm install`, then DUAL-05 under the owner's rules: raster-only local images (PNG, JPEG, static WebP); no SVG, remote fetching, animated formats (reject APNG acTL, animated WebP ANIM/ANMF, multi-frame) or new dependencies; file signature verification; bounded dimensions and decoded memory; safe project-relative paths (no traversal, no symlink escapes); content hashing; provenance/licence/attribution metadata; correct EXIF orientation applied deterministically; deterministic fit/crop/pan/zoom; missing/corrupt/hostile files fail clearly. Reuse the import quarantine (src/foundry/import-bundle.js, scripts/import-png.mjs) and the font loader pattern (load before frame 0, fail the render on error). Create our own licensed test images.
3. Exit: a narrated illustration film with the same image identity, crop and timing on both backends; corrupt, missing and hostile imports fail clearly.

## Known issue from this session
- A headless-browser process (chrome-headless-shell, PID 343888) from a stopped DUAL-01 render may still be running; the agent was not permitted to stop it. Harmless; Task Manager or a reboot ends it.

## Open issues carried into Campaign A
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12; ask before closing. PR #43 (old handoff) is superseded by #49; ask before closing it.
- OPEN-7 disk: out/ holds the agent test jobs, far-forest-r1*, clean-top-r1*/r2*, dual00-baseline-r1*, dual01-*, dual02-*, dual03-* and dual04-*; ask before deleting anything.
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main 5145f50, or later if PR #55 was merged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the directive section of the active milestone).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
   - `npm test` must give fail 0 (475 tests with both DUAL-04 repair passes, 1 Windows skip);
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
