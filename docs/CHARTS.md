# Charts, timelines, flowcharts and comparison cards (DUAL-04)

Opt-in `compose-v2` items, usually authored as Director `visuals` attached to script sentences (docs/MATHS.md, "Authored visuals"). Drawn by the shared 2D overlay path, so CPU and Three.js show the same values and labels. **Data is authored, never sourced or estimated:** the system checks it and refuses what would mislead; it never "fixes" it.

## chart
`{type:'chart', kind, categories, series, | csv, y?, x?, unit?, xUnit?, yLabel?, xLabel?, valueLabels?, highlight?, annotations?, steps?, phrases?/cues?}`
- **Kinds:** `bar` (grouped when there is more than one series), `line`, `area`, `scatter` (series of `[x,y]` points, up to 60), `pie` (one series, at most 6 slices).
- **Data:** 2–12 categories (≤ 14 characters, unique, kept in the given order: one rule for JSON and CSV), 1–4 series (unique names ≤ 16). Scatter and pie charts take no annotations (a validation error, not a crash). Values are finite numbers within ±1e12, or `null` for **missing**. Units and signs are kept as given.
- **Missing values** are never treated as zero: a gap in a line or area, nothing for scatter, a "no data" mark for a bar. A series with all values missing is refused. Pies refuse missing, zero and negative values.
- **CSV** (instead of categories and series) is inline text of at most 8,000 characters: a header row, then 2–60 rows and 2–6 columns. Quoted fields are allowed (`""` escapes a quote). Numbers must be plain decimals (`-12`, `3.5`); an empty cell is missing. Anything else is refused with its line and column: `1,000` makes a ragged row, and `1e3`, `=SUM(...)`, `NaN` and `Infinity` are not plain numbers.
- **Scales (no misleading charts):**
  - bar and area charts always include zero; an explicit `y` without zero is refused ("a truncated baseline misleads");
  - with an explicit `y`/`x`, any value outside it is refused (data is never clipped);
  - without one, a "nice" range (steps of 1, 2 or 5 × 10^k) covers **every** value of every step;
  - line and scatter charts may start above zero.
- **Steps** (≤ 12, timed by `cues`/`phrases`, otherwise spread over the item): each may give new `series` values (same series, same order, same categories), a `highlight` (`series` and/or `category`; others dim) and a `note`. The first state shows first.
- **Axes never change between steps.** **Only exact data states are drawn** (repair pass, audit 2026-11-26). A step crossfades the old and the new state over 0.5 s, element by element (each bar, line series or pie), where values differ; unchanged elements stay solid. Each value label fades with its own element, so a label never disagrees with its geometry; pie percentages belong to their own state. A value that appears or disappears (missing ↔ number) crossfades the "no data" mark and the real bar at its true height. No in-between value is ever drawn.
- **When items appear:** charts (and arrays) appear at their own start or , showing their first state; step  time only the steps (found in the dual04-bakery-r3 validation stills, where the chart appeared only at its first step). Items whose steps reveal parts (bullets, plots, graphs, timelines, flows, cards) appear at their first step.
- **Opening reveal:** a left-to-right wipe of the plotting area (pies fade in). Data coordinates are never scaled, so no point is ever drawn outside its axis range or at a false value.
- **Drawable ranges:** non-zero values below 1e-9 in size are refused ("rescale the unit"), as are ranges spanning less than 1e-9 or less than one part in a billion of their values (e.g. 1e11 and 1e11 + 0.0001: "chart the differences instead"). Every derived scale must be finite and positive, with at least two increasing finite ticks. Range tolerances are relative to the span (1e-9 of it), never an absolute 1e-9.
- **Labels:**
  - legend (more than one series): must fit, or it is refused;
  - category labels: 22 px down to 14 px, else refused;
  - `valueLabels`: must fit their bars;
  - `annotations` (≤ 4, at a category, not at a missing value);
  - pie labels: "name  value unit  percent"; percentages use largest-remainder rounding, so they add up to exactly 100. The legend goes beside the pie, beside a smaller pie, or below it; if none fits, it is refused.
- **Colours per theme:** aether-v1 cyan, gold, lavender, pink; paper-v1 rust, blue, ochre, green.

## timeline, flow, compare
- **`timeline`:** 2–8 events `{when ≤ 12, label ≤ 24}` on a line, labels alternating above and below. Each event appears at its cue, or evenly spread.
- **`flow`** (flowchart): 2–6 boxes (≤ 40 characters, wrapped) joined by arrows; `direction:'column'` (default) or `'row'`. Boxes appear one by one.
- **`compare`:** exactly 2 cards `{title ≤ 24, points: 1–5 of ≤ 48}`; card *j* appears at cue *j*.
- **Directed diagrams:** use `graph` with `directed:true` (docs/MATHS.md).
- **Size:** each picks the largest text size that fits its box; otherwise it is refused with a message.

## Visuals claim phrases
A visual now claims the narration **phrases** that hold its sentences. A planner shot is split at phrase boundaries or merged as needed, and only two visuals needing the same spoken phrase conflict.

## Planner notes
When a script mentions data or formulas, the Director never invents a chart or an equation. It shows a card and records `AUTHORED_VISUAL_SUGGESTED` ("add a chart with your data in request.visuals"). Images stay `VISUAL_AID_NOT_YET_SUPPORTED` until DUAL-05.

## Fixtures
- `examples/dual04-bakery.request.json` (**example data**, said so in the narration): a bar chart with a Friday highlight; a week-2 transition with a missing Wednesday ("no data"); a pie of takings (50/30/20 %); a temperature scatter.
- `examples/dual04-bread.request.json`: a flowchart (mix → rise → shape → bake), a morning timeline, sourdough-versus-yeasted cards, and a directed supply diagram.
