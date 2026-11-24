"""LOCAL-03 glitch-detector unit tests on synthetic frames (numpy needed; bare CI job skips)."""
import importlib.util,unittest
@unittest.skipUnless(importlib.util.find_spec('numpy'),'frame_glitch needs numpy (release venv)')
class Spikes(unittest.TestCase):
    def setUp(self):
        import numpy as np;self.np=np
        from frame_glitch import spikes,psnr;self.spikes,self.psnr=spikes,psnr
        # smooth motion: a gradient drifting one level per frame
        self.f=np.stack([np.full((16,9),40+i,np.float32) for i in range(12)])
    def test_smooth_motion_is_clean(self):self.assertEqual(self.spikes(self.f),[])
    def test_isolated_corrupt_frame_is_flagged(self):
        f=self.f.copy();f[5,:,::2]=255
        self.assertEqual([s['frame'] for s in self.spikes(f)],[5])
    def test_scene_cut_is_not_flagged(self):
        f=self.f.copy();f[6:]+=120
        self.assertEqual(self.spikes(f),[])
    def test_two_consecutive_cuts_back_and_forth_still_flag_the_odd_frame(self):
        f=self.f.copy();f[3]=0
        self.assertEqual([s['frame'] for s in self.spikes(f)],[3])
    def test_psnr(self):
        a=self.f[0];self.assertEqual(self.psnr(a,a),float('inf'));self.assertIsInstance(self.psnr(a,a+1),float);self.assertAlmostEqual(self.psnr(a,a+1),48.13,places=2)
if __name__=='__main__':unittest.main()
