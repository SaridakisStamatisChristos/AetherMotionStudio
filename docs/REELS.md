# GEN-09 Instagram Reels mode (2026-11-25)
Owner: "can the instagram be a mode and in case i want i can generate longer videos?" Yes. Reels is an opt-in mode, and length only produces a warning.

## How to use
- **Director request:** add `"delivery": "reels-v1"`, for example examples/gen09-reels.request.json. Then:
  `node scripts/produce.mjs --request examples/gen09-reels.request.json --backend both --id <id>`.
- **Authored project:** `reelsProject(project)` (src/core/reels.js) returns a copy with `delivery` set and every group/single framing fitted to the Reels area. Its report lists shots with other framings, which are left unchanged.
- **After rendering:** `node scripts/reels-export.mjs out/<id>-cpu-polished` writes `reels/cover.jpg` and `reels/reels-report.json` next to the film.
  - The film itself is already a valid Reel (1080×1920, 30 fps, H.264 + AAC) and is never modified.
  - Existing exports are never overwritten.
  - `--cover-frame N` picks the cover. By default it is the middle of the first line said in a single (GEN-06), else of the first line.

## What changes in the mode (nothing changes without it)
- **Layout** (src/core/reels-layout.js, both renderers):
  - the app's overlay covers the top, the bottom and the right edge of a Reel;
  - the heading is smaller (38 px on the 720×1280 reference) and sits at the top of the safe area;
  - the AETHER pill, the subheading and the progress bar are left out;
  - captions sit low, ending just above the app's own text (box x 46–634, bottom 990 on the reference). They may cover legs and feet, never a head. Revised before merge on the owner's word: "if on top it will cover the face... so i think bottom is prefered" (the first version hung them under the heading and shrank the characters).
- **Framing:** group and single framings keep the normal character height and only fit the width clear of the right-edge buttons (`cameraRig.safeArea:'reels-v1'`: half-width 274, half-height 340, against 336/340 by default).
  - Singles are solved for that area too; the Reels interview gets the same three singles as the default layout.
- **Check reels-safe-v1** (`quality-checks.json` `reels`, `CHECKS:` line, Studio Inspect):
  - `REELS_UNDER_OVERLAY`: more than 5 % of a character's box under the app overlay;
  - `REELS_CAPTION_ON_HEAD`: an active caption covers more than 5 % of a character's head (the top 40 % of its projected box; the box is sized like the drawn caption);
  - `REELS_LONG`: longer than the recommended 90 s. This is a warning only; longer films are fine.
- **Export report:**
  - `fail` only for a wrong format (not 1080×1920, not H.264/AAC);
  - long films `pass` with a warning;
  - a film rendered without the mode gets the warning `NOT_REELS_LAYOUT`.

## Assumptions and trade-offs (please check)
- **Safe area:** Meta publishes no single figure for organic Reels, and third-party guides disagree (bottom 280–670 px, right 90–120 px on 1080×1920). The mode keeps top 220, bottom 420, left 60 and right 120 px clear. Check a test upload in the app.
- **Length:** guides disagree on the current Reels maximum (3 min in some, up to 20 min for uploads in others), so the mode never refuses length. 90 s is the recommended length.
- **Character size:** the first version shrank speakers to 0.39 of the safe height (0.56 by default). The owner declined that; the revised mode keeps the normal height, and captions may cover legs and feet.
- Not done: a seamless loop (optional in the plan), Stories, and music.

## Related fix found while testing
In the three-speaker network film under the Reels framing, the robot's body turn while pointing reached 120.7°/s, over the 120 limit. The Director now eases into pointing over 0.12 of the shot instead of 0.08 (src/director/dialogue.js `AIM_BLEND`), for every dialogue film. The peak is now 62°/s in the default layout and 72°/s in Reels.

Tests: tests/gen09.test.js (layout constants and caption placement, Director films clean on every check, authored projects, contract negatives, check negatives, export).
