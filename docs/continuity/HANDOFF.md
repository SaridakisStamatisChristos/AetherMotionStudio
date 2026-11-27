# Forward-only handoff: Campaign A, DUAL-05 merged; DUAL-06 next (2026-11-27)

Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized.
- **DUAL-00 … DUAL-04 are COMPLETE and MERGED** (main **e520e4a**; PR #55 merged on "Approved. Merge PR #55", CI run 45889745389, 475/475).
- **DUAL-05 (local raster media) is MERGED**: PR #57 → **main aacfac6** (owner "merge pr 57 and close pr 56 as superseded"; CI 45961923535 green on 90eed63, 491/491). The owner inspected the dual05 outputs and likes them (2026-11-27).
- **PR #56** was closed as superseded (its docs were carried into #57).
- **Next milestone: DUAL-06** (formats, themes, audio controls). Then DUAL-07, 08 and 09, strictly in order. The plan for each is in CAMPAIGN_A.md, "Remaining work plan".

Date: 2026-11-27. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Campaign status, evidence and the remaining plan: CAMPAIGN_A.md. Requirements: CAMPAIGN_A_DIRECTIVE.md (verbatim). Contracts: docs/COMPOSITION.md (compose-v1/v2, fonts), docs/MATHS.md, docs/CHARTS.md, docs/MEDIA.md. Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md.

## Where things stand (one table)
| Milestone | State | Main capability (all opt-in) | Contract |
|---|---|---|---|
| DUAL-00 | MERGED #50 | baseline, capability audit, fixture IDs `dual<NN>-<slug>-r<n>` | CAMPAIGN_A_AUDIT.md, CAMPAIGN_A_PROTOCOL.md |
| DUAL-01 | MERGED #51 | `compose-v1` aids; `content` explainer-v1 / mixed-v1; check aids-v1 | docs/COMPOSITION.md |
| DUAL-02 | MERGED #52 | bundled OFL fonts; `compose-v2` typography; typography-v1; zero-asset shots | docs/COMPOSITION.md "Typography" |
| DUAL-03 | MERGED #53 | MathJax 4.1.3 equations (Node-only), plots, BFS graphs, Euclid arrays, `request.visuals` | docs/MATHS.md |
| CI | MERGED #54 | test job runs `npm ci` | CURRENT_STATE.md |
| DUAL-04 | MERGED #55 | charts, timelines, flowcharts, comparison cards; two audit repair passes | docs/CHARTS.md |
| DUAL-05 | MERGED #57 | local PNG/JPEG/static WebP library, import checks, verified `image` item, pan/zoom | docs/MEDIA.md |

## Next action for "fod continue"
1. Bootstrap (below). If this docs record (`chore/fod-dual05-merged`) is still an open PR, ask the owner to merge it; its content is the latest canon.
2. `git switch main && git pull && npm install`, branch `feature/dual-06-formats` from main.
3. Read the DUAL-06 directive section, the DUAL-06 rows of docs/CAMPAIGN_A_AUDIT.md and the DUAL-06 plan in CAMPAIGN_A.md. Owner decision already recorded: new sizes 1920×1080 and 1080×1080 are **opt-in presets**; the default stays 1080×1920 at 30 fps. Promoting any preset or theme to a default needs the owner.
4. The media library on this machine (`public/media/`, git-ignored) holds the five dual05 illustrations; `node scripts/media-import.mjs verify` re-checks them. `node scripts/dual05-gallery-media.mjs` recreates them on another machine (it refuses nothing already imported with the same bytes).

## The FOD loop for every remaining milestone
1. **Branch:** one branch per unit, from main.
2. **Read:** the directive section, the audit rows, the plan rows and the relevant source only.
3. **Implement and test:**
   - reproduce any reported defect before fixing it;
   - make minimal opt-in, versioned changes;
   - validate every untrusted input with explicit messages;
   - add positive, negative and adversarial tests (drawing tests check intermediate and final frames).
4. **Check the baseline:** `npm test` (fail 0), the Python tests, the legacy digests (`--exclude talk04,talk05,gen01,gen09,gen12,fixa,dual`) and `node scripts/font-metrics.mjs --check`.
5. **Render:**
   - commit first (`sourceDirty false`), and do not touch the working tree while a render runs;
   - produce fresh `dual<NN>-…` films with `node scripts/produce.mjs --request … --backend both --id …` on vulkan;
   - record PASS lines, CHECKS, QUALITY, frame_glitch, ebur128 loudness and hashes;
   - inspect stills from the timeline's phrase frames on both backends, and fix what the stills show.
6. **Checkpoint:** update CURRENT_STATE.md, this file and the CAMPAIGN_A.md row, evidence and ledger, plus the milestone's contract doc.
7. **Hand over:** push, open the PR and wait for the PR CI test job, then report in plain language with short tables. **Merge only on the owner's word**, after confirming CI is green on the PR's current head.
8. **Be honest in reports:** keep automated checks, agent stills and owner review separate. GPU (vulkan) Three.js renders are not bit-reproducible across runs (PSNR ≈ 64 dB between identical scenes); CPU renders are.

## Tooling lessons (cost real time this session)
- **Bash heredocs and `node -e`:**
  - they strip regex backslashes (`\s` became `s`; `\b` became a backspace character);
  - double-quoted `node -e` also runs backtick substitution.
  - Write edit scripts to the scratchpad with the Write tool, or use the Edit tool.
- **Write tool and `\uXXXX`:** it turns `\uXXXX` escapes inside regex or string literals into literal characters (U+2028 broke a regex). Afterwards run a small "re-escape invisible characters" script (e.g. scratchpad `unesc.cjs`: replace U+2028/2029/200B–200F/202A–202E/FEFF with `\u` escapes). `tests/typography.test.js` guards source files against control characters.
- **Line endings:** working copies are CRLF; normalise `\r\n` before multi-line anchors.
- **Renders:** never write files while a render runs; the second production in a batch will be marked sourceDirty.
- **Headless browser probes:** running chrome-headless-shell directly (`--dump-dom`) crashes on this machine (network service and GPU process exit). Use Remotion's `openBrowser('chrome')`, `browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}})` and `page.evaluate(fn,...args)`.
- **Processes:** the session's permission check refused stopping a stray `chrome-headless-shell`. Don't work around it; tell the owner.

## Open issues carried into Campaign A
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12; ask before closing. PR #43 (old handoff) is superseded by #49; ask before closing it.
- OPEN-7 disk: out/ holds the agent test jobs, far-forest-r1*, clean-top-r1*/r2*, dual00-baseline-r1*, dual01-*, dual02-*, dual03-*, dual04-* (DUAL-04 superseded attempts r1–r4 included), dual05-gallery-r1*, dual05-media-src/ and dual05-tamper-*.png; public/media/ holds the dual05 library; ask before deleting anything.
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test (all planned for DUAL-09).
- Studio preview: fonts (and future media) are not served by the Studio server; the preview shows substitute fonts. Planned for DUAL-07.
- A stray chrome-headless-shell (PID 343888) from a stopped DUAL-01 render may still be running; harmless.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main aacfac6 or later.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the directive section of the active milestone).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
   - `npm test` must give fail 0 (491 tests at aacfac6, 1 Windows skip; CI runs all 491);
   - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` must give 61 OK.

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
