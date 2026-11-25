"""TALK-01: per-frame speech envelope (scripts/speech_envelope.py)."""
import importlib.util
import unittest

HAVE = bool(importlib.util.find_spec('numpy'))
if HAVE:
    import numpy as np
    import speech_envelope as se


@unittest.skipUnless(HAVE, 'speech_envelope needs numpy (release venv); bare CI test job has none')
class SpeechEnvelopeTest(unittest.TestCase):
    def test_values_per_frame_gate_and_scale(self):
        frames = 6
        x = np.zeros(frames * se.SPF)
        t = np.arange(se.SPF) / 48000
        x[2 * se.SPF:3 * se.SPF] = .25 * np.sqrt(2) * np.sin(2 * np.pi * 300 * t)   # RMS .25 -> 1000
        x[3 * se.SPF:4 * se.SPF] = .17 * np.sqrt(2) * np.sin(2 * np.pi * 300 * t)   # RMS .17 -> 680
        x[4 * se.SPF:5 * se.SPF] = .005                                             # below gate -> 0
        e = se.envelope(x, frames)
        self.assertEqual(e['version'], 1)
        self.assertEqual(e['unit'], 'permille-rms')
        self.assertEqual(len(e['values']), frames)
        self.assertEqual(e['values'][:2], [0, 0])
        self.assertAlmostEqual(e['values'][2], 1000, delta=2)
        self.assertAlmostEqual(e['values'][3], 680, delta=2)
        self.assertEqual(e['values'][4:], [0, 0])
        self.assertTrue(all(isinstance(v, int) for v in e['values']))

    def test_short_input_padded_and_loud_clipped(self):
        # Half a frame at .1 -> frame RMS .1/sqrt(2) = .0707 -> 283 permille; missing samples count as silence.
        e = se.envelope(np.ones(se.SPF // 2) * .1, 2)
        self.assertEqual(e['values'], [283, 0])
        self.assertEqual(se.envelope(np.ones(se.SPF) * .9, 1)['values'], [1000])

    def test_wanted_only_with_speaker_assets(self):
        self.assertTrue(se.wanted({'shots': [{}, {'speakerAssets': {'default': 'a'}}]}))
        self.assertFalse(se.wanted({'shots': [{}, {}]}))


if __name__ == '__main__':
    unittest.main()
