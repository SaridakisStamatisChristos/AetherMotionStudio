# Forward-only roadmap

| Gate | Deliverable | Acceptance |
|---|---|---|
| v0.1 | Native Remotion + Kokoro, JSON templates, CLI, CI | Both example videos render, full decode, voice segments validated, contract tests |
| v0.2 | Reusable asset/animation registry | Two distinct scenes use the same independently tested primitives |
| v0.3 | Dynamic timeline, multi-shot film, Kokoro-measured duration | Exact 60-second film, automatic duration, three legacy regression renders, caption/transition tests |
| v0.4 | Cinematic engine and general composable scene graph, first-class Three.js backend alongside CPU | CPU fallback, visual comparison, independently reusable assets, deterministic camera/effects |
| v0.4.1 | Opt-in dual-backend visual fidelity | Matched original/polished renders, bounded lens and surface effects, measured cost |
| v0.4.2 | Universal asset library | 250 object presets, 50 motion presets, 30 effect presets; shared geometry tests and polished CPU showcase |
| v0.4.3 | Cinematography and motion design | Reusable camera/character animation, typography and diagram primitives |
| v0.5 | Provider-neutral AI director | Prompt to validated scene data; malformed output fails safely; measured token consumption |
| v0.6 | Character consistency & asset library | Reusable rig/appearance across independently authored scenes |
| v0.7 | Speech-driven timeline/captions | Measured alignment; no clipping/overlap; timing tests |
| v0.8 | Quality evaluation and repair | Held-out scenes, objective checks plus human visual review, bounded repair |
| v0.9 | Local editor/UI | Preview, edit, render; no mandatory service |
| v1.0 | One-click production | Reproducible release, install docs, real end-to-end evidence |

Current gate: v0.8 candidate; v0.7 scoped predecessor d8816f535339fcab2cd0adcbab6c9bda1e32981c, run 45361307457, artifact 14904319584 (1800 frames, full decode, subtitle export verification; 5 reading-speed outliers). User approved continuation. Default CI: fast tests plus one 50-second quality CPU film; 21 fixtures retained. Native Three.js comparison deferred. Next v0.9 local editor after quality acceptance.
