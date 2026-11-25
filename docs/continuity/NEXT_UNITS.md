# Proposed forward-only local roadmap
This is an actionable proposed sequence for future work, not an approved requirement to implement every unit at once. Current user request takes precedence. Core-first; no new auth, SaaS or rewrite. Preserve AF01–AF09 and both backends. Each unit needs explicit scope, changed-file map, unit/adversarial tests, exact run evidence, reviewed samples where relevant, updated contracts/canon/handoff. Do not auto-launch full historical matrix.

| Unit | Objective | Exit criteria |
|---|---|---|
| LOCAL-01 | Local environment + baseline | Actual OS/tool/model versions, fast tests pass, selected CPU and authorized Three short render/decoding, GPU identity measured or clearly unsupported. No broad refactor. |
| LOCAL-02 | Reproducible native comparison path | Reuse existing produce shared-preparation seam for authored v2 projects as needed; lossless mix/timeline/PCM/caption inventory; exact shared hashes; independent negative tests (tampering, mismatch, stale checkout); one selected pair. No relaxation of frozen AF09 checks. |
| LOCAL-03 | GPU/performance engineering | Measure actual WebGL renderer, resource lifecycle, timings, memory, concurrency; repeated same-machine tests CPU/Three with identical input; distinguish GPU use vs CPU/software. Opt-in profiles, no silent LOD/backend switches. Address concrete hotspot only. |
| ART-01 | Richer motion and interaction | Frame-addressed action choreography, secondary motion, easing/anticipation/follow-through, contacts, rig/attachments, transitions; shared deterministic state. One small narrative scene + matched backend tests; preserve stable identities. |
| ART-02 | Cinematic composition and lighting | Camera blocking and motion, scene depth, material/lighting profiles, silhouettes, composition, tasteful post effects; preserve original/polished profiles. One short hero/product scene; human visual review, structural checks. |
| ART-03 | High-detail reusable assets | Extend existing Foundry recipes/packs with distinct high-quality hero props/sets, rigging and material/LOD budgets; inspection and thumbnails; explicit review/promotion, no unlicensed content. Avoid hundreds of near-duplicate aliases. |
| ART-04 | Director and Studio authoring quality | Better retrieval and shot/action planning, fix duplicate shortlist when reproduced, compact IR, local editable preview; manual UI exercise and backward-compatible export/import. No mandatory cloud. |
| ART-05 | Curated final showcase | User-defined topic/style/duration, coherent multi-shot film, meaningful movement, clear audio, assets/identities, visual review, selected CPU/Three outputs. No aesthetic auto-certification. |
| POLISH-01 | Walking, identity handoffs, director interactions, longer film | MERGED (365a78e, PR #19): planted locomotion, ledger chains, solveHandoff + staging art-v2, "The Workshop — Extended" 64 s. |
| POLISH-02 | Close the remaining quality gaps (see plan below) | Each item opt-in or test-pinned; measured before/after; one matched render; human review of the extended film. Items 1–10 MERGED 9054c7e (PR #20). |
| POLISH-03 | Narration placement + mix-v2 for speech projects | MERGED 01051f1 (PR #21): placement 'lead', speech.mix.master, film lines. |
| TALK-01 | Speaking faces (mouth + speaker binding) — MERGED 7f121e7 (PR #22) | Mouth channel on detail-2 humans and robot face panels; driven by a per-frame speech envelope from the measured narration PCM (prepared once, shared, hashed); speaker→character binding per phrase; both backends; deterministic. |
| TALK-02 | Dialogue scenes — MERGED e17870c (PR #23) | Two+ characters exchange lines with distinct Kokoro voices (existing speakers/shotSpeakers); listeners face the active speaker; captions name speakers; turn-taking from measured phrase bounds. |
| TALK-03 | Body language while talking — MERGED 85d7a37 (PR #24; owner: "merge it for now") | Beat gestures on stressed words (estimated word timing, never called forced alignment), head nods/tilts, blinks, idle weight shifts; bounded and deterministic. |
| TALK-04 | Director dialogue authoring — MERGED 5c61d3f (PR #25) | Director/Studio produce dialogue scripts with speakers from a topic; staging places speakers, cheats faces, plans listener reactions; editable in Studio. |
| TALK-05 | Talking showcase — MERGED bf032ff (PR #26); "The Workshop — First Words" | A 60–90 s dialogue film (e.g. the makers teaching the robot to speak); matched CPU/Three; human visual + audio review. |

## Unit status (2026-11-24, branch `local-dev`, not pushed)
LOCAL-01 and LOCAL-02 implemented and verified locally, awaiting owner acceptance (see CURRENT_STATE). Update 2026-11-25: LOCAL-01/02 merged (PR #14). LOCAL-03 IMPLEMENTED + MEASURED, merged via PR #15 (owner-authorized): bench tooling, opt-in AETHER_CONCURRENCY/AETHER_GL/AETHER_HW_ENCODE seam, measurement table and recommended profile (c8 + vulkan, x264) documented in LOCAL_DEVELOPMENT.md. Hotspot addressed = concurrency scaling (frame render ≈97% of time); defaults unchanged. ART-01 ACTIVE 2026-11-25 on `feature/art-01-motion`: slice 1 (authored product choreography; owner: motion OK) and slice 2 (opt-in flow interpolation, camera interpolation, held actions; defaults digest-identical) implemented, tested and rendered locally. Slice 3 (handoff chains, drop/place release, facing, HANDOFF_GAP check; 3-character handoff fixture) implemented and rendered; merge authorized. ART-02 ACTIVE 2026-11-25 on `feature/art-02-composition`: slice 1 (composition report, telephoto product hero framing) implemented and rendered; slice 2 (opt-in CPU lighting parity profile parity-v1) implemented; PR awaiting owner merge. ART-02 merged (0981ac9). ART-03 (character detail 2, left-arm rig), ART-04 (staging pass, Studio controls, AF08 shortlist fix) and ART-05 ("The Workshop" showcase) implemented on `feature/art-03-04`, awaiting owner merge. Follow-ups (not started): identity ledger support for handoff chains; foot-planted walking; robot reach above head; director use of handoff/place; human visual/audio review of the showcase.

## LOCAL-03 prepared scope — GPU acceleration and performance
Starting facts (measured, single runs): owner PC hybrid RTX 4060 Laptop + Radeon 610M; only `AETHER_GL=vulkan` reaches the RTX (`angle` → iGPU). 360-frame cinematic polished pair at concurrency 2: CPU 44.8 s, Three/vulkan 28.6 s (RTX peak util 44–54%, ~424 MiB), Three/swangle 155.7 s. RTX is under-utilized; where time goes (bundle, frame capture, encode, audio mux) is unmeasured. Renders are bit-reproducible for this fixture, so output hashes can gate optimizations.
1. **Measure first (no behaviour change).** Add a per-render timing/resource record: wall phases where observable, GL identity actually reported by the page (WEBGL_debug_renderer_info captured in-render, not assumed from flags), nvidia-smi util/VRAM series, peak process RAM, cold vs warm (bundle cache) separation. Repeat ≥3 runs on identical prepared inputs (LOCAL-02 shared preparation; re-render only, no re-synthesis).
2. **Explicit opt-in knobs only**, recorded in render-timing.json and production.json: concurrency (native-render.mjs currently hard-codes 2), GL mode (existing AETHER_GL). Candidates verified present in pinned CLI 4.0.546: `--concurrency`, `--gl`, `--image-format`, `--jpeg-quality`, `--x264-preset`, `--hardware-acceleration`, and `remotion benchmark --runs --concurrencies`. Defaults stay (concurrency 2, swangle); no silent backend/LOD/quality change. Any knob that changes pixels (image format/quality, encoder preset) is reported as a quality-affecting profile, never a default.
3. **Fixtures:** the 360-frame cinematic pair (fast loop) plus one multi-shot authored pair (e.g. foundry-af01 polished, 900 frames) for VRAM/memory growth over longer ANGLE/Vulkan sessions. First multi-shot matched render also closes the LOCAL-02 multi-shot gap.
4. **Gates:** identical inputs → film hash equality across repeated runs per mode (or documented, explained nondeterminism); verify.py + quality pass; compare_release PASS; GPU use observed per run; CPU backend measured alongside, never regressed.
5. **Then address one concrete hotspot** shown by the data (e.g. concurrency scaling, encoder cost, Three resource lifecycle/re-creation per frame). No renderer rewrite; both backends first-class.
Exit: repeated measurement table (mode × concurrency × fixture), chosen opt-in local profile documented in LOCAL_DEVELOPMENT.md, tests for new options (including invalid values), no change to CI or defaults without authorization.

The first two units close environment/reproducibility debt; user can explicitly defer them to prioritize creative work. The recovered historical regression gate is already passed; a new full regression matrix may be run locally later by explicit authorization only when changes justify it. Separate release and commercial/license decisions remain outside these units.

## Plan after POLISH-01 (2026-11-25) — what to make better, then talking characters
Ordered by payoff. Every item: opt-in or default-proven-unchanged, tests incl. negatives, matched local render, agent stills review, owner review for visual claims.

### POLISH-02 — quality gaps observed in this session (do first)
1. **Pointing at targets** — DONE 2535907 (opt-in `aim`, docs/CINEMATOGRAPHY.md POLISH-02). `point` is a fixed forward arm; add an opt-in `aim:{target}` that solves arm pitch/spread (+ body cheat) toward an asset (seen: LEARNING BY WATCHING, the engineer's point aims at the robot, not the table).
2. **Turn-in-place steps** — DONE 7e847ea (opt-in `turnSteps`, planted feet incl. inside locomotion). pivots slide the planted foot 1–2 cm; add small stepping when yaw changes faster than a threshold while standing.
3. **Robot reach** — DONE 0087fa7 (opt-in `params.reach` telescoping arm). service-robot arms cannot reach above the head (hands max ~1.5 vs head 1.9); add an opt-in longer-arm/elbow rig variant or shoulder raise.
4. **Hand-to-object pickup/put-down** — DONE 0087fa7/52c01fd (surface.js, `restOn`, place `to:{surface}`, `offset:'auto'`, `solveReach`; HIGH SHELF shot). attachments start at a hand pose; add solved reach-to-prop pickup from a surface and place-onto-surface with surface height detection (today place targets are authored/solved by script).
5. **Director prompt for chains** — DONE a799ff0 (director-ir-v1.2, with item 10). teach provider prompts about hold chains and staging (versioned prompt; keep existing prompt digests for old versions).
6. **Composition gates in CI tests** — DONE bf31ccd (composition-v1 gate in tests). promote compositionReport thresholds (no back-to-camera, overlap bound) to tests for every showcase fixture; consider a bounded preflight warning (new versioned policy only).
7. **Human recipe detail 3** — DONE 989b4ee (params.detail 3, lineup example). hair/brows variety, hands with fingers, clothing silhouettes per kind (pure opt-in, digest-proven).
8. **Audio polish** — DONE ca9156d/b25b604/46ca532 (review + opt-in mix-v2; bed-only gaps left as authoring finding). owner has not commented on audio; do an audio review pass (levels, pauses between shots, music bed opt-in).
9. **Performance** — DONE 4e5e727 (film graph time 9.1 s → 0.5 s). 64 s film renders in ~91 s CPU / ~51 s Three at c8; cache locomotion tables across frames (WeakMap already) and profile evaluateGraph for long films.
10. **Compact director prompt (owner-requested 2026-11-25)** — DONE a799ff0 (~6,640 → ~829 estimated tokens for 60 s). measured for a 60 s / 6-shot request: ~7,100 prompt tokens, of which ~6,700 are the per-shot asset menu (the same 8 retrieved objects repeated for every shot, each with its full compatible-action list); instructions ~230, cameras/effects ~140, request ~55; model reply ~850–1,000 tokens. Sending the whole 250-object catalog would be ~36,200 tokens. Plan: a new versioned prompt (e.g. director-ir-v1.2) that lists each retrieved object once (id, short description, size class), references objects per shot by index, and compresses action lists (shared action groups instead of per-object lists). Target ≤2,000 prompt tokens for 60 s; keep v1.1 selectable so existing prompt digests stay reproducible; tests: token estimate bound, IR validity unchanged on all request examples, mock-provider round trip, negatives. Only affects optional model providers (offline director uses no tokens).

### TALK track — characters that talk (after POLISH-02)
Existing foundations to reuse (do not rebuild): speech config `speakers` (≤8, each with Kokoro voice/language) and `shotSpeakers` (speaker per narration phrase) in src/core/speech.js; measured phrase segments with sample boundaries in the shared timeline; `syncActions` (retimes actions to the speech span); captions with estimated word timing (must never be called forced alignment); matched pairs prepare speech once and share hashed sidecars.
1. TALK-01 speaking faces: new opt-in `mouth` channel (humans detail 2: jaw/mouth box height; robots: face-panel pulse); new shared sidecar `speech-envelope.json` (per-frame RMS of narration PCM, computed once in preparation, hashed like other shared inputs, verified identical across backends); per-phrase speaker→asset binding (`speakerAssets` map, validated); mouth = envelope × binding, zero for non-speakers; tests: determinism, silence → closed mouth, binding negatives, envelope hash checks.
2. TALK-02 dialogue: listener `face` toward active speaker derived from phrase bounds (no wall clock); caption speaker labels; two-voice Kokoro scenes.
3. TALK-03 body language: gesture library mapped to estimated stressed words; nods; blinks; all bounded and frame-addressed.
4. TALK-04 authoring: director dialogue scripts + speaker casting; Studio speaker editor.
5. TALK-05 showcase: "The Workshop — First Words" dialogue film.
Risks: lip-sync quality without phoneme alignment (envelope-driven mouth is honest and deterministic; viseme/phoneme alignment would need an opt-in local aligner and must be labelled estimated unless truly aligned); Kokoro voice variety (English voices only); keep audio/visual sync measured, not assumed.

## Plan for TALK-04 and TALK-05 (authorized by the owner 2026-11-25; execute in a new session via "fod continue")
Owner request: "write me a handoff … so i can start the talk-04 and -05 in new session and take it over from there … i would need to type only fod continue."

### Binding constraints (carry into both units)
- Every new behaviour is opt-in, and old outputs are proven unchanged with `node scripts/fod-digests.mjs` (base worktree vs working tree).
- Tests include negatives. Matched CPU/Three local production comes from a clean commit; run frame_glitch and an agent stills review on both backends.
- The owner's motion taste (three TALK-03 reviews): calm and sparse.
  - Defaults: `dialogue.turn` 0.8 s, `cheat` about 1.0; body language as merged in TALK-03 (≤1 arm beat per line, ≤1 small nod per character per 8 s, no nod when the addressee replies next, sway 0.015 rad).
  - Measure per-character counts and peak angular speeds before showing a render.
- Never call envelope- or loudness-driven motion "lip-sync", "forced alignment" or "word alignment".
- The model-facing prompt versions v1.1 and v1.2 must keep their digests; dialogue prompting is a new version.
- No new dependencies, no paid API, no CI or backend-default changes. Only the owner merges.

### TALK-04 — director dialogue authoring (next)
Goal: from a topic (or a supplied script) the Director produces a ready dialogue project, which the owner can edit in Studio.
1. **Request:** opt-in `request.dialogue: {speakers: [{id, name, voice, language, character}], style?: 'conversation'|'interview'}`.
   - 2–3 speakers; voices from VOICES with language and voice consistent (`bf_*`/`bm_*` → en-gb).
   - `character` is a catalog asset with a mouth: a human (detail 2/3 is set automatically) or a catalog robot.
   - Negatives for everything.
   - Absent → director output digest-identical (director line of fod-digests).
2. **IR:** per shot, an optional `speakers: [speakerId]` parallel to `narration` (same length), validated in src/director/schema.js `validateIR`. Absent when dialogue is off.
3. **Offline director (no model):** deterministic dialogue.
   - Split the offline beat narration into sentences and assign them in turns (round-robin starting with the first speaker; an interview style alternates host/guest).
   - It must be documented as a split of the offline narration into turns, not invented facts. Keep the existing topic patterns.
4. **Provider prompt:** new `director-ir-v1.3`, built on the v1.2 compact layout plus a "Dialogue:" block (speaker ids, names and roles; each shot's lines must alternate sensibly; every line needs a speaker).
   - Tests: ≤2,000 estimated tokens for a 60 s request; a mock provider round trip; v1.1/v1.2 prompts byte-identical.
5. **Compile (src/director/index.js `compile`)** with dialogue on:
   - `project.speech` from `defaultSpeech(seconds)` (src/studio/production.js) plus `speakers`, `shotSpeakers`, `placement: 'lead'` and `mix.master: 'mix-v2'`;
   - per shot: the speaking characters as assets, `speakerAssets`, `dialogue {listen, turn: .8, cheat: 1}`, and `bodyLanguage {beats, nods, blinks, sway}`;
   - staging of 2–3 speakers in an open line facing the camera (see the TALK-02/03 examples: x ±1.35, robot z −0.2, `turnSteps`).
   - Possibly as staging mode `talk-v1` in src/core/staging.js (opt-in, existing modes unchanged).
6. **Studio speaker editor (opt-in model functions + UI):**
   - src/studio/model.js: `setSpeakers(project, speakers)`, `setLineSpeaker(project, shotIndex, phraseIndex, speakerId)`, `bindSpeaker(project, shotIndex, speakerId, assetId)`; transactional, validated, with negatives.
   - studio/app.js + studio/index.html: a minimal panel to edit speakers and line speakers.
   - A manual UI exercise via `npm run studio:local`, reported as observed or not observed.
7. **Evidence:**
   - examples/talk04-dialogue.request.json, then `node scripts/produce.mjs --request examples/talk04-dialogue.request.json --backend both --id talk04-…` (check the flags in scripts/produce.mjs first);
   - all gates PASS, motion counts, stills;
   - docs/DIRECTOR.md and docs/SPEECH.md sections.

Exit: tests incl. negatives; digests unchanged without `dialogue`; one matched render; PR.

### TALK-05 — talking showcase film (after TALK-04; may stack on the TALK-04 branch)
Goal: "The Workshop — First Words", a 60–90 s dialogue film using TALK-01..03 and the POLISH features, for owner visual and audio review.
- Cast: engineer (af_heart, detail 2), scientist (bf_emma, en-gb, detail 2) and robot (am_michael, service-robot, `reach` 1.8 if it reaches).
- Proposed outline, 7 shots, about 75 s. Owner may change it; keep lines short for ≤18 characters per second.
  1. Workshop, morning: the engineer greets; the robot answers its first word.
  2. The scientist asks the robot to name tools; the robot points (aim) and names them.
  3. The robot fetches a book from the high shelf (reuse the HIGH SHELF pattern) and reads a line.
  4. A three-way conversation at the table (TALK-02/03 pattern).
  5. A mistake and a correction: the robot mispronounces a word (a pronunciation entry) and the engineer corrects it.
  6. A robot close-up: "Thank you." The listeners react with one nod each, at most.
  7. Lights out (callback to the extended film); the robot whispers goodnight.
- Generator scripts/talk05-first-words.mjs → examples/talk05-first-words-{cpu,three}-polished.json.
  - Speech project with lead placement and mix-v2; dialogue, bodyLanguage and turnSteps on speaking shots.
  - Composition gate and preflight clean; caption reading-speed findings minimised.
- Evidence:
  - matched production `talk05-first-words-r1` from a clean commit; all gates;
  - delivered loudness about −16 LUFS (ebur128 on both films);
  - per-character motion counts within the owner's budget;
  - stills of every shot on both backends;
  - owner visual and audio review requested explicitly.
- Optional: author the first draft with the TALK-04 director, then hand-polish in the generator, recording which parts are director-made.

Exit: the owner watches and accepts the film; PR merged on the owner's word.

## GEN-01 + GEN-02 (MERGED 23f4198, PR #27, 2026-11-25; item 5 dropped with reason, see docs/SPEECH.md GEN-01) — make every video benefit, not only the showcase films
Owner (on merging TALK-04/05): "the point is that these should be generalized to every video not this videos we mock up here".
The TALK-01..04 features are already general project and Director contracts that any project or request can opt into. But several quality fixes in TALK-04/05 were found by reviewing stills and then applied by hand to one film. GEN-01 turns those lessons into automatic, opt-in or default-proven-unchanged mechanisms:
1. **Motion-speed check** (quality/preflight, new versioned policy): peak body turn, nod and sway speed per character for any project, with dialogue face chains and body language applied from the measured timeline. Flags turns above ~90°/s. The talk05 r2 shelf turn at 224°/s was found only by a manual script.
2. **Visibility check:** occlusion share per asset per shot (both backends share geometry). Flags props and characters hidden behind others. It would have caught the hidden talk04 r1 set piece and the hidden talk05 table automatically.
3. **General staging mode `talk-v1`** in src/core/staging.js, usable on any speech project (Studio button, director, authored): places bound speakers in a readable line and set pieces beside them, and adds dialogue and bodyLanguage with the calm defaults. The Director's TALK-04 staging becomes a call to it.
4. **Optional automatic slowing:** an opt-in pass that stretches authored yaw turns over the speed limit inside their shot (never silently).
5. **Readable dialogue lines:** the offline dialogue splits sentences over ~18 characters per second into shorter turns, without changing the words.
6. **Director interactions:** when a line names the set piece, the speaker points at it (aim) if the rig allows.
Exit criteria: checks run on every example in tests and stay digest-neutral for existing outputs; one matched render of a fresh topic request through the Director with no hand edits, reviewed by the owner.

## GEN-02 group framing and GEN-03 speaker follow — MERGED
- GEN-02 (merged with GEN-01 in 23f4198, PR #27): `cameraRig.framing 'group'` for 9:16. Owner: "if the videos are posted for example in instagram the charachers are samll".
- GEN-03 (merged 4f588e3, PR #28): speaker-follow camera. Owner: "do 1".
  - The owner rejected r2 ("the camera move makes characters out of screen").
  - Fixed with the follow constraint and the OFF_FRAME check.

## Candidates after GEN-03 (proposed 2026-11-25, none authorized; the owner picks)

| ID | What | Why | Needs the owner? |
|---|---|---|---|
| GEN-04 (recommended first) | The composition overlap metric counts every catalog character (humans and robots, not only rigs with a right-hand anchor); recalibrate and record known findings | The explorer robot's crowding was invisible to the gate in GEN-02 r1 | No |
| GEN-05 | Caption reading speed: (a) opt-in slightly slower dialogue speech (Kokoro speed about 0.92 in speech projects), or (b) captions linger up to about 0.4 s into the following pause | 1–2 cues per film at 18–20 characters per second | Yes: choose (a) or (b) |
| GEN-06 | Variety for vertical feeds without cropping: optional cut to a clean single of the speaker as its own shot on long lines (a separate shot, so nobody is cut at an edge), driven by measured lines | Follow cannot enlarge two-person shots, because both already fill the width | Yes: confirm that cuts to singles are wanted |
| GEN-07 | Re-stage older accepted films flagged by the checks (off-frame characters, hidden tables, fast turns) using the general passes; produce new revisions, never overwrite | The checks list findings in 9+ older films | Yes: these films were accepted |
| GEN-08 | Visibility check from projected geometry boxes instead of whole-asset boxes | Fewer false alarms for thin shapes | No |

| GEN-09 | Instagram export preset: Reels duration limits, a chosen cover frame / thumbnail, caption and UI-safe zones for the app overlay, optional seamless loop; opt-in profile, default export unchanged | Ready to post without extra steps | Yes: confirm the target (Reels, Stories, both) |
| GEN-10 | Mouth shapes from sounds: opt-in local phoneme estimate driving visemes, labelled estimated (never "lip-sync"/"forced alignment" unless truly aligned); envelope mouths stay the default | Mouths only open with loudness today | Yes: a new local tool/dependency |
| GEN-11 | Idle weight shift: opt-in hip joint on human/robot rigs, slow calm shifts; geometry digests unchanged without it | Characters look stiff while listening | No (within the motion-taste budget) |
| GEN-12 | Topic-fitting sets: environment and set-piece variety chosen per topic from the catalog/Foundry packs, checked by visibility/composition gates | Series will look repetitive | No |
| GEN-13 | Music and sound design: mood-based music beds and small action sound effects from local, licence-clear sources; mix-v2 loudness preserved | Audio is mostly voice + bed | Yes: music sources/licences |
| GEN-14 | Real dialogue writing: an opt-in local model provider (no paid API, loopback) writes back-and-forth conversation through prompt director-ir-v1.3; the offline split stays the default; every line still validated, and every line flagged as model-written | Offline dialogue is explanatory narration split into turns | Yes: which local model/provider to install (new local dependency) |

Order set by the owner (2026-11-25: "let gen 09 as last put it as gen 14. change the order"): after GEN-04..08 come GEN-09 Instagram export, GEN-10 mouth shapes, GEN-11 idle weight shift, GEN-12 topic sets, GEN-13 music and sound, and real dialogue writing last as GEN-14. Added at the owner's request ("yes add them of course"); proposals only, none authorized.

Rules for any pick:
- Opt-in or default-proven-unchanged (fod-digests).
- Tests including negatives.
- A matched render from a clean commit.
- The checks must stay at 0 for new outputs.
- Stills at the middle of every spoken line.
- Ask before merging.
