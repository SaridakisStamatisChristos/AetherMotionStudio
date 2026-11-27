# Themes, caption styles and audio controls (DUAL-06, slice 2; all opt-in)

Every established default is unchanged: projects that do not ask for these options draw and sound exactly as before (tested: an absent caption style and `box-v1` draw identically; legacy and Director digests unchanged).

## Visual themes
A film's 2D look is the combination of a **composition theme** (plates, text, emphasis and chart colours), a **font** (DUAL-02) and a **caption style**. They are chosen separately and never change each other silently.

| Composition theme | Look | Contrast (tested) |
|---|---|---|
| `aether-v1` (default) | dark plates, light text | text, sub and emphasis ≥ 4.5:1 |
| `paper-v1` | light plates, dark ink | ≥ 4.5:1 |
| `contrast-v1` (new) | black plates, white text, white or coloured edges | text, sub and emphasis **≥ 7:1** (WCAG AAA); six distinct chart colours ≥ 3:1 |

| Caption style (`speech.captions.style`) | Look | Contrast (tested) |
|---|---|---|
| `box-v1` (default) | the historical dark box | text, highlight, speaker ≥ 4.5:1 |
| `paper-v1` | light box, dark text, rust highlight | ≥ 4.5:1 |
| `contrast-v1` | black box, white text, yellow highlight, thicker white edge | **≥ 7:1** |

Backgrounds stay the 3D environments (sets and topic backdrops); fonts are the four bundled families.

## Audio controls (existing; reachable in requests)
The engine already had them; requests reach them through `request.speech` (the Studio controls come in DUAL-07):
- voice (`voice`, nine Kokoro voices), `speech.pace`, `speech.fit` (`speech-v1` fits the film to its speech);
- `speech.mix`: `narration`, `music`, `ambience`, `sfx` gains, `duck`, `fadeSeconds`, `peak`, `master: "mix-v2"` (about −16 LUFS);
- `speech.captions`: `mode` (`burn-in`, `sidecar`, `both`), `highlight`, `speakerNames`.

## Explicit silent soundtrack (new)
- `speech.soundtrack: "silent"` (or the request shortcut `"soundtrack": "silent"`). Absent or `"mix"` = the normal soundtrack.
- The narration is still synthesised: it sets the shot timing and the captions (so burned-in captions stay in sync). The **delivered audio is digital silence**.
- It is reported as requested silence everywhere: `speech-report.json` `soundtrack: "silent"`; verify.py requires the mix to be exactly zero and prints "requested silent soundtrack (digital silence)"; quality_media.py reports `audio.soundtrack: "silent (requested)"`, raises `NOT_SILENT` if any sound decodes, and does not raise `SILENT_AUDIO` or `INAUDIBLE_DECODED_PHRASE`. Silence that was **not** requested is still an error.
- Loudness meters show their floor (about −70 LUFS, peak −91 dB) for a silent film.

## Request shortcuts
- `"captionStyle": "paper-v1"` → `speech.captions.style`; `"soundtrack": "silent"` → `speech.soundtrack`. They apply to whatever speech settings the request ends up with (its own or the defaults) and are refused for films without speech.
- `"theme": "contrast-v1"` styles the planner's visual aids (needs a content mode); authored `request.visuals` compositions name their own theme.
