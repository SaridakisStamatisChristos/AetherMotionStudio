"""Local clean-install entry point; no sudo, apt or model API."""
import argparse,hashlib,json,os,subprocess,sys,venv
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(args,**kw):
    subprocess.run([str(a) for a in args],cwd=ROOT,check=True,**kw)
def verify_models():
    lock=json.loads((ROOT/'models-lock.json').read_text())
    folder=Path(os.environ.get('KOKORO_MODEL_DIR',ROOT/'models'/'kokoro'))
    for name,expected in lock['files'].items():
        with (folder/name).open('rb') as f:actual=hashlib.file_digest(f,'sha256').hexdigest()
        if actual!=expected:raise RuntimeError('Model checksum mismatch: '+name+'; remove corrupt file and rerun setup')
    print('Verified locked Kokoro model and voice SHA-256',flush=True)
def main():
    p=argparse.ArgumentParser();p.add_argument('--ci',action='store_true',help='use existing isolated CI Python');p.add_argument('--verify-models',action='store_true');a=p.parse_args()
    if a.verify_models:verify_models();return
    if sys.version_info[:2]!=(3,11):raise RuntimeError('Release setup requires Python 3.11')
    node=subprocess.check_output(['node','--version'],text=True).strip()
    if not node.startswith('v22.'):raise RuntimeError('Release setup requires Node 22')
    if a.ci:python=Path(sys.executable)
    else:
        env=ROOT/'.venv';venv.EnvBuilder(with_pip=True).create(env)
        python=env/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    npm='npm.cmd' if os.name=='nt' else 'npm'
    run([npm,'ci' if (ROOT/'package-lock.json').exists() else 'install','--no-audit','--no-fund'])
    run([python,'-m','pip','install','--disable-pip-version-check','-r','requirements-release.txt'])
    run([python,'-m','pip','check'])
    run([python,'scripts/setup_models.py']);verify_models()
    print('Setup complete. Run npm run produce -- --topic "How a molecule is built" --seconds 30 --backend cpu',flush=True)
if __name__=='__main__':main()
