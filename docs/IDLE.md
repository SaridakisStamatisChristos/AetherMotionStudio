# GEN-11 idle weight shift (2026-11-25)
Authorized by the owner: "lets do it seriallized. Gen10 and onwards." Problem: characters look stiff while they listen.

- **Opt-in** `bodyLanguage.weight: true`.
  - Every Director dialogue film turns it on, for every shot with body language (src/director/index.js).
  - talk-v1 staging and the authored TALK showcases are unchanged, so their accepted films stay valid.
- **Motion** (src/core/body.js `WEIGHT`, `weightAt`):
  - each bound human or robot stands on one leg for 6–9 s (a schedule derived from its ID), then moves its hips over the other foot in 1.5 s;
  - the lean is ±0.022 rad about the ground point under the body, peaking at about 2.5°/s;
  - this fits the owner's "calm, sparse motion" taste.
  - Characters that walk (moving x/z tracks or a walking track) and animals get no weight shift.
- **Geometry** (src/visual/catalog.js `headRoute`, pose `hip`):
  - everything above the hips leans;
  - the feet stay planted, and the leg rods run from the planted foot to the moved hip;
  - head nods and tilts combine with the lean;
  - without `pose.hip`, the geometry is unchanged (the digests are unchanged).
- **Pinned-test update:** tests/talk04.test.js now expects `weight: true` in Director dialogue body language. This is a deliberate, recorded change.

Tests: tests/gen11.test.js (bounded and calm, holds and moves, per character; contract negatives; walkers excluded; motion and crowding checks clean; feet planted; nothing changes without the opt-in).
