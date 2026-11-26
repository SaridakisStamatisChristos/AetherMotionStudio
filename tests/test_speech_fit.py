"""Fix A: speech.fit 'speech-v1' (film length follows the measured speech, at most the requested target)."""
import math, unittest
from speech_plan import fit_target, allocate_mixed, required, slots, FIT_GAP, FIT_TAIL, FIT_END
from timeline_plan import RATE, SPF

S=RATE  # one second of samples

class SpeechFit(unittest.TestCase):
    def setUp(self):
        # Three automatic shots, two lines each, about 2.5 s per line (15 s of talk).
        self.lengths=[[int(2.5*S),int(2.5*S)] for _ in range(3)]
        self.texts=[['One line.','Two lines.'] for _ in range(3)]
        self.budgets=[None,None,None]

    def calm(self,a,b):
        return max(60,math.ceil((required(a,b)+int(RATE*(FIT_GAP*(len(a)-1)+FIT_TAIL)))/SPF))

    def test_none_keeps_the_exact_target(self):
        self.assertEqual(fit_target(self.lengths,self.texts,self.budgets,1800,'none'),1800)

    def test_short_speech_gives_a_shorter_film_with_calm_pauses(self):
        want=sum(self.calm(a,b) for a,b in zip(self.lengths,self.texts))+math.ceil(FIT_END*30)
        got=fit_target(self.lengths,self.texts,self.budgets,1800,'speech-v1')
        self.assertEqual(got,want);self.assertLess(got,1800)
        frames=allocate_mixed(self.lengths,self.texts,self.budgets,got);self.assertEqual(sum(frames),got)
        # Every pause inside a shot stays calm: at most the punctuation pause plus FIT_GAP plus the slack share.
        for a,b,n in zip(self.lengths,self.texts,frames):
            s=slots(a,b,n,'lead');gap=(s[1][0]-s[0][1])/RATE;self.assertLess(gap,.34+FIT_GAP+.01)
            tail=(n*SPF-s[-1][1])/RATE;self.assertLess(tail,2.0)

    def test_long_speech_is_capped_at_the_target(self):
        self.assertEqual(fit_target(self.lengths,self.texts,self.budgets,450,'speech-v1'),450)

    def test_fixed_shots_keep_their_length_and_minimum_is_six_seconds(self):
        got=fit_target(self.lengths,self.texts,[300,None,None],1800,'speech-v1')
        self.assertEqual(got,300+self.calm(self.lengths[1],self.texts[1])+self.calm(self.lengths[2],self.texts[2])+30)
        self.assertEqual(fit_target([[int(.4*S)]],[['Hi.']],[None],900,'speech-v1'),180)

    def test_negatives(self):
        with self.assertRaises(ValueError):fit_target(self.lengths,self.texts,self.budgets,1800,'speech-v2')
        with self.assertRaises(ValueError):fit_target(self.lengths,self.texts,[None],1800,'speech-v1')
        with self.assertRaises(ValueError):fit_target([],[],[],1800,'speech-v1')

if __name__=='__main__':unittest.main()
