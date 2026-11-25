"""GEN-05: opt-in slower speech pace; the default speed ladder is unchanged."""
import unittest
from speech_plan import speed_ladder, SPEEDS


class SpeechPaceTest(unittest.TestCase):
    def test_default_ladder_unchanged(self):
        self.assertEqual(speed_ladder(), [1., 1.08, 1.16, 1.25])
        self.assertEqual(speed_ladder(1), list(SPEEDS))

    def test_pace_is_tried_first_then_the_historical_ladder(self):
        self.assertEqual(speed_ladder(.92), [.92, 1., 1.08, 1.16, 1.25])
        self.assertEqual(speed_ladder(.85)[0], .85)

    def test_out_of_range_rejected(self):
        for bad in (.84, 1.01, 0, -1, float('nan')):
            with self.assertRaises(ValueError):
                speed_ladder(bad)


if __name__ == '__main__':
    unittest.main()
