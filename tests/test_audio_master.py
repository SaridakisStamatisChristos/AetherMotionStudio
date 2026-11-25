"""POLISH-02 item 8: opt-in mastering profile mix-v2 (scripts/audio_master.py)."""
import math
import unittest
import numpy as np
import audio_master as am

R = 48000


def sine(freq, amp, seconds):
    t = np.arange(int(seconds * R)) / R
    return amp * np.sin(2 * np.pi * freq * t)


class AudioMasterTest(unittest.TestCase):
    def test_bs1770_reference_tone(self):
        # ITU-R BS.1770: a 1 kHz sine at 0 dBFS in one channel reads -3.01 LUFS; amplitude 0.1 is 20 dB lower.
        self.assertAlmostEqual(am.integrated_lufs(sine(1000, 1.0, 5)), -3.01, delta=.1)
        self.assertAlmostEqual(am.integrated_lufs(sine(1000, .1, 5)), -23.01, delta=.1)

    def test_gating_ignores_silence(self):
        x = np.concatenate([sine(1000, .1, 3), np.zeros(R * 6)])
        # Blocks straddling the tone/silence edge pass the gate partly filled (standard BS.1770 behaviour): ~0.2 LU.
        self.assertAlmostEqual(am.integrated_lufs(x), am.integrated_lufs(sine(1000, .1, 3)), delta=.3)
        self.assertEqual(am.integrated_lufs(np.zeros(R)), -math.inf)

    def test_master_hits_target_and_ceiling(self):
        rng = np.random.default_rng(7)
        speechy = np.concatenate([rng.normal(0, a, R) * np.hanning(R) for a in (.05, .2, .02, .3, .1)])
        y, rep = am.master(speechy + sine(220, .02, len(speechy) / R))
        self.assertLessEqual(abs(rep['outputLufs'] - am.TARGET_LUFS), .2)
        self.assertAlmostEqual(am.TARGET_LUFS, -19.01, places=2)
        self.assertAlmostEqual(rep['deliveredDualMonoLufs'], rep['outputLufs'] + 3.01, delta=.02)
        self.assertLessEqual(rep['truePeakDbtp'], am.CEILING_DBTP + 1e-6)
        self.assertLessEqual(float(np.max(np.abs(y))), 1.0)
        y2, rep2 = am.master(speechy + sine(220, .02, len(speechy) / R))
        self.assertTrue(np.array_equal(y, y2))
        self.assertEqual(rep, rep2)

    def test_phrase_levelling_is_consistent(self):
        rng = np.random.default_rng(3)
        phrases = [rng.normal(0, a, R) * (1 + 4 * (rng.random(R) > .995)) for a in (.02, .1, .3)]
        rms = [20 * math.log10(float(np.sqrt(np.mean(am.level_phrase(p) ** 2)))) for p in phrases]
        self.assertLess(max(rms) - min(rms), 1.0)
        for p in phrases:
            self.assertLessEqual(float(np.max(np.abs(am.level_phrase(p)))), am.PHRASE_LIMIT)

    def test_profile_switch_and_rate_guard(self):
        self.assertTrue(am.enabled({'audio': {'master': 'mix-v2'}}))
        self.assertFalse(am.enabled({}))
        self.assertFalse(am.enabled({'audio': {'master': 'other'}}))
        with self.assertRaises(ValueError):
            am.integrated_lufs(np.zeros(44100), 44100)


if __name__ == '__main__':
    unittest.main()
