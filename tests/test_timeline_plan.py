import unittest
from timeline_plan import allocate,required_samples,SPF,PAD,GAP
class PlanTests(unittest.TestCase):
 def test_exact(self):
  n,slots=allocate([48000,96000,48000],360)
  self.assertEqual(n,360)
  self.assertEqual([b-a for a,b in slots],[48000,96000,48000])
  self.assertGreaterEqual(slots[0][0],PAD)
  self.assertGreaterEqual(slots[1][0]-slots[0][1],GAP)
  self.assertLessEqual(slots[-1][1],n*SPF-PAD)
 def test_auto(self):
  lengths=[120000,140000]
  n,slots=allocate(lengths,None)
  self.assertGreaterEqual(n*SPF,required_samples(lengths))
  self.assertLess(n*SPF-required_samples(lengths),SPF)
 def test_bad(self):
  for lengths,n in [([],60),([0],60),([999999],60),([100],59),([100],3601),([1.5],60)]:
   with self.assertRaises(ValueError):allocate(lengths,n)
if __name__=='__main__':unittest.main()
