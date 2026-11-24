"""Pure integer-sample timeline planning. No ML or media dependencies."""
import math
FPS=30
RATE=48000
SPF=RATE//FPS
MAX_FRAMES=9000
MAX_SHOT=3600
PAD=RATE*45//100
GAP=RATE*28//100

def required_samples(lengths):
    if not lengths or any(type(n) is not int or n<=0 for n in lengths):
        raise ValueError('positive integer sample counts required')
    return sum(lengths)+2*PAD+GAP*(len(lengths)-1)

def allocate(lengths, frames):
    need=required_samples(lengths)
    if frames is None:
        frames=max(60,math.ceil(need/SPF))
    if type(frames) is not int or not 60<=frames<=MAX_SHOT:
        raise ValueError('shot frame count out of range')
    extra=frames*SPF-need
    if extra<0:
        raise ValueError('speech exceeds shot budget')
    # Spread unused time over pauses rather than truncate or stretch audio.
    q,r=divmod(extra,len(lengths)+1)
    gaps=[q+(i<r) for i in range(len(lengths)+1)]
    start=PAD+gaps[0]
    slots=[]
    for i,n in enumerate(lengths):
        slots.append((start,start+n))
        start+=n+GAP+gaps[i+1]
    assert slots[-1][1]+PAD+gaps[-1]==frames*SPF
    return frames,slots
