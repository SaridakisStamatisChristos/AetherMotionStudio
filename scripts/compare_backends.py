"""Matched output comparison, not a visual-quality score."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import imageio_ffmpeg
root=Path(sys.argv[1])
a=root/'aethermotion-cinematic-cpu';b=root/'aethermotion-cinematic-three'
sa=json.loads((a/'scene.json').read_text(encoding='utf-8'));sb=json.loads((b/'scene.json').read_text(encoding='utf-8'))
sa['id']=sb['id'];sa['shots'][0]['backend']=sb['shots'][0]['backend'];assert sa==sb
ta=json.loads((a/'render-timing.json').read_text(encoding='utf-8'));tb=json.loads((b/'render-timing.json').read_text(encoding='utf-8'))
assert ta['backend']=='cpu' and tb['backend']=='three'
assert ta['renderSeconds']>0 and tb['renderSeconds']>0
def frame(p,t):
 r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-ss',str(t),'-i',str(p/'film.mp4'),'-frames:v','1','-vf','scale=180:320','-pix_fmt','rgb24','-f','rawvideo','-'],check=True,capture_output=True)
 return np.frombuffer(r.stdout,dtype=np.uint8).astype(float).reshape(320,180,3)
rows=[]
for t in [2,6,10]:
 x,y=frame(a,t),frame(b,t)
 # Focus on geometry, not shared typography or subtitles.
 x,y=x[85:250],y[85:250]
 assert x.std()>6 and y.std()>6,'flat/blank render'
 rows.append({'seconds':t,'meanAbsolutePixelDifference':float(np.abs(x-y).mean()),'cpuStd':float(x.std()),'threeStd':float(y.std())})
assert all(r['meanAbsolutePixelDifference']>1 for r in rows),'backend output indistinguishable'
out={'cpu':ta,'three':tb,'samples':rows,'interpretation':'Pixel difference confirms distinct outputs, not better visual quality.'}
(root/'comparison.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
