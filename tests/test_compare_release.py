"""LOCAL-02 negative tests for matched-output parity (no media decoding)."""
import json,tempfile,unittest
from pathlib import Path
from matched_inventory import check_shared,AUTHORED_SHARED,SPEECH_SHARED,sha

def project(backend,speech=False):
    shots=[{'id':'a','template':'cinematic-graph','backend':backend,'durationFrames':None if speech else 90},
           {'id':'b','template':'cinematic-graph','backend':backend,'durationFrames':None if speech else 60}]
    p={'version':2,'id':'x-'+backend+'-polished','shots':shots}
    if speech:p['speech']={'targetFrames':150}
    return p
TIMELINE={'version':1,'fps':30,'durationFrames':150,'shots':[{'id':'a','startFrame':0,'endFrame':90},{'id':'b','startFrame':90,'endFrame':150}]}

class MatchedOutputs(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name);self.a,self.b=root/'cpu',root/'three'
    def tearDown(self):self.tmp.cleanup()
    def build(self,speech=False,inventory=True):
        names=SPEECH_SHARED if speech else AUTHORED_SHARED
        for p,backend in ((self.a,'cpu'),(self.b,'three')):
            p.mkdir();(p/'scene.json').write_text(json.dumps(project(backend,speech)))
            for n in names:(p/n).write_text(json.dumps(TIMELINE) if n=='timeline.json' else 'payload:'+n)
        if inventory:
            inv={'version':1,'production':'x','targetFrames':150,'frameAllocation':[{'id':s['id'],'startFrame':s['startFrame'],'endFrame':s['endFrame']} for s in TIMELINE['shots']],'sharedHashes':{n:sha(self.a/n) for n in names}}
            for p in (self.a,self.b):(p/'shared-inputs.json').write_text(json.dumps(inv))
    def inv(self,p,**patch):
        x=json.loads((p/'shared-inputs.json').read_text());x.update(patch);(p/'shared-inputs.json').write_text(json.dumps(x))
    def test_authored_pass(self):
        self.build();total,shared,verified=check_shared(self.a,self.b)
        self.assertEqual((total,set(shared),verified),(150,set(AUTHORED_SHARED),True))
    def test_speech_pass_and_legacy_outputs_without_inventory(self):
        self.build(speech=True,inventory=False);self.assertEqual(check_shared(self.a,self.b)[2],False)
    def test_tampered_shared_file(self):
        self.build();(self.b/'mix.wav').write_text('tampered')
        with self.assertRaisesRegex(AssertionError,'differs: mix.wav'):check_shared(self.a,self.b)
    def test_tampered_identically_in_both(self):
        self.build()
        for p in (self.a,self.b):(p/'kokoro-narration.wav').write_text('both tampered')
        with self.assertRaisesRegex(AssertionError,'inventory hashes'):check_shared(self.a,self.b)
    def test_missing_speech_captions(self):
        self.build(speech=True);(self.b/'captions.vtt').unlink()
        with self.assertRaisesRegex(AssertionError,'missing: captions.vtt'):check_shared(self.a,self.b)
    def test_stale_or_foreign_production(self):
        self.build();self.inv(self.b,production='older-run')
        with self.assertRaisesRegex(AssertionError,'inventories differ'):check_shared(self.a,self.b)
    def test_inventory_in_one_output_only(self):
        self.build();(self.b/'shared-inputs.json').unlink()
        with self.assertRaisesRegex(AssertionError,'only one output'):check_shared(self.a,self.b)
    def test_project_mismatch(self):
        self.build();p=project('three');p['shots'][1]['durationFrames']=61;(self.b/'scene.json').write_text(json.dumps(p))
        with self.assertRaisesRegex(AssertionError,'different project'):check_shared(self.a,self.b)
    def test_timeline_not_exact_budget(self):
        self.build()
        for p,backend in ((self.a,'cpu'),(self.b,'three')):
            x=project(backend);x['shots'][0]['durationFrames']=91;(p/'scene.json').write_text(json.dumps(x))
        with self.assertRaisesRegex(AssertionError,'exact budget'):check_shared(self.a,self.b)
    def test_frame_allocation_mismatch(self):
        self.build()
        for p in (self.a,self.b):self.inv(p,frameAllocation=[{'id':'a','startFrame':0,'endFrame':80},{'id':'b','startFrame':80,'endFrame':150}])
        with self.assertRaisesRegex(AssertionError,'frame allocation'):check_shared(self.a,self.b)

if __name__=='__main__':unittest.main()
