"""POLISH-03: narration placement inside a shot ('center' historical default, 'lead'). Pure integer planning."""
import unittest
from timeline_plan import allocate, PAD, GAP, SPF, RATE, LEAD_GAP_MAX, PLACEMENTS
from speech_plan import slots, pause_after


class PlacementTest(unittest.TestCase):
    def test_center_is_the_unchanged_default(self):
        for lengths, frames in [([RATE * 2], 240), ([RATE, RATE * 2, RATE // 2], 300), ([RATE * 3, RATE], 180)]:
            self.assertEqual(allocate(lengths, frames), allocate(lengths, frames, 'center'))
        # Historical formula: equal shares before, between and after phrases.
        frames, s = allocate([RATE * 2], 240)
        lead, tail = s[0][0] - PAD, frames * SPF - PAD - s[0][1]
        self.assertLessEqual(abs(lead - tail), 1)
        texts = ['One.', 'Two, three.', 'Four']
        ls = [RATE, RATE * 2, RATE // 2]
        self.assertEqual(slots(ls, texts, 300), slots(ls, texts, 300, 'center'))

    def test_lead_starts_after_pad_and_puts_the_rest_at_the_end(self):
        ls = [RATE, RATE * 2, RATE // 2]
        frames, s = allocate(ls, 300, 'lead')
        self.assertEqual(s[0][0], PAD)
        for (a, b), (c, d) in zip(s, s[1:]):
            self.assertLessEqual(c - b, GAP + LEAD_GAP_MAX)
            self.assertGreaterEqual(c - b, GAP)
        self.assertEqual([b - a for a, b in s], ls)
        tail = frames * SPF - s[-1][1]
        _, centered = allocate(ls, 300)
        self.assertGreater(tail, frames * SPF - centered[-1][1])
        # Speech projects: same rule in speech_plan.slots.
        texts = ['One.', 'Two, three.', 'Four']
        out = slots(ls, texts, 300, 'lead')
        self.assertEqual(out[0][0], PAD)
        self.assertEqual(out[1][0] - out[0][1], slots(ls, texts, 300)[1][0] - slots(ls, texts, 300)[0][1])

    def test_single_phrase_and_negatives(self):
        frames, s = allocate([RATE], 120, 'lead')
        self.assertEqual(s[0], (PAD, PAD + RATE))
        self.assertEqual(PLACEMENTS, ('center', 'lead'))
        for bad in ('end', '', None):
            with self.assertRaises(ValueError):
                allocate([RATE], 120, bad)
            with self.assertRaises(ValueError):
                slots([RATE], ['One.'], 120, bad)
        with self.assertRaises(ValueError):
            allocate([RATE * 10], 60, 'lead')


if __name__ == '__main__':
    unittest.main()
