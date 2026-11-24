"""CI-only media tool selection: no apt, no sudo, no system package mutations."""
import os
import subprocess
from pathlib import Path
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
compositor = root / 'node_modules' / '@remotion' / 'compositor-linux-x64-gnu'
probe = compositor / 'ffprobe'
if not probe.is_file():
    raise RuntimeError(f'Pinned Remotion package lacks ffprobe: {probe}')
ffmpeg = Path(imageio_ffmpeg.get_ffmpeg_exe()).resolve()
# Keep the decoder separate from the rendering engine. Use the bundled Remotion
# probe for metadata, and a full independent FFmpeg binary for decoding/stills.
env = os.environ.copy()
ld = str(compositor) + (':' + env['LD_LIBRARY_PATH'] if env.get('LD_LIBRARY_PATH') else '')
env['LD_LIBRARY_PATH'] = ld
for name, path in [('AETHER_FFMPEG', ffmpeg), ('AETHER_FFPROBE', probe)]:
    result = subprocess.run([str(path), '-version'], env=env, check=True, capture_output=True, text=True, timeout=15)
    print(name, result.stdout.splitlines()[0], flush=True)
with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as f:
    f.write(f'AETHER_FFMPEG={ffmpeg}\nAETHER_FFPROBE={probe}\nLD_LIBRARY_PATH={ld}\n')
