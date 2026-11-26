# Campaign A qualification protocol — `campaign-a-protocol-v1`

Version **v1**, fixed at DUAL-00 (2026-11-26). Changes need a new version (`v2`, …) with the reason recorded in CAMPAIGN_A.md; v1 stays as written. The frozen AF09 protocol (`benchmarks/foundry-final-v1.json`) and all earlier evidence are untouched and not part of this protocol.

## Fixture and film IDs
- Format: `dual<NN>-<slug>-r<n>`, for example `dual00-baseline-r1`, `dual03-euclid-r2`. `NN` is the milestone (00…09), `slug` is short lowercase words joined by hyphens, `r<n>` counts attempts from 1.
- An ID is never reused. A failed or rejected attempt keeps its ID and the next attempt increments `r`.
- Matched pairs come from one `produce.mjs --backend both --id <id>` run, which prepares speech once and writes `<id>-prepared`, `<id>-cpu-polished`, `<id>-three-polished` and `<id>-production`.
- Committed request fixtures for the campaign live in `examples/` as `dual<NN>-<slug>.request.json` (or `.json` for authored scenes). Existing examples are never edited to make a campaign film.

## Per-milestone exit evidence
1. Source: a clean committed revision (`sourceDirty false`), its SHA recorded.
2. Tests: `npm test` fail 0 (record skips) and the Python unittest command OK; new positive, negative and adversarial tests for each new contract.
3. Digests: `node scripts/fod-digests.mjs . --exclude talk04,talk05,gen01,gen09,gen12,fixa,dual` unchanged (the `dual` prefix keeps campaign request fixtures out of the legacy Director set; added at DUAL-01, where it first mattered) from DUAL-00 (graph 3d33fbaee198acad, geometry 14dec244d171dc56, detail2 e3f80439a292f21a, director 2cbf9916e65da935), unless a milestone adds a versioned, opt-in catalog entry and records the new digest with the reason.
4. Films: fresh `dual<NN>-…` matched pairs on both backends; produce PASS lines; `CHECKS:` line; `frame_glitch.py`; ebur128 loudness; speech-report `pace`, `fit`, `alignment.maxCps`; matched shared hashes exact (timeline, narration PCM, mix, captions).
5. Inspection: agent stills from named frames on both backends. Owner review is recorded separately, never assumed.
6. GL route: Three.js films state `AETHER_GL` and the WebGL renderer string (vulkan → RTX 4060 on the owner PC; swangle → SwiftShader).

## Final matrix (DUAL-09), avoiding a Cartesian product
At least one matched pair for each content mode: dialogue, narrator-only, mixed, typography, maths/algorithm, charts/diagrams, image-based. Across that set: all three aspect ratios appear at least once, 30, 60 and 90 s lengths appear at least once, and one project near 300 s. Plus a selective set of accepted earlier examples. Full historical CI matrix only on the owner's word.

## Baseline (DUAL-00)
Recorded in CAMPAIGN_A.md: start commit, environment, GL identity, tests, digests and the `dual00-baseline-r1` matched film.
