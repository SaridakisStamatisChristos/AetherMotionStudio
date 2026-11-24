# Latest handoff — AF09 merged → local development
Checkpoint: product merge 04e3491bb21b4ebc3d54755a2a211b1a7affb3fa; documentation handoff follows. Date 2026-11-24.
Status: AF01–AF09 implemented and merged, fast CI verified, final Foundry nine-pair comparison verified on frozen source with validated recoveries; full historical qualification not asserted. Owner approved the viewed product and Speech films and authorized the test-only CI policy/merge. No release.

## What to carry forward
Read CURRENT_STATE.md for cumulative canon and evidence index; do not reread all past CI or old conversations. Source-level obligations in AGENTS.md and DUAL_BACKEND_POLICY remain binding; the latest test-only policy supersedes historical automatic render scopes. Preserve existing code, IDs, source evidence and both renderers. Use current git HEAD and cleanly isolate new local work.

## Last checkpoint verification
- PR #13 merged, main verified at 04e3491. Quick CI 45457656917: 158 JS, 11 Python, protocol plan, syntax; media jobs skipped intentionally.
- Full 48 render jobs succeeded. Main final Foundry structural comparison passed; legacy exact audio drift diagnosed and targeted re-renders preserved. Speech rerender job passed; final regression comparison still pending at inspection. See CURRENT_STATE and STATUS for exact runs.
- Viewed films were satisfactory to owner. No claim GPU acceleration, subjective blanket approval, or full regression green.

## Next executable action
LOCAL-01: inspect actual machine and repo status; follow LOCAL_DEVELOPMENT.md. Verify Node/Python/ffmpeg/espeak/model/tool versions, fast tests; do not install globally or modify user data silently. Report any blockers. If authorized, run a small existing matched baseline with unique output ID and actual hardware GL evidence. Avoid a full matrix or rebuilding already merged pipeline. Then take user's next scoped development request, or propose earliest uncompleted unit from NEXT_UNITS.md. No automatic push/merge.

## At session close
Record source SHA, actual commands/results, media paths/hashes if relevant, machine profile without secrets, modifications, failures, remaining obligations and next unit. Update CURRENT_STATE.md and this file together; do not promote unverified state. Archive older handoff when material, not all log text.
