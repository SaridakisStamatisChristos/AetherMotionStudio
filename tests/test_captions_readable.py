"""GEN-05b readable captions (opt-in captions.readable): balanced cue splits, a hold into the following pause and
per-phrase slowing, for any script (owner: "the captions must be generalized in speed not only from the sample video")."""
import random
import unittest

from speech_plan import RATE, PACE_MIN, caption_cues, caption_metrics, phrase_speed

CFG = {'mode': 'both', 'highlight': True, 'maxChars': 32, 'maxLines': 2, 'maxCps': 18}
WORDS = ('data network packet signal router device message standard protocol computer link order piece result '
         'information destination connection equipment wireless together different between').split()


def script(rnd, phrases, lo=13., hi=17.5):
    segs, cur = [], 0
    for _ in range(phrases):
        text = ' '.join(rnd.choice(WORDS) for _ in range(rnd.randint(3, 30))) + '.'
        cur += int(rnd.uniform(.3, 1.6) * RATE)
        d = int(len(text) * RATE / rnd.uniform(lo, hi))
        segs.append({'text': text, 'startSample': cur, 'endSample': cur + d, 'speaker': 'a'})
        cur += d
    return segs, cur


class Readable(unittest.TestCase):
    def test_default_unchanged(self):
        rnd = random.Random(3)
        for _ in range(40):
            segs, _ = script(rnd, 4)
            cues = caption_cues(segs, CFG)
            self.assertFalse(any('holdSample' in c for c in cues))
            m = caption_metrics(cues, segs, 18)
            self.assertNotIn('speechMaxCps', m)
            self.assertNotIn('heldCues', m)

    def test_orphan_word_case(self):
        # the GEN-06 interview line: 14 words, split greedily into 13 + 1 words; balanced, both cues read alike
        text = 'Standards allow different computers and networks to work together.'
        seg = [{'text': text, 'startSample': 0, 'endSample': int(len(text) * RATE / 18), 'speaker': 'a'}]
        old = caption_metrics(caption_cues(seg, CFG), seg, 18)
        new_cues = caption_cues(seg, {**CFG, 'readable': True}, [seg[0]['endSample'] + 2 * RATE])
        new = caption_metrics(new_cues, seg, 18)
        self.assertGreater(old['maxCps'], 18)
        self.assertLessEqual(new['maxCps'], 18)
        self.assertGreaterEqual(min(len(c['words']) for c in new_cues), 3, 'no orphan word')

    def test_general_scripts(self):
        rnd = random.Random(7)
        old = new = cues = 0
        for _ in range(300):
            # spoken within the limit (13-17.5 characters/s): captions must then read within it too
            segs, end = script(rnd, rnd.randint(1, 6))
            ends = [end + RATE] * len(segs)
            a = caption_cues(segs, CFG)
            b = caption_cues(segs, {**CFG, 'readable': True}, ends)
            old += caption_metrics(a, segs, 18)['readingSpeedOutliers']
            new += caption_metrics(b, segs, 18)['readingSpeedOutliers']
            cues += len(b)
            self.assertEqual([w['text'] for c in a for w in c['words']], [w['text'] for c in b for w in c['words']])
            for k, c in enumerate(b):
                shown = c.get('holdSample', c['endSample'])
                self.assertLessEqual(shown - c['endSample'], RATE)
                if k + 1 < len(b):
                    self.assertLessEqual(shown, b[k + 1]['startSample'])
                if 'holdSample' in c:
                    self.assertTrue(k + 1 == len(b) or b[k + 1]['phrase'] != c['phrase'], 'hold only after a phrase')
        self.assertEqual(new, 0)
        # spoken faster than the limit: display alone helps only partly (the pipeline slows such phrases instead)
        rnd = random.Random(11)
        old = new = 0
        for _ in range(200):
            segs, end = script(rnd, rnd.randint(1, 6), 14., 19.)
            old += caption_metrics(caption_cues(segs, CFG), segs, 18)['readingSpeedOutliers']
            new += caption_metrics(caption_cues(segs, {**CFG, 'readable': True}, [end + RATE] * len(segs)), segs, 18)['readingSpeedOutliers']
        self.assertLess(new, old)

    def test_hold_respects_shot_end_and_next_cue(self):
        text = 'Signals move over wired or wireless links quickly.'
        n = int(len(text) * RATE / 21)
        seg = [{'text': text, 'startSample': 0, 'endSample': n, 'speaker': 'a'},
               {'text': 'Next.', 'startSample': n + RATE // 5, 'endSample': n + RATE, 'speaker': 'a'}]
        cues = caption_cues(seg, {**CFG, 'readable': True}, [n + 10 * RATE, n + 10 * RATE])
        self.assertLessEqual(cues[0]['holdSample'], seg[1]['startSample'] - RATE // 10)
        cues = caption_cues(seg[:1], {**CFG, 'readable': True}, [n + 100])
        self.assertEqual(cues[0]['holdSample'], n + 100)

    def test_phrase_speed(self):
        text = 'x' * 90
        self.assertEqual(phrase_speed(text, 5 * RATE, .92, 18), .92, '18 characters/s is kept')
        v = phrase_speed(text, int(4.5 * RATE), .92, 18)
        self.assertLess(v, .92)
        self.assertGreaterEqual(v, PACE_MIN)
        self.assertEqual(round(v, 2), v)
        self.assertEqual(phrase_speed(text, RATE, .92, 18), PACE_MIN, 'never below the floor')
        self.assertEqual(phrase_speed(text, RATE, 1.08, 18), PACE_MIN)

    def test_quality_audit_matches_held_sidecars(self):
        # regression (gen12-forest-r1): the media audit rebuilt subtitles without the hold and failed SUBTITLE_MISMATCH
        from speech_plan import subtitles
        from quality_metrics import expected_subtitles, parse_subtitles
        text = 'Signals move over wired or wireless links quickly.'
        n = int(len(text) * RATE / 21)
        seg = [{'text': text, 'startSample': 0, 'endSample': n, 'speaker': 'a'},
               {'text': 'Next line here.', 'startSample': n + RATE, 'endSample': n + 2 * RATE, 'speaker': 'b'}]
        cues = caption_cues(seg, {**CFG, 'readable': True}, [n + 10 * RATE] * 2)
        self.assertIn('holdSample', cues[0])
        labels = {'a': 'A', 'b': 'B'}
        srt, vtt = subtitles(cues, labels)
        self.assertEqual(parse_subtitles(srt, 'srt'), expected_subtitles(cues, labels))
        self.assertEqual(parse_subtitles(vtt, 'vtt'), expected_subtitles(cues, labels))
        plain = caption_cues(seg, CFG)
        self.assertEqual(parse_subtitles(subtitles(plain, labels)[0], 'srt'), expected_subtitles(plain, labels), 'unchanged without holds')


if __name__ == '__main__':
    unittest.main()
