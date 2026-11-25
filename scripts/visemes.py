"""GEN-10 estimated mouth shapes (opt-in speech.mouths 'visemes-v1').

Phonemes come from the speech model's own phonemizer (espeak-ng through kokoro-onnx, already installed); the installed
Kokoro export reports no phoneme durations, so their timing is ESTIMATED: phonemes are spread over each word's
estimated window (speech_plan.estimate_words) with vowels weighted twice. This is not lip-sync and not forced
alignment. Loudness (speechEnvelope) still decides how far the mouth opens; the shape only sets width and closures.

values: one code per frame, stored in timeline.json as `visemes` (shared and hashed, identical for both backends):
  X no speech   M closed (m b p)   F teeth on lip (f v)   E wide   A open   O round
Pure functions only (no phonemizer import), so the tests run without the speech model.
"""
from speech_plan import estimate_words

VERSION = 'viseme-estimated-v1'
CODES = 'XMFEAO'
SPF = 1600
CLOSED, TEETH = set('mbp'), set('fv')
WIDE = set('iɪeɛɨj')
OPEN = set('aɑʌəɐæɜɚᵻ')
ROUND = set('oɔɒʊuɵwʷ')
SKIP = set('ˈˌːˑ̩̯̃.‿-ʔ,!?;:"“”—…()')   # stress, length and joiners carry no shape of their own


def phones(word):
    """Shape-bearing symbols of one IPA word, in order: (symbol, code or None for a neutral consonant)."""
    out = []
    for ch in word:
        if ch in SKIP:
            continue
        code = 'M' if ch in CLOSED else 'F' if ch in TEETH else 'E' if ch in WIDE else 'A' if ch in OPEN else 'O' if ch in ROUND else None
        out.append((ch, code))
    return out


def vowel(code):
    return code in ('E', 'A', 'O')


def word_shapes(word):
    """Codes for one word. Neutral consonants (t d n l k g s z h r ...) take the nearest vowel's shape in the word
    (coarticulation), else wide-neutral E. Vowels weigh 2, consonants 1."""
    ps = phones(word)
    codes = [c for _, c in ps]
    for i, c in enumerate(codes):
        if c is None:
            near = next((codes[j] for d in range(1, len(codes)) for j in (i + d, i - d) if 0 <= j < len(codes) and vowel(codes[j])), 'E')
            codes[i] = near
    weights = [2 if vowel(c) and ps[i][1] is not None else 1 for i, c in enumerate(codes)]
    return list(zip(codes, weights))


def phrase_spans(text, ipa, start, end):
    """(startSample, endSample, code) spans for one phrase. Word windows come from the caption word estimate when the
    phonemizer returns one IPA word per written word; otherwise the whole phrase is spread by weight."""
    written = text.split()
    spoken = [w for w in ipa.split() if phones(w)]
    if not spoken:
        return []
    if len(spoken) == len(written):
        windows = [(w['startSample'], w['endSample']) for w in estimate_words(text, start, end)]
        groups = [word_shapes(w) for w in spoken]
    else:
        windows = [(start, end)]
        groups = [[s for w in spoken for s in word_shapes(w)]]
    spans = []
    for (a, b), shapes in zip(windows, groups):
        total = sum(w for _, w in shapes)
        cursor, acc = a, 0
        for code, w in shapes:
            acc += w
            stop = a + (b - a) * acc // total
            if stop > cursor:
                spans.append((cursor, stop, code))
            cursor = stop
    return spans


def frames(spans, n):
    """One code per frame (code at the frame centre); single-frame shapes other than closures are merged into the
    previous shape so that mouths stay calm."""
    values = ['X'] * n
    for a, b, code in spans:
        for f in range(max(0, a // SPF), min(n, b // SPF + 1)):
            if a <= f * SPF + SPF // 2 < b:
                values[f] = code
    for f in range(1, n - 1):
        if values[f] not in ('X', 'M') and values[f - 1] == values[f + 1] != values[f] and values[f - 1] != 'X':
            values[f] = values[f - 1]
    return ''.join(values)


def visemes(segments, ipas, n, phonemizer):
    """Timeline field for all phrases (segments with text/startSample/endSample; ipas: IPA string per segment)."""
    spans = [s for g, ipa in zip(segments, ipas) for s in phrase_spans(g['text'], ipa, g['startSample'], g['endSample'])]
    return {'version': VERSION, 'phonemizer': phonemizer, 'timing': 'estimated', 'values': frames(spans, n)}


def wanted(scene):
    return (scene.get('speech') or {}).get('mouths') == 'visemes-v1' and any(s.get('speakerAssets') is not None for s in scene.get('shots', []))
