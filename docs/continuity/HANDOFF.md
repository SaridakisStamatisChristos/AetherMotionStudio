# Forward-only handoff: Campaign A, DUAL-03 rendered (2026-11-26)

Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized.
- DUAL-00, DUAL-01 and DUAL-02 are **MERGED**: PRs #50, #51 and #52, main now at 17ebecd. DUAL-02 was merged on "Yes, merge #52".
- DUAL-03 (maths, geometry, algorithms): **MERGED** (PR #53 → main 1b1543b, owner: "merge and yes").
- CI test job `npm ci` step (owner: "yes"): on `feature/ci-npm-ci`, CI 45879511370 passed 454/454 with 0 skipped; PR open, **merge on the owner's word**.
- **Next milestone: DUAL-04** (charts, diagrams and data storytelling).

Date: 2026-11-26. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Campaign status and evidence: CAMPAIGN_A.md ("DUAL-03 evidence", including the investigation of the DUAL-02 preflight block). Contracts: docs/COMPOSITION.md (compose-v1/v2, fonts), docs/MATHS.md (equations, plots, graphs, arrays, visuals). Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md. Earlier handoffs: the git history of this file.

## DUAL-03 in one table
| Item | Result |
|---|---|
| Owner decision | MathJax 4.1.3 (`@mathjax/src`, pinned, Apache-2.0), Node-only |
| New, opt-in | equations (allowlisted TeX → outlines; optional verified arithmetic), plots and geometry (out-of-range refused), graphs (BFS verified), arrays (Euclid verified), Director `request.visuals` (authored compositions attached to script sentences; visuals define their shots; cue/cues), maths report |
| Tests | 453 JS (452 pass, 0 fail, 1 skip); Python 61 OK |
| Films | dual03-pythagoras-r2, dual03-euclid-r2, dual03-bfs-r2 (74e8b9c): all PASS both backends, shared hashes exact, −16.0 LUFS; euclid-r2 byte-identical to r1. Agent stills only, **no owner review** |

## Next action for "fod continue"
1. Bootstrap. If the CI `npm ci` PR is still open, ask the owner to merge it. Pull main and run `npm install` (MathJax is a dependency since DUAL-03). Branch `feature/dual-04-…` from main.
2. DUAL-04: read its directive section and the DUAL-04 rows of docs/CAMPAIGN_A_AUDIT.md. Extend compose-v2 (reuse `plot` axes/ticks and the visuals mechanism; do not build a second chart engine): bar, line, scatter, area/pie where appropriate; legends, units, annotations, highlights, data transitions with defined rules; flowcharts and directed diagrams (reuse `graph`), timelines, comparison cards. Validated local JSON data and optional bounded CSV import; reject NaN/Infinity, malformed series and invalid ranges; preserve units, signs and categorical order; document axis scaling and missing values; no automatic factual sourcing.
3. Exit: a fresh data explainer on both backends using known fixture data, identical values and labels, no misleading clipping or scaling, adversarial numeric/layout tests.

## Known issue from this session
- A headless-browser process (chrome-headless-shell, PID 343888) from a stopped DUAL-01 render may still be running; the agent was not permitted to stop it. It is harmless; Task Manager or a reboot ends it.

## Open issues carried into Campaign A
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12; ask before closing. PR #43 (old handoff) is superseded by #49; ask before closing it.
- OPEN-7 disk: out/ holds the agent test jobs, far-forest-r1*, clean-top-r1*/r2*, dual00-baseline-r1*, dual01-*, dual02-* and dual03-*; ask before deleting anything.
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main 1b1543b, or later if the CI npm ci PR was merged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the directive section of the active milestone).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
   - `npm test` must give fail 0 (453 tests with DUAL-03, 1 Windows skip);
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
