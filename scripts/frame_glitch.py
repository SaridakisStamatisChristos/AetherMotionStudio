"""LOCAL-03 frame-glitch scanner (diagnostic, not an aesthetic judgement).

Decodes a film at reduced resolution and flags isolated corrupted frames:
- temporal spike: frame i differs strongly from both neighbours while the neighbours agree with each other
  (scene cuts change once and are not flagged);
- reference mismatch (optional): per-frame PSNR against a known-good film of the same project below a threshold.
Encoder noise between equivalent renders measures ~50-68 dB; a visible glitch measured 16 dB.
"""
import json,os,subprocess,sys
import numpy as np
W,H=90,160
def frames(path):
    ff=os.environ.get('AETHER_FFMPEG','ffmpeg')
    raw=subprocess.run([ff,'-v','error','-i',str(path),'-map','0:v','-vf',f'scale={W}:{H}:flags=area','-pix_fmt','gray','-f','rawvideo','-'],check=True,capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.uint8).reshape(-1,H,W).astype(np.float32)
def psnr(a,b):
    mse=float(np.mean((a-b)**2));return float('inf') if mse==0 else float(10*np.log10(255**2/mse))
def spikes(f,ratio=4.0,floor=6.0):
    """Indices i where d(i-1,i) and d(i,i+1) both exceed floor and ratio x d(i-1,i+1)."""
    d=lambda x,y:float(np.mean(np.abs(x-y)))
    out=[]
    for i in range(1,len(f)-1):
        a,b,c=d(f[i-1],f[i]),d(f[i],f[i+1]),d(f[i-1],f[i+1])
        if min(a,b)>floor and min(a,b)>ratio*max(c,.5):out.append({'frame':i,'prevDiff':a,'nextDiff':b,'neighbourDiff':c})
    return out
def scan(film,reference=None,threshold=40.0):
    f=frames(film);result={'version':1,'film':str(film),'frames':len(f),'spikes':spikes(f)}
    if reference:
        r=frames(reference)
        if len(r)!=len(f):result['referenceError']='frame count differs';
        else:
            p=[psnr(a,b) for a,b in zip(f,r)];bad=[{'frame':i,'psnr':v} for i,v in enumerate(p) if v<threshold]
            finite=[v for v in p if v!=float('inf')]
            result.update({'reference':str(reference),'thresholdDb':threshold,'identicalFrames':sum(v==float('inf') for v in p),'minPsnr':min(finite) if finite else None,'belowThreshold':bad})
    result['glitchFrames']=sorted({x['frame'] for x in result['spikes']}|{x['frame'] for x in result.get('belowThreshold',[])})
    result['status']='glitch' if result['glitchFrames'] or result.get('referenceError') else 'clean'
    return result
if __name__=='__main__':
    if len(sys.argv) not in (2,3):sys.exit('usage: frame_glitch.py film.mp4 [reference.mp4]')
    r=scan(*sys.argv[1:]);print(json.dumps(r));sys.exit(1 if r['status']=='glitch' else 0)
