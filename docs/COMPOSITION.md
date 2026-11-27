# Visual aids and content modes (DUAL-01, `compose-v1`)

Opt-in. A shot without `composition` and a request without `content` render exactly as before.

## Content modes (Director request field `content`)
| Value | What you get |
|---|---|
| absent | Unchanged behaviour (narrator films keep the guide robot and the lower-third; dialogue films keep their cast). |
| `explainer-v1` | Narrator only, **no characters**: each shot shows one catalog object (never a character) and a visual aid. Not with `dialogue`. |
| `mixed-v1` | The usual cast (narrator guide robot, or the dialogue speakers) **plus** a visual aid in the clean top of every shot. |

With a content mode, shot titles default to none (the aid takes that space), `titles:'shots'` is refused, the IR lower-third overlay is not used, and identity-library stories are refused.

### How the Director plans aids (src/director/aids.js)
From each shot's own text only; it never invents facts, numbers or labels:
1. first shot: the film title;
2. a flow "X turns **A into B**" → two labels and an arrow;
3. a list "**A, B and C**" (3–4 short items, shown whole or not at all) → a row of labels under the shot heading;
4. otherwise a card: the shot heading plus the first plain sentence of the narration. Generic outline roles ("Context", "Key idea") are not shown; the card then quotes the narration alone.

Each candidate must pass layout validation; the first that fits is used.
**Diagnostics** (in `director-stages.json` `aids` and the manifest):
- `VISUAL_AID_NOT_YET_SUPPORTED`: the shot talks about charts/data (DUAL-04), maths (DUAL-03) or images (DUAL-05). A card is used instead; nothing is faked.
- `NO_MATCHING_OBJECT`: an explainer shot whose words match no catalog object shows an open book.

Explainer objects: a real word match for the shot first (plurals tolerated), preferring one that differs from the previous shot's object (a change of scene). Then the film's best match, then the open book. Alphabetical ties at score 0 are never used.

**Length:** a content-mode production without its own `speech` is fitted to its speech (Fix A `speech-v1`, as dialogue films already are: at most the requested seconds, calm pauses kept, silence-v1 is a gate). The first explainer render without the fit (`dual01-explainer-r1`, 40 s) kept three pauses of 3.0–4.0 s. They also get the `mix-v2` master dialogue films use (about −16 LUFS; `dual01-explainer-r3` without it measured −18.7 LUFS).

## Shot field `composition`
```json
{"version":"compose-v1","region":"upper","items":[
 {"id":"heading","type":"label","box":[0.1,0,0.8,0.3],"text":"Key idea","tone":"accent"},
 {"id":"from","type":"label","box":[0,0.48,0.36,0.36],"text":"Carbon","start":0.06},
 {"id":"to","type":"label","box":[0.64,0.48,0.36,0.36],"text":"Sugar and wood","start":0.2},
 {"id":"step","type":"arrow","from":"from","to":"to","reveal":"wipe","start":0.12}]}
```
- **Regions** (720×1280 logical canvas): `upper` x 48–632, y 150–390 (the clean top, above heads at the Director's framings); `full` x 48–632, y 150–850. Both stay inside the Reels-safe area and above two-line captions in both caption layouts, with speaker names.
- **Boxes** are `[x,y,w,h]` in 0–1 of the region; at least 24×24 px.
- **Items** (1–6, drawn in order):
  - `background` (first only, optional box): a soft panel;
  - `title` (≤ 60 chars);
  - `card` (heading `text` ≤ 48 and/or `body` ≤ 160);
  - `label` (≤ 40);
  - `callout` (≤ 100, `to:[x,y]` outside its box);
  - `arrow` (`from`/`to`: an earlier boxed item ID or `[x,y]`, at least 24 px long);
  - `shape` (`circle`, `ring`, `rect`).
- **Timing:** `start`/`end` are shot progress 0–1. The reveal (`fade`, `slide`, `wipe`, `pop`, `none`) lasts 0.5 s of real time, and an item fades out over 0.3 s before an `end` below 1. Pieces of a shot split into singles keep the aids steady (`reveal:'none'`).
- **Tones** (theme `aether-v1`): `neutral`, `accent`, `warm`, `cool`. Plate text contrast is at least 4.5:1 (tested).

### Rules
- **Text layout:** deterministic and font-metric free. A fixed Arial-Bold advance table wraps by words and picks the largest allowed size that fits. Text that does not fit at the smallest size is **rejected** with a message naming the item and the box size; it is never truncated or squeezed.
- **Overlap:** text items on screen at the same time must not overlap. Backgrounds and shapes may sit under them.
- **Safety:** unknown fields, control characters, non-finite numbers and out-of-range values are rejected. Nothing in a composition is executed or fetched.

## Rendering (both backends)
`drawComposition` (src/visual/draw-composition.js) runs in `drawGraph` right after the overlays, on the **shared 2D overlay path (Canvas 2D, after the world pass)**. CPU and Three.js therefore draw identical aids over their own world pictures.

## Check `aids-v1` (src/quality/aids.js; productions with compositions; diagnostic)
Sampled every 3rd frame:
- `AIDS_ON_HEAD`: a plate covers more than 5 % of the top 40 % of a character;
- `AIDS_ON_OBJECT`: plates cover more than 25 % of an object;
- `AIDS_ON_CAPTION`: a plate meets the active burned-in caption box.

Printed on the `CHECKS:` line as `aids-v1 warnings N`.

## Not in DUAL-01
- Shots with no asset at all (camera checks assume one): DUAL-02 typography.
- Arrows that point at a 3D object.
- Text timed to measured phrases (DUAL-02).
- Silent films and explicit mute (DUAL-06).
- Studio controls for the modes (DUAL-07).

# Typography (DUAL-02, `compose-v2`)

Opt-in. `compose-v1` compositions draw exactly as in DUAL-01; `compose-v2` adds the fields below.

## Bundled fonts (owner-approved 2026-11-26: "Bundle open fonts", all four families)
| ID | Family | Use | Source (pinned) |
|---|---|---|---|
| `arial` | system Arial | default; ASCII only in compose-v2 | not bundled |
| `inter` | Inter 4.1 | modern sans | rsms/inter v4.1 release |
| `merriweather` | Merriweather | serif, documentary | SorkinType/Merriweather @ 4481226 |
| `jetbrains-mono` | JetBrains Mono 2.304 | code, numbers, maths | JetBrains/JetBrainsMono v2.304 release |
| `noto-sans` | Noto Sans 2.015 | Greek, Cyrillic, accents | notofonts/latin-greek-cyrillic NotoSans-v2.015 |

- Files: `public/fonts/<id>/` (Regular 400 and Bold 700, unmodified upstream TTF) with each family's `OFL.txt` (SIL Open Font License 1.1). `public/fonts/fonts.lock.json` records the source and SHA-256 of every file.
- `node scripts/font-metrics.mjs` reads each TTF (cmap, hmtx; a small bounded parser, no dependency) and writes `src/core/font-metrics.js`: advance widths and coverage for Latin, Latin-1, Latin Extended-A/B, Greek, Cyrillic, punctuation, currency, arrows and maths operators. `--check` fails when it is out of date (a test runs it).
- **Fallback chain:** the chosen font, then Noto Sans, then Inter. The layout measures each character in the first font that has it, and the browser falls back per glyph in the same order. A character no font in the chain covers is **rejected** with its code point (for example `🚀 (U+1F680)`); nothing is drawn as a box.
- **Rendering:** `src/index.jsx` loads every face a film uses (FontFace from `public/fonts`) before the first frame; if a face fails to load, the render fails. The Studio preview does not load them yet (DUAL-07); its preview shows substitute fonts.

## compose-v2 fields
- Composition: `font` (default `arial`), `theme` (`aether-v1` dark plates, or `paper-v1` light plates with dark ink; text, sub and emphasis contrast are at least 4.5:1, tested), up to 8 items.
- Any text item: `font`, `weight` (400 or 700), `align` (`left`/`center`/`right`), `emphasis` (1–6 exact phrases of the item's text, drawn in the tone's mark colour; a phrase that does not occur is rejected), `phrase` (start when narration phrase *k* of the shot starts; replaces `start`).
- New types:
  - `quote` (≤ 220 chars plus `cite` ≤ 60; curly quotes when the font has them);
  - `bullets` (2–6 lines ≤ 90; optional `phrases`, one per line, never going backwards; otherwise revealed one after another over the first 60 % of the window);
  - `counter` (`from`/`to` finite within ±1e12, `decimals` 0–3, `group`, `prefix`/`suffix` ≤ 12, optional label `text`). It counts for 1.5 s and ends on the exact value. Formatting is locale-free, and the box reserves the width of the widest value on the way;
  - `kinetic` (≤ 140 chars, words appear one by one over 80 % of its phrase or window).
  - `image` (DUAL-05): a verified local raster image (PNG, JPEG, static WebP) from the media library, with fit, crop, focus, a slow pan/zoom, alt text, an optional caption, plate and layering. Contract: [docs/MEDIA.md](MEDIA.md).
- **Timing honesty:** phrase windows are **measured** when the timeline has one segment per narration phrase; otherwise they are an even split, flagged `estimated`. Word timing inside kinetic text is always estimated (an even spread), never forced alignment.
- **Rejected text:** control, zero-width and bidirectional-override characters, alongside the DUAL-01 rules (overflow, overlap, box bounds).

## Typography shots and the `typography-v1` mode
- A shot with a `compose-v2` composition may have **no 3D asset**. It must then frame no subject. Preflight reports it as `TYPOGRAPHY_SHOT` (review) instead of the blocking `EMPTY_GEOMETRY`, which still applies to every other empty shot.
- Director `content:'typography-v1'` (narrator, no characters, not with dialogue): every shot is a full-region composition with no asset. Default font `inter`. Request `font` and `theme` work with every content mode, and a request with either gets compose-v2.
- **Planner** (src/director/aids.js), from the script's own words only:
  - first shot: the title as kinetic text;
  - a number → a counter (scale words shown, never multiplied out; years like "250 BC" or a bare 1990 are not counted; the label is the words right after the number, cut at the first function word: "3 trillion trees", "100 kilograms of oxygen");
  - a list → bullets;
  - a flow → labels and an arrow;
  - otherwise a plain sentence of the shot, revealed word by word, with a topic word emphasised.
- Burned-in captions stay on, so the spoken words are always shown; the typography is the large visual layer.
