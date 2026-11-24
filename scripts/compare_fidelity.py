"""Matched v0.4 vs v0.4.1 evidence; no automatic aesthetic score."""
import json, subprocess,sys
from pathlib import Path
import numpy as np
import imageio_ffmpeg
root=Path(sys.argv[1])
def load(p,name):return json.loads((p/name).read_text())
def frame(p,t):
 r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-ss',str(t),'-i',str(p/'film.mp4'),'-frames:v','1','-vf','scale=180:320','-pix_fmt','rgb24','-f','rawvideo','-'],check=True,capture_output=True)
 return np.frombuffer(r.stdout,dtype=np.uint8).astype(float).reshape(320,180,3)
out={}
for backend in ('cpu','three'):
 a=root/f'aethermotion-cinematic-{backend}';b=root/f'aethermotion-cinematic-{backend}-polished'
 sa,sb=load(a,'scene.json'),load(b,'scene.json');sb['id']=sa['id'];del sb['shots'][0]['fidelity'];assert sa==sb
 ta,tb=load(a,'render-timing.json'),load(b,'render-timing.json');assert ta['backend']==tb['backend']==backend
 pa,pb=load(a,'probe.json'),load(b,'probe.json')
 for probe in (pa,pb):
  v=next(s for s in probe['streams'] if s['codec_type']=='video')
  assert (v['width'],v['height'],int(v['nb_frames']))==(1080,1920,360)
 samples=[]
 for t in (2,6,10):
  x,y=frame(a,t),frame(b,t);x,y=x[85:250],y[85:250]
  d=float(np.abs(x-y).mean());assert d>.8 and y.std()>6
  samples.append({'second':t,'meanAbsolutePixelDifference':d,'baselineStd':float(x.std()),'polishedStd':float(y.std()),'polishedClippedFraction':float(((y<1)|(y>254)).mean())})
 out[backend]={'baselineSeconds':ta['renderSeconds'],'polishedSeconds':tb['renderSeconds'],'costRatio':tb['renderSeconds']/ta['renderSeconds'],'samples':samples}
out['interpretation']='Same-scene structural comparison. Pixel difference and time are not aesthetic quality or statistically controlled performance claims.'
(root/'fidelity-comparison.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
