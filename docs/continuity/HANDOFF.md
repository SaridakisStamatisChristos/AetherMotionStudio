# Forward-only handoff — POLISH-02 items 1–4 (aim, planted feet, robot reach, solved pickup/place)

Unit: POLISH-02 (items 1–4 in this PR)
Checkpoint: branch `feature/polish-02` (from local record commit ed3fa4c on top of main 365a78e). Commits: 2535907 (item 1), fe3ee26 (item 1 checkpoint), 7e847ea (item 2), 0087fa7 (items 3+4), 52c01fd (HIGH SHELF readability), plus this checkpoint commit. Pushed; PR #20 against main, CI run 45569390294 test job PASS at 32b6bf3 (render/compare skipped by test-only policy). Awaiting owner acceptance; not merged.
Status: items 1–4 IMPLEMENTED + TESTED + RENDERED (agent-reviewed). Items 5–10 NOT started.
Approved by: owner "fod continue" (item 1); then "continue until polish 3 is done then ask me for merge. not ask me for polish 2", then "implement item 4 also. then we will merge" (2026-11-25).
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. If the POLISH-02 PR is merged, record its merge commit + main CI in CURRENT_STATE on a new branch (never push directly to main).
2. Read AGENTS.md, CLAUDE.md, docs/continuity/CURRENT_STATE.md (Active unit), this file, docs/continuity/NEXT_UNITS.md ("Plan after POLISH-01"). Read docs/CINEMATOGRAPHY.md POLISH-01/02 sections only when touching rigs, locomotion, attachments or surfaces.
3. Environment (PowerShell, repo root): `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`.
4. Working agreement: owner delegates whole units/items and prefers executed recommendations in plain language; stop at the agreed point with PR open + CI green and ask before merge; stop early only for direction-changing or risky actions.

## FOD principles applied (keep doing this)
- Opt-in contract additions; defaults proven unchanged with old-vs-new digests from a temporary worktree of the base commit (graph+preflight over every cinematic shot at 13 progress points; geometry of all 250 assets in two probe poses; per-shot digests of the edited film).
- Tests include negatives; matched CPU/Three production from a clean commit; frame-glitch scan; agent stills on both backends; owner review for visual claims. When stills show a readability problem, fix and re-render (r2 → r3 here) rather than explaining it away.
- Probe bugs happen: a slip probe compared `prev.length` instead of `prev.ft.length` and reported 0 cm; always sanity-check a "perfect" number.
- Editing: files are CRLF in the working copy. Use the editor tool, or the scratchpad helper pattern (node script with exact old/new strings that normalises CRLF), never sed/`node -e` with backticks or `\r\n` escapes.

## Scope completed
- Item 1 — `assets[].aim` (src/core/aim.js): right-arm solve toward a target asset + optional bounded body-yaw cheat.
- Item 2 — `assets[].turnSteps` (src/core/turnsteps.js): planted feet; standing steps; stance foot planted inside locomotion; pivot cap 0.6 rad; pose keys footTwist*/footDx*/footDz* only with the opt-in.
- Item 3 — `params.reach` (robots, src/visual/catalog-rig.js localArm): telescoping arm above horizontal only.
- Item 4 — src/core/surface.js (surfaceTop/surfacePoint), `assets[].restOn`, place release `to:{surface,at}`, attachment `offset:'auto'`, `solveReach` (src/core/interaction.js).
- Film: "The Workshop — Extended" now 73 s / 10 shots (docs/SHOWCASE.md): teach pointers aim; planted turns in TOOLBOX/FIRST STEPS/LEARNING BY WATCHING; new HIGH SHELF shot.

## Evidence
- `npm test` 254 tests, 253 pass, 0 fail, 1 skip (Windows symlink). tests/polish-02.test.js 23 tests incl. negatives. tests/polish-01.test.js film pin updated 1920/9 → 2190/10 (only that assertion; reproduction, reused ART-05 shots, preflight and back-to-camera checks unchanged). foundry-qualify plan OK; py_compile OK; Python unittest 27 OK.
- Measured: pointing error 17.3°→0.0° / 80.5°→2.6°; stance slip legacy 0.65–2.14 cm/frame → 0 cm (all legged characters in the edited shots, synthetic turns, walk turns, closing step); robot max hand height service 1.59→2.07 (head 1.90) with reach 1.8; solveReach gaps 1–3 mm; HIGH SHELF: hand 4.7 cm from the book at grab (auto grip, no pop), book ends exactly on the rendered table top (0.748), max book speed 10.8 cm/frame while the arm lowers.
- Defaults vs ed3fa4c: graph+preflight 65e1b3fdab341019 (166 shots), geometry 14dec244d171dc56 identical; extended film WORKSHOP, PLAN, POWER ON, HAND TO HAND, TOGETHER, LIGHTS OUT identical.
- Renders: `polish02-aim-r1` (item 1 one-shot pair, 2535907); `workshop-extended-r2` (0087fa7, all gates PASS, superseded); `workshop-extended-r3` (52c01fd clean): 1 preparation, CPU 102.5 s, Three/vulkan 58.8 s, verify PASS (2190 frames, 73 s), quality 0/0, compare_release PASS, frame-glitch clean both. Films CPU fbea6756d1241fe8…, Three 8d864943380c7638…. Output: out/workshop-extended-r3-{cpu,three}-polished/film.mp4.
- Not observed: RTX utilisation during r2/r3 (sampler produced no data); owner visual/audio review.

## Material persistent deltas (contracts)
- New opt-in fields: `assets[].aim`, `assets[].turnSteps`, `assets[].restOn`, `params.reach` (robot family), attachment `offset:'auto'` (first window), place release `to:{surface,at}`. New exports: solveAim, turnSteps, surfaceTop/surfacePoint, solveReach. No defaults, prompts, rig limits or backends changed.

## Open issues and risks
- LEARNING BY WATCHING: the robot stands in the engineer's line of sight (point reads partly "at the robot").
- HIGH SHELF: during the reach the shelf front partly hides the robot's body; book lowering is brisk (~3 m/s peak).
- turnSteps foot offsets up to ~0.3 rig units mid-step; stance twist capped at 0.6 rad (pivot). The kept HAND TO HAND shot still has a 2.1 cm pivot slide on the receiver (not opted in, by the keep-unchanged rule).
- aim/turnSteps evaluate per-asset tables; combining aim+cheat with turnSteps on the same asset costs more per frame (not measured on long films).
- Director/Studio do not author aim, turnSteps, restOn or solveReach yet (staging could use them; see item 5/TALK-04).

## Next action
- Owner: watch out/workshop-extended-r3-cpu-polished/film.mp4 (or -three-), accept and merge the POLISH-02 PR.
- After merge: record merge commit + main CI; then POLISH-02 items 5–10 (director prompt for chains + compact prompt are 5 and 10) or the TALK track, as the owner chooses.
