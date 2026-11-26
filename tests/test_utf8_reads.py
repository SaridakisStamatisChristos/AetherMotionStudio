"""DUAL-02 regression: production scripts read JSON/text as UTF-8 explicitly.

On Windows the default text encoding is cp1252, so a non-ASCII film title (Greek "Εύρηκα", or even "café") made
verify.py fail with UnicodeDecodeError (dual02-eureka-r2). Every read_text() in scripts/ must name its encoding.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Utf8Reads(unittest.TestCase):
    def test_read_text_names_encoding(self):
        offenders = []
        for path in sorted((ROOT / 'scripts').glob('*.py')):
            for n, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
                if re.search(r'\.read_text\(\s*\)', line):
                    offenders.append(f'{path.name}:{n}')
        self.assertEqual(offenders, [])

    def test_greek_scene_round_trip(self):
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'scene.json'
            p.write_bytes(json.dumps({'title': 'Εύρηκα! café'}, ensure_ascii=False).encode('utf-8'))
            self.assertEqual(json.loads(p.read_text(encoding='utf-8'))['title'], 'Εύρηκα! café')


if __name__ == '__main__':
    unittest.main()
