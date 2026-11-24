import unittest
from quality_metrics import consecutive_runs,interior,parse_subtitles,expected_subtitles
class QualityMetricsTests(unittest.TestCase):
    def test_runs_and_transitions(self):
        self.assertEqual(consecutive_runs([(0,True),(5,True),(10,False),(15,True),(20,True),(25,True)],3),[{'startFrame':15,'endFrame':25,'samples':3}])
        s={'startFrame':100,'endFrame':200,'transitionFrames':10}
        self.assertFalse(interior(110,s,10));self.assertTrue(interior(115,s,10));self.assertFalse(interior(185,s,10))
        self.assertEqual(consecutive_runs([(0,False),(5,False)],2),[])
        with self.assertRaises(ValueError):consecutive_runs([(5,True),(5,True)],2)
    def test_independent_sidecar_oracle(self):
        cues=[{'startSample':48000,'endSample':96000,'speaker':'a','lines':['A & B']},{'startSample':96000,'endSample':144000,'speaker':'b','lines':['Next']}]
        expected=expected_subtitles(cues,{'a':'Guide','b':'Guest'})
        srt='1\n00:00:01,000 --> 00:00:02,000\nGuide: A &amp; B\n\n2\n00:00:02,000 --> 00:00:03,000\nGuest: Next\n'
        vtt='WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nGuide: A &amp; B\n\n00:00:02.000 --> 00:00:03.000\nGuest: Next\n'
        self.assertEqual(parse_subtitles(srt,'srt'),expected);self.assertEqual(parse_subtitles(vtt,'vtt'),expected)
        with self.assertRaises(ValueError):parse_subtitles(srt.replace('00:00:02,000 --> 00:00:03,000','00:00:01,999 --> 00:00:03,000'),'srt')
        self.assertNotEqual(parse_subtitles(srt.replace('Next','Changed'),'srt'),expected)
