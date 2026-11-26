# Forward-only handoff: Campaign A, DUAL-04 rendered (2026-11-26)

Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized.
- DUAL-00…03 **MERGED** (main 1b1543b).
- CI test job `npm ci` (owner: "yes"): **PR #54 open** (CI 45879799972 passed, 454/454, 0 skipped). The owner said "continue", not "merge"; ask.
- DUAL-04 (charts, timelines, flowcharts, comparison cards): **TESTED + RENDERED** on `feature/dual-04-charts` (215c2e1). PR open; **merge only on the owner's word after PR CI passes**.
- **Next milestone: DUAL-05** (local media and illustration integration).

Date: 2026-11-26. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Evidence: CAMPAIGN_A.md ("DUAL-04 evidence"). Contracts: docs/COMPOSITION.md, docs/MATHS.md, docs/CHARTS.md. Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md.

## DUAL-04 in one table
| Item | Result |
|---|---|
| New, opt-in | compose-v2 chart (bar/line/area/scatter/pie, inline JSON or strict CSV), timeline, flow, compare; visuals claim narration phrases |
| Data honesty | finite or explicit missing (never zero); bar/area include zero; no clipping; fixed axes across steps; transitions interpolate numbers, fade appearing values; pie % sum to 100 |
| Tests | 461 JS (460 pass, 1 Windows skip); Python 61 OK |
| Films | dual04-bakery-r2, dual04-bread-r2 (215c2e1): all PASS both backends, −16.0 LUFS; agent stills only, **no owner review** |

## Next action for "fod continue"
1. Bootstrap. Ask the owner to merge PR #54 (CI npm ci) and the DUAL-04 PR if still open (no merge without the word). Branch DUAL-05 from main after DUAL-04 is merged (never stacked); run `npm install` after pulling.
2. DUAL-05: read its directive section and the DUAL-05 rows of docs/CAMPAIGN_A_AUDIT.md. Extend the existing import quarantine (src/foundry/import-bundle.js, scripts/import-*.mjs, PNG decoder) to 2D image items in compose-v2: project-relative safe paths, manifests with content hashes, licence/attribution metadata, dimension and decoded-size bounds, cropping/fit, pan/zoom, layers; refuse traversal, symlink escapes, malformed or oversized media and unsupported types; missing-file diagnostics. **Owner decision first:** SVG only with an approved sanitizer or offline rasterizer (otherwise raster only); JPEG/WebP need a decoder (check what Chromium decodes locally before adding anything). Use licensed test assets (create our own).
3. Exit: narrated illustration film with the same image identity/crop/timing on both backends; corrupt, missing and hostile imports fail clearly.

## Known issue from this session
- A headless-browser process (chrome-headless-shell, PID 343888) from a stopped DUAL-01 render may still be running; the agent was not permitted to stop it. Harmless; Task Manager or a reboot ends it.

## Open issues carried into Campaign A
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12; ask before closing. PR #43 (old handoff) is superseded by #49; ask before closing it.
- OPEN-7 disk: out/ holds the agent test jobs, far-forest-r1*, clean-top-r1*/r2*, dual00-baseline-r1*, dual01-*, dual02-*, dual03-* and dual04-*; ask before deleting anything.
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main 1b1543b, or later if #54 or the DUAL-04 PR was merged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the directive section of the active milestone).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
   - `npm test` must give fail 0 (461 tests with DUAL-04, 1 Windows skip);
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
