# Forward-only handoff: session 2026-11-26 (STUDIO-01 through the finished-film panel)

Unit: owner plan "script to film, Fix A, GEN-15 step 2, Studio UI", plus the owner-requested follow-ups
Checkpoint: **main 8a74721** (PR #42 merged; main CI 45811548096 passed). This handoff: branch `chore/handoff-session-end` (docs only; no CI by design).
Status: **HANDED_OFF**. Every unit of the plan is merged, and nothing is active or authorized beyond it.
Approved by: the owner, by explicit word per PR ("merge 36", "merge it" [#38], "merge 39", "merge 40", "merge pr 41 … or pr 42").
Date: 2026-11-26
The owner types only **"fod continue"**. Binding facts: CURRENT_STATE.md. Earlier handoffs: the git history of this file.

## Scope actually completed (all MERGED to main)
| PR | Unit | What the owner gets |
|---|---|---|
| #35 | Record GEN-15 merges, docs/SCRIPT_FORMAT.md | The owner's script format and Claude-chat prompt |
| #36 | STUDIO-01 "script to film" | Double-click launcher `Start-AetherMotion-Studio.cmd` (RTX env); Director form with cast choice (Student + Explorer default), Reels checkbox, Claude prompt box, Clean up, word count; examples/gen12-forest-script.request.json |
| #37 | (closed, included in #38) | — |
| #38 | Fix A | `speech.fit 'speech-v1'`: dialogue films are as long as their speech plus calm pauses, at most the requested seconds; silence-v1 check (a gate for fitted films); examples/fixa-sky-script.request.json |
| #39 | GEN-15 step 2 | Look `crafted-v2` (glass and metal parts); sets `topic-v2` (dressed sets from catalog objects; pieces matched to the words); `bodyLanguage.alternateArms`; CPU eye fix (`CRAFTED.litBias` 0.18) |
| #40 | Studio UI refinement | Simple "Make a film" view (Advanced toggle); auto-clean of pasted scripts on Generate; length choices (calm/tight/long/short with Use N s / Keep / Shorten); "Speaker names in captions" checkbox (`speech.captions.speakerNames:false`) |
| #41 | Record of #40 | Docs |
| #42 | Owner guide and finished-film panel | **STUDIO_GUIDE.md** (repo root); "Your film is ready" panel with Download film (MP4), Captions (.srt), a plain summary line; downloads named after the film |

Also done (outside git):
- Render cleanup step 2: the GEN-15 reference set was deleted with the owner's confirmation of the exact list.
- The owner accepted the GEN-15 look.
- The owner made the first film through the Studio ("great for the first production through pipeline looks great").

## Evidence and acceptance
Every item below was actually run in this session, unless marked otherwise.
- **Baseline at handoff (main 8a74721):**
  - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` → graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 7 requests 2cbf9916e65da935;
  - `npm test` 385 tests, 0 fail, 1 Windows skip;
  - Python 59 OK.
- **PR CI:** test job green on every merged PR head. Main CI after each merge: 45775300788 (#36), 45799267039 (#39), 45809562848 (#40), 45811548096 (#42); main after #38 is merge 8e65805. Routine CI is test-only; render/compare jobs are skipped by policy.
- **Matched renders** (local, vulkan, from clean commits; all PASS, matched hashes exact, glitch clean, −16.0 LUFS):

  | Render | Content | Key result |
  |---|---|---|
  | fixa-script-r1 | Forest script | Byte-identical to forest-script-r1 |
  | fixa-forest-r2 | gen12-forest placeholder lines | 60 s → 23.9 s, longest pause 2.0 s |
  | fixa-sky-r1 | The sky script | The owner watched it ("great i seen the video") |
  | gen15b-sky-r1…r4 | GEN-15 step 2 | r2 adds alternating arms; r4 adds the CPU eye fix: CPU 096dbab2fcefe1e8…, Three 5849347e0ae35f46… |

- **Studio jobs** (through the HTTP API or by headless-browser clicks):

  | Job | How | Result |
  |---|---|---|
  | studio-e3bb2326… | HTTP API | STUDIO-01 |
  | studio-ddb5f4a6… | Clicks | Simple view |
  | studio-cae85f1e… | Clicks | Topic line auto-cleaned; roles correct |
  | studio-35d588b0… | Clicks | Speaker names off: 0 names in the srt/vtt |
  | studio-0e63bc8f…, studio-7529a4a8… | Clicks | Finished panel; downloads named film-mwxgyee6.mp4/.srt |

  The owner's own job studio-69cffc59… (bees, 65 s): all checks 0. The agent found the Topic-line role swap there, now fixed.
- **Human review:**
  - the owner watched fixa-sky-r1 and the bees Studio film and approved the pipeline;
  - the owner reported two issues (one-hand gestures, a one-eyed CPU robot), both fixed and re-rendered;
  - the owner has **not** watched gen15b-sky-r4 or the finished-panel films. The agent reviewed stills only.
- **Unrun or unverified:**
  - no GPU benchmark;
  - no full native matrix;
  - the launcher was started by the agent with Start-Process, which is the same as a double-click; the owner has since used it successfully;
  - the Reels cover export is not wired into the Studio (CLI only).

## Material persistent deltas (contracts; all opt-in or Director/Studio defaults; legacy digests unchanged)
- **`speech.fit`** (`'speech-v1'` | `'none'` | absent = exact length):
  - the dialogue default (src/director/dialogue.js);
  - fit_target in scripts/speech_plan.py;
  - the timeline accepts 180..target frames only with fit;
  - produce records `requestedFrames`. Docs: SPEECH.md "Fix A".
- **silence-v1** (src/quality/silence.js): gaps over 3 s between lines, over 2 s before the first, over 3 s after the last; fixed shots are exempt; talk share is reported only. It runs on every production and is a pre-render gate for fitted films.
- **Look `crafted-v2`:**
  - `partRole` from family, colour slot and shape (glass and metal) in crafted.js;
  - the role is an extra box-stream argument, ignored by legacy drawing and crafted-v1;
  - `CRAFTED.litBias` 0.18 applies to both crafted looks (CPU painter only).
- **Sets `topic-v2`:** `DRESSED_SETS` (lab, tech, forest, office, street, home) added to `LAYERED_ENVIRONMENTS`; `PIECE_WORDS`; `fitPiecesFor` (a piece from another category must be named in full). Docs: SETS.md and LOOK.md.
- **`bodyLanguage.alternateArms`:** beats alternate right and left per character across the film (`leftArmPitch`).
- **`speech.captions.speakerNames:false`:** no names in burned-in captions or the sidecars. Shared `caption_labels` in speech_plan.py, used by speech_pipeline, verify and quality_media.
- **Director dialogue defaults:** topic-v2, crafted-v2, fit speech-v1, alternateArms. The v1 values stay selectable by name.
- **Studio** (src/studio/director-form.js):
  - `directorRequest`, `STUDIO_CASTS`, `STUDIO_DEFAULTS`;
  - `scriptHelp` (zones from `CALM_WORDS_PER_SECOND` 2.15, measured), `scriptPrompt`, `cleanScript`;
  - src/studio/finished.js `finishedSummary`;
  - studio-server.mjs `downloadName`.
  - Studio jobs stay one backend per job; the job contract is unchanged.

## Architecture changes
- No new dependencies, renderer rewrites or CI policy changes. Both backends are kept first-class.
- New files:
  - Start-AetherMotion-Studio.cmd, .gitattributes (`*.cmd eol=crlf`), STUDIO_GUIDE.md;
  - src/studio/director-form.js, src/studio/finished.js, src/quality/silence.js;
  - tests/studio01.test.js, fix-a.test.js, gen15b.test.js, test_speech_fit.py, test_caption_labels.py;
  - examples/gen12-forest-script.request.json, examples/fixa-sky-script.request.json.
- The baseline digest command now also excludes the `fixa` prefix, because dialogue examples follow the dialogue defaults.

## Open issues, threads and debts (none blocking)
- OPEN-1 **Calm word rate** (2.15 spoken words/s) rests on 3–4 measured films; refine it as more films are made.
- OPEN-2 **The far skyline blocks** remain behind the dressed sets. Glass and metal are subtle at phone size.
- OPEN-3 **Historical CPU painter** (non-crafted look): the one-eye flaw remains in old films, by the owner's choice ("old videos … remain as they are").
- OPEN-4 **"How do bridges carry trucks?"** shows no set piece (GEN-06 singles; recorded since GEN-12).
- OPEN-5 **Reels cover/export** is not in the Studio; it is CLI only (`node scripts/reels-export.mjs out/<id>-cpu-polished`).
- OPEN-6 **Old draft PRs #2–#12** (v0.3–v1.0, 2026-11-24) are still open as historical drafts. Not touched; ask before closing.
- OPEN-7 **Disk:** out/ is 2.9 GB. It holds bench, speech-cache, fixtures, forest-script-r1, gen15-forest-r1/r2, fixa-*, gen15b-sky-r1..r4 and 8 studio-* jobs; studio-data/projects has 8 projects. No cleanup is planned; ask before deleting anything.

## Known tensions or uncertainty
- CURRENT_STATE.md still described #42 as pending until this handoff; it is now corrected.
- Three/vulkan renders are not bit-exact run to run (gate them by PSNR and frame_glitch), although r2→r4 Three happened to be byte-identical.

## State files updated (this checkpoint)
- docs/continuity/HANDOFF.md: this file, rewritten.
- docs/continuity/CURRENT_STATE.md: header and active unit (plan complete, #42 merged, no unit active).
- docs/continuity/NEXT_UNITS.md: the follow-up marked merged; later options listed.

## Next authorized unit
- **None.** The plan is complete, and nothing else is authorized.
- Starting instruction for "fod continue":
  1. Bootstrap and baseline (below).
  2. Report in one short table.
  3. Ask the owner what to do next, offering the options below. **Do not start anything unasked.**
- Options to offer (proposals, none authorized):
  - render progress bar in the Studio;
  - the Studio remembering the last settings;
  - Reels cover/export button in the finished panel (OPEN-5);
  - GEN-16, a Three cinematic profile (needs a policy decision: Three may look clearly better than CPU under an opt-in);
  - refine the far backdrop (OPEN-2);
  - the Instagram test upload (the owner deferred it to the very end).
- Historical lookups allowed if needed: the source files and docs named above, for the specific contract touched. No broad rereads.

## Bootstrap for "fod continue"
1. `git status --short --branch`, `git rev-parse HEAD`, `git fetch`, `gh pr list --state all --limit 5`. Expect main 8a74721 or later.
2. Read AGENTS.md, CURRENT_STATE.md, this file and NEXT_UNITS.md. Read STUDIO_GUIDE.md only if the task touches the Studio workflow.
3. Baseline:
   - `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa` must print the digests above;
   - `npm test` must give fail 0 (385 tests, 1 Windows skip);
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
