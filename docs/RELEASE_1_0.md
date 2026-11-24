# AetherMotion Studio v1.0 release candidate

## Install and run

Supported acceptance target: Ubuntu 24.04 x86_64, Node 22, CPython 3.11. On a clean checkout:

    python3.11 scripts/release_setup.py
    npm run produce -- --topic "How a molecule is built" --seconds 30 --backend cpu

The setup script creates .venv, installs pinned direct npm dependencies (npm ci if a lock is present, otherwise npm install produces a resolved lock), the exact Python release requirements, checks pip dependencies, obtains Kokoro weights, and verifies the two known-good SHA-256 values against models-lock.json. It needs internet for initial dependencies/weights and Remotion's Chromium acquisition; system browser shared libraries must exist. No sudo or apt in CI. On Linux x86_64, produce can use imageio-ffmpeg and Remotion bundled ffprobe when system tools are unavailable; explicit AETHER_FFMPEG/AETHER_FFPROBE and PYTHON override. Existing CLI/studio paths retain their prior environment configuration (activate .venv). For Three.js use explicit backend; AETHER_GL may override the default swangle software GL mode. Windows/macOS and air-gapped first-time setup are not certified. Subsequent runs can be offline with dependencies, weights and browser cached.

    npm run produce -- --request examples/release.request.json --backend both --repair
    npm run produce -- --topic "How a molecule is built" --seconds 30 --backend three --id molecule-three
    npm run produce -- --topic "Custom subject" --script-file script.txt --seconds 30 --id my-film

Choose cpu, three or both. Both renders use same profile. IDs are safe slugs, max 32 chars; generated automatically for topic-only use. Existing output IDs are rejected, choose a fresh ID. Request JSON preserves explicit speech config and constraints, rejects target mismatch; absent speech config uses the new speech-first defaults. Optional --import accepts validated externally authored Director IR. Existing npm run director supports optional external providers; no API is required for release production. Offline planner still finite curated patterns and generic question outline for unknown topics; supplied script or imported IR for other content. No arbitrary generated code. Automatic camera repair is opt-in; quality audit always enabled.

## Output and evidence

out/<id>-<backend>-<profile>/film.mp4 is native H.264/AAC 1080x1920 at 30 fps. Sidecars, measured scene, timeline, props, voice report, quality reports, contact sheet and stills accompany each. out/<id>-production/ holds original request, typed stages, IR, catalog, plan, resolved npm package-lock.json if present, Python freeze, pinned requirements/models, production.json, comparison.json for a pair. out/<id>-prepared/ contains one shared preparation. A failure leaves diagnostics and any independently successful render, exits nonzero, never substitutes a backend or truncates narration. No auto rerender. Validate same normalized scene, exact shared source audio and sidecar hashes, duration, codec, decoded sample differences and per-backend render times. Native verification and quality audit run for each. Encoded AAC streams may differ even with identical input PCM; no claim bitwise identical encoded audio. Exact wall time is measured on one runner, sequentially, not a hardware-neutral benchmark. Review findings do not certify aesthetics, factual claims, intelligibility or independently forced alignment.

## Replay and compatibility

Replay uses the exact source commit, archived generated npm lock (copy into checkout and npm ci), requirements-release.txt, locked model hashes, request and environment recorded in production.json. No bit-identical encoding guarantee across browsers, drivers and OS. First install without a repository lock resolves transitive npm dependencies; the run's lock is preserved as evidence, not falsely claimed to have been precommitted. All 23 legacy fixtures remain and v1/v2 authored contracts unchanged. Unknown format versions are rejected, no silent migrations; import/export of legacy data remains available. Release orchestrator only accepts v2 speech-first cinematic graphs, legacy projects use the unchanged render CLI. Browser Studio can Generate & render film with default speech-first exact target; UI native interaction still separate from HTTP tests.

## Licensing and distribution

Source project license has not been selected by the owner. Do not describe this repository as OSI-open-source or grant redistribution/commercial rights not authorized by the owner. Remotion's source-available licensing is separate; consult https://www.remotion.dev/docs/license for applicable terms. Three.js, React, Kokoro ONNX package, Kokoro model/voices, ONNX Runtime, eSpeak NG, FFmpeg and other dependencies retain their respective licenses/notices; review exact distributions (npm lock, Python freeze and upstream model release) before redistribution, especially LGPL/GPL components and codecs. No model weights, dependencies or produced films bundled into git. No unauthorized license changes or claims that commercial use is universally free. Source provenance remains in PROVENANCE.md.

## Acceptance

The 30-second curated molecular explainer exercises one Director plan, exact 900-frame measured timeline, shared neural soundtrack, two native backends, quality checks and independent pair comparison. Prior 23 fixtures are not rerendered by default; manually dispatch suite=full only with explicit approval. The v0.9 HTTP workflow passed, but manual browser interaction and full historical render suite remain separate. Release is a candidate until actual pair CI passes. Do not merge/tag/publish automatically.
