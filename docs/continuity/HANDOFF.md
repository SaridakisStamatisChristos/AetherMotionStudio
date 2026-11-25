# Forward-only handoff — after GEN-03 (owner types only "fod continue")

Unit: none active. TALK-01..05 and GEN-01..03 are merged. The next unit needs the owner's choice (see "Next action").
Checkpoint: main 4f588e3 (GEN-03 merge, PR #28; main CI 45635552428 test PASS, render/compare skipped by policy). This handoff lives on record branch `chore/record-gen-03` (main plus this record commit), pushed.
Status: HANDED_OFF. Nothing pending merge.
Approved by: owner, 2026-11-25: "ok merge it. then write the next handoff for the next session using the fod principles."
Date: 2026-11-25
Earlier handoffs: git history of this file (each record branch `chore/record-*`). Binding facts are in CURRENT_STATE.md.

## What "fod continue" must do (step by step)
1. Bootstrap (CLAUDE.md):
   - Run `git status --short --branch` and `git rev-parse HEAD`. Expect `chore/record-gen-03` (or main after it is merged), clean. Never discard user changes.
   - Read AGENTS.md, CLAUDE.md, CURRENT_STATE.md, this file and NEXT_UNITS.md ("Candidates after GEN-03").
   - Report in plain language: active unit | checkpoint | state loaded | blockers | next action.
2. `git fetch`. If main moved past 4f588e3, read the new commits' messages before anything else.
3. Baseline: `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01` must print:
   - graph 204 shots 3d33fbaee198acad
   - geometry 250 assets 6370 boxes 14dec244d171dc56
   - detail2 e3f80439a292f21a
   - director 7 requests 2cbf9916e65da935
   These lines prove the defaults are unchanged; keep them identical for every opt-in change.
4. `npm test` must end with `# fail 0` (318 tests, 317 pass, 1 Windows skip at 4f588e3).
5. **Do not start a unit on your own.** Present the candidates in NEXT_UNITS ("Candidates after GEN-03") as a short plain-language table with a recommendation, and ask the owner to pick.
   - If the owner says "go", "your choice" or similar, start with the recommended candidate.
   - Branch `feature/<unit>` from `chore/record-gen-03`.
6. Per unit, following the FOD loop:
   - minimal coherent change; opt-in or default-proven-unchanged;
   - tests including negatives;
   - a matched CPU/Three render from a clean commit (`sourceDirty false`);
   - frame-glitch and loudness checks;
   - an agent stills review at the middle of every spoken line, not only mid-shot;
   - docs and checkpoint, push, a PR against main, wait for CI, report;
   - ask before merging.
   - Only the owner says "merge". Then merge, watch main CI on the merge commit, and record the merge on a new record branch.

## Owner working agreement and taste (binding; see also auto-memory)
- **Delegation:** the owner delegates whole units and wants executed recommendations explained in plain language, with short tables and no jargon. Stop only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo, or changing films the owner already accepted.
- **Generalize:** every fix must work for every video automatically (a check, a staging rule, a director behaviour), never as a hand patch to one film. Prove it with a fresh Director request and no hand edits.
- **Vertical video:** films go to 9:16 feeds such as Instagram.
  - Characters must read large: report speaker height as a share of the safe area.
  - **No character may ever be cut by the frame edge**, even during camera moves (owner, GEN-03 review). The OFF_FRAME check enforces this.
- **Calm, sparse motion** (TALK-03 reviews):
  - about 1 small nod and 2 arm beats per character per 17 s;
  - turns about 0.8 s; camera pans well under 30°/s.
  - Measure before showing.
- **Wording and claims:**
  - Never call loudness-driven mouths or gestures "lip-sync" or "alignment".
  - Copy the owner may edit (lines, outlines) is a Claude draft and must be flagged as one.
  - Never claim a human review, GPU use, a passing test or a merge that was not observed.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- Per render session (PowerShell, repo root):
  `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); the repo default stays swangle.
  - Sample the GPU with a `Start-Job` nvidia-smi loop, collected with `Receive-Job` after the render.
- Matched production (new IDs only; existing outputs are refused; never delete old outputs):
  - Requests: `node scripts/produce.mjs --request <file> --backend both --id <id>`.
  - Authored projects: `node scripts/produce.mjs --project examples/<x>-cpu-polished.json --pair examples/<x>-three-polished.json --backend both --id <id>`.
  - Commit every input first. Renders made while a request file was untracked came out `sourceDirty` and had to be redone.
- Gates to report:
  - produce PASS lines (speech verify, native verify, quality, compare_release with shared hashes exact);
  - the `CHECKS:` line (motion-speed-v1 and visibility-v1 warnings, from `quality-checks.json`);
  - `python scripts/frame_glitch.py <film>` on both films (set AETHER_FFMPEG in the same command);
  - loudness `ffmpeg -i film.mp4 -vn -af ebur128=peak=true -f null -` (about −16 LUFS with mix-v2).
- Tests:
  - `npm test` (`# fail 0`);
  - Python `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py'` (38 OK);
  - `node scripts/foundry-qualify.mjs plan`.
- Editing:
  - Use the editor tool or `node scripts/fod-apply-edits.cjs <file> <edits.cjs>` (exact strings, CRLF-safe).
  - Never use sed or `node -e` with backticks or `\n` escapes in code. A trailing `// comment` once swallowed the next statement in a one-line file; put comments on their own line.
  - JS test files are ES modules, so `with` is reserved.
  - Don't `cat > file` without a heredoc (it waits on stdin).
- Stills:
  - mid-line frames: `ffmpeg -i film.mp4 -vf "select='eq(n\,F1)+…',scale=…,tile=Nx1" -frames:v 1 <scratchpad>/x.png`, with frame numbers from `timeline.json` segment sample bounds ÷ 1600;
  - the Studio draft preview (headless Chrome via `@remotion/renderer` openBrowser) works for layout checks without a render.

## Where things are (merged)

| Area | Files | Contract / note |
|---|---|---|
| Talking faces, dialogue, body (TALK-01..03) | src/core/talk.js, dialogue.js, body.js | `speakerAssets`, `dialogue {listen, turn, cheat, camera?}`, `bodyLanguage`; driven by the measured timeline |
| Director dialogue (TALK-04) | src/director/dialogue.js, schema.js, offline.js, index.js | `request.dialogue`; IR `speakers`; prompt director-ir-v1.3; offline splits narration into turns |
| Studio speakers (TALK-04, GEN-01) | src/studio/model.js, studio/app.js, index.html | `setSpeakers` / `setLineSpeaker` / `bindSpeaker`; buttons Stage dialogue, Calm fast turns; Inspect shows checks |
| Showcase (TALK-05) | scripts/talk05-first-words.mjs, examples/talk05-first-words-*.json | built only from the general passes; lines are a Claude draft |
| Checks (GEN-01/03) | src/quality/motion-check.js | motion-speed-v1 (FAST_TURN/NOD/TILT, FAST_CAMERA_PAN/ZOOM, OFF_FRAME), visibility-v1 (HIDDEN_ASSET); written by every production; known historical findings listed in tests/gen01.test.js |
| General staging (GEN-01/02/03) | src/core/staging.js `talk-v1` | binds by name, blocks under an automatic camera, group framing, follow; `TALK_STAGE` layout |
| Calm turns, pointing (GEN-01) | src/core/calm.js, aim.js (`aim.phrase`), dialogue.js `phraseAims` | opt-in; reports what it cannot change |
| Framing (GEN-02/03) | src/core/cinematography.js `frameGroup`, `GROUP_FRAMING`, `FOLLOW`, `followGoal` | `cameraRig.framing 'group'` + `subjects`; generated `focus`; follow keeps every character in frame |
| Docs | docs/SPEECH.md, DIRECTOR.md, STUDIO.md, QUALITY.md, CINEMATOGRAPHY.md, SHOWCASE.md | per-unit sections TALK-04 … GEN-03 |

## Evidence trail (latest accepted renders, all from clean commits)
- `gen03-interview-r3`, `gen03-network-r1` and `talk05-first-words-r10` at 0054e76:
  - all gates PASS; checks 0/0; no character outside the frame; −16.0 LUFS;
  - films listed in docs/SHOWCASE.md.
- Owner-rejected: `gen03-interview-r2` (characters off screen). Superseded runs are kept untouched in out/.
- Human review: the owner watched GEN-03 r2 and rejected it, then said "merge it" after the fix description. No explicit human visual or audio acceptance of r3/r10 is recorded.

## Open issues (not blockers)
- **Caption reading speed:** 1–2 cues per film read at 18–20 characters per second. The cause is the natural Kokoro pace, not line length. Owner decision needed: slower dialogue speech, or captions lingering briefly.
- **Composition gap:** the composition overlap metric ignores rigs without a `right-hand` anchor (for example the explorer robot). A crowding case was caught only by stills.
- **Older accepted films:** the new checks list known fast turns (up to 289°/s), hidden tables (TALK-02/03 meeting) and off-frame characters (9 films). These films are left unchanged; re-staging them needs the owner's OK.
- **Visibility check:** box-based, so it over-estimates coverage for thin shapes.
- **Mouths and beats:** mouths follow loudness only (no visemes); beats follow loudness peaks.
- **Idle shifts:** no idle weight shift, because the rigs have no hip joint.
- **TALK-05:** the LRA is wide (20.4 LU), from a long shelf shot with few lines; "Wrrrench" has not been heard by the owner.

## Next action
- Run "fod continue": bootstrap, baseline digests and tests.
- Then present NEXT_UNITS "Candidates after GEN-03" and ask the owner to pick.
- Recommended first pick: GEN-04 (composition overlap counts every character). It is small, safe and needs no owner decision.
