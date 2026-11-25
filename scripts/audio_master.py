"""POLISH-02 item 8: opt-in mastering profile "mix-v2" (project field audio.master).

- Phrase levelling: each narration phrase is set to a common RMS and soft-limited (tanh) instead of being capped by its
  own peak, so phrase loudness stays consistent.
- Master: integrated loudness measured per ITU-R BS.1770-4 (K-weighting, 400 ms blocks, 75 % overlap, -70 LUFS absolute
  and -10 LU relative gates; mono), gain to TARGET_LUFS, soft-knee ceiling, then a true-peak check on a 4x oversampled
  signal; if still above CEILING_DBTP the whole mix is turned down to meet it.
Deterministic numpy/scipy only (already pinned); no new dependency. Absent profile = historical mix unchanged.
"""
import math
import numpy as np
from scipy.signal import lfilter, resample_poly

PROFILE = 'mix-v2'
TARGET_LUFS = -16.0
CEILING_DBTP = -1.0
PHRASE_RMS = .17
PHRASE_LIMIT = .8


def enabled(scene):
    return (scene.get('audio') or {}).get('master') == PROFILE


def level_phrase(v):
    """Common RMS, then soft limit; returns float64 array."""
    v = np.asarray(v, dtype=float)
    rms = float(np.sqrt(np.mean(v * v)))
    if rms <= 1e-6:
        return v
    v = v * (PHRASE_RMS / rms)
    return PHRASE_LIMIT * np.tanh(v / PHRASE_LIMIT)


def _k_weight(x, rate):
    if rate != 48000:
        raise ValueError('K-weighting coefficients are defined for 48 kHz')
    x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], x)


def integrated_lufs(x, rate=48000):
    y = _k_weight(np.asarray(x, dtype=float), rate)
    block, hop = int(.4 * rate), int(.1 * rate)
    if len(y) < block:
        return -math.inf
    power = np.array([np.mean(y[i:i + block] ** 2) for i in range(0, len(y) - block + 1, hop)])
    loud = -0.691 + 10 * np.log10(np.maximum(power, 1e-20))
    gated = power[loud > -70]
    if not len(gated):
        return -math.inf
    rel = -0.691 + 10 * math.log10(float(np.mean(gated))) - 10
    gated = power[(loud > -70) & (loud > rel)]
    return -0.691 + 10 * math.log10(float(np.mean(gated)))


def true_peak_dbtp(x):
    up = resample_poly(np.asarray(x, dtype=float), 4, 1)
    return 20 * math.log10(max(1e-12, float(np.max(np.abs(up)))))


def master(mix, rate=48000):
    """Returns (mastered float array, report dict)."""
    mix = np.asarray(mix, dtype=float)
    before = integrated_lufs(mix, rate)
    gain_db = TARGET_LUFS - before if math.isfinite(before) else 0.0
    y = mix * 10 ** (gain_db / 20)
    knee = 10 ** ((CEILING_DBTP - .3) / 20)
    y = knee * np.tanh(y / knee)
    tp = true_peak_dbtp(y)
    trim = 0.0
    if tp > CEILING_DBTP:
        trim = CEILING_DBTP - tp - .05
        y = y * 10 ** (trim / 20)
    report = {'profile': PROFILE, 'targetLufs': TARGET_LUFS, 'ceilingDbtp': CEILING_DBTP, 'inputLufs': round(before, 2),
              'gainDb': round(gain_db, 2), 'trimDb': round(trim, 2), 'outputLufs': round(integrated_lufs(y, rate), 2),
              'truePeakDbtp': round(true_peak_dbtp(y), 2)}
    return y, report
