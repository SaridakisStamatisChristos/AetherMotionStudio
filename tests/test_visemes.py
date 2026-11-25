"""GEN-10 estimated mouth shapes (scripts/visemes.py): pure functions on IPA strings, no phonemizer needed.
IPA samples below are espeak-ng output (en-us) as returned by kokoro-onnx's tokenizer."""
import unittest

import visemes as V

R = 48000


class Visemes(unittest.TestCase):
    def test_word_shapes(self):
        self.assertEqual([c for c, _ in V.word_shapes('bˈɑːb')], ['M', 'A', 'M'], 'b closes, ɑ opens')
        self.assertEqual([c for c, _ in V.word_shapes('mˈuːs')], ['M', 'O', 'O'], 's takes the round vowel')
        self.assertEqual([c for c, _ in V.word_shapes('fˈaɪv')], ['F', 'A', 'E', 'F'])
        self.assertEqual([c for c, _ in V.word_shapes('tsk')], ['E', 'E', 'E'], 'no vowel: neutral wide')
        self.assertEqual([w for _, w in V.word_shapes('mˈɛt')], [1, 2, 1], 'vowels weigh twice')
        self.assertEqual(V.phones('pˈɑːɹk.,!?'), V.phones('pɑɹk'), 'stress, length and punctuation carry no shape')

    def test_phrase_and_frames(self):
        text, ipa = 'Bob met a moose.', 'bˈɑːb mˈɛt ɐ mˈuːs.'
        spans = V.phrase_spans(text, ipa, R, 3 * R)
        self.assertEqual(spans[0][0], R)
        self.assertEqual(spans[-1][1], 3 * R)
        self.assertTrue(all(a < b for a, b, _ in spans))
        self.assertTrue(all(spans[i][1] == spans[i + 1][0] for i in range(len(spans) - 1)), 'no gaps inside a phrase')
        f = V.frames(spans, 120)
        self.assertEqual(len(f), 120)
        self.assertEqual(set(f[:30]), {'X'}, 'silence before the phrase')
        self.assertEqual(set(f[91:]), {'X'}, 'silence after it')
        self.assertTrue(set(f) <= set(V.CODES))
        self.assertIn('M', f[30:33], 'the first b closes the lips at the start')
        self.assertIn('O', f[60:90], 'moose rounds the lips')
        # word count mismatch (espeak merged words): spread over the whole phrase, still covering it
        merged = V.phrase_spans('in the park', 'ɪnðə pˈɑːɹk', 0, R)
        self.assertEqual((merged[0][0], merged[-1][1]), (0, R))

    def test_calm_and_deterministic(self):
        spans = [(0, 1600 * 10, 'A'), (1600 * 10, 1600 * 11, 'E'), (1600 * 11, 1600 * 20, 'A'), (1600 * 20, 1600 * 21, 'M'), (1600 * 21, 1600 * 30, 'A')]
        f = V.frames(spans, 30)
        self.assertNotIn('E', f, 'a one-frame shape between equal shapes is merged')
        self.assertEqual(f[20], 'M', 'a one-frame closure is kept')
        segs = [{'text': 'Bob met a moose.', 'startSample': 0, 'endSample': 2 * R}]
        a = V.visemes(segs, ['bˈɑːb mˈɛt ɐ mˈuːs.'], 90, 'test')
        self.assertEqual(a, V.visemes(segs, ['bˈɑːb mˈɛt ɐ mˈuːs.'], 90, 'test'))
        self.assertEqual((a['version'], a['timing']), ('viseme-estimated-v1', 'estimated'))
        self.assertEqual(V.visemes(segs, [''], 90, 'test')['values'], 'X' * 90, 'no phonemes: rest shape')

    def test_wanted(self):
        bound = {'speech': {'mouths': 'visemes-v1'}, 'shots': [{'speakerAssets': {'a': 'b'}}]}
        self.assertTrue(V.wanted(bound))
        self.assertFalse(V.wanted({**bound, 'speech': {}}), 'opt-in only')
        self.assertFalse(V.wanted({**bound, 'shots': [{}]}), 'no bound speaker, no mouths')


if __name__ == '__main__':
    unittest.main()
