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
