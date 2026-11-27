# Forward-only handoff: Campaign A, DUAL-00…08 merged; DUAL-09 TESTED + RENDERED, PR open (2026-11-27)

**Latest checkpoint (DUAL-09):** `feature/dual-09-qualification` from main 527df34 (DUAL-08 merged as PR #63 on the owner's "merge and continue"; renders older than DUAL-08 cleared). PR open, **not merged, not tagged**.
- **Built and fixed:**
  - preview in-flight hardening (6705c84): 2 concurrent picture loads, obsolete fetches aborted and never decoded; real-Chromium bench scripts/preview-memory-bench.mjs: peak +1221/+1372 MB before → +676/+596 MB after;
  - batch production reports read with a 32 MB bound (0aa339b): a passing 235.7 s film had been refused (504 KB report) and re-rendered;
  - lists never drawn with their first item missing (fee87d8); 77 example plans compared, only the two new fixtures change; legacy Director digest unchanged.
- **Qualification:**
  - 8 new fixtures (examples/dual09-*.request.json) across all content modes, the three formats, 30/60/90 s and a 235.7 s film, on both backends, plus DUAL-07 narrator and DUAL-06 harbour regressions;
  - final films: out/batches/dual09-matrix-r2 (dialogue, narrator, mixed, typography, maths, gallery, 2 regressions) and out/batches/dual09-final-r1 (charts, long); `batch.mjs verify` ok on all;
  - superseded batches: dual09-matrix-r1 (environment not set), dual09-long-r1 and dual09-charts-r1 (list defect).
- **Owner review changes (no re-render, owner's decision):** CPU far-eye repair (5b104a9, `CRAFTED.detailBias` 0.10) and no light beams in new Director films (`fidelity.lightShafts: 0`; Director digest now 8a0ad025b6c9f6d6).
- **Tests:** 560 JS (0 fail, 1 Windows skip), Python 63 OK, graph/geometry/detail2 = DUAL-00, Director digest changed on purpose (above), fonts current. Clean install from a fresh clone: same results.
- **Measured:** CPU 28.5 fps byte-stable; Three vulkan 44.3 fps, 1.59 GB GPU memory, **not byte-stable** (visually identical, ≥ 51.5 dB; known since DUAL-04); Three swangle 3.4 fps, byte-stable.
- **Changed files:**
  - code: src/visual/preview-media.js, studio/app.js, scripts/batch-lib.mjs, src/director/aids.js;
  - tests: tests/dual09-preview.test.js (new), tests/batch.test.js, tests/audit07.test.js, tests/composition.test.js, tests/fixtures/fake-produce.mjs;
  - bench and fixtures: scripts/preview-memory-bench.mjs (new), examples/dual09-*.request.json, examples/batches/dual09-*.batch.json;
  - docs: docs/RELEASE_1_2.md (new), docs/MEDIA.md, docs/BATCH.md, docs/COMPOSITION.md, README.md and the continuity docs.
- **Unresolved, for the owner:**
  - review representative films;
  - accept the known limitations or make the GPU byte-stability a gate;
  - the licence situation (GPL parts, Remotion terms, no project licence);
  - merge, then tag `v1.2-dual-backend-final` on the exact accepted commit (no publication).
- **Next action for "fod continue":**
  - if the DUAL-09 PR is open, report it and wait for the owner's review, merge word and tag word (confirm CI green on its head);
  - after the merge: clear renders older than DUAL-09 (keep out/batches/dual09-matrix-r2 and dual09-final-r1, out/bench/d09-*, out/dual09-preview-mem, the speech cache and public/media);
  - tag only on the owner's word;
  - Campaign B only with separate authorization after the tag.
Unit: **Campaign A — Universal Dual-Backend Finalization**, owner-authorized. The text below is the earlier fresh-start handoff for DUAL-08, kept as written; the checkpoint above supersedes its "Next action".
- **DUAL-00 … DUAL-07 are COMPLETE and MERGED.** Main is at **0e83826** (PR #61 merged on the owner's "merge"; CI 45989203443 green on 14a4a9a, 522/522).
- **DUAL-07** = Studio integration (content mode, format, look, sound, visuals JSON, picture library; real fonts and pictures in the preview), the **independent audit repair** (findings 1–4 reproduced and repaired; finding 5 = DUAL-08 boundary requirements, recorded) and a tidier "Make a film" form (owner request). The owner inspected the Studio before the merge.
- **Next milestone: DUAL-08** (bounded local batch production). The owner decided **"Build it now"** (2026-11-27), before DUAL-09. Its binding requirements are the **"DUAL-08 boundary assessment"** in CAMPAIGN_A.md (eight items) plus the DUAL-08 plan there.
- **After DUAL-08: DUAL-09** (final qualification and release, proposed tag `v1.2-dual-backend-final`, tag only on the owner's word), including the recorded hardening item: bound in-flight preview picture loads (concurrent decode limit, cancelled obsolete fetches, measured peak process memory).
- This handoff is on `chore/fod-handoff-dual08` (docs only, no CI by design). **If its PR is still open at bootstrap, its content is the latest canon:** read it from that branch and ask the owner to merge it.

Date: 2026-11-27. The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Campaign status, evidence and the remaining plan: CAMPAIGN_A.md. Requirements: CAMPAIGN_A_DIRECTIVE.md (verbatim). Contracts: docs/COMPOSITION.md (compose-v1/v2, fonts), docs/MATHS.md, docs/CHARTS.md, docs/MEDIA.md, docs/FORMATS.md, docs/THEMES_AUDIO.md, docs/AUTHORING.md (authoring guide), docs/STUDIO.md. Scope map: docs/CAMPAIGN_A_AUDIT.md. Evidence rules: CAMPAIGN_A_PROTOCOL.md.

## Where things stand (one table)
| Milestone | State | Main capability (all opt-in) | Contract |
|---|---|---|---|
| DUAL-00 | MERGED #50 | baseline, capability audit, fixture IDs `dual<NN>-<slug>-r<n>` | CAMPAIGN_A_AUDIT.md, CAMPAIGN_A_PROTOCOL.md |
| DUAL-01 | MERGED #51 | `compose-v1` aids; `content` explainer-v1 / mixed-v1; check aids-v1 | docs/COMPOSITION.md |
| DUAL-02 | MERGED #52 | bundled OFL fonts; `compose-v2` typography; typography-v1 | docs/COMPOSITION.md "Typography" |
| DUAL-03 | MERGED #53 | MathJax 4.1.3 (Node-only) equations, plots, graphs, arrays, `request.visuals` | docs/MATHS.md |
| CI | MERGED #54 | test job runs `npm ci` | CURRENT_STATE.md |
| DUAL-04 | MERGED #55 | charts, timelines, flowcharts, comparison cards (two audit repair passes) | docs/CHARTS.md |
| DUAL-05 | MERGED #57 | local PNG/JPEG/static WebP library, verified `image` item, pan/zoom | docs/MEDIA.md |
| DUAL-06 | MERGED #59, #60 | vertical/landscape/square formats; contrast theme, caption styles, silent soundtrack | docs/FORMATS.md, docs/THEMES_AUDIO.md |
| DUAL-07 | MERGED #61 | Studio: content mode, format, look, sound, visuals JSON, picture library, verified preview pictures, GL adapter identity; audit repaired | docs/AUTHORING.md, docs/STUDIO.md |
| DUAL-08 | **TESTED + RENDERED**, PR open | bounded local batch queue, machine render lock | docs/BATCH.md |
| DUAL-09 | planned | qualification and release v1.2 | CAMPAIGN_A.md plan |

## Next action for "fod continue": DUAL-08
1. Bootstrap (below). If `chore/fod-handoff-dual08` is still an open PR, read this file from it and ask the owner to merge it.
2. `git switch main && git pull && npm install`; branch `feature/dual-08-batch` from main (never stacked).
3. Read the DUAL-08 directive section (CAMPAIGN_A_DIRECTIVE.md), the DUAL-08 audit rows (CAMPAIGN_A_AUDIT.md), the DUAL-08 plan and the **"DUAL-08 boundary assessment"** in CAMPAIGN_A.md; the relevant source is scripts/studio-server.mjs (job registry, `atomic`, `nativeRunner`), scripts/cli.mjs, scripts/produce.mjs and scripts/native-render.mjs.
4. Build a bounded local batch (CLI first; Studio list later only if cheap): a queue of validated requests/projects with explicit backend, format and output root; unique IDs; per-batch and per-job manifests written atomically before each side effect; one render at a time by default; cross-process lock shared with the Studio and produce.mjs; process-tree cancel (Windows `taskkill /T /F`); restart recovery marking interrupted jobs; idempotent resume that skips verified outputs and never re-renders them; bounded retries; per-job failure reports; no SaaS, scheduling or posting. Ask the owner before any new dependency.
5. Exit (CAMPAIGN_A.md): mixed success / failure / cancel fixtures, restart recovery, no lost outputs, bounded resources; tests incl. negative and race cases; fresh `dual08-…` films on both backends from a small batch; FOD checkpoint; PR; merge only on the owner's word; then clear renders older than DUAL-08 (owner rule).

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
- **Render stall watchdog:** dual06-contrast-r1 once stalled at frame 90 with idle tabs and no error. Watch long renders with a loop that reports when the log stops growing for 3 minutes; reproduce with single-frame renderStill before blaming code. Never leave a scripts/.tmp-* file while starting a production (it marks the run sourceDirty).
- **Processes:** the session's permission check refused stopping a stray `chrome-headless-shell`. Don't work around it; tell the owner.

## Open issues
- OPEN-1 calm word rate (2.15 words/s; refine with more films). OPEN-2 part 2: glass and metal subtle at phone size. OPEN-3: historical CPU one-eye, by the owner's choice. OPEN-4: "bridges" shows no set piece. OPEN-6: old draft PRs #2–#12 and PR #43; ask before closing.
- OPEN-7 disk (after the 2026-11-27 cleanup, owner rule "clear older renders after each merged milestone"): out/ holds only the DUAL-07 evidence (dual07-harbour-v-r1, dual07-narrator-r2, Studio jobs studio-e7dd725ee4f43709ef0f CPU and studio-6c066c099db672cd73ee Three), out/speech-cache and the polish0x fixture folders; public/audio is empty; public/media holds the five dual05 illustrations (local library, git-ignored; `node scripts/media-import.mjs verify`).
- Not yet run: a GPU benchmark, the full native matrix, a clean-install test (DUAL-09).
- DUAL-09 hardening item: in-flight preview picture loads are not yet bounded (see CAMPAIGN_A.md, DUAL-09 plan).
- A render once stalled with idle tabs (dual06-contrast-r1); use the stall watchdog (Tooling lessons).
- The owner's Studio may still be running from this session (port 4173, started with the launcher); stop it by closing its window or by the PID on port 4173.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state open`, `git tag --list`. Expect main **0e83826** (or later if this handoff PR was merged); only `v0.4-render-baseline` tagged.
2. Read CLAUDE.md, AGENTS.md, CURRENT_STATE.md, this file and CAMPAIGN_A.md (plus the DUAL-08 directive section).
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` must print graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests **8a0ad025b6c9f6d6** (since DUAL-09: every Director plan carries `fidelity.lightShafts: 0`, owner "those lights should be removed"; 2cbf9916e65da935 before);
   - `npm test` must give fail 0 (522 tests at 0e83826, 1 Windows skip; CI runs all 522). Also run it once with public/media renamed away: CI has no local media library;
   - `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` must give 63 OK;
   - `node scripts/font-metrics.mjs --check` must say up to date.

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
- **Render cleanup (owner 2026-11-27, standing):** "no need to accumulate videos all the time". After each merged milestone, delete renders older than it in out/ and the temporary soundtracks in public/audio; keep the latest milestone's films, out/speech-cache and public/media. List what was removed in CAMPAIGN_A.md.
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
- **Agent UI tests:** (DUAL-07 harness: wait for a *new* download link before reading a render result; keep the harness outside the repo during renders so the tree stays clean)
- **Agent UI tests (setup):**
  - start a temporary Studio from the working tree with `createStudio()` on a spare port (4190+), in a temporary `scripts/.tmp-*.mjs` file;
  - drive it with `openBrowser` from `@remotion/renderer` (`page._client().send('Page.captureScreenshot',…)`, response `r.data ?? r.value.data`);
  - delete the temporary script before committing.
- **Editing:**
  - use the editor tool or `node scripts/fod-apply-edits.cjs`;
  - never put regex backslashes or `\n` through Bash heredocs or `node -e` (this broke edits several times);
  - for multi-step doc edits, write a .cjs file to the scratchpad and run it.
- **Stills:** frame numbers from `<id>-prepared/timeline.json` (sample ÷ 1600). Then `ffmpeg -i film.mp4 -vf "select='eq(n,F1)+…',scale=216:384,tile=Nx1" -frames:v 1 <scratchpad>/x.png`.
