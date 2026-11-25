"""Synthesize v2 narration, measure it, compile frame timeline, then mix one soundtrack."""
import json, os, sys, math
from pathlib import Path
from math import gcd
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt
from kokoro_onnx import Kokoro
from timeline_plan import RATE,SPF,MAX_FRAMES,allocate,required_samples,allocate_global
import audio_master
R=RATE
root=Path(__file__).resolve().parents[1]
scene=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
model_dir=Path(os.environ.get('KOKORO_MODEL_DIR',root/'models'/'kokoro'))
kokoro=Kokoro(str(model_dir/'kokoro-v1.0.int8.onnx'),str(model_dir/'voices-v1.0.bin'))
if scene.get('speech') is not None:
    from speech_pipeline import compile_speech
    compile_speech(scene,out,root,model_dir,kokoro)
    sys.exit(0)
voice=scene['voice']
lang='en-gb' if voice.startswith('b') else 'en-us'
highpass=butter(2,90,btype='highpass',fs=R,output='sos')
mastered=audio_master.enabled(scene)

def synth(text,speed):
    v,sr=kokoro.create(text,voice=voice,speed=speed,lang=lang)
    v=np.asarray(v,dtype=float).reshape(-1)
    if not len(v) or not np.isfinite(v).all(): raise RuntimeError('invalid neural audio')
    nz=np.flatnonzero(np.abs(v)>.002)
    if not len(nz): raise RuntimeError('silent neural audio')
    v=v[max(0,nz[0]-int(.025*sr)):min(len(v),nz[-1]+int(.08*sr)+1)]
    g=gcd(sr,R);v=resample_poly(v,R//g,sr//g)
    v=sosfilt(highpass,v)
    rms=float(np.sqrt(np.mean(v*v)))
    if rms<=.001: raise RuntimeError('inaudible phrase')
    if mastered: v=audio_master.level_phrase(v)
    else: v*=min(.17/rms,.66/(np.max(np.abs(v))+1e-8))
    ramp=min(int(.012*R),len(v)//2)
    if ramp:
        v[:ramp]*=np.linspace(0,1,ramp);v[-ramp:]*=np.linspace(1,0,ramp)
    return v

compiled={'version':1,'fps':30,'sampleRate':R,'durationFrames':0,'shots':[]}
pieces=[];offset=0
measured=None
if '--director-budget' in sys.argv[3:]:
    budgets=[s['durationFrames'] for s in scene['shots']]
    speed=1.0
    for attempt in range(4):
        measured=[[synth(text,speed) for text in shot['narration']] for shot in scene['shots']]
        lengths=[[len(v) for v in waves] for waves in measured]
        try:
            allocation=allocate_global(lengths,budgets)
            break
        except ValueError as e:
            if attempt==3 or speed>=1.25: raise RuntimeError('Director narration cannot fit measured global budget; revise script or duration') from e
            speed=min(1.25,max(speed+.05,speed*sum(required_samples(x) for x in lengths)/(sum(budgets)*SPF)*1.03))
    global_speed=speed
    for shot,frames in zip(scene['shots'],allocation): shot['durationFrames']=frames
for shot_index,shot in enumerate(scene['shots']):
    speed=global_speed if measured is not None else 1.0;budget=shot['durationFrames']
    for attempt in range(4):
        waves=measured[shot_index] if measured is not None else [synth(text,speed) for text in shot['narration']]
        lengths=[len(v) for v in waves]
        try:
            frames,slots=allocate(lengths,budget)
            break
        except ValueError:
            if budget is None or speed>=1.25 or attempt==3: raise RuntimeError('Narration cannot fit shot '+shot['id'])
            speed=min(1.25,max(speed+.03,speed*required_samples(lengths)/(budget*SPF)*1.03))
    if offset+frames>MAX_FRAMES: raise RuntimeError('Film exceeds 300 seconds')
    entry={'id':shot['id'],'startFrame':offset,'endFrame':offset+frames,'transitionFrames':shot['transitionFrames'],'segments':[]}
    for text,v,(a,b) in zip(shot['narration'],waves,slots):
        a+=offset*SPF;b+=offset*SPF
        entry['segments'].append({'text':text,'startSample':a,'endSample':b,'speed':speed})
        pieces.append((a,b,v))
    compiled['shots'].append(entry);offset+=frames
    print('Compiled',shot['id'],frames,'frames at speed',speed,flush=True)
compiled['durationFrames']=offset
if measured is not None:
    scene_path=Path(sys.argv[1]);tmp=scene_path.with_suffix('.tmp')
    tmp.write_text(json.dumps(scene,indent=2,ensure_ascii=False),encoding='utf-8');tmp.replace(scene_path)
N=offset*SPF;seconds=N/R
t=np.arange(N,dtype=float)/R
music=np.zeros(N);speech=np.zeros(N);duck=np.ones(N)
# Continuous, understated harmonic bed; not a repeated 12-second soundtrack.
for i,f in enumerate([110,130.81,164.81,196,220]):
    music+=.017*np.sin(2*np.pi*f*t+.3*np.sin(t*.42+i))*(.72+.28*np.sin(t*.56+i))
def place(data,start,gain):
    i=int(start*R);n=min(len(data),N-i)
    if n>0: music[i:i+n]+=gain*data[:n]
x=np.arange(int(.18*R))/R
kick=np.sin(2*np.pi*(68*x-85*x*x))*np.exp(-24*x)
for beat in range(math.ceil(seconds/.75)):place(kick,beat*.75,.035)
for i,shot in enumerate(compiled['shots']):
    if i:
        x=np.arange(int(.45*R))/R
        place(np.sin(2*np.pi*(440+55*i)*x)*np.exp(-8*x)*np.minimum(x/.01,1),shot['startFrame']/30,.055)
for a,b,v in pieces:
    speech[a:b]=v
    l=max(0,a-int(.08*R));h=min(N,b+int(.18*R))
    duck[l:a]=np.minimum(duck[l:a],np.linspace(1,.43,a-l))
    duck[a:b]=np.minimum(duck[a:b],.43)
    duck[b:h]=np.minimum(duck[b:h],np.linspace(.43,1,h-b))
fade=np.minimum(t/.05,1)*np.minimum((seconds-t)/.25,1)
if mastered:
    mix,master_report=audio_master.master(music*audio_master.BED_GAIN*duck+speech,R);mix=mix*fade
    (out/'audio-master.json').write_text(json.dumps(master_report,indent=2),encoding='utf-8')
else: mix=np.tanh((music*duck+speech)*1.12)*fade
wavfile.write(out/'kokoro-narration.wav',R,np.int16(np.clip(speech,-1,1)*32767))
(out/'timeline.json').write_text(json.dumps(compiled,indent=2,ensure_ascii=False),encoding='utf-8')
report={'backend':'kokoro-onnx','voice':voice,'sample_rate':R,'segments':[a for s in compiled['shots'] for a in s['segments']]}
(out/'voice-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
target=root/'public'/'audio'/(scene['id']+'.wav');target.parent.mkdir(parents=True,exist_ok=True)
wavfile.write(target,R,np.int16(mix*32767))
print('Compiled film:',offset,'frames;',seconds,'seconds',flush=True)
