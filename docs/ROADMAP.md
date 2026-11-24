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

Current gate: v0.7 candidate; v0.6 scoped checkpoint 24210f9a41bb44c655a5865c153b8f44528e1b45, run 45359000856, artifact 14902619722 (1500 frames, full decode, Kokoro, user approved continuation). Default CI: fast tests and one 60-second speech-first CPU film. All nineteen fixtures retained; Three.js full native comparison deferred. Next v0.8 quality evaluation and bounded repair after scoped MP4/subtitle acceptance.
