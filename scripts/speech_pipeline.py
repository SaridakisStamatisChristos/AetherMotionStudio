"""Opt-in speech-first production; existing legacy synthesis remains unchanged."""
import json, math, os, re
from pathlib import Path
from importlib.metadata import version
from math import gcd
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt
from timeline_plan import RATE,SPF
from speech_plan import allocate_mixed, slots, pronunciation, caption_cues, subtitles, caption_metrics, speed_ladder, phrase_speed
import audio_master
import speech_envelope
import visemes
from phrase_cache import PhraseCache,key_for,file_hash
R=RATE

def compile_speech(scene,out,root,model_dir,kokoro):
    c=scene['speech'];out=Path(out);target=c['targetFrames'];shots=scene['shots']
    # POLISH-03 opt-ins: speech.placement ('center' default | 'lead') and speech.mix.master ('mix-v2'): every phrase of
    # every speaker levelled to one RMS, loudness mastered, then the configured mix.peak still enforced.
    placement=c.get('placement','center');mastered=c['mix'].get('master')==audio_master.PROFILE
    fingerprint={'model':file_hash(model_dir/'kokoro-v1.0.int8.onnx'),'voices':file_hash(model_dir/'voices-v1.0.bin'),'kokoro':version('kokoro-onnx'),'numpy':np.__version__,'processing':'speech-pcm-f32-v1'}
    cache=PhraseCache(Path(os.environ.get('AETHER_SPEECH_CACHE',root/'out'/'speech-cache')))
    cache.prune()
    hp=butter(2,90,btype='highpass',fs=R,output='sos')
    def who(shot,i):
        ids=c['shotSpeakers'].get(shot['id'])
        if ids:
            sid=ids[i];return sid,c['speakers'][sid]
        v=scene['voice'];return 'default',{'name':'Narrator','voice':v,'language':'en-gb' if v.startswith('b') else 'en-us'}
    def synth(text,speed,speaker):
        spoken=pronunciation(text,c['pronunciations'])
        key=key_for({'text':' '.join(text.split()),'spoken':spoken,'speed':speed,'voice':speaker['voice'],'language':speaker['language'],'fingerprint':fingerprint,**({'level':audio_master.PROFILE} if mastered else {})})
        raw=cache.get(key)
        if raw:
            v=np.frombuffer(raw,dtype='<f4')
            if len(v) and np.isfinite(v).all() and np.max(np.abs(v))<=(audio_master.PHRASE_LIMIT if mastered else .67) and np.sqrt(np.mean(v*v))>.001:return v
        v,sr=kokoro.create(spoken,voice=speaker['voice'],speed=speed,lang=speaker['language'])
        v=np.asarray(v,dtype=float).reshape(-1)
        if not len(v) or not np.isfinite(v).all():raise RuntimeError('invalid neural speech')
        nz=np.flatnonzero(np.abs(v)>.002)
        if not len(nz):raise RuntimeError('silent neural speech')
        v=v[max(0,nz[0]-int(.025*sr)):min(len(v),nz[-1]+int(.08*sr)+1)]
        g=gcd(sr,R);v=resample_poly(v,R//g,sr//g);v=sosfilt(hp,v)
        rms=float(np.sqrt(np.mean(v*v)))
        if rms<=.001:raise RuntimeError('inaudible neural speech')
        if mastered:v=audio_master.level_phrase(v)
        else:v*=min(.17/rms,.66/(np.max(np.abs(v))+1e-8))
        ramp=min(int(.012*R),len(v)//2)
        if ramp:v[:ramp]*=np.linspace(0,1,ramp);v[-ramp:]*=np.linspace(1,0,ramp)
        v=v.astype('<f4');cache.put(key,v.tobytes());return v
    texts=[s['narration'] for s in shots]
    budgets=[c['fixedShots'].get(s['id']) for s in shots]
    # GEN-05 opt-in speech.pace (<1): start slower. If the budget cannot fit it, the usual ladder continues from 1.0
    # and the report says the pace was not kept (never silent).
    pace=float(c.get('pace',1.))
    for speed in speed_ladder(pace):
        waves=[[synth(t,speed,who(s,i)[1]) for i,t in enumerate(s['narration'])] for s in shots]
        lengths=[[len(v) for v in a] for a in waves]
        try:frames=allocate_mixed(lengths,texts,budgets,target);break
        except ValueError as e:
            if speed==1.25:raise RuntimeError('Measured speech cannot fit fixed/global budget; revise script or duration. No truncation.') from e
    speeds=[[speed]*len(s['narration']) for s in shots];readable=None
    # GEN-05b readable captions: a phrase spoken faster than captions.maxCps is spoken again a little slower (never
    # below PACE_MIN), if the budget still fits; otherwise every phrase keeps the film speed and the report says so.
    if c['captions'].get('readable'):
        slow=[[phrase_speed(t,len(w),speed,c['captions']['maxCps'],R) for t,w in zip(s['narration'],a)] for s,a in zip(shots,waves)]
        changed=[{'shot':s['id'],'phrase':i,'speed':v} for s,a in zip(shots,slow) for i,v in enumerate(a) if v<speed]
        readable={'slowed':changed,'kept':True}
        if changed:
            new=[[synth(t,v,who(s,i)[1]) if v<speed else w for i,(t,v,w) in enumerate(zip(s['narration'],a,ws))] for s,a,ws in zip(shots,slow,waves)]
            try:frames=allocate_mixed([[len(v) for v in a] for a in new],texts,budgets,target);waves,speeds=new,slow;lengths=[[len(v) for v in a] for a in waves]
            except ValueError:readable['kept']=False;print('Readable captions: slower phrases do not fit the budget; kept at speed',speed,flush=True)
    timeline={'version':1,'fps':30,'sampleRate':R,'durationFrames':target,'shots':[],'alignment':'estimated-word/measured-phrase'}
    N=target*SPF;speech=np.zeros(N,dtype=np.float32);offset=0;segments=[];speech_metrics=[]
    for s,n,ls,ws,vs in zip(shots,frames,lengths,waves,speeds):
        entry={'id':s['id'],'startFrame':offset,'endFrame':offset+n,'transitionFrames':s['transitionFrames'],'segments':[]}
        for i,((a,b),w,text) in enumerate(zip(slots(ls,s['narration'],n,placement),ws,s['narration'])):
            a+=offset*SPF;b+=offset*SPF;sid,sp=who(s,i)
            seg={'text':text,'startSample':a,'endSample':b,'speed':vs[i],'speaker':sid,'voice':sp['voice'],'language':sp['language']}
            entry['segments'].append(seg);segments.append(seg);speech[a:b]=w
            block=R//50;low=longest=0
            for start in range(0,len(w),block):
                if np.sqrt(np.mean(w[start:start+block]**2))<.005:low+=min(block,len(w)-start);longest=max(longest,low)
                else:low=0
            speech_metrics.append({'phrase':len(segments)-1,'rms':float(np.sqrt(np.mean(w*w))),'peak':float(np.max(np.abs(w))),'longestLowEnergySamples':longest})
        timeline['shots'].append(entry);offset+=n
    assert offset==target
    timeline['captions']=caption_cues(segments,c['captions'],[e['endFrame']*SPF for e in timeline['shots'] for _ in e['segments']])
    labels={k:v['name'] for k,v in c['speakers'].items()}
    if any(s['speaker']=='default' for s in segments):labels['default']='Narrator'
    srt,vtt=subtitles(timeline['captions'],labels)
    (out/'captions.srt').write_text(srt,encoding='utf-8');(out/'captions.vtt').write_text(vtt,encoding='utf-8')
    # Explicit track gains and deterministic synthesis; no downloaded music.
    cfg=c['mix'];t=np.arange(N,dtype=np.float32)/R
    music=np.zeros(N,dtype=np.float32);ambience=np.zeros(N,dtype=np.float32);sfx=np.zeros(N,dtype=np.float32);duck=np.ones(N,dtype=np.float32)
    for i,hz in enumerate([110,130.81,164.81,196,220]):
        music+=.022*np.sin(2*np.pi*hz*t+.3*np.sin(t*.42+i))*(.72+.28*np.sin(t*.56+i))
    ambience[:]=.018*np.sin(2*np.pi*55*t)*(.5+.5*np.sin(.8*t)**2)+.009*np.sin(2*np.pi*83*t)
    cue_report=[];by_id={s['id']:s for s in timeline['shots']}
    for x in c['cues']:
        s=by_id[x['shot']]
        a=s['startFrame']*SPF if x['anchor']=='shot-start' else s['segments'][x['phrase']]['startSample' if x['anchor']=='speech-start' else 'endSample']
        duration={'tick':.12,'chime':.46,'whoosh':.32}[x['type']];n=min(int(duration*R),s['endFrame']*SPF-a)
        if n<=0:raise ValueError('audio cue has no samples')
        local=np.arange(n,dtype=np.float32)/R
        envelope=np.sin(np.pi*np.arange(n,dtype=np.float32)/max(1,n-1))**2*np.exp(-3*local)
        if x['type']=='chime':v=(np.sin(2*np.pi*660*local)+.4*np.sin(2*np.pi*990*local))*envelope*.12
        elif x['type']=='whoosh':v=np.sin(2*np.pi*(130*local+1800*local*local))*envelope*.12
        else:v=np.sin(2*np.pi*880*local)*envelope*.10
        sfx[a:a+n]+=v*x['gain'];cue_report.append({**x,'startSample':a,'endSample':a+n})
    for a in segments:
        l=a['startSample'];h=a['endSample'];start=max(0,l-int(.08*R));end=min(N,h+int(.18*R))
        duck[start:l]=np.minimum(duck[start:l],np.linspace(1,cfg['duck'],l-start))
        duck[l:h]=np.minimum(duck[l:h],cfg['duck'])
        duck[h:end]=np.minimum(duck[h:end],np.linspace(cfg['duck'],1,end-h))
    mix=speech*cfg['narration']+(music*cfg['music']+ambience*cfg['ambience'])*duck+sfx*cfg['sfx']
    fade=int(cfg['fadeSeconds']*R)
    if fade:
        # Fade only outside measured narration, so no voiced sample is truncated.
        f=min(fade,segments[0]['startSample']);g=min(fade,N-segments[-1]['endSample'])
        if f:mix[:f]*=np.linspace(0,1,f)
        if g:mix[-g:]*=np.linspace(1,0,g)
    master_report=None
    if mastered:
        mix,master_report=audio_master.master(mix,R);mix=mix.astype(np.float32)
    raw_peak=float(np.max(np.abs(mix)));gain=min(1,cfg['peak']/max(raw_peak,1e-9));mix*=gain
    if master_report is not None:
        master_report['peakCapGainDb']=round(20*math.log10(gain),2);(out/'audio-master.json').write_text(json.dumps(master_report,indent=2),encoding='utf-8')
    def metrics(v):return {'peak':float(np.max(np.abs(v))),'rms':float(np.sqrt(np.mean(v*v))),'rmsDbfs':20*math.log10(max(1e-12,float(np.sqrt(np.mean(v*v))))),'clippedSamples':int(np.count_nonzero(np.abs(v)>=1))}
    def pcm(v):return np.int16(np.clip(v,-1,1)*32767)
    wavfile.write(out/'kokoro-narration.wav',R,pcm(speech))
    wavfile.write(out/'mix.wav',R,pcm(mix))
    dest=root/'public'/'audio'/(scene['id']+'.wav');dest.parent.mkdir(parents=True,exist_ok=True);wavfile.write(dest,R,pcm(mix))
    if speech_envelope.wanted(scene):timeline['speechEnvelope']=speech_envelope.envelope(speech,target)
    # GEN-10 opt-in estimated mouth shapes: phonemes from the model's own phonemizer, timing estimated per word
    if visemes.wanted(scene):timeline['visemes']=visemes.visemes(segments,[kokoro.tokenizer.phonemize(pronunciation(g['text'],c['pronunciations']),g['language']) for g in segments],target,'espeak-ng via kokoro-onnx '+version('kokoro-onnx'))
    (out/'timeline.json').write_text(json.dumps(timeline,indent=2,ensure_ascii=False),encoding='utf-8')
    (out/'voice-report.json').write_text(json.dumps({'backend':'kokoro-onnx','voice':scene['voice'],'sample_rate':R,'segments':segments},indent=2,ensure_ascii=False),encoding='utf-8')
    report={'version':1,'status':'prepared','targetFrames':target,'actualFrames':offset,'fixedShots':c['fixedShots'],'allocation':[{'shot':s['id'],'frames':n,'mode':'fixed' if b is not None else 'automatic'} for s,n,b in zip(shots,frames,budgets)],'speechSpeed':speed,**({'pace':{'requested':pace,'kept':speed==pace}} if 'pace' in c else {}),**({'readablePhrases':readable} if readable is not None else {}),'modelFingerprint':fingerprint,'cache':{'hits':cache.hits,'misses':cache.misses,'limitBytes':cache.limit},'alignment':caption_metrics(timeline['captions'],segments,c['captions']['maxCps']),'speechIntervals':speech_metrics,'mix':{'settings':cfg,'samplePeakProtectionGain':gain,'preProtectionPeak':raw_peak,'narration':metrics(speech),'music':metrics(music),'ambience':metrics(ambience),'sfx':metrics(sfx),'final':metrics(mix),'metricDefinition':'linear sample peak and RMS dBFS, not LUFS or true peak'},'cues':cue_report}
    (out/'speech-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    if 'pace' in c and speed!=pace:print('Speech pace',pace,'not kept: budget needs speed',speed,flush=True)
    print('Speech-first compiled:',offset,'frames;',offset/30,'seconds;',len(timeline['captions']),'caption cues; estimated word timing',flush=True)
