# Latest handoff — LOCAL-02 verified; LOCAL-03 prepared
Checkpoint: branch `local-dev` (from main 1e0adcd). Commits: 5eba606 symlink test, 031a554 LOCAL-01 docs+lockfile, 19b20ec LOCAL-02, e1caa74 comparator fix, plus this checkpoint commit. Date 2026-11-24. Not pushed, not merged, no release.
Status: LOCAL-01 and LOCAL-02 IMPLEMENTED + VERIFIED locally, awaiting owner acceptance. LOCAL-03 PLANNED (scope in NEXT_UNITS.md), not started.

## LOCAL-01 (summary; details in CURRENT_STATE)
Windows 11, Ryzen 9 7845HX, RTX 4060 Laptop + Radeon 610M. Python 3.11.9 (winget, owner-approved), release_setup OK, models verified. ffprobe from Remotion compositor via AETHER_FFPROBE. GPU: AETHER_GL=vulkan reaches RTX; angle → iGPU. Symlink test: capability-aware skip (win32+EPERM only). package-lock.json reviewed and committed.

## LOCAL-02 changed files
- scripts/production-options.mjs — `--project`/`--pair` authored mode; exactly one of --topic/--request/--project; rejects retiming options and normalized pair mismatch. Director-mode semantics preserved.
- src/studio/production.js — matchedTargetFrames, projectProfile, SPEECH_SHARED/AUTHORED_SHARED, sharedArtifacts, verifyShared; matchedProject accepts fixed-budget authored projects, still requires measured timeline.
- scripts/produce.mjs — authored planning path (no Director, prepare without --director-budget), mix.wav archive for non-speech, inputHashes, sourceDirty, frameAllocation, per-output shared-inputs.json, pre/post-render hash checks incl. public/audio soundtrack.
- scripts/matched_inventory.py (new, stdlib) + scripts/compare_release.py (imports it; main() entry point).
- tests/production.test.js (+4 tests), tests/test_compare_release.py (new, 11 tests incl. numpy-gated entry point).
- README.md, docs/continuity/{CURRENT_STATE,HANDOFF,LOCAL_DEVELOPMENT,NEXT_UNITS}.md.

## Commands and results
- `npm test` → 164 tests, 163 pass, 0 fail, 1 skip (symlink, Windows).
- `PYTHONPATH=scripts .venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py"` → 22 OK. Same on bare `py -3.11` (no numpy, CI-equivalent) → 22 OK, 1 skipped.
- compileall scripts OK; `node scripts/foundry-qualify.mjs plan` → 9 pairs.
- Controlled matched run (PowerShell; AETHER_FFPROBE set, AETHER_GL=vulkan):
  `node scripts/produce.mjs --project examples/cinematic-cpu-polished.json --pair examples/cinematic-three-polished.json --backend both --id local-02-cinematic-r2`
  → PASS: 1 preparation, 2 renders, quality pass 0/0 each, compare_release PASS, inventory verified; sourceCommit e1caa74, sourceDirty false. CPU 44.8 s; Three/vulkan 28.6 s, RTX peak 44% util / 424 MiB. Shared: timeline c6e3b42f…, narration f1bad798…, mix 69b75285…, voice-report 1beb081f… identical in both outputs and the three public/audio soundtracks. Films: cpu 45a364e0…, three 4b12d823… (byte-identical to LOCAL-01 renders).
- Failed first attempt `local-02-cinematic` (comparator NameError after both renders passed) preserved under out/; fixed in e1caa74.

## Unresolved risks
- Only a single-shot pair rendered matched; multi-shot authored pairs covered by unit tests only.
- Timings are single runs; not benchmarks. No human/audio review of LOCAL-02 films.
- `npm run produce -- ...` loses `--` in PowerShell; use node directly (documented).
- CI (Linux) not yet run on these commits; nothing pushed.

## Next executable action
Owner: accept LOCAL-01/02 (or request changes), decide push/PR of `local-dev`, and authorize LOCAL-03 (step 1 measurement first). Do not push/merge without authorization.
