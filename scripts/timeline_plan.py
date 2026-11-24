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


def allocate_global(phrase_lengths, authored_frames):
    """Measured global budget, deterministic largest-remainder allocation; no truncation."""
    if len(phrase_lengths)!=len(authored_frames) or not authored_frames or any(type(x) is not int or not 60<=x<=MAX_SHOT for x in authored_frames):
        raise ValueError('invalid fixed director budget')
    target=sum(authored_frames)
    if target>MAX_FRAMES: raise ValueError('director budget exceeds film maximum')
    minimum=[max(60,math.ceil(required_samples(lengths)/SPF)) for lengths in phrase_lengths]
    if any(x>MAX_SHOT for x in minimum) or sum(minimum)>target:
        raise ValueError('measured narration exceeds global budget')
    frames=minimum[:]
    # Redistribute excess to shots according to original budgets, saturating at MAX_SHOT.
    remaining=target-sum(frames)
    while remaining:
        eligible=[i for i,x in enumerate(frames) if x<MAX_SHOT]
        if not eligible: raise ValueError('cannot distribute director budget')
        weights=[max(1,authored_frames[i]-frames[i]) for i in eligible]
        denom=sum(weights)
        chunks=[min(MAX_SHOT-frames[i],remaining*w//denom) for i,w in zip(eligible,weights)]
        if not any(chunks):
            order=sorted(range(len(eligible)),key=lambda j:(-(remaining*weights[j]%denom),eligible[j]))
            for j in order[:remaining]: chunks[j]=1
        for i,n in zip(eligible,chunks): frames[i]+=n
        remaining-=sum(chunks)
    assert sum(frames)==target
    return frames
