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
