"""GPU-06 measured mouth shapes (speech.mouths 'rhubarb-v1'): mapping, timing, refusals; a real run only where the
owner-approved tool is installed (never on CI)."""
import os, unittest
from unittest import mock
import numpy as np
import visemes_rhubarb as vr
import setup_rhubarb


class RhubarbVisemes(unittest.TestCase):
    def test_wanted_only_with_the_mode_and_bound_speakers(self):
        bound = [{'speakerAssets': {'a': 'x'}}]
        self.assertTrue(vr.wanted({'speech': {'mouths': 'rhubarb-v1'}, 'shots': bound}))
        self.assertFalse(vr.wanted({'speech': {'mouths': 'visemes-v1'}, 'shots': bound}))
        self.assertFalse(vr.wanted({'speech': {'mouths': 'rhubarb-v1'}, 'shots': [{}]}))
        self.assertFalse(vr.wanted({'shots': bound}))

    def test_every_rhubarb_shape_maps_to_an_engine_code(self):
        self.assertEqual(set(vr.SHAPES), set('ABCDEFGHX'))
        self.assertTrue(set(vr.SHAPES.values()) <= set('XMFEAO'))
        self.assertEqual(vr.SHAPES['A'], 'M'); self.assertEqual(vr.SHAPES['G'], 'F'); self.assertEqual(vr.SHAPES['F'], 'O')

    def test_cues_land_on_frames_inside_their_phrase(self):
        seg = [{'startSample': 1600 * 10, 'endSample': 1600 * 20}]
        v = vr.cues_to_values([[{'start': 0, 'end': .1, 'value': 'A'}, {'start': .1, 'end': .2, 'value': 'D'}, {'start': .2, 'end': 9, 'value': 'F'}]], seg, 30)
        self.assertEqual(len(v), 30); self.assertEqual(v[:10], 'X' * 10)
        self.assertEqual(v[10:13], 'MMM'); self.assertEqual(v[13:16], 'AAA'); self.assertEqual(v[16:20], 'OOOO')
        self.assertEqual(v[20:], 'X' * 10, 'never past the phrase end')
        with self.assertRaises(ValueError): vr.cues_to_values([[{'start': 0, 'end': 1, 'value': 'Q'}]], seg, 30)

    def test_recognizer_by_language(self):
        self.assertEqual(vr.recognizer('en-us'), 'pocketSphinx'); self.assertEqual(vr.recognizer('en-gb'), 'pocketSphinx')
        self.assertEqual(vr.recognizer('es'), 'phonetic'); self.assertEqual(vr.recognizer(None), 'phonetic')

    def test_missing_tool_is_a_precise_error_not_a_fallback(self):
        with mock.patch.dict(os.environ, {'AETHER_RHUBARB': ''}), mock.patch.object(setup_rhubarb, 'executable', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'setup_rhubarb.py'): vr.executable()
        with mock.patch.dict(os.environ, {'AETHER_RHUBARB': 'Z:/no/such/rhubarb.exe'}):
            with self.assertRaisesRegex(RuntimeError, 'AETHER_RHUBARB'): vr.executable()

    def test_lock_pins_every_platform(self):
        files = setup_rhubarb.LOCK['files']
        self.assertEqual(set(files), {'Windows', 'Darwin', 'Linux'})
        for f in files.values(): self.assertRegex(f['sha256'], r'^[0-9a-f]{64}$')
        self.assertIn('MIT', setup_rhubarb.LOCK['licence'])

    @unittest.skipUnless(setup_rhubarb.executable() is not None, 'Rhubarb not installed (optional tool; never on CI)')
    def test_real_run_on_a_synthetic_phrase(self):
        t = np.arange(int(.8 * vr.R)) / vr.R
        audio = (.3 * np.sin(2 * np.pi * 180 * t) * (np.sin(2 * np.pi * 3 * t) > 0)).astype(np.float32)
        cues = vr.run(setup_rhubarb.executable(), audio, 'hello there', 'en-us')
        self.assertTrue(cues and all(c['value'] in vr.SHAPES for c in cues))
        self.assertAlmostEqual(cues[-1]['end'], .8, delta=.05)


if __name__ == '__main__':
    unittest.main()
