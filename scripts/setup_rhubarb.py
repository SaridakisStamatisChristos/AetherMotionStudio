"""GPU-06: install the owner-approved Rhubarb Lip Sync (tools-lock.json) into models/rhubarb (not in Git).

Downloads the archive for this OS from the pinned GitHub release (or uses --zip PATH), verifies its SHA-256 against
tools-lock.json, and extracts it. Prints the executable path. Optional: only films with speech.mouths 'rhubarb-v1'
need it; nothing else changes without it.
"""
from pathlib import Path
from urllib.request import urlopen
import hashlib, json, os, platform, shutil, sys, zipfile

root = Path(__file__).resolve().parents[1]
LOCK = json.loads((root / 'tools-lock.json').read_text(encoding='utf-8'))['tools']['rhubarb']
DEST = Path(os.environ.get('AETHER_RHUBARB_DIR', root / 'models' / 'rhubarb'))
EXE = 'rhubarb.exe' if platform.system() == 'Windows' else 'rhubarb'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()


def executable(dest=DEST):
    """Path of the installed executable, or None."""
    found = sorted(Path(dest).glob('**/' + EXE)) if Path(dest).exists() else []
    return found[0] if found else None


def install(zip_path=None, dest=DEST):
    entry = LOCK['files'].get(platform.system())
    if entry is None: raise SystemExit('Rhubarb: no pinned archive for ' + platform.system())
    dest.mkdir(parents=True, exist_ok=True)
    archive = Path(zip_path) if zip_path else dest / entry['name']
    if not zip_path and not archive.exists():
        tmp = archive.with_suffix('.tmp')
        url = 'https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/' + LOCK['release'] + '/' + entry['name']
        try:
            with urlopen(url, timeout=300) as r, tmp.open('wb') as f: shutil.copyfileobj(r, f)
            tmp.replace(archive)
        finally:
            tmp.unlink(missing_ok=True)
    if sha256(archive) != entry['sha256']: raise SystemExit('Rhubarb: checksum mismatch for ' + str(archive))
    with zipfile.ZipFile(archive) as z:
        for m in z.namelist():
            target = (dest / m).resolve()
            if not str(target).startswith(str(dest.resolve())): raise SystemExit('Rhubarb: unsafe path in archive: ' + m)
        z.extractall(dest)
    exe = executable(dest)
    if exe is None: raise SystemExit('Rhubarb: executable missing after extraction')
    if platform.system() != 'Windows': exe.chmod(exe.stat().st_mode | 0o111)
    return exe


if __name__ == '__main__':
    print(install(sys.argv[sys.argv.index('--zip') + 1] if '--zip' in sys.argv else None))
