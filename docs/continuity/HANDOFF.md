# Forward-only handoff — POLISH-01 (walking, identity handoffs, director interactions, extended film)

Unit: POLISH-01
Checkpoint: branch `feature/polish-01` (from main 1ff0c60 + local record commit 2889c75); commits 67f3e20 (parts 1–3), ea9bde3 (part 4), plus this checkpoint commit. PR opened against main; merge only on owner authorization.
Status: VERIFIED locally (tests + matched renders + agent stills); not yet owner-reviewed; not merged.
Approved by: owner requested the unit ("implement all 4 … then write down a handoff with fod principles"); ART-03..05 previously accepted and merged (1ff0c60, "really nice video").
Date: 2026-11-25

## How to resume (next session)
1. `git status --short --branch`; `git rev-parse HEAD`. If the POLISH-01 PR is merged, first record its merge commit + main CI in CURRENT_STATE (on a new branch; never push directly to main).
2. Read AGENTS.md, CLAUDE.md, docs/continuity/CURRENT_STATE.md (Canon + Active unit), this file, docs/continuity/NEXT_UNITS.md ("Plan after POLISH-01"). Read docs/CINEMATOGRAPHY.md, IDENTITY.md, DIRECTOR.md, SHOWCASE.md sections only when touching them.
3. Environment (PowerShell, repo root): `$env:PYTHON=(Resolve-Path .venv/Scripts/python.exe).Path; $env:AETHER_FFMPEG=(Resolve-Path .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe).Path; $env:AETHER_FFPROBE=(Resolve-Path node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe).Path; $env:AETHER_GL="vulkan"; $env:AETHER_CONCURRENCY="8"`. Measure performance only after a real Restart (Windows Fast Startup keeps kernel state across "Shut down").
4. Working agreement with the owner: owner delegates whole units and prefers executed recommendations explained in plain language; stop at unit end with PR open + CI green and ask before merge; stop early only for direction-changing or risky actions (backend defaults, dependencies, deletions, system settings).

## FOD principles applied (keep doing this)
- One authorized unit at a time; opt-in contract additions; defaults proven unchanged with old-vs-new digests from a temporary worktree (geometry, graph, preflight, director, Foundry search; exclude wall-clock fields such as planningMs).
- Tests include negatives; matched CPU/Three local production from a clean commit; frame-glitch scan on both films; agent stills review on both backends; owner review for visual claims.
- Record evidence (commands, commit, hashes) and distinguish implemented / tested / rendered / reviewed / accepted / merged. Never edit historical evidence; never auto-merge.
- Lessons from this unit: write regexes with the editor tool, not Python string scripts (a `\b` became a backspace byte); when a probe disagrees with expectations, check the probe first (several "failures" were probe bugs).

## Scope actually completed
- Part 1 — foot-planted walking: `assets[].locomotion {mode:'stride',start,end,faceTravel?,blend?}` (src/core/locomotion.js, graph.js wiring, leg lift in src/visual/catalog.js gated on `footLift`). Distance-driven triangle stride (4 × leg swing), swing-foot lift, face-travel, closing step after the window.
- Part 2 — identity handoffs: continuity ledger models attachment chains (`handoff` event; gap = release + pickup; release `mode`); director IR `hold` accepts 2–4 window chains and compiles them.
- Part 3 — director plans interactions: src/core/interaction.js `solveHandoff`; staging `art-v2` (planted walks from in-place walks, solved handoffs for two characters + small prop); offline literal casting under art-v2; schema accepts `staging:'art-v2'`.
- Part 4 — "The Workshop — Extended": 64 s, 9 shots (5 accepted ART-05 shots unchanged + TOOLBOX, LEARNING BY WATCHING, LIGHTS OUT; FIRST STEPS upgraded to planted walking). Generator scripts/workshop-extended.mjs.

## Evidence and acceptance
- `npm test`: 231 tests, 230 pass, 0 fail, 1 skip (Windows symlink). New tests/polish-01.test.js (10 incl. negatives); the tests/art01-interaction.test.js "reject chains" placeholder was replaced by chain semantics. foundry-qualify plan OK (9 pairs); py_compile OK; Python unittest OK.
- Measured: stance-foot slip on straight travel ~0 (≤0.04 mm interpolation residue) vs legacy walk ~2 cm/frame (max 4.5 cm); while turning 1–2 cm (pivot). solveHandoff gaps 1–6 cm across rig pairs, ~0.3 s each. Extended film TOOLBOX handoff gap 3.8 cm.
- Default-unchanged proofs vs 2889c75: geometry b8ecef773a84f65a (250 assets, 6402 boxes + hand anchors); graph c2ab085b24a2f7f0 and preflight 9078ca22c8005ec7 (62 pre-unit examples); director 498fc960fbffa881 (7 directable requests); Foundry search a6d1ef95a9024dfc.
- Matched production `workshop-extended-r1` at ea9bde3 (clean): 1 speech preparation, 2 native renders (CPU 91.1 s, Three/vulkan 50.6 s), verify PASS (1920 frames, 64 s, full decode, Kokoro per-phrase audio), quality pass 0 errors/0 warnings (384 sampled frames each), compare_release PASS (shared hashes exact), frame-glitch clean on all frames. Films: CPU 462544f1e66f…, Three cccaa82c1c8a….
- Agent stills review (both backends): mid-stride walk with lifted foot, toolbox handoff, robot planted walk, teach beats, lights-out close-up.
- Unrun/unverified: owner visual/audio review of the extended film; PR CI (see PR page).

## Material persistent deltas (contracts)
- New opt-in fields: `assets[].locomotion`; staging mode `art-v2`; IR `hold` chains; ledger `handoff` event and release `mode`. Pose key `footLift` appears only with locomotion. Literal casting only under art-v2 + generic topics.
- Locomotion is rejected with walking tracks or walk/run actions, and for non-legged or legacy rigs (retro-robot).
- The model-facing director prompt is unchanged on purpose (keeps existing prompt digests); providers are not yet told about hold chains/staging.

## Open issues, threads, and debts
- POLISH-02 list (pointing at targets, turn-in-place steps, robot reach, solved pickup/put-down, versioned prompt for chains, composition gates in tests, human detail 3, audio review, long-film performance) — NEXT_UNITS "Plan after POLISH-01".
- Literal casting stages a handoff in every interaction beat; add variety (alternate giver/receiver, place-on-surface beats).
- Local record commit 2889c75 (ART-05 merge + owner review) rides on this branch.

## Known tensions or uncertainty
- Visual quality claims are agent-reviewed until the owner watches out/workshop-extended-r1-{cpu,three}-polished/film.mp4.
- Turning while standing slides the planted foot 1–2 cm (documented as pivot; POLISH-02 item 2).
- Three/vulkan output is not bit-exact run-to-run (gate by PSNR); keep frame_glitch on GPU renders.

## State files updated
- docs/continuity/CURRENT_STATE.md (Active unit = POLISH-01; previous unit = ART-03/04/05 accepted and merged).
- docs/continuity/NEXT_UNITS.md (POLISH-02, TALK-01..05 rows; "Plan after POLISH-01").
- docs/CINEMATOGRAPHY.md, docs/IDENTITY.md, docs/DIRECTOR.md, docs/SHOWCASE.md (POLISH-01 sections).

## Next authorized unit
- After the owner merges POLISH-01: **POLISH-02** (quality gaps; items 1–4 first), then the **TALK** track starting with **TALK-01 speaking faces**.
- Required input: this handoff, CURRENT_STATE canon, NEXT_UNITS plan, src/core/speech.js (speakers/shotSpeakers/syncActions), docs/SPEECH.md, the shared-inputs mechanism in scripts/produce.mjs.
- Starting instruction: implement POLISH-02 item 1 (`aim` for pointing at a target asset) with tests and a matched render of LEARNING BY WATCHING; continue through the list; then TALK-01 — add a per-frame speech-envelope sidecar computed once during preparation and hashed in shared inputs, plus an opt-in `mouth` channel bound to the speaking character.
