# GEN-10 estimated mouth shapes (2026-11-25)
Authorized by the owner: "lets do it seriallized. Gen10 and onwards."

**No new tool or dependency.** The installed Kokoro export (`kokoro-v1.0.int8.onnx`) has only an `audio` output, so it reports no phoneme durations (kokoro-onnx `create_timed` returns no timings for it). Phonemes therefore come from the phonemizer that Kokoro already uses (espeak-ng via kokoro-onnx). Their timing is **estimated**: each word's phonemes are spread over that word's estimated window, the same estimate the captions use, with vowels weighted twice. **This is not lip-sync and not forced alignment.**

## How it works
- **Opt-in** `speech.mouths: 'visemes-v1'`. It is on for every production through `defaultSpeech` (Director films, Studio). Authored examples without it are unchanged.
- **Preparation** (`scripts/visemes.py`, called from speech_pipeline.py) writes `timeline.visemes {version:'viseme-estimated-v1', phonemizer, timing:'estimated', values}`, with one code per frame. The timeline is shared and hashed, so both backends use the same codes.
- **Codes:**
  - X: no speech;
  - M: closed (m b p);
  - F: teeth on lip (f v);
  - E: wide;
  - A: open;
  - O: round (o u w).
- **Neutral consonants** (t d n s k …) take the shape of the nearest vowel in their word. A one-frame shape between two equal shapes is merged; one-frame closures are kept.
- **Render** (src/core/talk.js `VISEMES`, `visemeAt`):
  - loudness (speechEnvelope) still decides how far the mouth opens; the shape scales that (M shuts it) and sets the width (O 0.62, E 1.25);
  - the shape is lightly 1-2-1 smoothed;
  - listeners rest;
  - the geometry gets `pose.mouthWidth` (catalog robots: the lit bar; detail-2/3 humans: lip line and inner mouth). Without it, the geometry is unchanged.
- **Contract:** `timeline.visemes` is required with the opt-in and bound speakers, and forbidden otherwise. The values must be exactly one XMFEAO code per frame.

## Later (owner decision)
Exact phoneme timing needs a Kokoro export with a `duration` output. That is a model download and a new voice fingerprint, so it needs the owner's approval.

Tests: tests/test_visemes.py (shapes, timing spans, calm merge, determinism), tests/gen10.test.js (contract and negatives, talkAt, geometry unchanged without the opt-in).
