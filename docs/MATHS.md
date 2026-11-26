# Maths, geometry and algorithm visuals (DUAL-03)

Opt-in `compose-v2` items, authored per film through the Director request field `visuals` (or in an authored `--project`). Drawn by the shared 2D overlay path, so CPU and Three.js films show identical maths. Authored formulas and data are authoritative: the system checks claims where it can and **rejects** wrong ones; it never corrects or invents them.

## Dependency (owner-approved 2026-11-26: "MathJax 4.1.3")
- `@mathjax/src` **4.1.3**, pinned exactly in package.json (Apache-2.0).
- Its dependencies: `@mathjax/mathjax-newcm-font` 4.1.3, `mhchemparser`, `mj-context-menu` and `speech-rule-engine` (all Apache-2.0); `commander`, `@xmldom/xmldom` and `wicked-good-xpath` (MIT); `rimraf` (ISC). About 98 MB in node_modules; nothing large in git.
- Used **only in Node** while planning (src/director/math-compile.js); a test checks that neither browser bundle (Remotion entry, Studio page) imports it. Renders load no maths library or font.

## Equations
- `{type:'equation', tex, check?}`. TeX is limited to 200 characters, brace depth 8, and an **allowlist** of commands and environments (src/core/math.js `TEX_COMMANDS`, `TEX_ENVIRONMENTS`): fractions, roots, powers and indices, Greek letters, relations, arrows, sets, logic, sums and products, integrals and limits, common functions, `gcd`/`mod`, brackets, accents and vectors, angles, `matrix`/`pmatrix`/`bmatrix`/`vmatrix`/`Bmatrix`/`cases`/`aligned`.
- **Not allowed:** `\href`, `\def`, `\require`, HTML, `$`, unknown commands.
- **Compilation:** MathJax (TeX input with packages base and ams, SVG output, New Computer Modern font, `fontCache:'none'`) runs in Node. Only path data and transforms are kept: `compiled:{key, box, paths:[{d,m}]}`. The `key` binds the outlines to the TeX and the compiler version. The browser-side validator checks the path syntax and size limits.
- **Trusted boundary:** the Director and authored `--project` loading (src/director/math-loader.js) **regenerate every equation's outlines from its TeX**. Supplied `compiled` data is ignored there, even when its key matches (repair pass, audit 2026-11-26). The browser-side check stays structural (key, path syntax, sizes); renders read only scenes this boundary produced.
- **Errors:** MathJax errors are rejected with their message. Characters outside the maths font's base ranges (for example accented letters inside `\text`) are rejected; put such words in a text label.
- **Size:** the largest of 72…24 px per em that fits the box; otherwise an overflow error.
- **`check:'arithmetic'`:** every side of `=` must reduce to the **same exact rational number** (src/core/exact.js: BigInt numerator and denominator; repair pass, audit 2026-11-26 — floating point with a tolerance had accepted 1000000000 = 1000000001, 1/10000000000 = 0 and 9007199254740992 = 9007199254740993). The exact subset covers numbers (≤ 40 digits, decimals exact), `+ - \cdot \times \div / ^`, integer exponents up to 64, `\frac`, `\sqrt` (only when the result is rational), `\gcd` (integers), parentheses and unary signs. Limits: 200 characters, 120 tokens, nesting depth 24 at every level, 2000 digits in any intermediate value.
  - A false equation is rejected, with the exact sides shown ("evaluate to 1000000000 vs 1000000001").
  - Anything else is *unverifiable* (irrational root, non-integer or large exponent, division by zero, letters) and rejected while the check is requested; it is never certified by numerical closeness.
  - Without a check, an equation is reported as *not checked*, never as verified.

## Bounded expression parser (src/core/expr.js)
- **Grammar:** numbers, `x`, `pi`, `e`, `+ - * / ^`, parentheses, `sin cos tan asin acos atan sqrt abs exp ln log floor ceil`, `gcd(a,b)`.
- **Limits:** 160 characters, 120 tokens, nesting depth 24, enforced on every recursion path (unary signs and power chains included; repair pass).
- **No `eval`, no `Function`, no property access.** Non-finite results are returned as NaN; each caller treats them explicitly (a gap in a plot, or a false claim).

## Plots and geometry
- `{type:'plot', x:[min,max], y:[min,max], equal?, grid?, axes?, xLabel?, yLabel?, clip?, shapes:[…], phrases?}`. Ticks use steps of 1, 2 or 5 × 10^k. `equal:true` keeps both axes at the same scale, and circles require it.
- **Shapes** (up to 24, each with an optional `step` 0–15 and tone `mark`/`text`/`sub`): `point{at,label}`, `segment{from,to,label}`, `vector{from,to,label}` (arrow), `circle{center,r,label}`, `polygon{points}` (3–12 points), `label{at,text}`, and `function{expr,domain}` (200 samples; a non-finite sample is a gap; fewer than half finite is rejected).
- **No misleading clipping:** any point or shape outside the ranges is rejected ("widen x/y rather than clip"). A function leaving the y range is rejected unless `clip:true`; the clipped parts are then left out, never flattened onto the edge.
- **Steps** appear in order, each at its narration phrase (`phrases`/`cues`) or evenly across the item window. Lines and functions draw progressively.

## Algorithms
- **`graph`:** 2–12 nodes placed in the box, labels ≤ 10 characters that must fit the node, no overlapping nodes. 1–24 edges, directed or not; no self-loops or duplicates. 1–16 steps, each `{visit, edges, note}`. With `algorithm:{name:'bfs', start}`, the cumulative visit order must equal breadth-first order from `start`, taking neighbours in the order the edges are listed. A wrong order is rejected and the message shows the expected order.
- **`array`:** 2–10 values and 1–16 steps `{values, highlight, note}`. The initial values show first. With `algorithm:{name:'euclid'}` (two non-negative integers), each step must turn `(a, b)` into `(b, a mod b)` and stop at `b = 0`; the gcd is reported.

## Authored visuals (Director request field `visuals`)
- `visuals:[{at:"exact sentence of the script", composition:{version:'compose-v2', …}}]` (at most 24). Needs a content mode and a `script`.
- **A visual defines its shot:** the planner shots holding any sentence the visual names (`at`, plus item `cue`/`cues`) are merged into one shot (at most 8 phrases). Two visuals that would share a shot are refused, as are sentences not in the script or not unique.
- **Timing by sentence:** an item's `cue:"…"` becomes `phrase` (the item starts when that sentence is spoken); `cues:[…]` becomes `phrases` (one per step).
- **Maths report:** in `director-stages.json` `maths` and the manifest: equations `verified-arithmetic` or `not-checked`, algorithms `verified-bfs` / `verified-euclid`, plots `ranges-checked`.

## Fixtures
- `examples/dual03-pythagoras.request.json`: geometry construction with a right-angle mark, a symbolic law (not checked) and a checked sum.
- `examples/dual03-euclid.request.json`: three checked division steps, a verified Euclid state array and a checked gcd.
- `examples/dual03-bfs.request.json`: a six-node graph with verified breadth-first levels.
