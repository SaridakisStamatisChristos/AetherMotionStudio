"""Independent matched native-output check; objective diagnostics, not aesthetic ranking."""
import json,os,sys,subprocess
from pathlib import Path
import numpy as np
from formats import dims
from matched_inventory import load,sha,normalized,check_shared,SPEECH_SHARED,AUTHORED_SHARED
def frame(p,t,size=(180,320)):
    ff=os.environ.get('AETHER_FFMPEG','ffmpeg');w,h=size
    data=subprocess.run([ff,'-v','error','-ss',str(t),'-i',str(p/'film.mp4'),'-frames:v','1','-vf',f'scale={w}:{h}','-pix_fmt','rgb24','-f','rawvideo','-'],check=True,capture_output=True).stdout
    return np.frombuffer(data,dtype=np.uint8).astype(np.float32).reshape(h,w,3)
def compare(a,b,profiles=False):
    total,shared,inventory=check_shared(a,b,profiles);t=load(a,'timeline.json')
    # DUAL-06: expected size from the project's format; sampled rows keep the historical 80:210 of 320 band
    W,H=dims(load(a,'scene.json'));size=(W//6,H//6);r0,r1=round(size[1]*80/320),round(size[1]*210/320)
    outputs=[]
    # GPU-01 --profiles: a = GPU Standard, b = Cinematic, both Three.js; labels are the reported profiles.
    sides=((a,'three','gpu-standard'),(b,'three',load(b,'scene.json').get('renderProfile'))) if profiles else ((a,'cpu',None),(b,'three',None))
    for p,backend,profile in sides:
        probe=load(p,'probe.json');v=next(x for x in probe['streams'] if x['codec_type']=='video');audio=next(x for x in probe['streams'] if x['codec_type']=='audio')
        assert (v['width'],v['height'],int(v['nb_frames']),v['codec_name'],audio['codec_name'],v['r_frame_rate'])==(W,H,total,'h264','aac','30/1')
        assert abs(float(probe['format']['duration'])-total/30)<.08
        timing=load(p,'render-timing.json');q=load(p,'quality-report.json');assert timing['backend']==backend and q['errors']==0
        if profiles:assert timing.get('profile')==profile,'reported profile differs: '+str(timing.get('profile'))
        outputs.append({'backend':backend,**({'profile':profile} if profiles else {}),'renderSeconds':timing['renderSeconds'],'framesPerSecond':total/timing['renderSeconds'],'gl':timing['gl'],'filmBytes':(p/'film.mp4').stat().st_size,'filmSha256':sha(p/'film.mp4'),'qualityStatus':q['status'],'warnings':q['warnings']})
    assert outputs[0]['filmSha256']!=outputs[1]['filmSha256'],'unexpected identical encoded film'
    samples=[]
    for s in t['shots']:
        for fraction in (.25,.5,.75):
            second=(s['startFrame']+fraction*(s['endFrame']-s['startFrame']))/30
            x,y=frame(a,second,size)[r0:r1],frame(b,second,size)[r0:r1]
            samples.append({'shot':s['id'],'second':second,'meanAbsRgbDifference':float(np.abs(x-y).mean()),'cpuStd':float(x.std()),'threeStd':float(y.std())})
    assert all(min(s['cpuStd'],s['threeStd'])>4 for s in samples),'flat sampled geometry'
    assert any(s['meanAbsRgbDifference']>1 for s in samples),'no meaningful sampled backend difference'
    if profiles:
        return {'version':1,'status':'pass','mode':'profiles','sameNormalizedProject':True,'sameTimeline':True,'sharedInventoryVerified':inventory,'sharedFileHashes':shared,'frames':total,'seconds':total/30,'outputs':outputs,'samples':samples,'cinematicToStandardRenderTimeRatio':outputs[1]['renderSeconds']/outputs[0]['renderSeconds'],'method':'sequential native renders on one machine, identical prepared assets/audio, same settings; GPU Standard vs Cinematic','limitations':'objective parity and difference only; artistic quality is the owner\'s review'}
    return {'version':1,'status':'pass','sameNormalizedProject':True,'sameTimeline':True,'sharedInventoryVerified':inventory,'sharedFileHashes':shared,'frames':total,'seconds':total/30,'outputs':outputs,'samples':samples,'threeToCpuRenderTimeRatio':outputs[1]['renderSeconds']/outputs[0]['renderSeconds'],'method':'sequential native renders on one runner, identical prepared assets/audio, same concurrency; CI software GL if swangle; not a dedicated hardware benchmark; no aesthetic superiority inferred'}
def main(argv,run=None):
    profiles='--profiles' in argv;argv=[x for x in argv if x!='--profiles']
    a,b,out=map(Path,argv);result=(run or compare)(a,b,profiles) if profiles else (run or compare)(a,b);out.write_text(json.dumps(result,indent=2))
    print('PASS: matched native GPU Standard / Cinematic comparison,' if profiles else 'PASS: matched native CPU / Three.js comparison,',result['frames'],'frames each, shared hashes exact')
    return result
if __name__=='__main__':main(sys.argv[1:])
