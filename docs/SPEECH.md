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
