"""Read-only decoded-media audit; no additional native renders."""
import os,sys,json,math,hashlib,subprocess,wave
from pathlib import Path
import numpy as np
from formats import analysis_size
from quality_metrics import consecutive_runs,interior,parse_subtitles,expected_subtitles
R=48000;STEP=5;W=180;H=320
def read_json(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def rms(v):return float(np.sqrt(np.mean(v*v))) if len(v) else 0.
def emit(out):
    ff=os.environ.get('AETHER_FFMPEG','ffmpeg')
    scene=read_json(out/'scene.json');pre=read_json(out/'quality-preflight.json');probe=read_json(out/'probe.json')
    timeline=read_json(out/'timeline.json') if scene['version']==2 else None
    global W,H;W,H=analysis_size(scene)
    film=out/'film.mp4';total=timeline['durationFrames'] if timeline else 360
    shots=timeline['shots'] if timeline else [{'id':scene['id'],'startFrame':0,'endFrame':360,'transitionFrames':0,'segments':[]}]
    issues=[]
    def issue(code,severity,detail,shot=None):issues.append({'code':code,'severity':severity,'shot':shot,'detail':detail})
    for x in pre['after']['issues']:issues.append(x)
    cmd=[ff,'-v','error','-i',str(film),'-an','-vf',r'select=not(mod(n\,5)),scale='+f'{W}:{H}','-vsync','0','-pix_fmt','rgb24','-f','rawvideo','-']
    rows=[{'shot':s['id'],'samples':[],'black':[],'flat':[],'frozen':[],'highlights':[],'thumb':None,'distance':float('inf')} for s in shots]
    previous=None;idx=0;count=0;frame_bytes=W*H*3
    with subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE) as p:
        while True:
            raw=p.stdout.read(frame_bytes)
            if not raw:break
            if len(raw)!=frame_bytes:raise RuntimeError('truncated decoded frame')
            frame=count*STEP;count+=1
            if frame>=total:raise RuntimeError('extra video samples')
            while idx+1<len(shots) and frame>=shots[idx]['endFrame']:idx+=1;previous=None
            s=shots[idx];row=rows[idx];v=np.frombuffer(raw,dtype=np.uint8).reshape(H,W,3)
            gray=v.astype(np.float32).mean(axis=2);roi=gray[80:210,10:170]
            eligible=interior(frame,s,shots[idx+1]['transitionFrames'] if idx+1<len(shots) else 0)
            black=float(np.mean(gray<12));contrast=float(gray.std());roi_std=float(roi.std())
            motion=None if previous is None or not eligible else float(np.abs(roi-previous).mean())
            row['samples'].append({'frame':frame,'eligible':eligible,'darkFraction':black,'contrast':contrast,'geometryContrast':roi_std,'geometryMeanAbsChange':motion,'nearWhiteFraction':float(np.mean(gray>250))})
            row['black'].append((frame,eligible and black>.995));row['flat'].append((frame,eligible and contrast<2.5))
            row['frozen'].append((frame,eligible and motion is not None and motion<.12))
            row['highlights'].append((frame,eligible and np.mean(gray>250)>.25))
            previous=roi.copy() if eligible else None
            distance=abs(frame-(s['startFrame']+s['endFrame'])/2)
            if distance<row['distance']:row['thumb']=v.copy();row['distance']=distance
        err=p.stderr.read();status=p.wait()
        if status:raise RuntimeError('video audit decode failed: '+err.decode(errors='replace')[:400])
    if count!=math.ceil(total/STEP):raise RuntimeError('decoded sample count mismatch')
    thumbnails=[]
    for row in rows:
        for field,code,severity,minimum in [('black','SUSTAINED_BLACK','error',3),('flat','SUSTAINED_FLAT','error',3),('frozen','LOW_GEOMETRY_MOTION','review',6),('highlights','LARGE_NEAR_WHITE_REGION','review',3)]:
            runs=consecutive_runs(row.pop(field),minimum);row[field+'Runs']=runs
            if runs:issue(code,severity,runs,row['shot'])
        eligible=[s for s in row['samples'] if s['eligible']]
        if not eligible:issue('NO_INTERIOR_FRAME_SAMPLE','review',None,row['shot'])
        row['eligibleSamples']=len(eligible)
        thumbnails.append(row.pop('thumb'));row.pop('distance')
    # Contact sheet, one mid-shot decoded image per shot, without rerendering.
    cols=min(4,len(thumbnails));height=math.ceil(len(thumbnails)/cols)*H
    sheet=np.full((height,cols*W,3),20,dtype=np.uint8)
    for i,v in enumerate(thumbnails):
        if v is not None:sheet[(i//cols)*H:(i//cols+1)*H,(i%cols)*W:(i%cols+1)*W]=v
    subprocess.run([ff,'-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{cols*W}x{height}','-i','-','-frames:v','1',str(out/'quality-contact-sheet.jpg')],input=sheet.tobytes(),check=True,capture_output=True)
    raw=subprocess.run([ff,'-v','error','-i',str(film),'-vn','-ac','1','-ar',str(R),'-f','s16le','-'],check=True,capture_output=True).stdout
    pcm=np.frombuffer(raw,dtype='<i2').astype(np.float32)/32768
    expected=total*1600
    if abs(len(pcm)-expected)>4096:issue('DECODED_AUDIO_LENGTH','error',{'actual':len(pcm),'expected':expected})
    silent=bool(scene.get('speech')) and scene['speech'].get('soundtrack')=='silent'
    # DUAL-06: a requested silent soundtrack must decode as silence; otherwise silence is an error
    if silent:
        decoded_peak=float(np.max(np.abs(pcm))) if len(pcm) else 0.
        if decoded_peak>.001:issue('NOT_SILENT','error',decoded_peak)
    elif rms(pcm)<.003:issue('SILENT_AUDIO','error',rms(pcm))
    if np.count_nonzero(np.abs(pcm)>=.999)>0:issue('DECODED_AUDIO_SATURATION','warning',int(np.count_nonzero(np.abs(pcm)>=.999)))
    report=read_json(out/'voice-report.json');segments=report['segments'];intervals=[]
    for i,s in enumerate(segments):
        a,b=(s['startSample'],s['endSample']) if timeline else (round(s['start']*R),round(s['end']*R))
        v=pcm[a:b];energy=rms(v);low=longest=0;block=R//50
        for start in range(0,len(v),block):
            n=min(block,len(v)-start)
            if rms(v[start:start+n])<.005:low+=n;longest=max(longest,low)
            else:low=0
        intervals.append({'phrase':i,'startSample':a,'endSample':b,'decodedRms':energy,'longestLowEnergySamples':longest})
        if energy<.005 and not silent:issue('INAUDIBLE_DECODED_PHRASE','error',i)
        if longest>R*.7 and not silent:issue('LOW_ENERGY_INSIDE_PHRASE','warning',{'phrase':i,'samples':longest})
    audio={**({'soundtrack':'silent (requested)'} if silent else {}),'decodedSamples':len(pcm),'expectedSamples':expected,'rms':rms(pcm),'peak':float(np.max(np.abs(pcm))) if len(pcm) else 0,'intervals':intervals,'method':'decoded AAC mono PCM; not LUFS, true peak or intelligibility'}
    captions=None
    if scene.get('speech'):
        from speech_plan import caption_labels
        cfg=scene['speech'];expected_cues=expected_subtitles(timeline['captions'],caption_labels(cfg,segments))
        for kind in ('srt','vtt'):
            try:
                if parse_subtitles((out/f'captions.{kind}').read_text(encoding='utf-8'),kind)!=expected_cues:raise ValueError('subtitle payload or times differ')
            except (OSError,ValueError) as e:issue('SUBTITLE_MISMATCH','error',{'format':kind,'message':str(e)})
        rates=[]
        for i,c in enumerate(timeline['captions']):
            # reading speed over the time the cue is shown (GEN-05b hold included), as speech_plan.caption_metrics
            seconds=(c.get('holdSample',c['endSample'])-c['startSample'])/R;rate=len(' '.join(c['lines']))/seconds
            rates.append(rate)
            if rate>cfg['captions']['maxCps']:issue('CAPTION_READING_SPEED','warning',{'cue':i,'charactersPerSecond':rate,'limit':cfg['captions']['maxCps']})
            if seconds<.7:issue('SHORT_CAPTION','review',{'cue':i,'seconds':seconds})
        captions={'cues':len(expected_cues),'maxCps':max(rates,default=0),'outliers':sum(x>cfg['captions']['maxCps'] for x in rates),'alignment':timeline['alignment'],'independentWordError':None,'speakerLabelsExcludedFromReadingRate':True}
    timing=read_json(out/'render-timing.json')
    errors=sum(x['severity']=='error' for x in issues);warnings=sum(x['severity']=='warning' for x in issues)
    result={'version':1,'policy':'quality-v1','status':'fail' if errors else 'pass-with-findings' if issues else 'pass','errors':errors,'warnings':warnings,'issues':issues,'video':{'frames':total,'sampleStrideFrames':STEP,'decodedSamples':count,'shots':rows,'contactSheet':'quality-contact-sheet.jpg'},'audio':audio,'captions':captions,'repair':{'candidateEvaluations':pre['candidateEvaluations'],'accepted':pre['accepted'],'extraNativeRenders':0,'partialRerenderSupported':False},'cost':{'renderSeconds':timing['renderSeconds'],'framesPerSecond':total/timing['renderSeconds'],'backend':timing['backend'],'bytes':film.stat().st_size},'evidence':{'filmSha256':sha(film),'sceneSha256':sha(out/'scene.json'),'timelineSha256':sha(out/'timeline.json') if timeline else None},'humanReview':{'status':'required','checks':['story coherence and factual accuracy','style and character expressivity','actual text legibility and safe zones','speech intelligibility and word alignment','intentional versus unwanted camera crops'],'notes':'No aesthetic score or independent word-alignment claim. Sampled image metrics are proxies.'}}
    (out/'quality-report.json').write_text(json.dumps(result,indent=2,allow_nan=False),encoding='utf-8')
    print('QUALITY:',result['status'],'errors',errors,'warnings',warnings,'accepted repairs',len(pre['accepted']),'sampled frames',count,flush=True)
    if errors:raise RuntimeError('quality audit found blocking defects; inspect quality-report.json')
if __name__=='__main__':emit(Path(sys.argv[1]))
