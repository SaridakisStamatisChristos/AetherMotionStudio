# v0.7 Speech-first production (candidate)

Opt-in speech v1 on a v2 project; all older inputs retain prior pipeline. Director accepts speech settings in a request or --speech settings.json. TargetFrames equals seconds*30. fixedShots maps shot ID to exact frame count; others automatic. Authored fixed duration remains binding. Natural Kokoro first, bounded speeds 1.08/1.16/1.25 only if necessary, fail explicitly if speech cannot fit; revise script/duration rather than truncate. Punctuation-aware pauses and bounded extra interphrase silence; residual slack at shot edges. Integer 48 kHz clock, 1600 samples/frame. Automatic durations remain null in source; compiled timeline gives actual durations. --prepare produces preflight audio/sidecars without video. Explicit script normalization and token-based pronunciation replacement preserve caption text. Existing nine voices, English US/GB metadata only. Optional shotSpeakers arrays bind one speaker per phrase; no invented multilingual support.

Caption timing quality: measured phrase bounds, weighted estimated intra-phrase word timing, not forced alignment. Cue grouping wraps at configured 24–36 characters, one/two lines, max 10 words (12 on tail merge); duration and reading-speed outliers are reported, not concealed. Burn-in/sidecar/both mode, optional active word highlighting, speaker label, stable safe zone. SRT and WebVTT share canonical sample intervals, rounded nearest ms; reject collapsed/overlap. Exact normalized text coverage, measured phrase boundary error, independent word error unavailable. No separate alignment model or API. Actual word alignment, independent timestamp evaluation and semantic quality remain open.

Speech-envelope retiming maps existing normalized action windows into measured speech block for graph shots without identity continuity or attachments; other choreography remains unchanged. No automatic lip sync. Audio mix explicit narration/music/ambience/SFX gains, deterministic synthesized bed, ducking attack/release and cue anchors shot-start/speech-start/speech-end, fades outside voiced windows, global sample peak protection. Measured linear sample peak, RMS dBFS, clipped sample count, interval RMS and longest low-energy block; not LUFS/true peak or intelligibility certification. No external music downloads. Mix WAV and narration WAV accompany sidecars and report.

Cache stores processed float32 phrase PCM keyed by normalized original/pronounced text, voice/language, speed, model/voice SHA256, package and processing version. Atomic replacement and checksum/size/waveform validation; 128 MiB per-process eviction limit, 8 MiB entry limit. Concurrent independent renders may transiently exceed cap; use separate output IDs, local trusted cache directory. Cache outside git. Exact repeated deterministic synthesis not claimed across machines/versions.

Acceptance fixture: A message travels across a network, supplied script and six shots, exact 1800-frame target with first shot fixed at 300 frames and remaining automatic, two voices, speech-linked cues and highlight, matched CPU/Three.js. Tests for 15/30/60/120 second synthetic allocation, fixed infeasibility, cache corruption/eviction, caption bounds, malformed data, legacy regressions. Native CPU verification adds sidecars, phrase coverage, mixed audio sample peak/activity. Only one polished CPU render; matched Three.js deferred. v0.8 quality/repair and v0.9 editor remain explicit gates.

## POLISH-02 mastering profile mix-v2 (2026-11-25, opt-in)
- Project field `audio: {master: 'mix-v2'}` applies to the standard timeline mixer (scripts/make_timeline_audio.py + scripts/audio_master.py). Projects with a `speech` config are rejected with it, because they keep their own `speech.mix` contract. Absent = historical mix, byte-identical.
- What it does:
  - every phrase is set to a common RMS (0.17) and soft-limited (tanh, 0.8), replacing the peak-capped normalisation;
  - the music bed is raised +6 dB before ducking;
  - BS.1770-4 integrated loudness (numpy/scipy, no new dependency) targets −16 LUFS as delivered (−19.01 LUFS on the mono mix, which the film carries on both AAC channels), with gain re-measured after a soft knee;
  - true-peak ceiling −1 dBTP (4× oversampled).
- The report is written to `<prepared>/audio-master.json`.
- Audio review of "The Workshop — Extended":

  | | r3, historical mix | r6, mix-v2 |
  |---|---|---|
  | Integrated loudness (delivered) | −19.8 LUFS | −16.0 LUFS |
  | Loudness range | 13.6 LU | 11.7 LU |
  | True peak | −3.8 dBFS | −2.5 dBFS |
  | Phrase RMS spread | 6.6 dB | 0.3 dB |
  | Bed in gaps (relative to speech) | −11 dB | about −10 dB, now fills the gaps |

- Remaining finding, not changed: authored shot lengths centre the narration, leaving 1.6–3.1 s of bed-only time at each end of every shot (up to about 5 s across a cut). Fixing it means tightening shot durations or adding narration, which is an authoring or TALK-track decision.
- Tests: tests/test_audio_master.py (BS.1770 reference tone, gating, target and ceiling, determinism, phrase levelling, rate guard) and project-field validation in tests/polish-02.test.js. Human audio review is still pending.

## POLISH-03 narration placement and mix-v2 for speech projects (2026-11-25, opt-in)
- Placement inside each shot:
  - `center` is the historical default and byte-identical;
  - `lead` starts speech right after the 0.45 s pad, lets pauses between phrases grow by at most 0.35 s each, and leaves the remaining silence at the end of the shot, while the action plays.
- Where to set it: `audio.placement` for timeline projects (scripts/timeline_plan.py `allocate`); `speech.placement` for speech projects (scripts/speech_plan.py `slots`).
- Speech projects: `speech.mix.master: 'mix-v2'`.
  - Every phrase of every speaker is levelled to one RMS, so voices with different natural loudness match.
  - The phrase-cache key includes the levelling profile only when it is enabled, so historical cache entries are unchanged.
  - Loudness is mastered to −16 LUFS delivered.
  - The configured `mix.peak` is still enforced afterwards, so verify's peak check is unchanged.
  - Report: `<prepared>/audio-master.json` (adds `peakCapGainDb`).
  - The project-level `audio` field is still rejected for speech projects.
- Evidence:
  - **"The Workshop — Extended" r7** (source 3dd64e6 clean): lead placement plus one extra line in TOOLBOX, LEARNING BY WATCHING and HIGH SHELF. POWER ON, a reused accepted ART-05 shot, keeps its script.

    | Measure | r6 | r7 |
    |---|---|---|
    | Speech share of film | 42 % | 51 % |
    | Mean voice-free gap | 4.31 s | 2.69 s |
    | Longest gap across a cut | 5.0 s | 4.5 s |
    | Delivered loudness | −16.0 LUFS | −16.0 LUFS |
    | Loudness range | 11.7 LU | 11.2 LU |
    | True peak | −2.5 dBFS | −3.4 dBFS |

    The remaining long gaps follow reused shots with short scripts (PLAN, FIRST STEPS, HAND TO HAND). r7 passed every gate: verify, quality 0/0, compare_release, frame-glitch clean on both. Films CPU b3490129c3776acb…, Three e995ce1a64a41fac….
  - **Two-voice speech fixture** (from examples/quality-cpu-polished.json; Maya af_heart and Leo am_michael alternating by shot; out/polish03-fixtures, not committed):

    | Measure | Baseline, no master | `mix-v2` + lead (`polish03-voices-r1`) |
    |---|---|---|
    | Maya phrase level | −21.2 dB | −16.2 dB |
    | Leo phrase level | −23.8 dB | −16.6 dB |
    | Gap between voices | 2.6 dB | 0.4 dB |
    | First phrase start | 0.8–1.3 s | 0.45 s |

    `polish03-voices-r1`: delivered −16.02 LUFS; speech verify PASS (including the peak limit), native verify PASS, compare_release PASS. Quality is pass-with-findings with 2 warnings (shot-3 VIEWPORT_CROP and SAFE_ZONE_RISK), both already present in the source example, which keeps a framing issue for the camera-repair demo.
- Tests: tests/test_placement.py (pure planning; runs in CI) and tests/polish-03.test.js (validation, film lines). Human audio review is pending.

## TALK-01 speaking faces (2026-11-25, opt-in)
- Binding: a cinematic-graph shot may set `speakerAssets: {speakerId: assetId}`.
  - Speaker IDs are `default` or keys of `speech.speakers`.
  - Each asset must be in that shot and have a mouth: a detail-2/3 human or a catalog robot.
  - One speaker per character.
- Envelope: when any shot binds speakers, preparation adds `timeline.speechEnvelope = {version:1, unit:'permille-rms', values:[…]}`.
  - One integer per frame: the narration RMS over the frame's 1,600 samples relative to 0.25 RMS, with a 0.01 silence gate (scripts/speech_envelope.py, used by both mixers).
  - It rides in the shared, hashed `timeline.json`, so both backends read identical values (compare_release shared hashes).
  - It is required when speakers are bound; there is no silent closed-mouth fallback. Timelines without bound speakers are unchanged.
- Render: `talkAt` (src/core/talk.js) finds the phrase sounding at the frame's centre sample.
  - That phrase's speaker's character gets `pose.mouth` = 1-2-1 smoothed envelope; other bound characters get 0; pauses close every mouth.
  - It is applied after graph evaluation on both the CPU and Three paths. The graph and its caches are untouched.
- Geometry:
  - Humans keep the detail-2 lip line unchanged; while speaking, a dark inner mouth opens below it in proportion to `mouth`. Closed or absent = identical geometry.
  - Catalog robots that are bound get a lit mouth bar under the eyes that grows with `mouth`.
- This is envelope-driven lip motion, not phoneme or viseme alignment.
- Example `examples/talk01-faces-{cpu,three}-polished.json` (generator scripts/talk01-faces.mjs): engineer (af_heart) and robot (am_michael) bound per phrase, lead placement, mix-v2, three-quarter cheat on the two-shot.
- Evidence: `talk01-faces-r2` (source 18fe699 clean): speech verify and native verify PASS, compare_release PASS (shared hashes exact, envelope included), frame-glitch clean on both. Quality is pass-with-findings with 1 CAPTION_READING_SPEED warning. r1 (da5ff50) also passed every gate, but its stills showed unreadable mouths (thin lip line, faces near profile); that led to the dark inner mouth, the stronger cheat and the tighter two-shot. Agent stills show the speaker's mouth open and the listener's closed, with every mouth closed in pauses, on both backends.
- Defaults vs main 01051f1: graph+preflight 1b75bee2197e90db (170 shots, excluding the new example), geometry 14dec244d171dc56, human detail 2 e3f80439a292f21a, director 2cbf9916e65da935, all identical.
- Tests: tests/talk01.test.js (binding and envelope negatives, talkAt, geometry, applyTalk, generator reproduction) and tests/test_speech_envelope.py.

## TALK-02 dialogue scenes (2026-11-25, opt-in)
- `shot.dialogue: {listen: true, turn?: 0.1–1.5 s (default 0.35), cheat?: 0–1 rad (default 0.5)}` on a cinematic-graph shot with at least two bound speakers (`speakerAssets`). Bound characters may not have an authored `face`, because dialogue drives it.
- Looking rule (src/core/dialogue.js `focusPlan`, from the measured phrase start samples in the timeline):
  - every bound character looks at whoever is speaking;
  - a character that is speaking keeps looking at the previous speaker;
  - before anyone else has spoken, a speaker looks at the next speaker.
- How it is applied:
  - `dialogueShot` turns the plan into face chains, one window per focus change, each blending over `turn` seconds and cheated toward the camera by `cheat` (sign from the characters' authored x positions); the last window holds;
  - it runs in drawFilm before graph evaluation, so planted feet (`turnSteps`) and aims see the turns.
- Graph contract: `assets[].face` may be a chain of 2–16 sequential windows. A window that touches the previous one blends from that window's target instead of snapping back to the authored yaw. A single window is unchanged.
- Captions already name the speaker whenever a project has more than one speaker.
- Example `examples/talk02-dialogue-{cpu,three}-polished.json` (scripts/talk02-dialogue.mjs):
  - engineer (af_heart), scientist (bf_emma, en-gb) and robot (am_michael);
  - six alternating lines at a table, then a robot close-up;
  - lead placement, mix-v2, turnSteps on the speakers, cheat 1.0 (humans 21–46° from camera).
- Evidence, `talk02-dialogue-r2` (bd38377 clean): CPU 39.3 s, Three/vulkan 23.1 s; all verifies PASS; compare_release PASS; frame-glitch clean; 2 CAPTION_READING_SPEED findings. Films: CPU d7f532ba14036eac…, Three f6d2e31718606b32….
- r1 (40fc324) passed every gate but its 30 s target left about 10 s of silence after the meeting; fixed with a 20 s target.
- Agent stills (both backends): listeners face each active speaker; the speaker's mouth is open.
- Defaults vs 7f121e7 identical: graph 5cc713071a6ddb6f (176 shots, excluding the new example), geometry 14dec244d171dc56, director 2cbf9916e65da935, extended film per shot.
- Tests: tests/talk02.test.js (face chains, continuity, validation negatives, looking rules, smooth generated turns, generator reproduction).

## TALK-03 body language while talking (2026-11-25, opt-in)
- `shot.bodyLanguage: {beats?, nods?, blinks?, sway?}`: booleans, at least one true, and the shot needs `speakerAssets`. src/core/body.js derives everything per frame from the measured timeline. Values live in `BODY`.
  - **beats:** the active speaker's arm lifts by up to 0.35 rad, with a 0.07 rad head nod, at emphasis peaks of the shared speech envelope. A peak is a local maximum within ±5 frames, at least 600 per mille, and at least 20 frames (0.67 s) after the previous one. That gives 2–3 beats per line in the example. These are measured loudness peaks, not word-level or forced alignment.
  - **nods:** listeners nod (up to 0.16 rad, 14 frames) as another speaker's phrase ends.
  - **blinks:** each bound character blinks on a fixed schedule (every 75–134 frames, from a hash of its ID). An authored blink track always wins.
  - **sway:** listeners' heads tilt slowly (±0.04 rad, 96-frame period).
- Applied after graph evaluation, together with TALK-01 mouths, on the CPU, Three and motion-blur paths.
  - Beats skip characters that hold a prop, aim, or have authored arm tracks or arm actions, so attachments and aims never drift.
  - Arm pitch is additive and clamped to the rig limits.
- Geometry (src/visual/catalog.js):
  - with `pose.nod` / `pose.tilt` present, head-region boxes and rods rotate about the neck through a pre-transformed builder (`headed`); boxes are routed by height and |x|;
  - human detail-2/3 eyes scale with `pose.blink`;
  - absent keys run the original builders, so geometry digests are identical.
- Not done:
  - idle weight shifts (the rigs have no hip joint; head sway is used instead);
  - beat gestures on estimated stressed words (measured peaks are used instead, which is more honest).
- Example `examples/talk03-body-{cpu,three}-polished.json` (scripts/talk03-body.mjs): the TALK-02 meeting with all four behaviours on; the dialogue is identical.
- Evidence, `talk03-body-r1` (e3ddfd5 clean): CPU 39.2 s, Three/vulkan 24.6 s, RTX peak 31 %; all verifies PASS, compare_release PASS, frame-glitch clean; 2 CAPTION_READING_SPEED findings, as in TALK-02. Films: CPU 6df5a6ca5b8ae8aa…, Three 48c209810bf6afbe….
- Agent side-by-side against TALK-02 r2 (frames 63 and 88): the engineer's arm beat, the listeners' head sway, and the listeners nodding as her line ends; body and feet unchanged.
- Defaults vs aacab42 identical: graph 9629764b6193cf5c (180 shots, excluding the new example), geometry 14dec244d171dc56, human detail 2 e3f80439a292f21a, director 2cbf9916e65da935.
- Tests: tests/talk03.test.js (validation negatives, peaks, per-role behaviour and bounds, eligibility, applyBody clamping, head-only rotation, blink geometry, generator reproduction).
- TALK-03 speed revision (owner review: "the heads move too fast"). Commit 5e25225, render `talk03-body-r2`: all gates PASS, frame-glitch clean; films CPU 8826b0964be4e8e7…, Three ec5fac8abbab77ec….
  - r1 measured peaks: nods ~93°/s; sway ~68°/s, a bug where the tilt dropped to 0 in one frame when a listener became the speaker; dialogue turns ~80°/s.
  - Changes:
    - listener nods 0.12 rad over 30 frames, starting 10 frames before the line ends;
    - beat head nods 0.05 rad over 20 frames, now separate from the arm beat (18 frames);
    - beats and nods always finish rather than being cut at speaker changes;
    - sway 0.03 rad with a 150-frame period on every bound character;
    - the TALK-03 example uses `dialogue.turn: 0.8` s.
  - New peaks: nods 26°/s, sway 2°/s, turns ~42°/s. A regression test pins nods at ≤35°/s and sway at ≤5°/s.
- TALK-03 calmer revision (second owner review: "too many movements and nods"). Commit 79d1932, render `talk03-body-r4`: all gates PASS, frame-glitch clean; films CPU 50abf7073ade3e5f…, Three c8f565da010dbf5d….
  - `bodyPlan` builds a per-shot event plan from the measured timeline (cached):
    - at most one arm beat per line, on its loudest envelope frame, only for lines of at least 45 frames;
    - no head nod on beats;
    - as a line ends, only the addressee (whom the speaker is looking at, per the TALK-02 focus rule) nods, at most once per 120 frames.
  - Result in the 17 s meeting, per character:

    | | r2 | r4 |
    |---|---|---|
    | Arm beats | 4–5 | 2 |
    | Nods | 8–9 | 1–3 |
    | Share of time the head moves | ~33 % | 5–14 % |

  - Budget regression test added.
  - `talk03-body-r3` was interrupted mid-render by a session break; its incomplete output is left untouched and superseded by r4.
- TALK-03 third revision (owner: "still a bit much of movement, especially in nodding"). Commit cb74c7b, render `talk03-body-r5`: all gates PASS, frame-glitch clean; films CPU 38cef1baf4adeaf0…, Three 97207a4d5f90af43….
  - Changes:
    - nods 0.07 rad (was 0.12);
    - at most one nod per character per 240 frames (8 s);
    - no nod from an addressee who speaks next, since the reply acknowledges the line;
    - sway 0.015 rad (was 0.03).
  - Result in the meeting: 1 nod per character (was 1–3), nodding 5 % of the time; arm beats unchanged at 2 per character.

## TALK-04 director dialogue authoring (2026-11-25, opt-in)
The Director can now produce a dialogue project from a topic (docs/DIRECTOR.md TALK-04). The result uses the TALK-01..03 contracts unchanged: `speech.speakers`/`shotSpeakers`, `speakerAssets`, `dialogue`, `bodyLanguage`, placement `lead` and mix-v2. Mouths, looks and gestures stay envelope- and phrase-driven: no lip-sync, forced alignment or word alignment.
- Render `talk04-dialogue-r2` from clean commit 7fb7beb (`node scripts/produce.mjs --request examples/talk04-dialogue.request.json --backend both --id talk04-dialogue-r2`). 60 s, 6 shots, 11 lines, 3 voices.
  - Gates: 1 preparation; speech verify, native verify and compare_release (shared hashes exact) all PASS; frame-glitch clean on both films.
  - Quality: pass-with-findings, 0 errors, 2 CAPTION_READING_SPEED warnings (18.7 and 19.9 characters per second). They come from the long offline sentences. Review notes: 3 SHORT_CAPTION and LOW_PROJECTED_MOTION on shot 6.
  - Loudness −16.0 LUFS on both films.
  - Render time CPU 141.4 s, Three-vulkan 54.7 s; RTX observed at util peak 68 % and 1,404 MiB.
  - Films: CPU 8054ce8b52559f09…, Three 7552e5cad785486f….
- Motion per character over 60 s:

  | Character | Beats | Nods |
  |---|---|---|
  | Engineer | 4 | 4 |
  | Robot | 4 | 1 |
  | Scientist | 3 | 1 |

  That is ≤1.1 nods and ≤1.1 beats per 17 s, within the accepted TALK-03 level. Peak speeds equal TALK-03 r5: turns 41.7°/s, nods 14.9°/s, sway 1.1°/s.
- `talk04-dialogue-r1` (8d69270) also passed every gate, but its stills showed the set piece hidden behind the middle speaker in every shot. Fixed in 7fb7beb; r1 is superseded and left untouched.
- Review status: agent stills review only. No human review yet.

## GEN-01 general dialogue staging and calm motion (2026-11-25, opt-in)
- **Staging `talk-v1`** (src/core/staging.js; `stageProject(p,'talk-v1')`; Studio "Stage dialogue"; used by the Director in dialogue mode) works on any speech project:
  - **Binding:** each line speaker binds to the mouth-capable character whose ID or asset type equals the speaker's ID or name. One remaining speaker may take one remaining character; anything else is ambiguous and nothing is bound. There is no guessing by order: in the TALK-05 "mistake" shot an order rule would have given the robot's lines to the engineer.
  - **Blocking:** with 2–3 bound characters, an automatic camera and every character freely placeable, the characters stand in the TALK line and up to two free set pieces move beside it. Aimers, faces, locomotion and attachments count as authored blocking. Shots with authored camera tracks keep their blocking: re-blocking under a fixed camera cropped TALK-05 shots.
  - **Behaviour, each added only when absent:** dialogue {listen, turn 0.8, cheat 1} with two or more bound characters; bodyLanguage; turnSteps; human detail 2; lighting parity-v1.
- **`calmTurns(project, {limit = 120, timeline})`** (src/core/calm.js; Studio "Calm fast turns") is opt-in and never silent.
  - It widens authored yaw-key turns faster than the limit into their neighbouring holds, re-measuring after each step and reverting any step that does not help.
  - Turns driven by face, dialogue or actions are reported, not changed. A first version made a face-driven turn worse (174 → 3,418°/s); that is now prevented and tested.
  - It returns `changes` and `unresolved` with reasons. Shots without a known length are reported as "duration unknown".
  - On workshop-extended it calms the shelf turn from 224 to 111°/s and reports 4 others with reasons.
- **`aim.phrase: k`** (contract extension, validated): at render the aim window follows narration line k's measured bounds (`phraseAims`, applied in `dialogueShot`). The authored start/end is the estimate used before preparation.
- **TALK-05** now uses these general passes instead of hand staging (see docs/SHOWCASE.md).
- **Caption reading speed:** splitting lines does not help. Speech ran at speed 1.0, and Kokoro naturally speaks short lines at about 18–20 characters per second ("We are proud of you." takes 1.1 s). The real options are slightly slower speech for dialogue, or captions lingering briefly after a line. Both change the audio or caption contracts and are left for the owner to decide.

## GEN-05 slightly slower speech (2026-11-25)
Owner choice for the caption reading-speed finding (1–2 cues per film at 18–20 characters per second): "speech a bit slower" (option a).
- **Contract:** opt-in `speech.pace` is a number from 0.85 to 1, the Kokoro speed tried first. Absent means 1, the historical behaviour.
  - Validation: src/core/speech.js. Timeline segment speeds may go down to the project's pace, never below it (src/core/timeline.js, scripts/verify.py).
- **Pipeline** (scripts/speech_pipeline.py, `speed_ladder` in scripts/speech_plan.py):
  - The pace is tried first, then the historical ladder 1.0 / 1.08 / 1.16 / 1.25.
  - If the shot budgets cannot fit the slower speech, synthesis continues up the ladder. The log prints `Speech pace … not kept`, and speech-report.json records `pace {requested, kept}`. Nothing is truncated or silently changed.
- **Where it is used:**
  - Director dialogue (TALK-04/GEN-01) sets `pace` 0.92 by default. `request.dialogue.pace` (0.85–1) overrides it; 1 gives the TALK-04 speed and an otherwise identical project.
  - The TALK-05 generator uses 0.92.
  - Non-dialogue projects are unchanged; the Director digests are identical.
- Tests: tests/gen05.test.js (contract, timeline bounds, Director, negatives) and tests/test_speech_pace.py (ladder).
- The effect on reading speed is measured from the GEN render (see docs/continuity/CURRENT_STATE.md), not assumed.

## GEN-05b readable captions (2026-11-25)
Owner: "the captions must be generalized in speed not only from the sample video". The fastest GEN-06 caption (19.1 characters per second) came from two things: the greedy splitter left one word ("together.") alone on a second cue, and that line was spoken faster than 18 characters per second. Opt-in `speech.captions.readable: true`, on for every production through `defaultSpeech` (Director films, Studio); authored examples without the flag are unchanged.
- **Balanced split** (`scripts/speech_plan.py` `balanced`): a phrase that needs k cues is cut into k cues of even reading speed (the fastest cue as slow as possible), still within maxChars/maxLines/10 words.
- **Hold:** a phrase's last cue stays shown into the following pause (`holdSample`) until it reads at most `maxCps`, at least 0.7 s in all, at most 1 s later, never past its shot's end or 0.1 s before the next cue. The SRT/VTT sidecars use the same times. Word highlight follows the speech only.
- **Per-phrase pace** (`phrase_speed`): a phrase still spoken faster than `maxCps` is spoken again slower (3 % headroom, never below the 0.85 floor), if the time budget still fits. Otherwise all phrases keep the film speed and the report says so (`readablePhrases {slowed, kept}`). Timeline speeds may then go down to 0.85 (contract: timeline.js, verify.py).
- Metrics: `alignment.maxCps` and `readingSpeedOutliers` measure the time each cue is shown; `speechMaxCps` and `heldCues` are added when a cue holds.
- Tests: tests/test_captions_readable.py (300 random scripts spoken within the limit: 0 fast cues; faster scripts: fewer fast cues; holds never overlap), tests/gen05b.test.js (contract and negatives).
