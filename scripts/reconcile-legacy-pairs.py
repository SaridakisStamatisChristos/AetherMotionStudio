"""Verify all repaired output hashes and original input evidence before selecting copies."""
import hashlib,json,sys,subprocess,shutil,os
from pathlib import Path
import imageio_ffmpeg
def load(p):return json.loads(p.read_text())
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()
def audio(p):return subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
def reconcile(root,repairs,manifest):
    for phase,row in manifest['phases'].items():
        cpu=root/f'aethermotion-{phase}-cpu-polished';old=root/f'aethermotion-{phase}-three-polished';new=repairs/phase
        p=load(new/'legacy-repair-provenance.json')
        assert p['sourceCommit']==manifest['sourceCommit'] and p['originalRun']==manifest['originalRun'] and p['phase']==phase
        assert p['repairRun']==os.environ['GITHUB_RUN_ID'] and p['orchestrationCommit']==os.environ['GITHUB_SHA']
        assert p['originalInputs']==row
        for d,hashes in [(cpu,row['cpu']),(old,row['three']),(new,p['outputs'])]:
            for n,h in hashes.items():assert sha(d/n)==h,(phase,n)
        assert sha(new/'scene.json')==row['three']['scene.json']
        for n in row['cpu']:
            if n not in ('film.mp4','scene.json'):assert sha(new/n)==row['cpu'][n],(phase,n)
        assert audio(new/'film.mp4')==audio(cpu/'film.mp4')==p['sharedAacPacketHash']
        assert load(new/'timeline.json')['durationFrames']==row['frames']
        assert load(new/'render-timing.json')['backend']=='three'
        shutil.copyfile(new/'legacy-repair-provenance.json',root/f'legacy-repair-provenance-{phase}.json')
        old.rename(repairs/f'original-{phase}');shutil.copytree(new,old)
        print('Verified exact shared source and audio for',phase)
if __name__=='__main__':
    root,repairs,manifest=map(Path,sys.argv[1:4]);reconcile(root,repairs,load(manifest))
