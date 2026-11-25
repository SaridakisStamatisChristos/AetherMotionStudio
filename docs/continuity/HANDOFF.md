# Latest handoff — ART-03, ART-04, ART-05 accepted and merged (1ff0c60)
Checkpoint: branch `feature/art-03-04` from main 0981ac9 (ART-02 merged via PR #17; main CI 45509387381 green). Commits d4224bb (record ART-02 merge), c018850 + 74e64b8 (ART-03), 6bd2b0b + 3ade829 (ART-04), 96878cc + 6b80a19 (ART-05), plus this checkpoint commit. Date 2026-11-25.
Status: ART-03/04/05 IMPLEMENTED + TESTED + RENDERED locally; agent-reviewed only. Owner delegated all three ("you take over … come back after art 05 is finished"; "record the progress … i will just allow the merge at the end"). Stop point: PR open + CI green, before merge.

## What was done
- ART-03: `params.detail:2` faces/ears/collar/buttons for catalog humans; `leftArmPitch/leftArmSpread` for catalog human/robot rigs (published rig channel lists unchanged). Inspection pair art03-cast (before/after). Defaults: geometry digest over 250 assets identical.
- ART-04: `request.staging:'art-v1'` + Studio `setStaging`, "Cinematic staging" checkbox and "Stage for camera" button; staging module in src/core (served to the Studio browser); import-graph regression test; AF08 duplicate beacon shortlist fixed. Unstaged director output byte-identical (7 directable requests). Headless loopback Studio exercise: 0 browser errors (it first caught a real 404 defect, fixed).
- ART-05: "The Workshop" 40 s showcase (docs/SHOWCASE.md); generator scripts/art05-workshop.mjs; r2 films CPU 28e0d260…, Three e6ecca51… (source 6b80a19 clean), all gates PASS.

## Verification
- `npm test` 221 tests, 220 pass, 0 fail, 1 skip (Windows symlink). foundry-qualify plan OK; py_compile OK; Python unittest 27 OK.
- Default-unchanged proofs vs pre-unit commits: geometry, graph-state and preflight digests over all pre-existing examples; director output digests (timing field excluded); Foundry search digest; CPU regression render (ART-02) byte-identical to the LOCAL-01 film.

## Next action
1. Done: owner watched the showcase and accepted it ("really nice video"); PR #18 merged as 1ff0c60, main CI 45519807052 green. This record is on local branch chore/record-art05-merge (not pushed) — fold it into the next unit's PR.
2. Next unit: owner to choose; roadmap ART-01..05 complete.
3. Follow-ups (not started): identity ledger for handoff chains; foot-planted walking; director use of handoff/place; human visual/audio review.

## Environment (PowerShell, repo root)
PYTHON=.venv python; AETHER_FFMPEG=absolute .venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe; AETHER_FFPROBE=absolute node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe; AETHER_CONCURRENCY=8, AETHER_GL=vulkan for local renders.

## Unresolved risks
- All ART-03..05 visuals and audio are agent-reviewed only; no aesthetic certification.
- Three/vulkan not bit-exact run-to-run (gate by PSNR); keep frame_glitch on GPU renders.
- Memory pressure after long uptime / Fast Startup; measure performance only after a real restart.
