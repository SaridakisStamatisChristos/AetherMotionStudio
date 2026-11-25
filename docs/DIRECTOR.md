# v0.5 provider-neutral AI Creative Director (candidate)

## Workflow and contracts
Version 1 request -> validated treatment/script/storyboard/shot plan -> existing v2 project -> measured Kokoro timeline -> native Remotion render. One compact IR response projects into explicit stage artifacts; it is not four separate paid model calls. Project is validated against existing graph, asset/action allowlists, and exact requested frame total. Source scripts are preserved exactly after whitespace normalization. English only, existing nine voices, explicit voice/dialect compatibility. Backend and fidelity stay outside model control. No arbitrary code, remote assets, or mandatory API.

Default offline provider is deterministic and non-LLM: five small curated topic patterns (network, solar, molecules, bridges, logistics), supplied-script segmentation, and a clearly labeled generic question outline for unmatched topics. It does not claim factual synthesis of arbitrary topics. Style/tone/audience preserved in treatment, offline visual adaptation is limited. Topic-based lexical retrieval supplies eight assets per shot (250 total catalog objects); catalog includes family, approximate emitted bounds, and conservative implemented action metadata. Catalog digest and prompt version recorded. Prompt contains compact IDs/actions, not full geometry.

## CLI
- Plan: npm run director -- --topic "How computers send messages across a network" --seconds 60 --backend cpu --profile polished --out out/director/project.json
- Render: add --render. Audio-only preflight: add --prepare instead.
- Request file: npm run director -- --request examples/director-cpu-polished.request.json --render
- Supplied script: --script-file script.txt (preserves normalized spoken text).
- Local OpenAI-compatible server: --provider local --endpoint http://127.0.0.1:11434/v1 --model YOUR_INSTALLED_MODEL. No automatic model installation, no network outside loopback.
- Optional remote OpenAI-compatible: --provider openai-compatible --allow-remote --endpoint https://YOUR_PROVIDER/v1 --model YOUR_MODEL; set AETHER_DIRECTOR_API_KEY in environment. Explicit opt-in, HTTPS, bounded response and timeout.
- Optional Gemini: --provider gemini --allow-remote --model YOUR_AVAILABLE_MODEL; set GEMINI_API_KEY. No hardcoded model or quota claims.
- Manual external authoring: --prompt-only writes prompt.txt; paste into your model, save raw JSON, then use --import response.json with identical request/seed. No adapter required. Do not send confidential text to remote providers without permission.
- --repairs 0–2; one retry default on validation error. Provider transport errors fail without silent fallback. --timeout milliseconds (100–120000). --seed controls offline camera sequence; model determinism not guaranteed.
- Files: request.json, director-ir.json, stages.json, catalog-selection.json, director-manifest.json, prompt.txt, planned project; measured compiled-project.json, timeline, media and reports after successful prepare/render. Provider tokens are reported only when supplied; cost unknown. Planned duration error is not reported as measured. Failed planning writes director-failure.json; failed media compilation reports failure, no fabricated success.

The optional --director-budget path synthesizes all phrases at natural speed, uses measured integer sample counts to redistribute a fixed global frame budget, and retries synthesis at bounded speed <=1.25 only when required. Impossible speech fails explicitly; revise script or duration, no truncation. Legacy CLI behavior unchanged. Automatic script rewrite on measured overrun is not implemented; user script remains binding.

## Evidence and scope
Predecessor scoped CI 45355048931 passed and user accepted current motion quality. v0.5 scoped CI generates ONE 60-second film from the network topic request (not a preauthored project), uses Kokoro and native CPU Remotion, verifies exact 1800 frames, full decode and speech. Matched Three.js request differs only in backend and output ID; deferred to full suite. All thirteen predecessor fixtures retained. Mock transport tests exercise usage, timeout, malformed output, repair, script preservation, retrieval and held-out structural topics. No paid calls in CI. Live model output quality, arbitrary-topic comprehension, advanced choreography and native Three.js evidence remain unverified. Full v0.6 gate not started.

## ART-04 staging pass and Studio controls (2026-11-25, opt-in)
- Request field `staging: 'art-v1'` (no default). After compiling, the director applies `stageProject` (src/core/staging.js): every graph shot gets `lighting: 'parity-v1'`; catalog humans without an identity or explicit `params.detail` get `detail: 2`; the first two characters face each other with a three-quarter cheat toward the camera (offset ±0.55 rad by screen side, window 0.05–0.95, blend 0.15), further characters face the first; a lone character looks at the shot's first free prop (0.2–0.7, blend 0.3). Assets whose yaw is already driven (yaw tracks, yaw actions, existing `face`) and identity-pinned appearance are left untouched. The model-facing prompt excludes `staging`, so IR generation is unaffected.
- Studio: "Cinematic staging (art-v1)" checkbox on the director form (on by default) and a "Stage for camera" button in project settings (`setStaging` in src/studio/model.js, pure and idempotent).
- The staging module lives in src/core because the Studio server serves only src/{core,visual,templates,studio,foundry} to the browser; a test walks the Studio import graph to keep it that way (an earlier placement in src/director broke the Studio page and was caught by a headless UI exercise).
- Unstaged director output (project, IR, stages, prompt, selection, manifest minus timing) is byte-identical for all directable request examples.
- AF08 fix: Foundry search no longer lists an imported exact built-in generated revision twice (the unresolved built-in placeholder is superseded); different revisions remain distinct.

## POLISH-01: staging art-v2 and literal casting (2026-11-25)
- `request.staging: 'art-v2'` applies the art-v2 staging pass (planted walking, solved handoffs) after compile.
- Literal casting (art-v2 + generic topics only): catalog assets named in the topic (simple plurals) are boosted in retrieval and cast in order of mention, up to 3 per shot; the retro-robot guide is added only when fewer than 3 are cast. Shots alternate between interaction beats (idle cast → staging may solve a handoff) and, when the topic mentions walking, walking beats. Unstaged and art-v1 director output is byte-identical to before.

## POLISH-02: compact prompt director-ir-v1.2 (2026-11-25, opt-in)
- `request.promptVersion: 'director-ir-v1.1' | 'director-ir-v1.2'`; absent = v1.1, so prompts, prompt digests and outputs are byte-identical to before (7 request examples digest-identical). The manifest records the version used.
- v1.2 lists each retrieved object once (`n|id|short description|action group`), shares action lists as lettered groups and gives each shot its object indices. The IR schema and validation are unchanged. With identities it also documents hold chains (2–4 windows) and the `handoff` event `{type, prop, from, fromAnchor, to, toAnchor, at}`. With `staging` it says what the staging pass will do (art-v2: planted walks, solved handoff for two characters plus one small prop).
- Size (estimate = characters/4, not a provider tokenizer): 60 s / 6-shot director request 6,640 → 829; every request example 756–1,206 (previously 3,525–6,776). The offline director is unaffected (it uses no tokens); v1.2 offline projects equal v1.1 projects.
- Tests: tests/polish-02.test.js. They check v1.1 is unchanged, v1.2 stays ≤2,000 tokens with each object listed once, the chains and staging text appears, a mock provider that reads only the v1.2 prompt round-trips to a valid project, and invalid versions are rejected.
