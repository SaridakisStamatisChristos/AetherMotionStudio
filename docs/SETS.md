# GEN-12 topic-fitting sets (2026-11-25)
Authorized by the owner: "Gen10 and onwards" and "merge and continue". Problem: every film looked alike. The offline Director alternated three lighting palettes shot by shot and never used the layered backdrops, and dialogue films often showed the same set piece in every shot.

## What changes
- **Request field `sets`:**
  - `'topic-v1'` or `'none'`;
  - absent means topic-v1 for dialogue films and unchanged output for every other request (the director digest is unchanged);
  - not allowed with identity stories, which keep their authored locations;
  - never part of the model prompt.
- **One location per film** (src/director/sets.js `topicSet`, `applySet`):
  - the topic category is scored from the topic words (×4) and the narration (×1);
  - each category maps to a palette and a layered backdrop that both renderers already draw:

    | Category | Palette | Backdrop |
    |---|---|---|
    | technology | midnight | energy-hub |
    | science | laboratory | energy-hub |
    | architecture | amber | city-dusk |
    | business | midnight | city-dusk |
    | nature | amber | solar-field |
    | vehicles | amber | city-dusk |
    | everyday | amber | none |

  - If no word matches, the film keeps the Director's environments and the report says why.
- **Set pieces that fit** (`fitPieces`, on the dialogue script before staging, so placement and pointing work as before):
  - a piece that fits the category, or that the topic or the line names, is kept unless an earlier shot already used it;
  - otherwise the best-matching unused piece of the category is used;
  - the broad "everyday" category only swaps in pieces that share words with the topic or the line, never a random object.
- No new assets. Deterministic.

## Examples (fresh Director requests, no hand edits)
| Topic | Location | Set pieces |
|---|---|---|
| internet / message | midnight, energy-hub | laptop, network switch, router, energy core, desktop computer |
| forests clean the air | amber, solar-field | pine, oak, palm, birch, autumn tree, cactus |
| banks lend money | midnight, city-dusk | area, bar, column, stacked-bar and line charts, histogram |
| vaccines | laboratory, energy-hub | atom model, molecules, DNA helix, RNA strand |
| brew coffee at home | amber | coffee machine (kept) |

## Findings (not changed here)
- "Why do bridges not fall down?" gives three one-line shots. GEN-06 turns each into a single, so no set piece is ever seen (GEN-06 behaviour, recorded).
- "City bus route" scores architecture and vehicles equally; ties go to the earlier category (architecture).

Tests: tests/gen12.test.js (category scoring, palettes, no-match report, fitting without repeats, everyday guard, Director defaults, sets none, legacy unchanged, prompt unchanged, negatives, every quality check clean on three fresh topics).

## topic-v2: dressed sets and word-matched pieces (GEN-15 step 2, 2026-11-26)
Owner saw a DNA helix in a film about the sky. topic-v1 kept any piece of the right category even when no word matched. `sets: 'topic-v2'` is the Director default for dialogue films; `'topic-v1'` stays selectable and unchanged.
- **Dressed sets** (src/core/cinematography.js `DRESSED_SETS`; new layered environments):
  - one set per category: lab-set (science), tech-set (technology), forest-set (nature), office-set (business), street-set (architecture and vehicles), home-set (everyday);
  - each keeps the far skyline blocks and adds 4–5 real catalog objects as dressing behind the speakers (z −2.6 to −4.4): bookshelves, a centrifuge, a microscope, server racks, control panels, trees, rocks, a fern, desks, lamps, a bench, a sofa;
  - drawn by both renderers through the same box stream. The quality checks read only the film's assets, so dressing never changes them.
- **Pieces follow the words** (`fitPiecesFor`):
  - a piece is kept only when its words meet the topic (×3) or the line (×2);
  - its words are its ID plus curated tags (`PIECE_WORDS`; for example the prism matches light, colour, rainbow and sky, and the mountain matches volcano and lava);
  - otherwise the best matching unused piece is used: the category first, then any catalog piece;
  - a piece from another category must be named in full, so "train the body" never brings a passenger train and "tree" never brings a binary tree;
  - with no matching word at all, the topic-v1 rules apply (no repeats; the everyday category never swaps in random objects).
- **Extra category words** (`SETS_V2.words`): light, sky, colour, sound, heat (science); weather, volcano, bees (nature); pay, savings, jobs (business); food, cooking (everyday).

| Topic | Set | Pieces (topic-v2) |
|---|---|---|
| Why is the sky blue? (script) | lab-set | prism, atom model, telescope, planet system, water and carbon dioxide molecules |
| How do forests clean the air? (script) | forest-set | carbon dioxide molecule, pine, autumn tree, oak, palm, birch |
| Internet / message | tech-set | laptop, network switch, router, smartphone, desktop computer |
| Banks lend money | office-set | coin stack, banknotes, bank building, charts |
| Vaccines | lab-set | cell model, virus model, atom and molecules (no passenger train) |
| Volcanoes erupt | forest-set | mountain, trees |
| Brew coffee at home | home-set | coffee machine (kept) |
