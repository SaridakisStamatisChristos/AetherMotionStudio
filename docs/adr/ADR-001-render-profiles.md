# ADR-001: Render profiles and capability negotiation

**Status:** **Accepted** by the owner on 2026-11-27 ("Approve as written", a UI choice during GPU-00). Drafted at GPU-00 the same day. [DUAL_BACKEND_POLICY.md](../DUAL_BACKEND_POLICY.md) points here in its section "Campaign B render profiles (ADR-001)"; all its earlier sections stay binding.

**Context:** Campaign B directive §2 and §4 GPU-00 ([CAMPAIGN_B_DIRECTIVE.md](../continuity/CAMPAIGN_B_DIRECTIVE.md)). Inventory: [CAMPAIGN_B_AUDIT.md](../CAMPAIGN_B_AUDIT.md).

## 1. Decision in one paragraph
There are three user-facing render profiles on two backends.
- **CPU Classic** and **GPU Standard** are exactly the v1.2 backends. They stay first-class for every shared feature, now and in future.
- **GPU Cinematic** is a new opt-in, versioned profile of the same Three.js backend. Only this profile may use GPU-exclusive capabilities.

Before any expensive work, a preflight check compares the capabilities a film needs with what the chosen profile supports. A mismatch stops with a precise diagnostic and explicit choices for the user. Nothing is ever stripped, substituted or switched automatically.

## 2. Profiles
| Profile | Backend | How a film selects it | Capabilities |
|---|---|---|---|
| CPU Classic | `cpu` | `shot.backend: 'cpu'`, no `renderProfile` | `shared` |
| GPU Standard | `three` | `shot.backend: 'three'`, no `renderProfile` | `shared` |
| GPU Cinematic | `three` | `renderProfile: 'cinematic-v1'` on the film, every shot `backend: 'three'` | `shared` + the Cinematic set of its version |

- **Absent `renderProfile` means exactly the v1.2 behaviour.** Every existing example, film, digest and test is untouched.
- `shared` is the whole v1.2 feature set (looks, Foundry, content modes, formats, themes, fidelity effects on the 2D path). Any new feature that both backends get also joins `shared`.

## 3. The field (name and versioning)
- **Name: `renderProfile`.** The name `profile` is taken: it is the fidelity profile (`original` / `polished`) in Director requests and the Studio. The two must never be confused.
- **Where:** an optional **film-level** field of v2 projects, and the same optional field on Director requests, batch jobs and the Studio (GPU-11). It is film-level because one film is one render job: the GPU budget, matched-pair rules and reports are per film.
- **Values:** `cinematic-v1` only, at first. A later incompatible change makes `cinematic-v2`; `v1` stays renderable unchanged, as old looks do today.
- Invalid values are refused by name (`renderProfile: unknown profile "cinematic-v9"`).

## 4. Capability vocabulary (typed)
- A capability is a string `<name>-v<N>`. The table lives in one module (proposed `src/core/render-profiles.js`) and lists, for each capability: its version, the milestone that adds it, and the profiles that support it.
- **Derived, not declared:** preflight computes the capabilities a film needs from the fields it uses (for example a Cinematic material preset needs `pbr-v1`). A film cannot claim fewer than it uses.
- Planned names (each enters the table only when its milestone is accepted):

| Capability | Milestone | Supported by |
|---|---|---|
| `shared` | v1.2 | Classic, Standard, Cinematic |
| `pbr-v1` (physical material presets; film field `cinematic: {version: 1, materials: 'pbr-v1'}`) | GPU-01 (implemented, PR open) | Cinematic |
| `env-light-v1` (lighting presets, environment light) | GPU-02 | Cinematic |
| `proc-texture-v1` | GPU-03 | Cinematic |
| `glb-v1` (validated local GLB) | GPU-04 | Cinematic |
| `skeletal-v1`, `morph-v1` | GPU-05/06 | Cinematic |
| `scene-set-v1` (instanced environments) | GPU-07 | Cinematic |
| `post-v1` (GPU post-processing) | GPU-08 | Cinematic |
| `sci3d-v1` (3D scientific primitives) | GPU-09 | Cinematic |

- A Cinematic feature may later be ported to Standard or CPU; it then joins those profiles' columns explicitly, with tests. That is the owner's decision per feature.

## 5. Preflight negotiation contract
- **When:** at option and plan time: in `produce.mjs` and `batch.mjs` before speech preparation, in the Studio before a job is queued, and again in `validateProject` before rendering. Never after rendering has started.
- **Result:** either `ok`, or a list of diagnostics. Each diagnostic has a stable code, the field path, and the choices offered.

| Code | Meaning | Choices offered to the user |
|---|---|---|
| `RP-01 unknown-profile` | `renderProfile` is not a known value | correct the value |
| `RP-02 backend-mismatch` | `cinematic-*` on a shot with `backend: 'cpu'` | render on Three.js Cinematic; or run the explicit "make shared" conversion (below); or cancel |
| `RP-03 capability-unsupported` | the film uses a capability its profile lacks (for example `pbr-v1` with no `renderProfile`) | add `renderProfile: 'cinematic-v1'`; or run the conversion; or cancel |
| `RP-04 matched-pair-mismatch` | `--backend both` (CPU + Three) for a Cinematic film | `--backend three`; or remove `renderProfile` for a CPU + Standard pair (an explicit edit); or cancel. A Standard vs Cinematic matched mode arrives with the first visible Cinematic difference (GPU-01) |
| `RP-05 software-gl` (warning) | Cinematic on a software GL route (`swangle`) | continue (slow, byte-stable); or switch to `vulkan` yourself |
| `RP-06 over-budget` | estimated resources exceed the agreed budget (GPU-10 fills in the estimate) | lower settings yourself, named; or cancel |

- **The "make shared" conversion is never automatic.** It is a separate command the user runs. It writes a **new** project file, lists every removed or replaced feature, and leaves the original unchanged.
- Shared content modes stay portable: a film that uses only `shared` renders on all three profiles.

## 6. Reports
Every native render report (timing.json and the production manifest) gains: `renderProfile` (or `null` for Classic/Standard), the profile table version, the list of capabilities used, the three.js version, the GL route and the measured adapter (already recorded since DUAL-07).

## 7. Determinism statement
- Frame-addressed state and animation are deterministic: the same input gives the same scene state at every frame on every profile.
- CPU Classic and Three.js on `swangle` are byte-stable run to run.
- **GPU pixels are not byte-stable**, even on the same machine: on the RTX `vulkan` route, 3 renders of one film gave 3 hashes (average PSNR 60 dB, worst frame 51.5 dB; Campaign A). Cinematic comparisons therefore use visual and structural checks, never byte hashes.
- No byte-identical GPU output is promised across drivers, GPUs or operating systems. Only the RTX 4060 Laptop on Windows 11 is measured; other devices are listed as unverified.

## 8. What changes in DUAL_BACKEND_POLICY.md
- **Kept, all binding:** every existing section. Both backends stay permanent and first-class; explicit backend selection; visible failure; all fixtures and evidence; local-first CI policy; Campaign A scope.
- **Replaced, only for future Cinematic-only capabilities:** the requirement that every new graphical feature exists on both backends. Such features may exist only in GPU Cinematic, behind the negotiation above.
- **Added, as a new section pointing here:** "Shared features stay on all profiles; Cinematic-only features are opt-in, versioned and negotiated; CPU and Standard regressions gate every Campaign B milestone."

## 9. Consequences
- **Good:** one Three.js engine with no fork; old films are untouched; mistakes fail loudly before speech or GPU time is spent; reports name exactly what rendered what.
- **Cost:** every new Cinematic field needs a capability entry and a test that wrong pairings fail; the matched-pair tooling learns a Standard vs Cinematic mode.
- **Not decided here:** budgets (GPU-00 step 6), quality tiers (GPU-10), the Studio default (GPU-11).

## 10. First implementation step after approval (no visual change; implemented at GPU-00)
- Implemented in `src/core/render-profiles.js`; wired into `validateProject`, the Director request, `production-options.mjs` (also used by batch jobs), `produce.mjs` (RP-05 warning) and `native-render.mjs` (report fields). Tests: `tests/gpu00-profiles.test.js`.
- `renderProfile` validation, the capability table with only `shared`, preflight codes RP-01 to RP-04, and the report fields.
- `cinematic-v1` renders exactly like Standard until GPU-01.
- Tests: legacy digests unchanged; every wrong pairing fails before speech preparation with its code.
