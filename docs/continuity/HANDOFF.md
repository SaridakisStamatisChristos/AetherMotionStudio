# Forward-only handoff — STUDIO-01 implemented (owner types only "fod continue")

Date: 2026-11-26. Keep reports short and plain.
Checkpoint: branch `feature/studio-01` from **main 22ffec4** (not stacked). Earlier handoff (before STUDIO-01): PR #35 branch `chore/record-gen-15` and git history of this file. Binding facts are in CURRENT_STATE.md.

## Where things stand
| Item | State |
|---|---|
| STUDIO-01 "script to film" | **Implemented and tested** on `feature/studio-01`. One real Studio render passed (below). Owner has not tried it yet. PR #36 (pushed with the owner's permission: "i allow pushes"). **Merge only on the owner's word, after PR CI.** |
| PR #35 `chore/record-gen-15` | Docs only. **MERGED 36f6fd6** on the owner's word ("lets do it after the push is sucessfull"). It had no CI run because core.yml only runs on pushes to main and feature/**. STUDIO-01 was rebased onto it; SCRIPT_FORMAT "How the owner will feed it in" and NEXT_UNITS are updated. |
| `feature/forest-script` (ad893f7) | **Folded into STUDIO-01** (cherry-picked as a56732e; examples/gen12-forest-script.request.json). The local branch is now redundant; delete only with the owner's OK. |
| GEN-15 look, cleanup step 2, fix A, GEN-16 | Unchanged: waiting for owner decisions (see "Pending owner decisions"). |

## STUDIO-01 what changed
| File | Change |
|---|---|
| `Start-AetherMotion-Studio.cmd` (+ `.gitattributes` `*.cmd eol=crlf`) | Double-click launcher: sets PYTHON, AETHER_FFMPEG, AETHER_FFPROBE, AETHER_GL=vulkan, AETHER_CONCURRENCY=8 for its window only, checks the tools exist, runs `npm run studio:local`, opens http://127.0.0.1:4173; if the Studio already runs it only opens the page. First version had spaces in its name and nested quotes; the owner saw "Windows cannot find aethermotionstudio" → renamed without spaces and the browser line rewritten. |
| src/studio/director-form.js | `STUDIO_CASTS` (interview = gen01 cast and request fields incl. seed 1; trio = TALK-04 cast unchanged; narrator = earlier form), `STUDIO_DEFAULTS` (interview, three, polished, 60 s, Reels off), `directorRequest`, `scriptHelp`, `wordRange` (2.0–2.33 words/s). Browser-safe. |
| studio/index.html, app.js, style.css | Cast select replaces the "Dialogue" checkbox; Reels checkbox; rules text + live word count under Script; Three default; seconds 60; voice/staging only for the narrator cast. |
| tests/studio01.test.js (new, 6 tests), tests/talk04.test.js | Form → request equals the forest example request; trio cast pinned; negatives (empty topic+script, missing topic, unknown cast/backend/profile, bad seconds/reels/id/voice; links rejected by the schema); script help; offline Director turns alternate host/guest over 14 lines; Studio API round trip; launcher contents. TALK-04 wiring test now checks `directCast` and `directorRequest(directorForm())` (the trio cast itself is pinned in studio01). |
| docs/STUDIO.md, docs/continuity/LOCAL_DEVELOPMENT.md | "Script to film (STUDIO-01)" section; launcher line. |
- **Backends:** Studio jobs stay one backend per job (one active job, one snapshot, one output). "Both" does not fit that model without a new job contract, so it is not offered; `produce.mjs --backend both` stays the matched-pair path. Job contracts unchanged.

## Evidence (this checkpoint)
- Baseline on main 22ffec4: digests graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935 (unchanged after the change). `npm test` 360 → **366 tests, 365 pass, 0 fail, 1 skip**. Python 51 OK.
- Launcher: run through cmd.exe by full path (not a mouse double-click by the agent); the Studio answered HTTP 200 and the page module loaded. The owner reported the first version failing; the fixed version has not yet been tried by the owner.
- Real Studio run, **through the HTTP API with the same calls the page makes** (no browser clicks by the agent): forest script pasted one sentence per line, interview cast, Three, polished, 60 s, quality on. Job `studio-e3bb2326a60691aab621` from commit 5abe119 (same code as rebased 22857f8) → **succeeded**. film.mp4 sha256 b6f4a0fadef46d1f…, 1800 frames, `gl: vulkan`, concurrency 8, render 57.3 s; nvidia-smi showed 15–45 % GPU and ~1.3–1.4 GB VRAM during the render. PASS speech allocation/captions/audio; PASS native 1800-frame MP4; QUALITY pass-with-findings, errors 0, warnings 0 (review-level LOW_PROJECTED_MOTION on singles); draft checks motion/visibility/crowding 0; frame_glitch clean; −16.0 LUFS; pace requested 0.92 (not kept), maxCps 18. Download link `?download=1` served the identical file (attachment). Agent looked at 4 stills: correct cast, captions and set. **No human review.**
- Note: `scripts/frame_glitch.py` needs ffmpeg on PATH (the launcher sets only AETHER_FFMPEG); Studio itself does not need it.

## Pending owner decisions
1. Try the launcher (double-click `Start-AetherMotion-Studio.cmd`) and a film from the form. Optional desktop shortcut: right-click → Show more options → Send to → Desktop.
2. Merge PR #36 (STUDIO-01) after its CI on the rebased head.
3. Fix A "film length follows speech" (proposed, not authorized).
4. Accept the GEN-15 look (unlocks cleanup step 2 and GEN-15 step 2). Films: gen15-forest-r2, forest-script-r1, and now the Studio film above.
5. GEN-16 policy; Instagram test upload deferred to the very end.

## Owner working agreement and taste (binding; see also auto-memory)
- **Delegation:** the owner delegates whole units and wants plain-language reports with short tables. Stop only for direction-changing or risky actions: backend defaults, dependencies, deletions, system settings, anything outside the repo, or changing accepted films.
- **Generalize:** every fix must work for every video automatically. Prove it with a fresh Director request and no hand edits.
- **Vertical video:**
  - films go to 9:16 feeds;
  - characters must read large; report speaker height as a share of the safe area;
  - **no character may ever be cut by the frame edge**. A character wholly outside the frame (for example the listener during a single) is fine.
- **Calm, sparse motion:** about 1 small nod and 2 arm beats per character per 17 s; turns about 0.8 s; camera pans well under 30°/s; at most one single per shot.
- **Wording and claims:**
  - never call loudness-driven mouths "lip-sync" or "alignment";
  - Claude-drafted lines are drafts;
  - never claim a human review, GPU use, a passing test or a merge that was not observed.

## Environment (Windows 11, PowerShell for renders, Git Bash for scripting)
- Render session: `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`
  - vulkan uses the RTX 4060 (owner preference); the repo default stays swangle.
  - Sample the GPU with a `Start-Job` nvidia-smi loop.
  - Do not wrap produce in `Measure-Command`, which swallows the log. Use a Stopwatch and capture the output.
- Production: `node scripts/produce.mjs --request <file> --backend both --id <new id>`. Commit every input first (`sourceDirty false`).
- Reels:
  - add `"delivery":"reels-v1"` to a request (see examples/gen09-reels.request.json);
  - after rendering: `node scripts/reels-export.mjs out/<id>-cpu-polished`, which writes reels/cover.jpg and reels-report.json.
- Gates to report:
  - produce PASS lines;
  - the `CHECKS:` line (motion-speed-v1, visibility-v2, crowding-v1, and reels-v1 when in Reels mode);
  - `python scripts/frame_glitch.py <film>`;
  - ebur128 loudness (about −16 LUFS);
  - speech-report.json `pace` and `alignment.maxCps`.
- Editing:
  - use the editor tool or `node scripts/fod-apply-edits.cjs <file> <edits.cjs>`;
  - write long test files with the editor tool: one Bash heredoc of a test file failed on quoting;
  - never use sed with code containing backticks or `\n`.
- Stills: frame numbers from `<id>-prepared/timeline.json` (segment sample midpoints ÷ 1600). Then `ffmpeg -i film.mp4 -vf "select='eq(n,F1)+…',scale=216:384,tile=Nx1" -frames:v 1 <scratchpad>/x.png`.


## Next action
- "fod continue": bootstrap (expect `feature/studio-01` PR open, or merged if the owner said so), baseline digests and tests.
- If PR #36 is open: report its CI and ask the owner to merge. Then wait for the owner's choice among the pending decisions. Never merge without the owner's word and a passing PR CI. Never stack branches.
