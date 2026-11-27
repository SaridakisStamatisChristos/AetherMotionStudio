# Output formats (DUAL-06, opt-in)

Owner decision (2026-11-26): the new sizes are **opt-in presets**; the default stays **1080×1920 at 30 fps**. Projects without `format` are drawn exactly as before (tested: absent and explicit `vertical-v1` give identical drawing, and every legacy digest is unchanged).

| Format | Output | Logical canvas | Use |
|---|---|---|---|
| `vertical-v1` (default) | 1080×1920, 30 fps | 720×1280 | phones, Reels |
| `landscape-v1` | 1920×1080, 30 fps | 1280×720 | desktop, video sites |
| `square-v1` | 1080×1080, 30 fps | 720×720 | feeds |

## How to choose one
- Director request: `"format": "landscape-v1"` (needs `content`: explainer-v1, mixed-v1 or typography-v1).
- Production: `node scripts/produce.mjs --request <file> --format square-v1 --backend both --id <id>` (overrides the request; refused with `--project`).
- Authored project: top-level `"format"`.

## Only tested combinations
Landscape and square are refused, with the reason, unless every shot is a `cinematic-graph` shot with `titles: "none"`, no legacy `overlays` and no Foundry `geometryProfile`, and the film has no Reels delivery (Reels is 9:16 only; `scripts/reels-export.mjs` also refuses other sizes). Version-1 scenes and other templates stay vertical.

## How the picture reflows (never stretched or cropped)
- **The 3D world** is drawn in the vertical-equivalent space every camera, framing rule and check was designed in, through one transform that **keeps the vertical field of view**. Wider formats see more at the sides and never less, so nothing visible in the vertical film is cut. Characters and objects therefore keep their vertical framing and appear smaller in landscape and square (the frame is shorter). The same transform is used on CPU and Three.js (the Three.js camera already keeps the vertical field of view).
- **2D layers** are laid out per format (text sizes keep their physical size, 1.5 output px per logical px):

| Format | Composition `upper` | Composition `full` | Caption box (bottom) | Progress bar |
|---|---|---|---|---|
| vertical-v1 | 48,150 584×240 | 48,150 584×700 | x 42, w 636, bottom 1171 | 54,1212 w 612 |
| landscape-v1 | 128,36 1024×170 | 128,36 1024×500 | x 240, w 800, bottom 676 | 96,700 w 1088 |
| square-v1 | 48,36 624×170 | 48,36 624×500 | x 42, w 636, bottom 676 | 54,700 w 612 |

- Composition items keep their fractional boxes; text is re-wrapped, charts and diagrams re-laid out, images re-cropped by `fit`/`focus`. Content that no longer fits a shorter panel is **refused with an explicit message**, never squeezed.
- **Per-format boxes:** any compose-v2 item (not arrows) may carry `"formats": {"landscape-v1": {"box": [x,y,w,h]}, "square-v1": {"box": […]}}`; the box replaces `box` in that format only. examples/dual06-harbour.request.json shows a full example.

## Checks
- verify.py, compare_release.py and quality_media.py expect each format's size (scripts/formats.py mirrors src/core/formats.js; a test keeps them equal).
- aids-v1 maps composition plates into the vertical-equivalent space before comparing them with characters and objects; caption overlap is measured in the format's own coordinates.
- visibility-v2, crowding-v1, motion-speed-v1 and the off-frame checks still use the 720×1280 vertical frame, which lies inside every wider format: for landscape and square they are **stricter, never looser**.

## Known limits (recorded)
- The Studio preview canvas is 9:16; a format chooser and a matching preview are DUAL-07.
- Characters read smaller in landscape and square (the vertical field of view is kept so nothing is cut). No automatic re-framing.
