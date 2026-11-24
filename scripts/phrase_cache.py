"""Content-addressed local cache with bounded entries, integrity and atomic writes."""
import os, hashlib, json, tempfile
from pathlib import Path
MAX_ENTRY=8*1024*1024
def key_for(settings):
    return hashlib.sha256(json.dumps(settings,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def file_hash(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
class PhraseCache:
    def __init__(self,root,limit=128*1024*1024):
        self.root=Path(root);self.limit=limit;self.hits=0;self.misses=0;self.root.mkdir(parents=True,exist_ok=True)
    def path(self,key):
        if len(key)!=64 or any(c not in '0123456789abcdef' for c in key):raise ValueError('invalid cache key')
        return self.root/(key+'.pcm')
    def get(self,key):
        p=self.path(key)
        try:
            size=p.stat().st_size
            if not 36<size<=MAX_ENTRY+32:raise ValueError('cache size')
            raw=p.read_bytes()
            if len(raw)!=size or hashlib.sha256(raw[32:]).digest()!=raw[:32] or (len(raw)-32)%4:raise ValueError('cache checksum')
            self.hits+=1
            return raw[32:]
        except (OSError,ValueError):
            self.misses+=1;return None
    def put(self,key,raw):
        p=self.path(key)
        if not raw or len(raw)%4 or len(raw)>MAX_ENTRY or len(raw)+32>self.limit:return
        fd,tmp=tempfile.mkstemp(prefix='.phrase-',dir=self.root)
        try:
            with os.fdopen(fd,'wb') as f:f.write(hashlib.sha256(raw).digest()+raw)
            os.replace(tmp,p)
        finally:
            if os.path.exists(tmp):os.unlink(tmp)
        self.prune()
    def prune(self):
        # Per-process size cap; concurrent independent renders may transiently exceed it.
        entries=[]
        for p in self.root.glob('*.pcm'):
            try:
                st=p.stat();entries.append((st.st_mtime_ns,p,st.st_size))
            except FileNotFoundError:pass
        total=sum(x[2] for x in entries)
        for _,p,n in sorted(entries):
            if total<=self.limit:break
            try:p.unlink();total-=n
            except FileNotFoundError:total-=n
