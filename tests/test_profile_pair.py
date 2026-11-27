"""GPU-01: matched GPU Standard vs Cinematic parity (check_shared profiles=True); no media decoding."""
import json,tempfile,unittest,importlib.util
from pathlib import Path
from matched_inventory import check_shared,AUTHORED_SHARED,sha

TIMELINE={'version':1,'fps':30,'durationFrames':150,'shots':[{'id':'a','startFrame':0,'endFrame':90},{'id':'b','startFrame':90,'endFrame':150}]}
def project(cinematic,move=0):
    shots=[{'id':'a','template':'cinematic-graph','backend':'three','durationFrames':90,'x':move},{'id':'b','template':'cinematic-graph','backend':'three','durationFrames':60}]
    p={'version':2,'id':'x-'+('cinematicv1' if cinematic else 'three')+'-polished','shots':shots}
    if cinematic:p.update(renderProfile='cinematic-v1',cinematic={'version':1,'materials':'pbr-v1'})
    return p

class ProfilePair(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name);self.a,self.b=root/'standard',root/'cinematic'
    def tearDown(self):self.tmp.cleanup()
    def build(self,a=None,b=None):
        for p,scene in ((self.a,a or project(False)),(self.b,b or project(True))):
            p.mkdir();(p/'scene.json').write_text(json.dumps(scene))
            for n in AUTHORED_SHARED:(p/n).write_text(json.dumps(TIMELINE) if n=='timeline.json' else 'payload:'+n)
        inv={'version':1,'targetFrames':150,'frameAllocation':[{'id':s['id'],'startFrame':s['startFrame'],'endFrame':s['endFrame']} for s in TIMELINE['shots']],'sharedHashes':{n:sha(self.a/n) for n in AUTHORED_SHARED}}
        for p in (self.a,self.b):(p/'shared-inputs.json').write_text(json.dumps(inv))
    def test_pass(self):
        self.build();self.assertEqual(check_shared(self.a,self.b,True)[0],150)
    def test_backend_pair_check_still_refuses_a_profile_pair(self):
        self.build()
        with self.assertRaises(AssertionError):check_shared(self.a,self.b)
    def test_scene_differs_beyond_profile(self):
        self.build(b=project(True,move=1))
        with self.assertRaisesRegex(AssertionError,'different project'):check_shared(self.a,self.b,True)
    def test_order_and_sides(self):
        self.build(a=project(True),b=project(False))
        with self.assertRaisesRegex(AssertionError,'GPU Standard then Cinematic'):check_shared(self.a,self.b,True)
    def test_two_standard_sides(self):
        self.build(b=project(False))
        with self.assertRaisesRegex(AssertionError,'GPU Standard then Cinematic'):check_shared(self.a,self.b,True)
    def test_cpu_side_refused(self):
        s=project(False);s['shots'][0]['backend']='cpu';self.build(a=s)
        with self.assertRaises(AssertionError):check_shared(self.a,self.b,True)

@unittest.skipUnless(importlib.util.find_spec('numpy'),'compare_release needs numpy (release venv); bare CI test job has none')
class ProfileMain(unittest.TestCase):
    def test_flag_routes_to_profile_mode(self):
        import compare_release
        seen=[]
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'c.json';compare_release.main([d,d,str(out),'--profiles'],run=lambda a,b,profiles=False:seen.append(profiles) or {'frames':3})
        self.assertEqual(seen,[True])

if __name__=='__main__':unittest.main()
