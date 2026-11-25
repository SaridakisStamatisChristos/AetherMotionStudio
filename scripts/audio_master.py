"""POLISH-02 item 8: opt-in mastering profile "mix-v2" (project field audio.master).

- Bed: the music bed is raised by BED_GAIN (+6 dB) before ducking, so gaps between phrases do not drop out.
- Phrase levelling: each narration phrase is set to a common RMS and soft-limited (tanh) instead of being capped by its
  own peak, so phrase loudness stays consistent.
- Master: target -16 LUFS as delivered (dual-mono stereo = mono + 3.01 LU); integrated loudness measured per ITU-R BS.1770-4 (K-weighting, 400 ms blocks, 75 % overlap, -70 LUFS absolute
  and -10 LU relative gates; mono), gain to TARGET_LUFS, soft-knee ceiling, then a true-peak check on a 4x oversampled
  signal; if still above CEILING_DBTP the whole mix is turned down to meet it.
Deterministic numpy/scipy only (already pinned); no new dependency. Absent profile = historical mix unchanged.
"""
import math
import numpy as np
from scipy.signal import lfilter, resample_poly

PROFILE = 'mix-v2'
# The film carries the mono mix on both stereo channels (AAC 2ch); BS.1770 sums channels, so delivered loudness is
# mono + 3.01 LU. Target = -16 LUFS as delivered (r5 check: mono -18.05 measured -15.0 LUFS in the film).
DELIVERED_LUFS = -16.0
DUAL_MONO_OFFSET = 3.01
TARGET_LUFS = DELIVERED_LUFS - DUAL_MONO_OFFSET
CEILING_DBTP = -1.0
PHRASE_RMS = .17
PHRASE_LIMIT = .8
# Bed gain relative to the historical bed: keeps bed-only gaps between phrases from feeling like dropouts once
# speech is levelled up (r4 review: bed-only -33 dB vs speech -16 dB, LRA 17.7 LU). Ducking under speech unchanged.
BED_GAIN = 2.0


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
    knee = 10 ** ((CEILING_DBTP - .3) / 20)
    gain_db = TARGET_LUFS - before if math.isfinite(before) else 0.0
    # The soft knee lowers loudness slightly; re-measure and correct the gain (fixed 3 iterations, deterministic).
    for _ in range(3):
        y = knee * np.tanh(mix * 10 ** (gain_db / 20) / knee)
        now = integrated_lufs(y, rate)
        if not math.isfinite(now) or abs(now - TARGET_LUFS) < .05:
            break
        gain_db += TARGET_LUFS - now
    tp = true_peak_dbtp(y)
    trim = 0.0
    if tp > CEILING_DBTP:
        trim = CEILING_DBTP - tp - .05
        y = y * 10 ** (trim / 20)
    report = {'profile': PROFILE, 'targetLufs': TARGET_LUFS, 'ceilingDbtp': CEILING_DBTP, 'inputLufs': round(before, 2),
              'gainDb': round(gain_db, 2), 'trimDb': round(trim, 2), 'outputLufs': round(integrated_lufs(y, rate), 2),
              'truePeakDbtp': round(true_peak_dbtp(y), 2), 'deliveredDualMonoLufs': round(integrated_lufs(y, rate) + DUAL_MONO_OFFSET, 2)}
    return y, report
