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
