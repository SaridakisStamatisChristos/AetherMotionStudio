# Binding dual-backend preservation policy

User decision (2026-11-24): both CPU Canvas and Three.js WebGL backends are permanent first-class capabilities. Neither may be retired, replaced, silently substituted, or made dependent on the other without explicit user authorization.

- CPU is the portable, GPU-independent execution option. Three.js is the depth-buffered cinematic option, including software GL where supported.
- Both consume the same versioned declarative scene graph, asset registry, camera and animation tracks, timeline, narration and caption semantics. Backend-specific shading and effects may differ; not all visual features must be pixel-identical.
- Keep explicit backend selection (cpu or three). Fail visibly if the selected backend is unavailable. An automated director may recommend a backend but must preserve explicit user selection.
- Every change to the shared scene contract, assets, timeline, renderer or director must retain the matched cinematic-cpu and cinematic-three fixtures, verify both native renders and preserve the five earlier regression fixtures. Keep the independent matched-output comparison and timing report. Add new tests rather than weakening existing gates.
- Keep both source implementations and example JSON files in version control. Do not modify frozen baseline evidence. Store rendered baseline binaries as release assets, not ordinary git blobs.
- New rendering backends or capabilities are additive. CPU must remain usable without a GPU or paid inference service.

## Scoped verification exception (2026-11-24)
User explicitly authorizes CPU-polished-only development renders during asset/cinematography refinements. Preserve every earlier fixture, both renderer implementations and full comparison jobs. Run shared fast tests and one polished CPU showcase on development pushes. Defer full matched CPU/Three.js native renders until the final head-to-head; use manual suite=full. The full gate is not waived and CPU success does not certify new Three.js output.

## Verified v0.4 baseline

Source commit: `6e3e894e29ae30ba59e82a894760dabea9971b11`. GitHub Actions run: [45348529087](https://github.com/SaridakisStamatisChristos/AetherMotionStudio/actions/runs/45348529087), all nine jobs passed. Identical 12-second Discovery shot, 1080×1920 at 30 fps, Kokoro narration. CPU Canvas 26.559671665 seconds; Three.js swangle 113.978981844 seconds (CI wall time, not a GPU benchmark). Source artifacts: CPU 14898858288; Three.js 14899810419; comparison 14899785482. Archive workflow copies original artifacts, verifies source run identity, packages videos and comparison evidence, and publishes a prerelease anchored to the verified source commit. CI artifact links are temporary; the release assets are the archival copy.

## v1.0 matched release scope (2026-11-24)
User explicitly requests both backend videos at 30 seconds. Default v1.0 CI executes one shared plan and one shared narration preparation followed by exactly two native renders (CPU and Three.js); both must have 900 frames and identical timeline, narration/mix, subtitle and normalized scene hashes. The 23 earlier fixtures remain in manual full suite; a scoped release pair is not the full historical gate. Do not infer GPU performance from software GL timing or aesthetic superiority from RGB differences.

## Asset Foundry scoped development
After v1.0 acceptance, default development pushes return to fast tests and one polished AF-01 CPU fixture. Matched AF-01 Three.js fixture and all prior 25 native outputs remain in manual full suite (plus the new pair). Explicit manual release-pair is retained. Native Foundry WebGL evidence deferred.

AF-03 scoped default: fast tests, six-asset LOD benchmark and one AF03 CPU film. AF01/02/03 matched pairs retained in manual full gate; native WebGL evidence remains outstanding.

AF04 development scope: fast tests and per-asset inspection evidence plus one narrative CPU film. All matching native Three.js scenes preserved; full gate remains deferred.

AF05 default tests and one local-import CPU film; full matched AF05 pair generated deterministically from the authored corpus by CI, previous fixtures retained. Native Three deferred.

AF06 default: structural checks and CPU still inspection sheets plus single selected AF06 CPU film. Matched AF06 native fixture retained in manual full gate. Inspector records the actual shader, including explicit relighting of older fixed-light geometry; native Three inspection deferred.

AF07 default: fast tests and held-out generator evaluation, one AF07 CPU polished film. Both fixtures are generated deterministically from the same committed story request; native Three retained in manual full gate.

AF08 default: pack roundtrip/negative evidence and one AF08 CPU polished film; native paired fixture generated from the same portable authored story, full matrix deferred.

AF09 frozen protocol v1: default new CPU product only, full manual native matrix includes nine final pairs plus all old regression fixtures. Matched and optimized comparisons separated. Authorization and human review required before final acceptance.

## Current CI policy — local-first rendering (2026-11-24)
User authorizes merging the Asset Foundry implementation with routine CI restricted to fast JavaScript and Python tests, protocol planning and Python syntax checks. No automatic native renders or comparisons on pushes to feature branches or main. Manual workflow dispatch retains CPU showcase, matched release pair and complete native matrix. Historical recovery workflows are archived as documentation, not active triggers. Both backends, all fixtures, all original comparison assertions and prior evidence remain intact. Green routine CI does not signify full native qualification. The original full matrix rendered all 48 jobs; final AF09 nine-pair comparison passed following two targeted audio repairs; historical regression remains pending final Speech recovery and comparison. Native visual/performance validation moves to local hardware. Future matched benchmark work must prepare shared narration once per pair. No automatic release publication.

## Final frozen qualification result (2026-11-24)
Verified [recovery run 45447693269](https://github.com/SaridakisStamatisChristos/AetherMotionStudio/actions/runs/45447693269): both jobs succeeded. Speech replacement artifact 14950458642; final comparison artifact [14950928618](https://github.com/SaridakisStamatisChristos/AetherMotionStudio/actions/runs/45447693269/artifacts/14950928618). Log confirms all six replacements' provenance and exact shared audio, compare_foundry_final PASS (9/9), compare_backends PASS, compare_fidelity PASS, compare_phase_pairs PASS (15/15). All original 48 render matrix jobs and six targeted replacements succeeded; structural comparison passed on frozen source 202ee715012c0e857461ec56c4df733a438c1608 with validated derived provenance. This is recovered qualification, not a clean rerun on main; human aesthetic certification, controlled physical GPU performance and release remain separate. No automatic native rendering or release. Reproducible shared-preparation improvements remain a forward development task, not a reason to repeat the historical matrix.

## Campaign A scope (owner-authorized 2026-11-26)
Campaign A (docs/continuity/CAMPAIGN_A_DIRECTIVE.md) extends **both** backends equally: character-free content, typography, maths, charts, local images, formats, themes and audio controls. Content semantics must match across backends; pixels may differ. GPU-exclusive features (Campaign B) stay out of scope, and this policy stays unchanged until v1.2 is verified, owner-accepted and tagged and the owner explicitly authorizes a revision. All earlier sections of this policy remain binding.

## Status 2026-11-27: v1.2 tagged; Campaign B revision pending (no rule changed here)
Campaign A is verified, owner-accepted and tagged (`v1.2-dual-backend-final` → 2cb82ef).
- The owner has supplied the Campaign B directive (docs/continuity/CAMPAIGN_B_DIRECTIVE.md).
- Its first gate (GPU-00) is an ADR (docs/adr/ADR-001-render-profiles.md). It would keep CPU Classic and GPU Standard first-class for every shared feature and allow GPU-exclusive capabilities only in an opt-in GPU Cinematic profile, with capability negotiation and no silent substitution.
- **Until the owner approves that ADR, every section of this policy above stays fully binding**, including "both backends first-class" for all features.
- After approval, a new section here points to the ADR, and the earlier sections stay.
