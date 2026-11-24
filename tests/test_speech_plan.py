import unittest,tempfile
from pathlib import Path
from speech_plan import allocate_mixed,slots,estimate_words,caption_cues,subtitles,caption_metrics,pronunciation
from phrase_cache import PhraseCache,key_for
from timeline_plan import RATE,SPF
class SpeechPlanTests(unittest.TestCase):
    def test_mixed_exact_and_fixed(self):
        for seconds in (15,30,60,120):
            ls=[[48000,24000],[80000],[50000]];texts=[['One.','Two'],['Three.'],['Four.']]
            frames=allocate_mixed(ls,texts,[120,None,None],seconds*30)
            self.assertEqual(frames[0],120);self.assertEqual(sum(frames),seconds*30)
            self.assertEqual(frames,allocate_mixed(ls,texts,[120,None,None],seconds*30))
            for a,b,n in zip(ls,texts,frames):
                ss=slots(a,b,n);self.assertTrue(all(y-x==z for (x,y),z in zip(ss,a)));self.assertLessEqual(ss[-1][1],n*SPF)
        with self.assertRaises(ValueError):allocate_mixed([[RATE*20],[RATE]],[['long'],['short']],[120,None],450)
        with self.assertRaises(ValueError):allocate_mixed([[RATE]],[['short']],[120],450)
    def test_caption_coverage_and_export(self):
        a={'text':'A simple message crosses a network. Every packet has a destination.','startSample':12345,'endSample':234567,'speaker':'g'}
        c=caption_cues([a],{'maxChars':24,'maxLines':2})
        self.assertGreater(len(c),1);self.assertEqual(c[0]['startSample'],a['startSample']);self.assertEqual(c[-1]['endSample'],a['endSample'])
        self.assertTrue(all(len(line)<=24 for x in c for line in x['lines']))
        report=caption_metrics(c,[a],18);self.assertEqual(report['coverage'],1);self.assertEqual(report['phraseBoundaryErrorSamples'],0);self.assertIsNone(report['independentWordAlignmentError'])
        s,v=subtitles(c,{'g':'Guide'});self.assertIn(' --> ',s);self.assertTrue(v.startswith('WEBVTT'))
        self.assertEqual(estimate_words('a b',0,3)[-1]['endSample'],3)
        with self.assertRaises(ValueError):subtitles([{'startSample':1,'endSample':2,'speaker':'g','lines':['x']}],{})
    def test_pronunciation_and_cache(self):
        self.assertEqual(pronunciation('Use Wi-Fi, not Wi-Fis.',{'Wi-Fi':'why fie'}),'Use why fie, not Wi-Fis.')
        with tempfile.TemporaryDirectory() as root:
            c=PhraseCache(root,limit=80);a=key_for({'voice':'a','text':'x'});b=key_for({'voice':'b','text':'x'})
            self.assertNotEqual(a,b);self.assertIsNone(c.get(a));c.put(a,b'abcd'*4);self.assertEqual(c.get(a),b'abcd'*4)
            c.path(a).write_bytes(b'x'*48);self.assertIsNone(c.get(a));c.put(a,b'abcd'*4);c.put(b,b'efgh'*4)
            self.assertLessEqual(sum(p.stat().st_size for p in Path(root).glob('*.pcm')),80)
