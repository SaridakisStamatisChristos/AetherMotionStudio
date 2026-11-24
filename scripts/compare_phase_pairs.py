"""Compare matched multi-shot phase outputs, not aesthetics."""
import json, sys, subprocess, hashlib
from pathlib import Path
import numpy as np
import imageio_ffmpeg
root=Path(sys.argv[1])
def load(p,n): return json.loads((p/n).read_text())
def frame(p,t):
    r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-ss',str(t),'-i',str(p/'film.mp4'),'-frames:v','1','-vf','scale=180:320','-pix_fmt','rgb24','-f','rawvideo','-'],check=True,capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.uint8).astype(float).reshape(320,180,3)
out={}
for phase in ('asset-showcase','cinematography','director','continuity','speech','quality','studio'):
    a,b=[root/f'aethermotion-{phase}-{backend}-polished' for backend in ('cpu','three')]
    sa,sb=load(a,'scene.json'),load(b,'scene.json')
    sa['id']=sb['id']
    for x,y in zip(sa['shots'],sb['shots']):
        assert x['backend']=='cpu' and y['backend']=='three'
        x['backend']='three'
    assert sa==sb
    ta,tb=load(a,'timeline.json'),load(b,'timeline.json')
    assert ta==tb
    times=[load(p,'render-timing.json') for p in (a,b)]
    assert [t['backend'] for t in times]==['cpu','three']
    for p in (a,b):
        v=next(v for v in load(p,'probe.json')['streams'] if v['codec_type']=='video')
        assert (v['width'],v['height'],int(v['nb_frames']))==(1080,1920,ta['durationFrames'])
    rows=[]
    for s in ta['shots']:
        for fraction in (.25,.5,.75):
            t=(s['startFrame']+fraction*(s['endFrame']-s['startFrame']))/30
            x,y=frame(a,t)[85:210],frame(b,t)[85:210]
            assert x.std()>4 and y.std()>4,'flat geometry area'
            rows.append({'shot':s['id'],'second':t,'difference':float(abs(x-y).mean()),'cpuStd':float(x.std()),'threeStd':float(y.std())})
    assert any(row['difference']>1 for row in rows)
    out[phase]={'timing':times,'samples':rows,'audioHashes':[hashlib.sha256((p/'kokoro-narration.wav').read_bytes()).hexdigest() for p in (a,b)]}
(root/'phase-pairs.json').write_text(json.dumps(out,indent=2))
