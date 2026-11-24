from pathlib import Path
from urllib.request import urlopen
import shutil, os
root=Path(__file__).resolve().parents[1]
dest=Path(os.environ.get('KOKORO_MODEL_DIR',root/'models'/'kokoro'));dest.mkdir(parents=True,exist_ok=True)
base='https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
for name,minimum in [('kokoro-v1.0.int8.onnx',1_000_000),('voices-v1.0.bin',100_000)]:
 p=dest/name
 if p.exists() and p.stat().st_size>=minimum: continue
 tmp=p.with_suffix(p.suffix+'.tmp')
 try:
  with urlopen(base+name,timeout=120) as r,tmp.open('wb') as f: shutil.copyfileobj(r,f)
  if tmp.stat().st_size<minimum: raise RuntimeError('Truncated model: '+name)
  tmp.replace(p)
 finally:
  tmp.unlink(missing_ok=True)
 print('Acquired',name,p.stat().st_size)
