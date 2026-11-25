"""TALK-01: per-frame speech envelope from the measured narration PCM (computed once in preparation).

values[f] = RMS of the narration over the frame's samples, as integer per-mille of FULL_SCALE_RMS, with a silence gate.
Stored in timeline.json as speechEnvelope (shared and hashed with the timeline, identical for both backends).
Envelope-driven mouth motion only: this is not phoneme or viseme alignment.
"""
import numpy as np

VERSION = 1
SPF = 1600
FULL_SCALE_RMS = .25   # phrase RMS is levelled near .17, so normal speech lands around 600-700
GATE_RMS = .01


def wanted(scene):
    return any(s.get('speakerAssets') is not None for s in scene.get('shots', []))


def envelope(speech, frames):
    x = np.asarray(speech, dtype=np.float64)
    need = frames * SPF
    if len(x) < need:
        x = np.concatenate([x, np.zeros(need - len(x))])
    rms = np.sqrt(np.mean(x[:need].reshape(frames, SPF) ** 2, axis=1))
    vals = np.where(rms < GATE_RMS, 0, np.minimum(1000, np.round(1000 * rms / FULL_SCALE_RMS)))
    return {'version': VERSION, 'unit': 'permille-rms', 'values': [int(v) for v in vals]}
