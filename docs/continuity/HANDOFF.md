# Forward-only handoff — POLISH-02 (quality gaps), item 1 checkpoint

Unit: POLISH-02
Checkpoint: branch `feature/polish-02` (from local record commit ed3fa4c on top of main 365a78e); commits 2535907 (item 1) plus this checkpoint commit. Not pushed; no PR.
Status: ACTIVE. Item 1 (aim) IMPLEMENTED + TESTED + RENDERED (agent-reviewed). Items 2–10 not started.
Approved by: POLISH-01 handoff named POLISH-02 as the next authorized unit after the owner merged PR #19; owner invoked "fod continue" (2026-11-25).
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`; expect `feature/polish-02`.
2. Read AGENTS.md, CLAUDE.md, docs/continuity/CURRENT_STATE.md (Active unit), this file, docs/continuity/NEXT_UNITS.md ("Plan after POLISH-01"). Read docs/CINEMATOGRAPHY.md (POLISH-01/02 sections) only when touching rigs or locomotion.
3. Environment (PowerShell, repo root): `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`.
4. Working agreement: the owner delegates whole units and prefers executed recommendations in plain language; stop at unit end with PR open + CI green and ask before merge; stop early only for direction-changing or risky actions.

## FOD principles applied (keep doing this)
- Opt-in contract additions; defaults proven unchanged with old-vs-new digests from a temporary worktree (`git worktree add <tmp> <base>`; copy node_modules; evaluate every cinematic shot at 13 progress points + inspectProject).
- Tests include negatives; matched CPU/Three render from a clean commit; frame-glitch scan; agent stills review on both backends; owner review for visual claims.
- Single-shot matched renders: derive a one-shot project from the examples into out/ (gitignored) and set the first shot's transitionFrames to 0 (validator requires it).
- Lesson from this session: never put Markdown backticks inside a bash double-quoted `node -e` string (command substitution); use the editor tool for docs.

## Scope completed in this checkpoint
- Item 1 — `assets[].aim` (src/core/aim.js, src/core/graph.js wiring after face/locomotion). LEARNING BY WATCHING in scripts/workshop-extended.mjs uses it for both pointers (engineer: table, height .7; robot: table, height .7, cheat .6); examples regenerated.

## Evidence
- `npm test`: 238 tests, 237 pass, 0 fail, 1 skip. New tests/polish-02.test.js (7 incl. negatives: rig, target, window, values, unknown field, conflicting tracks).
- Measured pointing error at the table (mid-window): engineer 17.3°→0.0°, robot 80.5°→2.6°.
- Default-unchanged vs ed3fa4c: graph+preflight digest 65e1b3fdab341019 over 166 cinematic shots (all examples except workshop-extended); workshop-extended per-shot digests identical except `teach`.
- Matched render `polish02-aim-r1` at 2535907 (clean): 1 preparation, CPU 20.7 s, Three/vulkan 13.0 s, RTX util peak 12%; verify PASS (240 frames, 8 s), quality 0 errors/0 warnings, compare_release PASS, frame-glitch clean on both. Films: CPU 61877904623af8ee…, Three 1ff65ad1626b7c9d….
- Agent stills (frames 72, 180, both backends): engineer's arm angles down toward the table top; robot's arm reaches to the table edge; backends agree.
- Not done: owner visual review; full extended-film re-render (only the teach shot changed and was rendered alone).

## Material persistent deltas (contracts)
- New opt-in field `assets[].aim` (docs/CINEMATOGRAPHY.md POLISH-02). No change to rig limits, actions, defaults or prompts.

## Open issues and risks
- In LEARNING BY WATCHING the robot stands in the engineer's line of sight, so the engineer's point partly reads as "at the robot"; consider re-staging when the extended film is re-rendered.
- Arm reach without `cheat` is limited (no shoulder yaw); item 3 (robot reach) may revisit the rig.
- Carried over from POLISH-01: turning while standing slides the planted foot 1–2 cm (item 2); Three/vulkan not bit-exact run-to-run (gate by PSNR + frame_glitch).

## Next action
- POLISH-02 item 2: turn-in-place steps. While standing (no locomotion window active), when yaw changes faster than a threshold, add small alternating steps (reuse locomotion's lift/footLift) so the planted foot does not pivot-slide; opt-in, measured slip before/after, tests incl. negatives. Then items 3 (robot reach) and 4 (solved pickup/put-down), then 5–10; then the TALK track.
