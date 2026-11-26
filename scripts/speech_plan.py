"""Integer sample allocation and estimated caption subdivision; no ML dependencies."""
import math, re, html
from timeline_plan import RATE, SPF, MAX_FRAMES, MAX_SHOT, PAD

def pause_after(text):
    return int(RATE*(.34 if text.rstrip().endswith(('.', '!', '?')) else .22 if text.rstrip().endswith((',', ';', ':')) else .16))

def required(lengths,texts):
    if not lengths or len(lengths)!=len(texts) or any(type(n) is not int or n<=0 for n in lengths):
        raise ValueError('invalid phrase measurements')
    return sum(lengths)+2*PAD+sum(pause_after(t) for t in texts[:-1])

def allocate_mixed(lengths,texts,budgets,target):
    if type(target) is not int or not 180<=target<=MAX_FRAMES or not lengths or len(lengths)!=len(texts) or len(lengths)!=len(budgets):
        raise ValueError('invalid global target')
    needs=[max(60,math.ceil(required(a,b)/SPF)) for a,b in zip(lengths,texts)]
    frames=[]; auto=[]
    for i,(n,f) in enumerate(zip(needs,budgets)):
        if n>MAX_SHOT: raise ValueError('shot exceeds maximum duration')
        if f is None: frames.append(n);auto.append(i)
        elif type(f) is not int or not n<=f<=MAX_SHOT: raise ValueError('fixed shot speech exceeds budget')
        else: frames.append(f)
    remaining=target-sum(frames)
    if remaining<0 or remaining>sum(MAX_SHOT-frames[i] for i in auto): raise ValueError('measured speech exceeds global target or automatic capacity')
    while remaining:
        eligible=[i for i in auto if frames[i]<MAX_SHOT]
        weights=[needs[i] for i in eligible];den=sum(weights)
        chunks=[min(MAX_SHOT-frames[i],remaining*w//den) for i,w in zip(eligible,weights)]
        if not any(chunks):
            order=sorted(range(len(eligible)),key=lambda j:(-(remaining*weights[j]%den),eligible[j]))
            for j in order[:remaining]: chunks[j]=1
        for i,n in zip(eligible,chunks): frames[i]+=n
        remaining-=sum(chunks)
    return frames

# Fix A (opt-in speech.fit 'speech-v1'; owner: "there is so much pause in the forest video"): the film is as long as
# the measured speech plus calm pauses, never longer than the requested target. Calm pauses per automatic shot: the
# usual PAD and punctuation pauses (required), up to FIT_GAP more between lines, FIT_TAIL after the last line, and
# FIT_END once at the end of the film. Fixed shots keep their authored length. Speech that needs more than the
# target follows the usual ladder (faster speech), exactly as without fit.
FIT_GAP=.18;FIT_TAIL=.5;FIT_END=1.;FIT_MODES=('speech-v1','none')
def fit_target(lengths,texts,budgets,target,mode):
    if mode not in FIT_MODES: raise ValueError('unknown speech fit')
    if mode=='none': return target
    if not lengths or len(lengths)!=len(texts) or len(lengths)!=len(budgets): raise ValueError('invalid fit input')
    total=0
    for a,b,f in zip(lengths,texts,budgets):
        if f is not None: total+=f;continue
        calm=required(a,b)+int(RATE*(FIT_GAP*(len(a)-1)+FIT_TAIL))
        total+=max(60,math.ceil(calm/SPF))
    total+=math.ceil(FIT_END*30)
    return min(target,max(180,total))

def slots(lengths,texts,frames,placement='center'):
    slack=frames*SPF-required(lengths,texts)
    if slack<0: raise ValueError('speech cannot fit')
    # Retain punctuation pauses; spread a bounded internal surplus, then place
    # remaining silence symmetrically around the speech block.
    internal=min(slack,max(0,len(lengths)-1)*int(.18*RATE))
    gaps=[]
    if len(lengths)>1:
        q,r=divmod(internal,len(lengths)-1);gaps=[q+(i<r) for i in range(len(lengths)-1)]
    # POLISH-03: placement 'lead' starts speech right after PAD and leaves the remaining silence at the end.
    if placement not in ('center','lead'): raise ValueError('unknown placement')
    edge=slack-internal;head=0 if placement=='lead' else edge//2;cursor=PAD+head;out=[]
    for i,n in enumerate(lengths):
        out.append((cursor,cursor+n));cursor+=n
        if i<len(gaps): cursor+=pause_after(texts[i])+gaps[i]
    assert out[-1][1]+PAD+(edge-head)==frames*SPF
    return out

def pronunciation(text,dictionary):
    # Simultaneous, exact case-sensitive token substitution; captions retain authored words.
    return re.sub(r"[A-Za-z0-9][A-Za-z0-9'-]*",lambda m:dictionary.get(m.group(),m.group()),' '.join(text.split()))

def estimate_words(text,a,b):
    tokens=text.split()
    if not tokens or b-a<len(tokens): raise ValueError('insufficient samples for words')
    weights=[max(1,len(re.sub(r'\W','',w)))+(2 if w.endswith(('.',',','!','?',':',';')) else 0) for w in tokens]
    total=sum(weights);remaining=b-a-len(tokens);cursor=a;prefix=0;out=[]
    for i,(word,weight) in enumerate(zip(tokens,weights)):
        prefix+=weight;end=a+i+1+remaining*prefix//total
        out.append({'text':word,'startSample':cursor,'endSample':end});cursor=end
    return out

def wrap(tokens,max_chars):
    lines=[]
    for w in tokens:
        if len(w)>max_chars: raise ValueError('caption token exceeds line limit')
        if not lines or len(lines[-1])+1+len(w)>max_chars: lines.append(w)
        else: lines[-1]+=' '+w
    return lines

# GEN-05b readable captions (opt-in captions.readable, set for every production by defaultSpeech). Owner: "the captions
# must be generalized in speed not only from the sample video". Two rules, for any script:
# 1. balanced split: a phrase needing k cues is cut into k cues of even reading speed (no orphan last word that leaves the
#    other cue too fast);
# 2. hold: a phrase's last cue stays on screen into the following pause (holdSample) until it reads at most maxCps,
#    at most HOLD_MAX later, never past the next cue (HOLD_GAP before it) or the end of its shot.
HOLD_MAX=RATE;HOLD_GAP=RATE//10
def fits(ws,cfg):return len(ws)<=10 and len(wrap([x['text'] for x in ws],cfg['maxChars']))<=cfg['maxLines']
def cue_cps(ws,end=None):return len(' '.join(x['text'] for x in ws))*RATE/((end or ws[-1]['endSample'])-ws[0]['startSample'])
def balanced(words,k,cfg):
    # contiguous split into exactly k fitting groups minimising the fastest group, then the spread of group lengths
    n=len(words);best={}
    def go(i,left):
        if (i,left) in best:return best[(i,left)]
        if left==1:
            r=((cue_cps(words[i:]),0),[n]) if fits(words[i:],cfg) else None
        else:
            r=None
            for j in range(i+1,n-left+2):
                if not fits(words[i:j],cfg):break
                rest=go(j,left-1)
                if rest is None:continue
                score=(max(cue_cps(words[i:j]),rest[0][0]),rest[0][1]+(len(' '.join(x['text'] for x in words[i:j])))**2)
                if r is None or score<r[0]:r=(score,[j]+rest[1])
        best[(i,left)]=r;return r
    r=go(0,k)
    if r is None:return None
    cuts=[0]+r[1];return [words[a:b] for a,b in zip(cuts,cuts[1:])]
def caption_cues(segments,cfg,shot_ends=None):
    cues=[]
    for i,s in enumerate(segments):
        words=estimate_words(s['text'],s['startSample'],s['endSample']);groups=[]
        current=[]
        for w in words:
            candidate=current+[w]
            if current and (len(wrap([x['text'] for x in candidate],cfg['maxChars']))>cfg['maxLines'] or len(candidate)>10):
                groups.append(current);current=[w]
            else:current=candidate
        if current:groups.append(current)
        if len(groups)>1 and groups[-1][-1]['endSample']-groups[-1][0]['startSample']<RATE*.7:
            joined=groups[-2]+groups[-1]
            if len(wrap([x['text'] for x in joined],cfg['maxChars']))<=cfg['maxLines'] and len(joined)<=12:groups[-2:]=[joined]
        if cfg.get('readable') and len(groups)>1:groups=balanced(words,len(groups),cfg) or groups
        for g in groups:
            cues.append({'phrase':i,'speaker':s['speaker'],'startSample':g[0]['startSample'],'endSample':g[-1]['endSample'],'lines':wrap([x['text'] for x in g],cfg['maxChars']),'words':g})
    if cfg.get('readable'):
        for k,c in enumerate(cues):
            if k+1<len(cues) and cues[k+1]['phrase']==c['phrase']:continue
            limit=min(c['endSample']+HOLD_MAX,cues[k+1]['startSample']-HOLD_GAP if k+1<len(cues) else c['endSample']+HOLD_MAX,shot_ends[c['phrase']] if shot_ends else c['endSample']+HOLD_MAX)
            need=c['startSample']-(-len(' '.join(c['lines']))*RATE//cfg['maxCps'])
            hold=min(limit,max(need,c['startSample']+int(.7*RATE)))
            if hold>c['endSample']:c['holdSample']=hold
    return cues
def shown_end(c):return c.get('holdSample',c['endSample'])

def millis(sample):return (sample*1000+RATE//2)//RATE
def stamp(ms,separator):
    h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02d}:{m:02d}:{s:02d}{separator}{ms:03d}'
# Speaker labels for subtitle sidecars (shared by speech_pipeline, verify and quality_media): names of the speakers,
# plus 'Narrator' for default lines; none when captions.speakerNames is false (owner's Studio checkbox).
def caption_labels(cfg,segments):
    if cfg['captions'].get('speakerNames') is False: return {}
    labels={k:v['name'] for k,v in cfg['speakers'].items()}
    if any(s['speaker']=='default' for s in segments):labels['default']='Narrator'
    return labels

def subtitles(cues,speakers):
    srt=[];vtt=['WEBVTT',''];last=0
    for i,c in enumerate(cues,1):
        a,b=millis(c['startSample']),millis(shown_end(c))
        if not last<=a<b: raise ValueError('subtitle rounding overlap or zero length')
        lines=c['lines'][:]
        if len(speakers)>1:lines[0]=speakers.get(c['speaker'],'Narrator')+': '+lines[0]
        # Escape markup in both formats; use the same canonical text and times.
        payload='\n'.join(html.escape(l,quote=False) for l in lines)
        srt.extend([str(i),stamp(a,',')+' --> '+stamp(b,','),payload,''])
        vtt.extend([stamp(a,'.')+' --> '+stamp(b,'.'),payload,''])
        last=b
    return '\n'.join(srt)+'\n','\n'.join(vtt)+'\n'
def caption_metrics(cues,segments,max_cps):
    by_phrase={i:[] for i in range(len(segments))}
    for c in cues:by_phrase[c['phrase']].append(c)
    errors=[];covered=0
    for i,s in enumerate(segments):
        cs=by_phrase[i];errors.extend([abs(cs[0]['startSample']-s['startSample']),abs(cs[-1]['endSample']-s['endSample'])])
        covered+=sum(c['endSample']-c['startSample'] for c in cs)
        if ' '.join(w['text'] for c in cs for w in c['words'])!=' '.join(s['text'].split()):raise ValueError('caption text coverage mismatch')
    # reading speed over the time a cue is shown (its hold included); the speech-only speed is reported beside it
    rates=[len(' '.join(c['lines']))*RATE/(shown_end(c)-c['startSample']) for c in cues]
    duration=sum(s['endSample']-s['startSample'] for s in segments)
    out={'alignment':'estimated-word/measured-phrase','independentWordAlignmentError':None,'phraseBoundaryErrorSamples':max(errors,default=0),'coverage':covered/duration,'cueCount':len(cues),'maxCps':max(rates,default=0),'readingSpeedOutliers':sum(x>max_cps for x in rates),'shortCues':sum(shown_end(c)-c['startSample']<.7*RATE for c in cues)}
    if any('holdSample' in c for c in cues):out['speechMaxCps']=max(len(' '.join(c['lines']))*RATE/(c['endSample']-c['startSample']) for c in cues);out['heldCues']=sum('holdSample' in c for c in cues)
    return out


SPEEDS = (1., 1.08, 1.16, 1.25)
PACE_MIN = .85


def speed_ladder(pace=1.):
    """GEN-05: Kokoro speeds tried in order. pace 1 (default) gives the historical ladder unchanged; a pace below 1
    is tried first, then the historical ladder (the speech report records whether the pace was kept)."""
    pace = float(pace)
    if not PACE_MIN <= pace <= 1:
        raise ValueError('speech pace out of range')
    return ([pace] if pace < 1 else []) + list(SPEEDS)

def phrase_speed(text, samples, speed, max_cps, rate=RATE):
    """GEN-05b: Kokoro speed for one phrase so that it is spoken at most max_cps characters per second (with 3 %
    headroom), never faster than the film speed and never below PACE_MIN. Rounded to 0.01 (stable cache keys)."""
    cps = len(' '.join(text.split())) * rate / samples
    if cps <= max_cps:
        return speed
    return max(PACE_MIN, min(speed, round(speed * max_cps / cps * .97 - .005, 2)))
