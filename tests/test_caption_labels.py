"""Owner's Studio checkbox "Speaker names in captions": caption_labels feeds the .srt/.vtt writer and both checkers."""
import unittest
from speech_plan import caption_labels, subtitles

CFG={'speakers':{'host':{'name':'Student'},'guest':{'name':'Explorer'}},'captions':{'mode':'both'}}
SEGS=[{'speaker':'host'},{'speaker':'guest'}]
CUES=[{'speaker':'host','startSample':0,'endSample':48000,'lines':['How do bees make honey?']},{'speaker':'guest','startSample':96000,'endSample':144000,'lines':['It starts with nectar.']}]

class CaptionLabels(unittest.TestCase):
    def test_names_by_default(self):
        self.assertEqual(caption_labels(CFG,SEGS),{'host':'Student','guest':'Explorer'})
        srt,vtt=subtitles(CUES,caption_labels(CFG,SEGS))
        self.assertIn('Student: How do bees make honey?',srt);self.assertIn('Explorer: It starts with nectar.',vtt)
    def test_narrator_label_for_default_lines(self):
        self.assertEqual(caption_labels(CFG,SEGS+[{'speaker':'default'}])['default'],'Narrator')
    def test_off_removes_names(self):
        cfg={**CFG,'captions':{'mode':'both','speakerNames':False}}
        self.assertEqual(caption_labels(cfg,SEGS),{})
        srt,vtt=subtitles(CUES,caption_labels(cfg,SEGS))
        self.assertNotIn('Student:',srt);self.assertNotIn('Explorer:',vtt);self.assertIn('How do bees make honey?',srt)

if __name__=='__main__':unittest.main()
