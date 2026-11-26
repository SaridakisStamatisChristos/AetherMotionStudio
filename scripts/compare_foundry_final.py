"""Frozen AF09 qualification. No subjective auto-approval."""
import hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
import imageio_ffmpeg
root=Path(sys.argv[1]);protocol_path=Path('benchmarks/foundry-final-v1.json')
protocol=json.loads(protocol_path.read_text(encoding='utf-8'))
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def load(p,n):return json.loads((p/n).read_text(encoding='utf-8'))
def norm(s,optimized=False,asset_quality=False):
    s=json.loads(json.dumps(s));s.pop('id')
    for x in s['shots']:
        x.pop('backend')
        if optimized:
            for a in x.get('lodPolicy',{}).get('overrides',[]):a.pop('level')
        if asset_quality:
            for k in ('geometryProfile','lodPolicy','materialProfile'):x.pop(k,None)
    return s
def frame(p,n):
    r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-ss',str(n/30),'-i',str(p/'film.mp4'),'-frames:v','1','-vf','scale=180:320','-pix_fmt','rgb24','-f','rawvideo','-'],check=True,capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.uint8).reshape(320,180,3)
def sheet(path,rows):
    img=np.concatenate([np.concatenate(r,axis=1) for r in rows],axis=0)
    h,w=img.shape[:2]
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-i','-','-frames:v','1',str(path)],input=img.tobytes(),check=True)
report={'version':1,'protocolDigest':sha(protocol_path),'pairs':{},'failures':[],'humanApproval':False,'scope':'single noisy CI run; software WebGL; pixel difference is diagnostic only'}
commits=set();scenes={}
for row in protocol['pairs']:
    key=row['key']
    try:
        lanes=[root/('aethermotion-'+row[b]) for b in ('cpu','three')]
        qs=[];ss=[];ts=[]
        for backend,p in zip(('cpu','three'),lanes):
            q=load(p,'qualification.json');s=load(p,'scene.json');t=load(p,'timeline.json')
            assert q['id']==row[backend] and q['kind']==row['kind'] and q['protocolDigest']==report['protocolDigest'] and q['nativeVerified']
            assert q['sourceCommit'] and q['media']['frames']==row['frames'] and q['media']['fps']=='30/1'
            assert [q['media']['width'],q['media']['height']]==protocol['dimensions']
            assert all(x['backend']==backend for x in s['shots']);assert load(p,'render-timing.json')['backend']==backend
            for name in protocol['requiredArtifacts']:assert (p/name).is_file(),name
            for name,meta in q['inventory'].items():assert sha(p/name)==meta['sha256'] and (p/name).stat().st_size==meta['bytes'],name
            commits.add(q['sourceCommit']);qs.append(q);ss.append(s);ts.append(t)
        assert norm(ss[0],row['kind']=='backend-optimized')==norm(ss[1],row['kind']=='backend-optimized'),'scene drift'
        assert ts[0]==ts[1], 'timeline mismatch'
        assert qs[0]['inventory']['kokoro-narration.wav']['sha256']==qs[1]['inventory']['kokoro-narration.wav']['sha256'],'audio mismatch'
        if row['kind']=='backend-optimized':assert [x['lodPolicy'] for x in ss[0]['shots']]!=[x['lodPolicy'] for x in ss[1]['shots']]
        else:assert qs[0]['geometryTraversal']['samples']==qs[1]['geometryTraversal']['samples'],'matched geometry resource drift'
        samples=[];images=[]
        for shot in ts[0]['shots']:
            for fraction in protocol['sampling']:
                n=min(shot['endFrame']-1,shot['startFrame']+round(fraction*(shot['endFrame']-shot['startFrame'])))
                x,y=[frame(p,n) for p in lanes]
                samples.append({'shot':shot['id'],'frame':n,'meanAbsoluteRGBDifference':float(np.abs(x.astype(float)-y.astype(float)).mean()),'cpuMean':float(x.mean()),'threeMean':float(y.mean()),'darkCpu':bool(x.mean()<8),'darkThree':bool(y.mean()<8)})
                if fraction in (0,.5,1):images.append([x,y])
        sheet(root/(key+'-review.jpg'),images)
        report['pairs'][key]={'kind':row['kind'],'lanes':qs,'samples':samples,'reviewSheet':key+'-review.jpg','reviewOrder':'CPU left, native Three right; shot start/mid/end','humanRubric':{k:None for k in protocol['humanRubric']}}
        scenes[key]=ss
    except Exception as exc:
        report['failures'].append({'pair':key,'reason':str(exc) or type(exc).__name__})
if len(commits)!=1:report['failures'].append({'pair':'all','reason':'missing or mixed source commits'})
for baseline,premium in protocol['assetQualityComparisons']:
    if baseline in scenes and premium in scenes and norm(scenes[baseline][0],asset_quality=True)!=norm(scenes[premium][0],asset_quality=True):report['failures'].append({'pair':premium,'reason':'legacy semantic workload drift'})
report['sourceCommits']=sorted(commits);report['assetQualityComparisons']=protocol['assetQualityComparisons'];report['status']='failed' if report['failures'] else 'structural-pass-human-review-pending'
(root/'foundry-final-report.json').write_text(json.dumps(report,indent=2))
if report['failures']:raise SystemExit('AF09 qualification failures: '+json.dumps(report['failures']))
print('AF09 all frozen pairs verified; human review and release authorization pending')
