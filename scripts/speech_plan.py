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

def caption_cues(segments,cfg):
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
        for g in groups:
            cues.append({'phrase':i,'speaker':s['speaker'],'startSample':g[0]['startSample'],'endSample':g[-1]['endSample'],'lines':wrap([x['text'] for x in g],cfg['maxChars']),'words':g})
    return cues

def millis(sample):return (sample*1000+RATE//2)//RATE
def stamp(ms,separator):
    h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02d}:{m:02d}:{s:02d}{separator}{ms:03d}'
def subtitles(cues,speakers):
    srt=[];vtt=['WEBVTT',''];last=0
    for i,c in enumerate(cues,1):
        a,b=millis(c['startSample']),millis(c['endSample'])
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
    rates=[len(' '.join(c['lines']))*RATE/(c['endSample']-c['startSample']) for c in cues]
    duration=sum(s['endSample']-s['startSample'] for s in segments)
    return {'alignment':'estimated-word/measured-phrase','independentWordAlignmentError':None,'phraseBoundaryErrorSamples':max(errors,default=0),'coverage':covered/duration,'cueCount':len(cues),'maxCps':max(rates,default=0),'readingSpeedOutliers':sum(x>max_cps for x in rates),'shortCues':sum(c['endSample']-c['startSample']<.7*RATE for c in cues)}
