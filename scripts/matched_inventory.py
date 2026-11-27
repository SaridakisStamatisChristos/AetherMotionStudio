"""Stdlib-only matched-output parity: project, timeline, exact budget, shared files and inventory (LOCAL-02)."""
import hashlib,json
def load(p,n):return json.loads((p/n).read_text(encoding='utf-8'))
def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def normalized(p,backend,profiles=False):
    s=load(p,'scene.json');s.pop('id')
    # GPU-01 Standard vs Cinematic: the pair is the same film apart from its profile fields.
    if profiles:
        s.pop('renderProfile',None);s.pop('cinematic',None)
    for x in s['shots']:
        assert x.pop('backend')==backend
    return s
SPEECH_SHARED=('timeline.json','kokoro-narration.wav','mix.wav','voice-report.json','speech-report.json','captions.srt','captions.vtt')
# LOCAL-02 authored non-speech projects: captions are timeline text segments; mix.wav is the archived lossless soundtrack.
AUTHORED_SHARED=('timeline.json','kokoro-narration.wav','mix.wav','voice-report.json')
def expected_frames(project):
    if project.get('speech'):return project['speech']['targetFrames']
    d=[s['durationFrames'] for s in project['shots']]
    assert all(type(x) is int for x in d),'authored matched project needs fixed shot durations'
    return sum(d)
def check_shared(a,b,profiles=False):
    """Project/timeline/shared-file/inventory parity without decoding media. Returns (total, shared hashes, inventory verified).
    profiles=True (GPU-01): a is GPU Standard and b the Cinematic film, both on three."""
    if profiles:
        assert 'renderProfile' not in load(a,'scene.json') and 'renderProfile' in load(b,'scene.json'),'profile pair must be GPU Standard then Cinematic'
        project=normalized(a,'three',True);assert project==normalized(b,'three',True),'different project'
    else:
        project=normalized(a,'cpu');assert project==normalized(b,'three'),'different project'
    t=load(a,'timeline.json');assert t==load(b,'timeline.json'),'different timeline'
    total=t['durationFrames'];fit=(project.get('speech') or {}).get('fit')=='speech-v1'
    # Fix A: with speech.fit 'speech-v1' the measured length may be shorter than the budget (never longer).
    assert (180<=total<=expected_frames(project)) if fit else total==expected_frames(project),'timeline frames differ from exact budget'
    shared={}
    for name in (SPEECH_SHARED if project.get('speech') else AUTHORED_SHARED):
        assert (a/name).is_file() and (b/name).is_file(),'shared artifact missing: '+name
        x,y=sha(a/name),sha(b/name);assert x==y,'shared artifact differs: '+name;shared[name]=x
    has=[(p/'shared-inputs.json').is_file() for p in (a,b)]
    assert has[0]==has[1],'shared-input inventory present in only one output'
    if has[0]:
        inv=load(a,'shared-inputs.json');assert inv==load(b,'shared-inputs.json'),'shared-input inventories differ (different or stale production)'
        assert inv['sharedHashes']==shared,'inventory hashes do not match shared files'
        assert inv['targetFrames']==total,'inventory frame budget differs'
        assert inv['frameAllocation']==[{'id':s['id'],'startFrame':s['startFrame'],'endFrame':s['endFrame']} for s in t['shots']],'inventory frame allocation differs'
    return total,shared,has[0]
