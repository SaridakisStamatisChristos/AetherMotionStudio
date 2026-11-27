# Authoring guide: one script, every kind of film

This guide shows how to make each kind of film from the Studio ("Make a film") or from a request file (`node scripts/produce.mjs --request <file> --backend both --id <id>`). Script rules for every mode: [SCRIPT_FORMAT.md](SCRIPT_FORMAT.md) (plain sentences, one per line, about 2.2 words per second; Claude-drafted lines are drafts).

## 1. Choose the kind of film
| Studio "Content" | Request `content` | Cast | What you get |
|---|---|---|---|
| Characters only (classic) | (absent) | Interview, Trio or Narrator | characters in 3D sets; dialogue films take turns |
| Characters + visual aids | `mixed-v1` | any | the characters plus cards, numbers and lists at the top |
| Explainer (no characters) | `explainer-v1` | Narrator only | props and backdrops with visual aids |
| Typography (no characters) | `typography-v1` | Narrator only | large animated text; the aids are the picture |

The Studio refuses impossible choices and says what to change (for example "Explainer has no characters: choose the cast Narrator only").

## 2. Example scripts
**Dialogue (Interview cast, classic):**
```
What makes a forest so good at cleaning the air?
Every leaf takes in carbon dioxide and gives out oxygen.
So a bigger forest means cleaner air?
Mostly, yes, and the soil stores carbon for centuries.
```
**Narrator, Explainer or Typography:**
```
A small bakery's week in numbers.
On Monday it sold 120 loaves.
Friday was the busiest day, with 180 loaves.
So the bakery now bakes extra loaves when a warm Friday is forecast.
```
Numbers, lists and flows in the script become counters, bullets and arrows automatically; every word and number comes from the script (the planner never invents data).

## 3. Add your own data, formulas and pictures (Advanced → Visuals)
Visuals attach to an **exact sentence of the script** (`at`); items can start on later sentences with `cue`. The Studio box takes a JSON list; request files use `"visuals": [...]`.
```json
[
 {"at": "On Monday it sold 120 loaves.",
  "composition": {"version": "compose-v2", "region": "full", "items": [
   {"id": "week", "type": "chart", "kind": "bar", "box": [0, 0, 1, 0.7],
    "categories": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "series": [{"name": "Loaves", "values": [120, 95, 110, 140, 180]}], "yLabel": "Sold (loaves)"}]}},
 {"at": "Friday was the busiest day, with 180 loaves.",
  "composition": {"version": "compose-v2", "region": "full", "items": [
   {"id": "shop", "type": "image", "box": [0, 0, 1, 0.8], "media": "my-bakery-photo",
    "alt": "The bakery counter on a Friday morning", "caption": "Friday morning", "fit": "cover",
    "move": {"from": {"x": 0.5, "y": 0.5, "zoom": 1}, "to": {"x": 0.5, "y": 0.4, "zoom": 1.3}}}]}}
]
```
- Charts, timelines, flowcharts and comparison cards: [CHARTS.md](CHARTS.md). Equations, plots and algorithms: [MATHS.md](MATHS.md). Text items, fonts and themes: [COMPOSITION.md](COMPOSITION.md).
- **Pictures** come only from your local picture library: `node scripts/media-import.mjs add photo.jpg --id my-bakery-photo --licence own-work --source "my phone, 2026"`. The Advanced view lists the library. Contract: [MEDIA.md](MEDIA.md).
- Errors name the item and the fix (for example "text overflow … shorten it or enlarge the box").

## 4. Format, look and sound
| Studio | Request | Choices |
|---|---|---|
| Format | `format` | Vertical 9:16 (default), Landscape 16:9, Square 1:1; the last two need a content mode ([FORMATS.md](FORMATS.md)) |
| Theme | `theme` | Dark (default), Paper, High contrast (needs a content mode) |
| Font (Advanced) | `font` | Automatic, Inter, Merriweather, JetBrains Mono, Noto Sans |
| Captions | `captionStyle` | Dark box (default), Paper, High contrast |
| Sound | `soundtrack` | Narration and music (default), Silent (captions only; narration still sets the timing) |
| Music | `music` | Soft (default), Off, Louder |

More audio settings (voice, pace, all mix gains, ducking, caption mode) are in `request.speech`: [THEMES_AUDIO.md](THEMES_AUDIO.md). An item that does not fit a shorter landscape or square panel can get its own box: `"formats": {"landscape-v1": {"box": [x, y, w, h]}}`.

## 5. Make it
Studio: **Generate & render film** (the preview shows the film's own fonts and pictures in its format), then download it from "Your film is ready". CLI: `node scripts/produce.mjs --request my.request.json --backend both --id my-film-r1` (add `--format square-v1` to try another format without editing the file).
