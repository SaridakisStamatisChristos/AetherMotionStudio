"""Small independent diagnostic primitives (stdlib only)."""
def consecutive_runs(flags,min_count):
    if min_count<1:raise ValueError('minimum run must be positive')
    out=[];start=None;last=None
    for frame,flag in flags:
        if last is not None and frame<=last:raise ValueError('frames must be ordered')
        if flag:
            if start is None:start=frame;count=0
            count+=1
        elif start is not None:
            if count>=min_count:out.append({'startFrame':start,'endFrame':last,'samples':count})
            start=None
        last=frame
    if start is not None and count>=min_count:out.append({'startFrame':start,'endFrame':last,'samples':count})
    return out
def interior(frame,shot,next_transition=0):
    # Exclude intentional fades/wipes and a small sampling guard on either edge.
    return frame>=shot['startFrame']+shot['transitionFrames']+5 and frame<shot['endFrame']-next_transition-5
def sample_ms(sample,rate=48000):return (sample*1000+rate//2)//rate
def parse_stamp(s):
    import re
    m=re.fullmatch(r'(\d{2}):([0-5]\d):([0-5]\d)[,.](\d{3})',s)
    if not m:raise ValueError('invalid subtitle timestamp')
    h,mn,sec,ms=map(int,m.groups());return ((h*60+mn)*60+sec)*1000+ms
def parse_subtitles(text,kind):
    import html,re
    blocks=re.split(r'\n\s*\n',text.replace('\r\n','\n').strip())
    if kind=='vtt':
        if not blocks or blocks.pop(0)!='WEBVTT':raise ValueError('missing WEBVTT header')
    elif kind!='srt':raise ValueError('unknown subtitle format')
    result=[];previous=0
    for i,b in enumerate(blocks,1):
        lines=b.splitlines()
        if kind=='srt':
            if not lines or lines.pop(0)!=str(i):raise ValueError('subtitle sequence mismatch')
        if len(lines)<2:raise ValueError('missing subtitle payload')
        ts=lines.pop(0).split(' --> ')
        if len(ts)!=2:raise ValueError('invalid subtitle range')
        a,z=map(parse_stamp,ts)
        if not previous<=a<z:raise ValueError('overlap or zero duration')
        result.append((a,z,[html.unescape(x) for x in lines]));previous=z
    return result
def expected_subtitles(cues,labels):
    rows=[]
    for c in cues:
        lines=c['lines'][:]
        if len(labels)>1:lines[0]=labels.get(c['speaker'],'Narrator')+': '+lines[0]
        # GEN-05b readable captions: a held cue is shown until holdSample (same times as the SRT/VTT sidecars)
        rows.append((sample_ms(c['startSample']),sample_ms(c.get('holdSample',c['endSample'])),lines))
    return rows
