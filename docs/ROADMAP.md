# Forward-only roadmap

| Gate | Deliverable | Acceptance |
|---|---|---|
| v0.1 | Native Remotion + Kokoro, JSON templates, CLI, CI | Both example videos render, full decode, voice segments validated, contract tests |
| v0.2 | Reusable asset/animation registry | Two distinct scenes use the same independently tested primitives |
| v0.3 | Dynamic timeline, multi-shot film, Kokoro-measured duration | Exact 60-second film, automatic duration, three legacy regression renders, caption/transition tests |
| v0.4 | Cinematic engine and general composable scene graph, first-class Three.js backend alongside CPU | CPU fallback, visual comparison, independently reusable assets, deterministic camera/effects |
| v0.5 | Provider-neutral AI director | Prompt to validated scene data; malformed output fails safely; measured token consumption |
| v0.6 | Character consistency & asset library | Reusable rig/appearance across independently authored scenes |
| v0.7 | Speech-driven timeline/captions | Measured alignment; no clipping/overlap; timing tests |
| v0.8 | Quality evaluation and repair | Held-out scenes, objective checks plus human visual review, bounded repair |
| v0.9 | Local editor/UI | Preview, edit, render; no mandatory service |
| v1.0 | One-click production | Reproducible release, install docs, real end-to-end evidence |

Current gate: v0.4 verified at 6e3e894e29ae30ba59e82a894760dabea9971b11 (run 45348529087, all nine jobs passed). Next gate: v0.5 AI director. Both rendering backends are binding requirements; see DUAL_BACKEND_POLICY.md. Visual superiority and production readiness are not implied.
