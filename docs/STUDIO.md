# v0.9 Local visual production Studio (candidate)

**DUAL-07 (2026-11-27):** "Make a film" also chooses the content mode, format, theme, caption style, sound and music level; Advanced adds the font, authored visuals (data, equations, pictures) and the picture library. The preview loads the film's own fonts and library pictures and takes its format. How to write each kind of film: [AUTHORING.md](AUTHORING.md).

## Start
Install the existing pinned Node and Python dependencies, local media tools and Kokoro weights as README describes. Run npm run studio:local and open http://127.0.0.1:4173 (optional port: npm run studio:local -- 4180). Keep the terminal open. No cloud, account, external service, new model or paid API. The existing npm run studio still starts Remotion's own Studio.

## Workflow
- Import a validated v1/v2 example or JSON file, or create a project with the offline Director (topic/script, duration, voice, backend and profile). Offline factual topic patterns remain finite; provider-assisted planning is still available through the CLI, not the Studio form.
- Project ID/title/default voice, graph backend/profile, timeline scrub and play, graph shot heading/subheading/narration/duration/camera/environment, shot reordering, search/category-filtered 250-object catalog, add/remove objects and edit X track. Full advanced JSON editor permits other supported contract fields, including identity library, cue/mix settings and animation controls. Invalid transactions fail rather than silently deleting references or altering identity continuity. Reordering a speech/identity film may require coordinated JSON edits; no automatic event rewriting. V1 supports import/export, preview and render; detailed inspector is v2 graph only.
- Save local JSON in studio-data/projects. Atomic writes and revision hashes reject stale saves. Import a different ID for a separate project. Draft edits remain local until save. Export authored JSON via browser download. No project deletion or migration beyond current validated v1/v2 formats.
- Preview uses shared drawFilm at 360x640, selected actual CPU or WebGL backend; no automatic fallback. Silent estimated draft timeline has no invented speech alignment. Prepare audio to produce measured timeline, then select Prepared snapshot; playback uses local audio and shared drawFilm. Actual browser performance varies, no realtime guarantee. Native render uses existing Remotion CLI at 1080x1920. Quality inspect is read-only; optional explicit repair applies existing bounded camera optimizer to job snapshot only. A job's repaired project is exported separately, not silently written back.
- Native job snapshot receives unique safe run ID and saved revision. One active native job per server, phases/logs and errors, actual artifact allowlist, byte-range media serving, local subtitle and quality exports. Jobs in current session only; output folders and authored projects persist on disk. There is no automatic cancellation or job recovery after server restart. Keep server running during a job. No arbitrary command or path accepted; loopback-only, strict Host/Origin, custom write header, JSON bounds, no arbitrary filesystem exposure. Local trusted machine and data directory, not a multi-user hardened server; do not expose via reverse proxy.

## Verification
Tests cover transactional edits, estimated budget, reference rejection, atomic project roundtrip/revision conflict, cross-origin writes, path denial, duplicate simultaneous jobs, immutable snapshot and explicit runner failure. CI native acceptance uses actual HTTP service to import matched 50-second fixture, persist and edit first shot, inspect, start exactly one real CLI render with quality/repair, retrieve report and byte-range MP4, verify measured 1500 frames, copy output to fixture artifact folder. Matched Three.js fixture retained for authorized full matrix. Browser manual interaction and WebGL preview are distinct verification surfaces; HTTP acceptance does not certify them. Human artistic review remains required. No automatic merge.

## Speakers (TALK-04)
- The Director form option "Dialogue" generates a three-speaker conversation (engineer af_heart, robot am_michael, scientist bf_emma). It replaces the art-v1 staging option.
- The Speakers panel works on speech projects:
  - edit speaker names and voices (the language follows the voice), add or remove speakers, then "Apply speakers";
  - for the selected shot, pick the speaker of each line and which character each speaker appears as.
- Line and character edits apply immediately. They go through `setSpeakers`, `setLineSpeaker` and `bindSpeaker` (src/studio/model.js), which edit a validated copy, so a rejected edit changes nothing and the reason shows in the status bar. Examples of rejected edits: removing a speaker who still has lines, a character without a mouth, or leaving a dialogue shot with fewer than two bound speakers.
- The first speaker set on a shot that had no line speakers voices every line of that shot. The narrator cannot be mixed with named speakers.
- Changing a dialogue shot's line count is rejected until its line speakers match.
- Manual exercise (2026-11-25, headless Chrome from the pinned Remotion renderer, loopback server, temp data): every step was observed working, with no browser errors. Steps: generate a dialogue project, change a line speaker, rename a speaker and change its voice, unbind a character, then two rejected edits.
- GEN-01 adds three things:
  - "Stage dialogue" (`talk-v1`) and "Calm fast turns" buttons;
  - Inspect also shows the motion-speed and visibility warnings (estimated line timing on drafts).
  - Headless exercise observed, with no browser errors:
    - talk02 with its bindings removed: all speakers re-bound by name;
    - workshop-extended calm: 1 turn changed, 4 reported;
    - Inspect: 4 motion warnings, 0 visibility warnings, timeline estimated.

## Script to film (STUDIO-01)
- **Start:** double-click `Start-AetherMotion-Studio.cmd` in the repository folder. For that window only it sets the render settings from docs/continuity/LOCAL_DEVELOPMENT.md (`AETHER_GL=vulkan` for the RTX, `AETHER_CONCURRENCY=8`, the venv Python, FFmpeg, FFprobe), runs `npm run studio:local` and opens http://127.0.0.1:4173. If the Studio is already running it only opens the page. It changes no system settings and installs nothing. A desktop shortcut is optional: right-click the file → Show more options → Send to → Desktop (create shortcut).
- **Director form** (mapping in src/studio/director-form.js `directorRequest`, tested in tests/studio01.test.js):
  - Topic (required) and Script (optional; paste the owner script, one sentence per line). The rules and a live word count with the range for the chosen seconds (2.0–2.33 words per second: 60 s → 120–140) sit under the Script box.
  - Cast: **Student + Explorer (interview)** by default, the same request fields and voices as examples/gen01-interview.request.json and examples/gen12-forest-script.request.json; **Engineer, Robot, Scientist** (the TALK-04 cast, unchanged; turns rotate among all three); **Narrator only** (the earlier non-dialogue form; the voice and art-v1 staging options apply only here).
  - Prompt guidance: "Need a script? Get one from Claude chat" shows the docs/SCRIPT_FORMAT.md prompt filled in for the topic, cast and seconds (`scriptPrompt`; lines ≈ words ÷ 8.6–8.75, 60 s → 14–16 lines) with Copy prompt. "Clean up pasted script" (`cleanScript`) removes speaker names of the offered casts, numbering, bullets, markdown, headings, wrapping quotes and blank lines, and moves a "Topic:" line into an empty Topic box. Ordinary sentences with colons or numbers are kept.
  - Reels checkbox → `delivery: 'reels-v1'`. The cover and reels-report still come from `node scripts/reels-export.mjs out/<job id>` after the render.
  - Backend: **Three.js** by default (RTX through the launcher; plain `npm run studio:local` uses the repository default swangle), or CPU Canvas. Seconds default 60.
- **One backend per job.** Studio jobs render one saved project with one backend (one active job, one snapshot, one output folder). "Both" would need a second job or a new job contract, so it is not offered; use `node scripts/produce.mjs --backend both` for matched pairs.

## Simple "Make a film" view (Studio UI refinement, 2026-11-26)
Owner picked "Simple 'Make a film' view" (the last step of the plan; the other offered refinements were not chosen).
- The page opens in the **simple view**:
  - the "Make a film" form: topic, cast, seconds, backend, the Claude-chat prompt box, script, Clean up, word count and rules, Reels;
  - **Generate & render film**, now the first button, so Enter renders;
  - the preview;
  - the production status, downloads and the finished film.
- **Advanced** (header button; it reads "Simple view" when on) shows the full editor as before: workspace, Save/Export, the asset library, Foundry packs, the preview mode, timeline, the production toolbar and session jobs, the project settings, the shot inspector, speakers, JSON and the quality report.
  - "Generate project only" and the Profile choice are advanced too.
- Narrator voice and art-v1 staging show only when the Narrator cast is chosen.
- No contract, job or request change: the same handlers and `directorRequest`. Each element is tagged `adv`, and CSS hides it in the simple view.
- Click-through (agent, headless Chrome on a fresh Studio from the branch code, vulkan):
  - the simple view opened by default;
  - the topic and the forest script were filled in (136 words, "Good length"), and "Generate & render film" was clicked;
  - job studio-ddb5f4a61d08ce9e740e succeeded in about 65 s (speech cached; render 49.6 s);
  - the finished film and the download links appeared in the page;
  - film df90f17e13d52492…: 1800 frames, glitch clean, −16.0 LUFS; PASS lines; QUALITY errors 0, warnings 0; crafted-v2, forest-set, alternateArms.
- The screenshot exposed a bug: "Narrator voice" stayed visible with the interview cast, because `label {display:grid}` overrode `hidden`. Fixed with `.narrator-only[hidden]{display:none!important}`, tested and re-checked by screenshot.
- **The owner has not tried the new view.**
- **Owner's first Studio film** ("great for the first production through pipeline looks great"):
  - Job studio-69cffc5969ccc5a3504e, bees, 65 s: 1950 frames, pace 0.92 kept, longest pause 1.2 s, all checks 0, glitch clean, −16.0 LUFS.
  - Agent inspection found a content bug: Claude's "Topic: …" line (which the prompt asks for) was pasted without Clean up and spoken. Every turn shifted, so the Student explained and the Explorer asked.
  - **Fix:** the page now cleans the script automatically on Generate (`autoClean` → `cleanScript`). The word count counts only what will be spoken and flags pasted extras.
  - **Length advice follows Fix A:** a long dialogue script says "set Seconds to N to keep the calm pace" (N = words ÷ 2.33, rounded up to 5 s); a short one says "the film will be about N s". Narrator films keep the old advice.
  - Click re-test with the owner's exact answer at 60 s (job studio-cae85f1ea275cb3c4224): the Topic line was removed on click, 138 spoken words, "Good length". The Student asks and the Explorer explains. 60.0 s, glitch clean, −16.0 LUFS.
  - Pace 0.92 was not kept at 138 words / 60 s: the 120–140 range may be slightly generous (owner decision; unchanged).
- **Checkbox "Speaker names in captions"** (owner: "it writes who is who in the captions … is that intentional?" → "i prefer a checkbox"):
  - Names have been intentional since TALK-01/02: with more than one speaker, the name shows above each caption and as "Name: " in the .srt/.vtt.
  - New opt-in `speech.captions.speakerNames: false` (src/core/speech.js) hides them in burned-in captions (draw-film.js) and in the sidecars. One shared `caption_labels` (scripts/speech_plan.py) feeds the writer and both checkers (verify.py, quality_media.py).
  - Studio: the checkbox is ticked by default; unticked, `directorRequest` adds the speech setting for dialogue casts (narrator requests are unchanged).
  - Click test with the box unticked (job studio-35d588b054e8486b020f, bees script): job succeeded (verify passed); 0 speaker names in captions.srt and captions.vtt; burned-in captions show words only (agent frames 100, 400 and 900).
  - Tests: tests/studio01.test.js and tests/test_caption_labels.py (3).
- **Length choices instead of a tighter range** (owner: "instead of tighten the word range why not give a list of advice … so whoever uses it could be able to choose"):
  - `scriptHelp` sorts a script into zones using the calm rate `CALM_WORDS_PER_SECOND` 2.15, which separates the measurements (138 words / 65 s kept the 0.92 pace; 136–139 words / 60 s did not):
    - calm: "Good length, calm pace";
    - tight: within 120–140 per 60 s but faster than calm;
    - long: over the range;
    - short.
  - Tight and long offer **Use N s** (N = words ÷ 2.15, rounded up; for dialogue films the length still follows the speech) and **Keep**. Long also hints **Shorten** (about K words; for dialogue films, remove a question and its answer together).
  - Short dialogue scripts say "the film will be about N s". Short narrator scripts offer Use N s or Keep.
  - The page renders the choices under the word count: "Use" sets Seconds; "Keep" closes the choice for this script and length. The 120–140 range is unchanged.
  - Browser check (agent): the bees script at 60 s showed "Use 65 s / Keep 60 s". Clicking Use set 65 s and showed "Good length, calm pace".
- **Finished-film panel and the owner guide** (owner: "write an md file with instructions on how to start the studio etc. then add the finished film with download button"):
  - STUDIO_GUIDE.md (repository root, for the owner): start, make a film, get the finished film, stop, troubleshooting.
  - A finished job shows **Your film is ready**: the film, **Download film (MP4)**, **Captions (.srt)** and one plain line (src/studio/finished.js `finishedSummary`: length, size, checks). The render log and all files fold away below; the page scrolls to the panel once.
  - In the simple view the draft preview hides once the film is ready (`body.has-film`).
  - Downloads are named after the film (studio-server.mjs `downloadName`): `<project id>.mp4/.srt/.vtt`, other files `<project id>-<file>`.
  - Click tests (agent, headless Chrome, fresh Studios from the branch, vulkan):
    - job studio-0e63bc8fcae50c78d99c: the panel appeared at 74 s with "65.0 s · 1080×1920 (vertical) · checks passed (13 review notes)", and the download returned the 49.6 MB MP4. That download was still named film.mp4, which led to `downloadName`.
    - job studio-7529a4a8064bd4d9e7f8: Content-Disposition film-mwxgyee6.mp4 and film-mwxgyee6.srt; the draft preview hidden; the screenshot shows the panel only.
  - The prompt box's step 3 now says extras are removed automatically.
- Tests: tests/studio01.test.js "Studio UI refinement" (simple by default; every film-path field stays outside advanced wrappers; the editor parts are advanced; the first submit renders; narrator-only fields).

## Render progress bar (2026-11-26)
Owner: "implement 1-2-3 and 5" (1 = render progress bar).
- `src/studio/progress.js` `jobProgress(job)` reads the newest step line of the job log and returns one bar for the whole job:
  - speech 0–12 % (shown as "working", because speech has no frame count);
  - preflight 13 %, renderer setup 13–18 %;
  - rendering 18–90 % by Remotion's "Rendered N/M" lines, with its time-remaining estimate;
  - encoding 90–96 % ("Encoded N/M"), checking the film 96–99 %;
  - 100 % only for a finished job.
- A failed job keeps its percentage and says at which step it stopped (orange).
- Remotion prints these lines because the Studio runner pipes stdout (not a TTY: `shouldUseNonOverlayingLogger`). A step line counts only at the start of a line, so spoken text in the log never moves the bar.
- Pure and browser-safe. No server, job or contract change: the page reads the log that `/api/jobs/<id>` already returns.
- **Fix, already on main since #42:** `.finished{display:grid}` overrode `hidden`, so an empty "Your film is ready" panel showed while a film rendered. A global `[hidden]{display:none!important}` now keeps every hidden element hidden.
- Click tests (agent, headless Chrome, fresh Studios from the branch, vulkan, forest script, speech cached):
  - job studio-fd9f43a10cb0e33f5109: the bar went Starting → speech → plan check 13 % → renderer 18 % → "frame 73 of 1800 · about 51 s left" … 89 % → checking the film 96 %, never moving backwards. 1 sample per second.
  - job studio-d4cf9677b63034074a3e (after both fixes): the finished panel was hidden in all 60 samples while running; the bar went 87 % → encoding 95 % → checking 96 %; then the finished panel showed "60.0 s · 1080×1920 (vertical) · checks passed (13 review notes)".
- Tests: tests/studio-progress.test.js (7, with negative logs).

## Remembered choices (2026-11-26)
Owner: "implement 1-2-3 and 5" (2 = the Studio remembers the last settings).
- `src/studio/settings.js` keeps the Make-a-film choices in this browser's localStorage (key `aethermotion.studio.settings.v1`):
  - cast, seconds, backend, profile, narrator voice, staging, Reels, speaker names and the Simple/Advanced view;
  - never the topic, the script or anything on the server.
- Every value is checked when read back (`checkedSettings`): an unknown cast, voice or backend, seconds outside 6–300, a wrong type, damaged JSON or another version falls back to the default for that field only. A restored choice can never make a request the form could not.
- The page restores after the catalog fills the voices and writes nothing before that, so the defaults at load never overwrite what was kept. It saves on every change in the form and on the view toggle. **Reset choices** clears the stored choices and shows the defaults.
- No server, job or request contract change.
- Browser check (agent, headless Chrome, fresh Studio from the branch): narrator, bm_george, 45 s, CPU, Reels on, names off, Advanced were set → reload → all restored, topic empty, status "Your last choices are back" → Reset choices → defaults → reload → defaults.
- Tests: tests/studio-settings.test.js (6, with negatives).

## Reels cover button (2026-11-26)
Owner: "implement 1-2-3 and 5" (3 = Reels cover/export in the finished panel; this was OPEN-5, before only `node scripts/reels-export.mjs`).
- The finished panel has **Make Reels cover**. It calls `POST /api/jobs/<id>/reels`, which runs `exportReels` (scripts/reels-export.mjs), the same code as the CLI:
  - the default cover frame (GEN-09 `coverFrame`: the first close-up, else the first line, else the middle);
  - `<job>/reels/cover.jpg` and `reels-report.json`, the CLI layout;
  - the film is never changed.
- The page shows the cover, **Download cover (JPG)** (`<project id>-reels-cover.jpg`) and the check in plain words (finished.js `reelsSummary`). Unknown warning codes are shown by code, never hidden.
- Server rules:
  - only a succeeded render job of this session; no request fields;
  - one export per film at a time (409);
  - an earlier export is returned unchanged (`created:false`) and never overwritten; a half export is an error;
  - files are served under the flat names `reels-cover.jpg` and `reels-report.json`.
  - The CLI still refuses an existing export.
- ffmpeg runs without a shell and with fixed arguments (`ffmpegFrame`); tests inject a stand-in (`extract`, `createStudio({reelsExport})`).
- Click test (agent, headless Chrome, fresh Studio from the branch, vulkan): job studio-5e27ef2535fc0429316e (forest script, Three) succeeded. A click on Make Reels cover gave "Ready for Reels · 60.0 s · cover from the first close-up (frame 189)" with the NOT_REELS_LAYOUT note, a 1080×1920 cover and the download link. The CLI on another forest job gave the same frame 189 (first single) and then refused to overwrite.
- Tests: tests/studio-reels.test.js (4, with negatives); gen09 unchanged and passing.

## Clean top and no roles by default (2026-11-26)
Owner, after seeing far-forest-r1 ("i see you rendered the video with roles in subtitles and also big on top tittles"), chose roles in captions "Off by default" and titles "No titles at all".
- **Shot field `titles: 'none'`** (src/core/graph.js, timeline.js): draw-graph.js skips all top text (the AETHER pill, the heading, the subheading; also the Reels heading). The thin progress line stays. Absent = every earlier layout, unchanged (digests unchanged). Only `'none'` or absent is valid.
- **`request.titles`** (`'none'` | `'shots'`): absent = `'none'` for dialogue films, `'shots'` (unchanged) otherwise. The Director sets `titles:'none'` on every graph shot, singles included.
- **Speaker names:** speech that the Director builds for a dialogue film now sets `captions.speakerNames:false`. A request that brings its own speech keeps what it says. The Studio always sends its own speech, so its checkbox decides.
- **Studio:** "Speaker names in captions" and the new "Titles on top" both start **unticked** (`STUDIO_DEFAULTS` speakerNames false, titles false). The form always sends `titles`.
- One-click production (`produce.mjs` → production-options.mjs) always gives the Director speech, so it applies the same default: a dialogue request without its own speech gets `speakerNames:false`. The first render (clean-top-r1, 31ce19b) still had names because of this; fixed and re-rendered as clean-top-r2.
- Preflight: REPEATED_HEADING is not reported for hidden titles.
- Old films and authored projects are unchanged.
- Tests: tests/clean-top.test.js (5, with negatives); studio01 updated to the new defaults (the contract checks are kept).
