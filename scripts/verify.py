import json, os, subprocess, sys, wave
from pathlib import Path
import numpy as np
from formats import dims
out=Path(sys.argv[1]); film=out/'film.mp4'
ffmpeg=os.environ.get('AETHER_FFMPEG','ffmpeg')
ffprobe=os.environ.get('AETHER_FFPROBE','ffprobe')
def run(args): return subprocess.run(args,check=True,capture_output=True,text=True)
scene=json.loads((out/'scene.json').read_text(encoding='utf-8'))
timeline=json.loads((out/'timeline.json').read_text(encoding='utf-8')) if scene['version']==2 else None
frames=timeline['durationFrames'] if timeline else 360
seconds=frames/30
d=json.loads(run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(film)]).stdout)
v=[s for s in d['streams'] if s['codec_type']=='video']; a=[s for s in d['streams'] if s['codec_type']=='audio']
assert len(v)==len(a)==1
assert (v[0]['width'],v[0]['height'])==dims(scene)
assert v[0]['codec_name']=='h264' and a[0]['codec_name']=='aac'
assert v[0]['r_frame_rate']=='30/1' and int(v[0]['nb_frames'])==frames
assert abs(float(d['format']['duration'])-seconds)<.08
run([ffmpeg,'-v','error','-xerror','-i',str(film),'-f','null','-'])
report=json.loads((out/'voice-report.json').read_text(encoding='utf-8'))
assert report['backend']=='kokoro-onnx' and report['voice']==scene['voice']
expected=[p for s in scene['shots'] for p in s['narration']] if timeline else [p['text'] for p in scene['narration']]
assert len(report['segments'])==len(expected)
with wave.open(str(out/'kokoro-narration.wav'),'rb') as f:
 assert f.getframerate()==48000 and f.getnframes()==frames*1600 and f.getsampwidth()==2
 samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
if timeline:
 assert timeline['fps']==30 and timeline['sampleRate']==48000
 prev=0
 flat=[]
 for authored,shot in zip(scene['shots'],timeline['shots']):
  assert shot['id']==authored['id'] and shot['startFrame']==prev
  assert shot['endFrame']>prev
  assert authored['durationFrames'] is None or shot['endFrame']-prev==authored['durationFrames']
  assert len(shot['segments'])==len(authored['narration'])
  last=prev*1600
  for text,actual in zip(authored['narration'],shot['segments']):
   a,b=actual['startSample'],actual['endSample']
   assert text==actual['text'] and last<=a<b<=shot['endFrame']*1600
   sp=scene.get('speech') or {}
   from speech_plan import PACE_MIN
   assert (PACE_MIN if sp.get('captions',{}).get('readable') else sp.get('pace',1))<=actual['speed']<=1.25
   assert np.sqrt(np.mean(samples[a:b]**2))>.005
   last=b;flat.append(actual)
  prev=shot['endFrame']
 assert len(timeline['shots'])==len(scene['shots']) and prev==frames and flat==report['segments']
else:
 for requested,actual in zip(scene['narration'],report['segments']):
  assert actual['text']==requested['text'] and actual['start']==requested['start']
  assert actual['end']<=requested['end']+1/48000 and actual['end']>actual['start']
  segment=samples[round(actual['start']*48000):round(actual['end']*48000)]
  assert np.sqrt(np.mean(segment**2))>.005
if scene.get('speech') is not None:
 from speech_plan import subtitles,caption_metrics
 cfg=scene['speech'];sr=json.loads((out/'speech-report.json').read_text(encoding='utf-8'));assert timeline['durationFrames']==sr['actualFrames'] and (180<=sr['actualFrames']<=cfg['targetFrames'] if cfg.get('fit')=='speech-v1' else sr['actualFrames']==cfg['targetFrames']);assert sr['alignment']['phraseBoundaryErrorSamples']==0 and sr['alignment']['coverage']==1
 assert caption_metrics(timeline['captions'],report['segments'],cfg['captions']['maxCps'])==sr['alignment']
 from speech_plan import caption_labels
 srt,vtt=subtitles(timeline['captions'],caption_labels(cfg,report['segments']));assert (out/'captions.srt').read_text(encoding='utf-8')==srt and (out/'captions.vtt').read_text(encoding='utf-8')==vtt
 for x in sr['allocation']:
  if x['mode']=='fixed':assert x['frames']==cfg['fixedShots'][x['shot']]
 with wave.open(str(out/'mix.wav'),'rb') as f:
  assert f.getframerate()==48000 and f.getnframes()==frames*1600 and f.getsampwidth()==2
  pcm=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
 assert np.max(np.abs(pcm))<=cfg['mix']['peak']+1/32768 and sr['mix']['final']['clippedSamples']==0
 if cfg.get('soundtrack')=='silent':
  # DUAL-06: a requested silent soundtrack must be exactly silent and reported as such
  assert sr.get('soundtrack')=='silent' and not np.any(pcm),'requested silent soundtrack is not silent'
  print('PASS: exact speech allocation, caption sidecars, measured phrase coverage, sample peak limit and requested silent soundtrack (digital silence)')
 else:
  for a in report['segments']:assert np.sqrt(np.mean(pcm[a['startSample']:a['endSample']]**2))>.005
  print('PASS: exact speech allocation, caption sidecars, measured phrase coverage, sample peak limit and mixed audio activity')
review=[(s['startFrame']+s['endFrame'])/60 for s in timeline['shots']] if timeline else [1,6,10]
if timeline and any('cameraRig' in shot for shot in scene['shots']):
 review=sorted(set(review+[n/30 for s in timeline['shots'] for n in (s['startFrame'],s['endFrame']-1)]))
for second in review:
 run([ffmpeg,'-v','error','-y','-ss',str(second),'-i',str(film),'-frames:v','1',str(out/f'frame-{second}.jpg')])
(out/'probe.json').write_text(json.dumps(d,indent=2))
print(f'PASS: native {frames}-frame Remotion MP4, {seconds:g}s, full decode, Kokoro per-phrase audio, {len(review)} review stills')
