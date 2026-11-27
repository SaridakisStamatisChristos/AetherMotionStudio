# Local media (DUAL-05): images in compositions

Opt-in. Scenes without `image` items are unchanged. Owner rules (2026-11-26): **raster only — PNG, JPEG and static WebP**; no SVG, no remote fetching, no animated formats, no new dependencies.

## The library
- Images live in `public/media/<id>.<png|jpg|webp>` with `public/media/media.lock.json`. The folder is local user data and is **not in Git** (`.gitignore`).
- The **only** way in is the import tool:
  ```
  node scripts/media-import.mjs add <file> --id <id> --licence <licence> --source "<where it came from>" [--attribution "<credit>"]
  node scripts/media-import.mjs verify     # re-check every file (hash, structure, PNG data)
  node scripts/media-import.mjs list
  ```
- IDs: lowercase letters, digits and hyphens (at most 48). **IDs are immutable**: the tool never overwrites an ID with different bytes (re-importing the same bytes is a no-op).
- Provenance in the lock: licence (required), source (required), attribution (required for CC-BY licences), SHA-256, byte size, stored and upright size, EXIF orientation, alpha, and which decode checks passed.

## Checks on import (nothing is written unless all pass)
| Check | What it refuses |
|---|---|
| Local regular file | URLs, links, folders, devices, files over 32 MB |
| Signature (never the name) | a `.png` holding JPEG bytes; SVG, GIF and anything else |
| Structure (src/core/media.js) | truncated or malformed PNG chunks / JPEG segments / WebP RIFF chunks; PNG CRC errors; data after the end; unsupported PNG depths; lossless, hierarchical, arithmetic or 12-bit JPEG |
| Bounds | zero size; more than 8192 px per side; more than 64 MB decoded (RGBA), checked from the header before any decode (decompression bombs) |
| Animation | APNG (`acTL`/`fcTL`/`fdAT`), animated WebP (VP8X flag, `ANIM`, `ANMF`) |
| Orientation | malformed EXIF; orientation outside 1–8; **WebP with orientation ≠ 1** (see below) |
| PNG data | the image data is inflated in full and must be exactly the size the header implies |
| ffmpeg strict decode | damaged JPEG scan data (Chromium would silently draw grey or garbage) |
| Chromium decode | anything the renderer's own browser cannot decode; the upright size must match |

Measured on 2026-11-27 with Chromium 158 (the browser Remotion renders with): EXIF orientation is **applied** to JPEG and PNG (`eXIf`), but **ignored** for WebP; damaged JPEG data decodes without an error. That is why rotated WebP is refused and why the import runs a strict ffmpeg decode.

## The production boundary and the render
- At the Director compile and at `--project` load, every `image` item is resolved from the lock: the file must exist inside `public/media` (no link, no escape), its SHA-256 must match, and its structure is checked again. The resolved `source` **overwrites** anything the author supplied.
- Per film: at most 12 distinct images and 256 MB decoded in total.
- Before frame 0 the renderer fetches each image, checks its SHA-256 and structure again, decodes it with `createImageBitmap` and checks the upright size. Any failure **stops the render**; there is never a substitute picture. Both backends draw images on the shared 2D composition path, so the image, crop and timing are identical on CPU and Three.js.
- The Studio preview (DUAL-07, audit repair) loads library pictures through `src/visual/preview-media.js` with the **same verification** as the native renderer (`verifyImageBytes`: SHA-256 of the actual bytes, structure, size and orientation; `checkDecoded`: upright decoded size). Unverified pictures are never registered under a verified hash; they become an explicit preview diagnostic and a labelled placeholder. The preview keeps only the current film's pictures (released ones are closed), merges concurrent loads, ignores loads and messages from replaced films, and keeps the registered pictures within the per-film decoded bound. Loads already in flight for a replaced film still finish before their bitmaps are closed, so transient memory during very rapid switching is not hard-bounded yet (DUAL-09 hardening: bounded concurrent decoding, cancelled obsolete fetches, measured peak process memory). Preview problems never relax the native checks.

## The `image` item (compose-v2)
```json
{"id":"map","type":"image","box":[0,0.08,1,0.62],"media":"dual05-harbour","alt":"Harbour map …",
 "fit":"cover","crop":[0,0,1,1],"focus":[0.5,0.5],
 "move":{"from":{"x":0.5,"y":0.5,"zoom":1},"to":{"x":0.52,"y":0.7,"zoom":1.8}},
 "caption":"…","plate":true,"under":false,"cue":"…"}
```
| Field | Meaning |
|---|---|
| `media` | library ID (required) |
| `alt` | description of the picture (required, at most 160 characters; not drawn) |
| `fit` | `cover` (default: fills the box, cuts the overflow around `focus`) or `contain` (whole picture, letterboxed, never cut) |
| `crop` | `[x,y,w,h]` 0–1 of the upright picture (at least 16×16 picture pixels) |
| `focus` | `[x,y]` 0–1: which part stays visible with `cover` |
| `move` | slow pan/zoom over the item's time on screen: view centre `x`,`y` (0–1) and `zoom` 1–4; eased, zoom interpolated geometrically, always clamped inside the picture |
| `caption` | optional strip under the picture (at most 80 characters, at most 35 % of the box, glyph-checked) |
| `plate` | default `true` (tone plate and edge); `false` for transparent overlays |
| `under` | default `false`; `true` makes the image a lower layer, so text and other images may sit on it |
| timing | `start`/`end`, `phrase` or (in `request.visuals`) `cue`, plus `reveal`, `tone`, `font`, `weight` like other items |

The maths is pure and deterministic (`imageRects`, `imageView`): the same frame always gives the same source and destination rectangles. `contain` never cuts the crop; `cover` always fills the box; the aspect ratio is never stretched.

## Not done (recorded)
- SVG, animated formats, remote images: refused by the owner's rules.
- WebP with EXIF orientation: refused (the renderer does not apply it).
- The Director never invents images: image words in a script without authored visuals keep `VISUAL_AID_NOT_YET_SUPPORTED`.
