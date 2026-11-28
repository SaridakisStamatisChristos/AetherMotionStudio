"""GPU-06 measured mouth shapes (opt-in speech.mouths 'rhubarb-v1').

The owner-approved Rhubarb Lip Sync (tools-lock.json; installed by scripts/setup_rhubarb.py, never in Git) listens to
each spoken phrase of the narration track (with the phrase text as a hint) and reports mouth shapes over time. They
are mapped to the same per-frame codes as the GEN-10 estimate (src/core/talk.js VISEMES), so both backends draw them
identically from timeline.json:
  X no speech   M closed (m b p)   F teeth on lip (f v)   E wide   A open   O round
Timing is MEASURED from the audio (timeline.visemes.timing 'measured'). Loudness still decides how far the mouth opens.
A missing tool is an error with the install command; there is no silent fallback to the estimate.
"""
from pathlib import Path
import json, os, subprocess, tempfile, wave
import numpy as np

VERSION = 'viseme-rhubarb-v1'
SPF = 1600
R = 48000
# Rhubarb's basic shapes A–F and extended G, H, X (its documentation) → the engine's codes.
SHAPES = {'A': 'M', 'B': 'E', 'C': 'E', 'D': 'A', 'E': 'O', 'F': 'O', 'G': 'F', 'H': 'E', 'X': 'X'}


def wanted(scene):
    return (scene.get('speech') or {}).get('mouths') == 'rhubarb-v1' and any(s.get('speakerAssets') is not None for s in scene.get('shots', []))


def executable():
    """The installed Rhubarb executable (AETHER_RHUBARB overrides), or a precise error."""
    env = os.environ.get('AETHER_RHUBARB')
    if env:
        if not Path(env).is_file(): raise RuntimeError('AETHER_RHUBARB does not point to a file: ' + env)
        return Path(env)
    import setup_rhubarb
    exe = setup_rhubarb.executable()
    if exe is None:
        raise RuntimeError("speech.mouths 'rhubarb-v1' needs Rhubarb Lip Sync: run python scripts/setup_rhubarb.py "
                           "(or set AETHER_RHUBARB), or choose mouths 'visemes-v1' / remove it")
    return exe


def recognizer(language):
    """PocketSphinx is English-only; other languages use Rhubarb's language-independent phonetic recognizer."""
    return 'pocketSphinx' if str(language or '').lower().startswith('en') else 'phonetic'


def cues_to_values(cues_by_segment, segments, frames):
    """Pure: [(segment, [{'start': s, 'end': s, 'value': shape}])] → one code per frame (X outside speech)."""
    out = ['X'] * frames
    for g, cues in zip(segments, cues_by_segment):
        for c in cues:
            code = SHAPES.get(c['value'])
            if code is None: raise ValueError('unknown Rhubarb shape: ' + str(c['value']))
            a = int(round((g['startSample'] + c['start'] * R) / SPF)); b = int(round((g['startSample'] + c['end'] * R) / SPF))
            last = min(frames, (g['endSample'] + SPF - 1) // SPF)
            for f in range(max(0, a), min(last, b)): out[f] = code
    return ''.join(out)


def run(exe, audio, text, language):
    """Rhubarb on one phrase (float32 mono at 48 kHz) → its mouth cues (seconds from the phrase start)."""
    with tempfile.TemporaryDirectory() as d:
        wav, txt = Path(d) / 'phrase.wav', Path(d) / 'phrase.txt'
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(np.int16(np.clip(audio, -1, 1) * 32767).tobytes())
        txt.write_text(text, encoding='utf-8')
        result = Path(d) / 'cues.json'
        r = subprocess.run([str(exe), '-f', 'json', '--extendedShapes', 'GHX', '-r', recognizer(language), '--dialogFile', str(txt), '--threads', '1', '-q', '-o', str(result), str(wav)],
                           capture_output=True, text=True, timeout=600)
        if r.returncode != 0 or not result.exists(): raise RuntimeError('Rhubarb failed: ' + (r.stderr or r.stdout)[-400:])
        return json.loads(result.read_text(encoding='utf-8'))['mouthCues']


def version_string(exe):
    r = subprocess.run([str(exe), '--version'], capture_output=True, text=True, timeout=60)
    return ' '.join((r.stdout or r.stderr).split())[:80] or 'Rhubarb Lip Sync'


def visemes(speech, segments, frames):
    exe = executable()
    cues = [run(exe, speech[g['startSample']:g['endSample']], g['text'], g.get('language', 'en-us')) for g in segments]
    return {'version': VERSION, 'phonemizer': version_string(exe), 'timing': 'measured', 'values': cues_to_values(cues, segments, frames)}
