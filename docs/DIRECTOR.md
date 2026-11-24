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
