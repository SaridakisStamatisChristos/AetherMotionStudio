import json, os, subprocess, sys, wave
from pathlib import Path
import numpy as np
out=Path(sys.argv[1]); film=out/'film.mp4'
ffmpeg=os.environ.get('AETHER_FFMPEG','ffmpeg')
ffprobe=os.environ.get('AETHER_FFPROBE','ffprobe')
def run(args): return subprocess.run(args,check=True,capture_output=True,text=True)
d=json.loads(run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(film)]).stdout)
v=[s for s in d['streams'] if s['codec_type']=='video']; a=[s for s in d['streams'] if s['codec_type']=='audio']
assert len(v)==len(a)==1
assert (v[0]['width'],v[0]['height'])==(1080,1920)
assert v[0]['codec_name']=='h264' and a[0]['codec_name']=='aac'
assert v[0]['r_frame_rate']=='30/1' and int(v[0]['nb_frames'])==360
assert abs(float(d['format']['duration'])-12)<.08
run([ffmpeg,'-v','error','-xerror','-i',str(film),'-f','null','-'])
scene=json.loads((out/'scene.json').read_text())
report=json.loads((out/'voice-report.json').read_text())
assert report['backend']=='kokoro-onnx' and report['voice']==scene['voice']
assert len(report['segments'])==len(scene['narration'])
with wave.open(str(out/'kokoro-narration.wav'),'rb') as f:
 assert f.getframerate()==48000 and f.getnframes()==576000 and f.getsampwidth()==2
 samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
for requested,actual in zip(scene['narration'],report['segments']):
 assert actual['text']==requested['text'] and actual['start']==requested['start']
 assert actual['end']<=requested['end']+1/48000 and actual['end']>actual['start']
 segment=samples[round(actual['start']*48000):round(actual['end']*48000)]
 assert np.sqrt(np.mean(segment**2))>.005
for second in [1,6,10]:
 run([ffmpeg,'-v','error','-y','-ss',str(second),'-i',str(film),'-frames:v','1',str(out/f'frame-{second}.jpg')])
(out/'probe.json').write_text(json.dumps(d,indent=2))
print('PASS: native 360-frame Remotion MP4, full decode, Kokoro per-phrase audio, three review stills')
