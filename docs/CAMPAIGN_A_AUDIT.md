# Campaign A capability audit (DUAL-00)

Audit of main **d3982f5** (product code identical to 6c71875), 2026-11-26. One row per capability the directive asks for in DUAL-01 … DUAL-08.
Status words: **existing** (meets the directive's need now), **partial** (a seam exists; extend it), **missing** (nothing to extend), **out of scope** (Campaign B or excluded).
This is a scope map from reading the source. Nothing here is a render claim; the baseline evidence is in [CAMPAIGN_A.md](continuity/CAMPAIGN_A.md).

## Architecture facts that shape every milestone
- **One logical canvas.** Every v2 frame is drawn in a 720×1280 logical space and scaled to the output size (`ctx.scale(W/720,H/1280)` in [src/visual/draw-graph.js](../src/visual/draw-graph.js) and [src/core/draw-film.js](../src/core/draw-film.js)). The output size comes from `FORMAT` (1080×1920, 30 fps) in [src/core/contract.js](../src/core/contract.js) via the Remotion composition in [src/index.jsx](../src/index.jsx).
- **Shared 2D overlay path (already exists).** On both backends the 3D world is drawn first (CPU painter, or the Three.js canvas from [src/visual/three-backend.js](../src/visual/three-backend.js) drawn in with `drawImage`). Then the *same* Canvas 2D code draws titles (`polishedType`), overlays (`drawOverlays` in [src/visual/draw-overlays.js](../src/visual/draw-overlays.js)), the progress bar, transitions and burned-in captions (`drawSpeechCue`). This is the natural home for all new 2D content (text, maths, charts, images): content semantics stay identical across backends by construction. Reports must name it: **"shared 2D overlay path (Canvas 2D, after the world pass)"**.
- **A cinematic-graph shot needs 1–8 assets** ([src/core/graph.js](../src/core/graph.js) `validateGraph`). An empty, character-free shot is not expressible today; DUAL-01 needs an opt-in versioned way to have no asset or only non-character props.
- Content data is already declarative and validated (field allowlists, length limits, finite numbers, `safeText` refuses URLs and markup in [src/director/schema.js](../src/director/schema.js), `safeJson` bounds depth and refuses unsafe keys).

## DUAL-01 — Character-free content and shared composition
| Capability | Status | Where | Notes |
|---|---|---|---|
| Character dialogue mode | existing | src/director/dialogue.js, src/core/dialogue.js, src/studio/director-form.js (`interview`, `trio`) | Accepted; keep unchanged. |
| Narrator-only explainer | **partial** | src/director/offline.js `offlineIR`; Studio cast `narrator` "Narrator only (no characters)" | Voice is narrator-only, but every offline shot **adds a `retro-robot` character** (offline.js, `assets.push({asset:'retro-robot',…})`). The Studio label promises no characters. DUAL-01 must add an opt-in mode without the robot. |
| Silent visual content | missing | src/core/speech.js (speech config), scripts/speech_pipeline.py | Speech-less v2 scenes exist (captions from `a.caption`), but there is no explicit "silent" mode in the Director or Studio. |
| Mixed shots (character + visual aid) | partial | overlays per shot (graph.js `overlays`, max 3; Director IR `overlay`, max 1) | Works today with fixed slots; needs the richer primitives below. |
| Title, label, callout, arrow, lower-third | partial | src/core/overlays.js types `title`,`lower-third`,`label`,`callout`,`arrow` | Three fixed slots (upper/center/lower, 624 px wide), one style, text ≤ 56 chars, arrow is a fixed horizontal glyph. No free placement, no pointing at a target. |
| Panels/cards, backgrounds, shape groups | missing | — | Only the overlay's rounded box. Backgrounds are 3D environments only (`laboratory`,`midnight`,`amber`, sets). |
| Image slots | missing (2D) | see DUAL-05 | — |
| Reveal/transition actions | partial | overlays.js `animation`: stagger, reveal, emphasize, slide, counter; shot transitions fade/wipe/slide/match | Bounded already; extend, don't replace. |
| Safe areas, ordering, deterministic placement | partial | src/core/reels-layout.js (Reels safe area), overlays duplicate-slot check, src/quality/visibility.js, crowding.js | Safe area is defined for Reels only and in 1080×1920 pixels. |
| Contrast checks | missing | — | No contrast measurement for text. |
| Director plans visual aids | partial | offline.js adds one `lower-third` per narrator shot | It never picks a chart, diagram or equation; unsupported content is not diagnosed. |

## DUAL-02 — Typography and motion graphics
| Capability | Status | Where | Notes |
|---|---|---|---|
| Titles / headings | existing | draw-graph.js heading + subheading; fidelity-effects.js `polishedType`; `titles:'none'` | Accepted look; keep. |
| Quotations, emphasis, kinetic type, bullet reveals | missing | — (overlay `reveal`/`emphasize` are single-line effects) | — |
| Number counters | partial | overlay `counter` (from → to, unit) | Integer rounding only, no format/locale/decimals. |
| Captions distinct from editorial text | existing | draw-film.js `drawSpeechCue`; speech.js captions `mode` burn-in/sidecar/both, `highlight`, `maxChars`, `maxLines`, `maxCps`, `speakerNames` | Word highlight timing is estimated (alignment `estimated-word/measured-phrase`); keep it labelled estimated. |
| Deterministic wrapping | partial | draw-film.js `wrapCaption` (captions only) | Editorial text uses `primitives.text` → `fillText(s,x,y,max)`, which **silently squeezes** long text horizontally; no wrapping, no overflow diagnostic. |
| Alignment, font fallback, theme tokens | missing | primitives.js hard-codes Arial; colours are literals | Font identity is the system "Arial" only. Local font files would be an owner decision (licence). |
| Unicode coverage / missing-glyph report | missing | `literal`/`safeText` refuse control characters only | No glyph-coverage check. |
| Text timed to measured phrases | partial | timeline.js cues, speech `syncActions` | Overlays use shot progress windows, not phrase windows. |

## DUAL-03 — Mathematics, geometry, algorithms
| Capability | Status | Where | Notes |
|---|---|---|---|
| Equation primitives | **partial (minimal)** | overlay `equation`: 2–5 text boxes of ≤ 14 chars joined by lines | No fractions, powers, roots, matrices. A typesetter is a new dependency (owner decision); otherwise a built-in declarative layout. |
| Coordinate systems, axes, plots | missing | — (chart axes only, see DUAL-04) | — |
| Lines, circles, polygons, vectors | missing (2D content) | primitives.js has `polygon`, `glow`, `star` as drawing helpers, not scene content | — |
| Graph nodes/edges, trees | partial | overlay `network`: ≤ 5 nodes in one row, ≤ 10 undirected edges, index-validated | No layout, direction, trees or highlighting. |
| Arrays and algorithm state steps | missing | — | — |
| Bounded expression parser | missing | — | Must be allowlisted, never `eval`. |

## DUAL-04 — Charts, diagrams, data
| Capability | Status | Where | Notes |
|---|---|---|---|
| Bar, line, pie | **partial** | overlay `bar`,`line`,`pie`; draw-overlays.js | 2–5 points, lower slot only, values 0…1e9 (no negatives), labels ≤ 12 chars, axis only shows max and 0, no ticks, no legend except pie labels, no data transitions. Finite-number and positive-domain checks exist. |
| Scatter, area | missing | — | — |
| Annotations, highlights, units | partial | `unit`, `axis` strings | — |
| Flowcharts, directed diagrams | missing | (`network` is undirected) | — |
| Timelines | partial | overlay `timeline`: 2–5 labelled nodes in a row | — |
| Comparison cards | missing | — | — |
| Local JSON / bounded CSV data import | missing | data is inline in the shot only | — |
| Collision/overflow diagnostics | missing | — (text squeezes silently) | — |

## DUAL-05 — Local media
| Capability | Status | Where | Notes |
|---|---|---|---|
| Import quarantine, provenance, hashes | existing (3D) | src/foundry/import-bundle.js, scripts/foundry-import.mjs, import-sources.mjs, import-formats.mjs, docs/foundry/ | Bounded local staging, digests, licence quarantine, symlink rejection (test skipped on this Windows account). |
| PNG | partial | scripts/import-png.mjs `decodePNG`; import-formats.mjs `parsePNG` | Imported as a **3D textured plane** for the Foundry profile, not as a 2D image slot. |
| JPEG, WebP | missing | — | Would need a decoder; check what Chromium/Canvas can decode locally before adding anything. |
| SVG | partial (restricted) | import-formats.mjs `parseSVG` refuses `& ! ? ' \` and >64 KB | Converts simple shapes to meshes. 2D SVG needs the owner's sanitizer decision. |
| Crop/fit, pan/zoom, layers | missing (2D) | — | — |
| Missing-file / hostile-file diagnostics | partial | import pipeline errors; Studio safe paths | Need the same for 2D image slots. |

## DUAL-06 — Formats, themes, audio
| Capability | Status | Where | Notes |
|---|---|---|---|
| 1080×1920 / 30 fps | existing | contract.js `FORMAT`, src/index.jsx | Default; keep. |
| Reels layout | existing | src/core/reels.js, reels-layout.js, scripts/reels-export.mjs | Opt-in `delivery:'reels-v1'`. |
| 1920×1080 and 1080×1080 | **missing** | — | Logical space is 720×1280; overlay boxes, captions, titles, Reels safe area and camera framing all assume 9:16. Needs a real reflow, not a stretch. Owner decision: opt-in presets, default unchanged. |
| Themes (colours, type, captions) | partial | 3 environments; looks crafted-v1/v2; sets topic-v1…v3; overlay palette literal | No theme token set for 2D content. |
| Narration voice, pacing | existing | contract.js `VOICES` (9 Kokoro voices); speech `pace`, `fit` | — |
| Music gain, ambience, ducking, SFX | existing (engine) / missing (Studio) | speech.js `mix` {narration, music, ambience, sfx, duck, fadeSeconds, peak, master}, `cues`; speech_pipeline.py synthesises music/ambience deterministically | No Studio controls for them. |
| Caption toggles | existing | speech captions mode; Studio "Speaker names", "Titles on top" | — |
| Explicit mute / silent mode | missing | — | Must not look like a speech failure. |

## DUAL-07 — Director and Studio
| Capability | Status | Where | Notes |
|---|---|---|---|
| Director schema, offline planner, providers | existing | src/director/ (schema, index, offline, providers, sets, dialogue) | Prompt versions director-ir-v1.1…v1.3 with digests; providers optional. |
| Content-mode, theme, format selection | missing | — | — |
| Pasted scripts, auto-clean, length advice | existing | studio/app.js, director-form.js, docs/SCRIPT_FORMAT.md | Keep. |
| Simple and Advanced views | existing | studio/index.html, docs/STUDIO.md | Keep. |
| Data/equation/media editing in Advanced | missing | Advanced edits shots, assets, Foundry only | — |
| Job queue, progress, finished panel, downloads, Reels cover | existing | scripts/studio-server.mjs, src/studio/progress.js, finished.js | — |
| Authoring guide per content mode | partial | STUDIO_GUIDE.md, docs/SCRIPT_FORMAT.md (dialogue/narrator) | — |

## DUAL-08 — Batch production (owner decides)
| Capability | Status | Where | Notes |
|---|---|---|---|
| Single production CLI | existing | scripts/produce.mjs (`--request --backend both --id`), native-render.mjs | — |
| Studio job list | partial | studio-server.mjs jobs (in-memory, one session) | No persistent queue, resume or per-batch manifest. |
| Batch queue, cancel/resume, restart recovery | missing | — | — |

## Verification and production tools (reuse in every milestone)
`scripts/produce.mjs`, `verify.py`, `quality_media.py`, `frame_glitch.py`, `compare_backends.py`, src/quality/ (`motion-check`, `visibility`, `crowding`, `silence`, `composition`, `preflight`), `scripts/fod-digests.mjs`. Tests at d3982f5: 412 JS (411 pass, 1 skip), 59 Python.

## Out of scope for Campaign A
PBR, HDR/IBL, cinematic post, high-detail models, skeletal/morph rigs, animated GLB, GPU particles, the former GEN-16 Three cinematic profile (Campaign B).
