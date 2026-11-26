"""Validate the two recovered lanes, then correct only the derived source metadata.
Never modify the source artifacts or relax the frozen comparator.
"""
import hashlib,json,sys,subprocess,shutil
from pathlib import Path
import imageio_ffmpeg
FROZEN='202ee715012c0e857461ec56c4df733a438c1608'
ORCHESTRATION='1615e8d31195b5122cddf479b171826ac02a506f'
ORIGINAL_RUN=45423588804
RECOVERY_RUN='45433500593'
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()
def check_inventory(d,q):
    for n,m in q['inventory'].items():
        assert (d/n).stat().st_size==m['bytes'] and sha(d/n)==m['sha256'],n
def audio_hash(p):
    return subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
def reconcile(root,repaired,phase):
    id='foundry-af'+phase+'-three-polished'
    cpu=root/('aethermotion-'+id.replace('-three-','-cpu-'))
    original=root/('aethermotion-'+id)
    replacement=repaired/phase
    q=load(replacement/'qualification.json');p=load(replacement/'repair-provenance.json')
    a=load(cpu/'qualification.json');b=load(original/'qualification.json')
    assert a['sourceCommit']==b['sourceCommit']==p['sourceCommit']==FROZEN
    assert q['sourceCommit']==p['orchestrationCommit']==ORCHESTRATION
    assert p['originalRun']==ORIGINAL_RUN and p['repairRun']==RECOVERY_RUN and p['phase']==phase
    assert q['id']==b['id']==id and a['id']==id.replace('-three-','-cpu-')
    assert a['protocolDigest']==b['protocolDigest']==q['protocolDigest']==sha(Path('benchmarks/foundry-final-v1.json'))
    for d,x in [(cpu,a),(original,b),(replacement,q)]:check_inventory(d,x)
    assert p['originalCpuFilm']==a['inventory']['film.mp4']['sha256']
    assert p['originalThreeFilm']==b['inventory']['film.mp4']['sha256']
    assert p['cpuTimeline']==a['inventory']['timeline.json']['sha256']==q['inventory']['timeline.json']['sha256']
    assert p['cpuNarration']==a['inventory']['kokoro-narration.wav']['sha256']==q['inventory']['kokoro-narration.wav']['sha256']
    assert q['inventory']['scene.json']['sha256']==b['inventory']['scene.json']['sha256']
    assert p['renderSeconds']==q['renderSeconds']
    assert audio_hash(cpu/'film.mp4')==audio_hash(replacement/'film.mp4')==p['sharedAacPacketHash']
    # Keep original archived report and record why the comparison copy differs.
    shutil.copyfile(replacement/'qualification.json',root/('qualification-reported-'+phase+'.json'))
    shutil.copyfile(replacement/'repair-provenance.json',root/('repair-provenance-'+phase+'.json'))
    original.rename(repaired/('original-'+phase))
    shutil.copytree(replacement,original)
    q['sourceCommit']=FROZEN
    q['orchestrationCommit']=ORCHESTRATION
    q['provenanceCorrection']={'reportedSourceCommit':ORCHESTRATION,'verifiedRendererCheckout':FROZEN,'reason':'GITHUB_SHA is a reserved runner variable; frozen checkout was validated by recovery script using git rev-parse HEAD','originalQualificationSha256':sha(replacement/'qualification.json'),'repairProvenanceSha256':sha(replacement/'repair-provenance.json')}
    (original/'qualification.json').write_text(json.dumps(q,indent=2))
    print('Verified all provenance, exact shared audio, and artifact checksums for',id)
if __name__=='__main__':
    root,repaired=map(Path,sys.argv[1:3])
    for phase in ('05','09'):reconcile(root,repaired,phase)
