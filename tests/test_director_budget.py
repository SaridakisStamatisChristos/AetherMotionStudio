import unittest
from timeline_plan import allocate_global,allocate,MAX_SHOT
class DirectorBudgetTests(unittest.TestCase):
    def test_measured_redistribution(self):
        lengths=[[350000],[30000],[90000]]
        frames=allocate_global(lengths,[150,150,150])
        self.assertEqual(sum(frames),450)
        self.assertGreater(frames[0],150)
        for l,n in zip(lengths,frames): allocate(l,n)
        self.assertEqual(frames,allocate_global(lengths,[150,150,150]))
    def test_impossible(self):
        with self.assertRaises(ValueError): allocate_global([[9999999],[100]], [60,60])
    def test_limits(self):
        frames=allocate_global([[100],[100]],[MAX_SHOT,MAX_SHOT])
        self.assertEqual(frames,[MAX_SHOT,MAX_SHOT])
