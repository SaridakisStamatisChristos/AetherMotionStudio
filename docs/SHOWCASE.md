# ART-05 showcase — "The Workshop" (2026-11-25)
Curated final showcase for the ART track. Topic, style and duration were chosen by the agent under the owner's delegation ("you take over … until the end of phase 4" extended to ART-05).

- **Story (40 s, 1200 frames, 6 shots, one narration line each, fades):** THE WORKSHOP (two makers and a sleeping robot) → THE PLAN (the scientist points out the robot) → POWER ON (hero close-up: eyes open, arms rise) → FIRST STEPS (the robot walks across while the makers turn to follow it) → HAND TO HAND (the engineer hands the first tool to the robot, which sets it on a table while the scientist watches and waves) → BUILT TOGETHER (all three wave/cheer to camera).
- **Style:** warm workshop (amber) → cool power-on (laboratory) → night ending (midnight); `lighting:'parity-v1'` on all shots so CPU and Three.js read alike; humans at `detail:2`.
- **Features exercised:** ART-01 actions/flow/hold/face/handoff chain + place release; ART-02 telephoto hero framing (rig zoom ≤2400) and lighting parity; ART-03 faces and left-arm rig; ART-04 staging pass (the generator runs `stageProject`; it is a no-op on the finished film).
- **Source:** generator `scripts/art05-workshop.mjs` (deterministic; tests assert it reproduces `examples/art05-workshop-{cpu,three}-polished.json` exactly). The HAND TO HAND shot reuses the numerically solved ART-01 handoff geometry (hand gap 0.05, tool placed on the tabletop at y 0.792).
- **Staging decisions made from measurements:** characters look at targets placed level with or in front of them (the composition report flagged a back-to-camera scientist and side-on makers when the robot stood behind them); raised arms use pitch −2.6 with mirrored outward spread (right −0.4, left +0.4) — the stock `wave` action crosses the face and −2.5 with positive spread hid the robot's arms behind its head (found in r1 stills, fixed in r2).
- **Evidence (r2, source 6b80a19 clean):** `node scripts/produce.mjs --project examples/art05-workshop-cpu-polished.json --pair examples/art05-workshop-three-polished.json --backend both --id art05-workshop-r2` with AETHER_CONCURRENCY=8, AETHER_GL=vulkan → 1 speech preparation, 2 native renders (CPU 56.9 s, Three 31.1 s), verify PASS (1200 frames, 40 s, full decode, Kokoro per-phrase audio), quality pass 0 errors/0 warnings (240 sampled frames each), compare_release PASS with exact shared hashes, frame-glitch clean on all 1200 frames of both films. Films: CPU 28e0d260…, Three e6ecca51…. Composition: no preflight issues; 0 back-to-camera samples in every shot.
- **Review status:** agent stills review (beat sheet + close crops on both backends); owner watched the film and accepted it on 2026-11-25 ("honestly that was really nice video"). Merged to main as 1ff0c60 (PR #18). No automated aesthetic certification is claimed.
- **Known limits:** characters are still simple voxel recipes; the robot's short arms reach beside, not above, its head; the FIRST STEPS walk is an in-place cycle with root translation (no foot planting); identity continuity is not used because the ledger does not model handoff chains yet.

## "The Workshop — Extended" (POLISH-01, 2026-11-25)
- 64 s, 1920 frames, 9 shots: WORKSHOP, PLAN, **TOOLBOX** (new: the scientist walks with planted feet carrying the wrench and hands it to the engineer at solver-computed positions, gap 3.8 cm), POWER ON, FIRST STEPS (upgraded to planted walking), **LEARNING BY WATCHING** (new: engineer points, robot watches then points), HAND TO HAND, BUILT TOGETHER, **LIGHTS OUT** (new: night close-up, eyes dim). The five reused shots are byte-identical to the accepted ART-05 film; the 40 s ART-05 film itself is unchanged.
- Generator scripts/workshop-extended.mjs → examples/workshop-extended-{cpu,three}-polished.json (tests assert exact reproduction).
- Evidence (source ea9bde3 clean): `node scripts/produce.mjs --project examples/workshop-extended-cpu-polished.json --pair examples/workshop-extended-three-polished.json --backend both --id workshop-extended-r1` (c8/vulkan) → 1 preparation, 2 renders (CPU 91.1 s, Three 50.6 s), verify PASS (1920 f, 64 s, full decode, Kokoro), quality pass 0/0 (384 sampled frames each), compare_release PASS shared hashes exact, frame-glitch clean on all frames. Films CPU 462544f1…, Three cccaa82c….
- Review: agent stills only (walk mid-stride with lifted foot, handoff, robot walk, teach, lights out on both backends). Polish note: in LEARNING BY WATCHING the engineer's point aims more at the robot than the table.

## "The Workshop — Extended" update (POLISH-02 items 1–4, 2026-11-25)
- Now 73 s, 2190 frames, 10 shots. Changes: LEARNING BY WATCHING pointers aim at the table (item 1); planted turn steps on every legged character in TOOLBOX, FIRST STEPS and LEARNING BY WATCHING (item 2); new **HIGH SHELF** shot after LEARNING BY WATCHING (items 3+4): the robot (telescoping reach 1.8) stands beside the bookshelf, reaches up with its camera-side arm, takes the book from the shelf top (auto grip), walks with planted feet and sets it on the detected table top. The five reused ART-05 shots (WORKSHOP, PLAN, POWER ON, HAND TO HAND, TOGETHER) and LIGHTS OUT are unchanged.
- Evidence (source 52c01fd clean): `node scripts/produce.mjs --project examples/workshop-extended-cpu-polished.json --pair examples/workshop-extended-three-polished.json --backend both --id workshop-extended-r3` (c8/vulkan) → 1 preparation, 2 renders (CPU 102.5 s, Three 58.8 s), verify PASS (2190 frames, 73 s, full decode, Kokoro per-phrase audio), quality pass 0 errors/0 warnings (438 sampled frames each), compare_release PASS (shared hashes exact), frame-glitch clean on all frames of both films. Films: CPU fbea6756d1241fe8…, Three 8d864943380c7638…. (r2 at 0087fa7 also passed all gates; its stills showed the reach hidden behind the robot's head, which led to the mirrored layout in r3.)
- Review: agent stills only (both backends): reach in profile with the raised telescoping arm, carry facing the camera, planted stride, book set on the table. During the reach the shelf front partly hides the robot's body. Owner visual/audio review pending.

## "The Workshop — Extended" update (POLISH-02 items 5–10, 2026-11-25)
- Picture is unchanged apart from the teach aim numerics (faster solver, same accuracy). Audio now uses mastering profile `mix-v2` (docs/SPEECH.md).
- Evidence (source 46ca532 clean): `node scripts/produce.mjs --project examples/workshop-extended-cpu-polished.json --pair examples/workshop-extended-three-polished.json --backend both --id workshop-extended-r6` (c8/vulkan):
  - 1 preparation, 2 renders: CPU 100.8 s, Three 58.6 s;
  - RTX observed: nvidia-smi utilisation peak 40 %, VRAM peak 1,436 MiB;
  - verify PASS (2190 frames, 73 s), quality 0/0, compare_release PASS, frame-glitch clean on both;
  - films: CPU 70867e20fa4248d0…, Three e9eb27517f4dc71a…;
  - delivered loudness −16.0 LUFS, LRA 11.7 LU, true peak −2.5 dBFS (both films).
- r4 and r5 were intermediate mastering iterations (bed level, then loudness bookkeeping); both passed all gates and are superseded.

## TALK-05: "The Workshop — First Words" (2026-11-25)
A 75 s dialogue film. The engineer (af_heart), the scientist (bf_emma, en-gb) and the robot (am_michael) teach the robot to speak. Generator scripts/talk05-first-words.mjs → examples/talk05-first-words-{cpu,three}-polished.json; tests in tests/talk05.test.js.
- **All lines are a Claude draft awaiting the owner's approval.** They are in `SCRIPT` in the generator, and the owner may edit any line.
- Shots:

  | Shot | Who | What happens |
  |---|---|---|
  | GOOD MORNING | engineer, robot | first word: "Hello." |
  | NAME IT | scientist, robot | the robot points at the toolbox (aim with body cheat) and names it |
  | TOP SHELF | robot | the POLISH-02 high-shelf book choreography, slowed for this film (360 frames, turn ~1.9 s); the robot reads a line |
  | AROUND THE TABLE | all three | conversation |
  | ONE LETTER | engineer, robot | "wench" corrected to "wrench"; the elongated "Wrrrench" uses the pronunciation entry `Wrrrench → rrr rench` |
  | THANK YOU | all three | thanks |
  | LIGHTS OUT | robot | goodnight (reused shot, new lines) |

- Every conversation shot uses TALK-02 dialogue (turn 0.8 s, cheat 1) and TALK-03 body language. The film uses placement lead and mix-v2.
- Render `talk05-first-words-r3` from clean commit a7b539b (`node scripts/produce.mjs --project examples/talk05-first-words-cpu-polished.json --pair examples/talk05-first-words-three-polished.json --backend both --id talk05-first-words-r3`):
  - 1 preparation, 2250 frames on each backend; speech verify, native verify and compare_release (shared hashes exact) all PASS; frame-glitch clean on both films.
  - Quality: pass-with-findings, 0 errors, 2 CAPTION_READING_SPEED warnings (19.3 and 18.1 characters per second).
  - Loudness −16.0 LUFS, true peak −3.7 dBFS, LRA 20.7 LU. The range is wide: the long shelf shot has two short lines.
  - Render time CPU 109.3 s, Three-vulkan 68.4 s; RTX observed at util peak 46 % and 1,444 MiB.
  - Films: CPU 5b83b6f65c7234a1…, Three 4a0ced6180aea44a….
- Motion over 75 s:

  | Character | Lines | Beats | Nods |
  |---|---|---|---|
  | Engineer | 6 | 1 | 2 |
  | Scientist | 4 | 2 | 2 |
  | Robot | 11 | 3 | 4 |

  - Peak speeds: nods 14.9°/s, sway 1.1°/s, conversation turns ~42°/s.
  - The robot is faster in three places: 105°/s while carrying the book on the shelf and in THANK YOU (it sits between two speakers), and 60°/s when its pointing ends.
- Earlier runs:
  - r1: preparation failed because the LIGHTS OUT fixed duration was not listed in `speech.fixedShots`. Fixed, with a test.
  - r2 (d58d7c7): all gates PASS, but the reused shelf turn measured 224°/s. Slowed in r3.
  - r1 and r2 are superseded and left untouched.
- Known: the table in AROUND THE TABLE is hidden behind the robot (the same layout as the TALK-02 meeting).
- Review status: agent stills review only. **Owner visual and audio review requested.**

## GEN-01 renders (2026-11-25), both from clean commit 1e89fdb
- **`gen01-interview-r2`** is a fresh Director request with no hand edits: "How does the internet move a message?", 60 s, interview style, Student (af_bella) and Explorer robot (bm_george, en-gb).
  - Gates: 1 preparation; all verifies and compare_release (shared hashes exact) PASS; frame-glitch clean on both films.
  - Checks: motion 0 and visibility 0 warnings on both backends.
  - Quality: 1 CAPTION_READING_SPEED warning (20.0 characters per second).
  - Loudness −16.0 LUFS (LRA 5.1 LU).
  - Render time CPU 121.3 s, Three-vulkan 53.6 s; RTX util peak 61 %, 1,422 MiB.
  - Films: CPU dc57520852638725…, Three 46481d4d9a8e80ee….
  - The student points at the router while saying "Routers…". Motion peaks: turns 82°/s, nods 14.9°/s. Over 60 s the host made 5 beats and 4 nods, the guest 5 beats and 2 nods.
  - r1 had identical gates but was rendered with the request file uncommitted (sourceDirty), so it is superseded; its CPU film is byte-identical to r2.
- **`talk05-first-words-r5`**: TALK-05 rebuilt with the general passes (talk-v1, calmTurns, automatic framing for free conversations). The table is visible now.
  - Gates: all PASS; frame-glitch clean; checks 0 and 0.
  - Loudness −16.0 LUFS (LRA 20.4 LU).
  - Render time CPU 110.5 s, Three 67.0 s.
  - Films: CPU 53fb64ea2b3e0cc0…, Three 7f3686963f6f335d….
  - Review notes: LOW_PROJECTED_MOTION on table, mistake and thanks (calmer automatic cameras). The shelf turn peaks at 111°/s.
  - r4 is superseded for the same uncommitted-request reason.
- Known: with automatic framing of a group plus its set piece, characters are fairly small in the frame. A framing improvement is a candidate follow-up.
- Review status: agent stills review only.

## GEN-02 renders (2026-11-25), both from clean commit 1c526b6
- **`gen02-interview-r2`**: the same fresh request, now with group framing.
  - Gates: all PASS; frame-glitch clean; checks 0 and 0 on both backends.
  - −16.0 LUFS; 1 CAPTION_READING_SPEED warning.
  - Render time CPU 124.0 s, Three 55.8 s (RTX util peak 61 %).
  - Films: CPU c74bb6949c2147cb…, Three 159219bd12f29aa4….
  - Turn peak 43°/s.
  - r1 (8cf51c4, ±0.75 spacing) passed every gate, but its stills showed the robot overlapping the student's arm. It is superseded and left untouched.
- **`talk05-first-words-r7`**: all gates PASS, checks 0 and 0, −16.0 LUFS.
  - Render time CPU 110.8 s, Three 68.1 s.
  - Films: CPU d64de6b7e882ab0e…, Three f76eb7828a1ad92a….
  - The conversation shots are group-framed. r6 was the ±0.75 version and is superseded.
- Review status: agent stills review only.
