# v0.9 Local visual production Studio (candidate)

## Start
Install the existing pinned Node and Python dependencies, local media tools and Kokoro weights as README describes. Run npm run studio:local and open http://127.0.0.1:4173 (optional port: npm run studio:local -- 4180). Keep the terminal open. No cloud, account, external service, new model or paid API. The existing npm run studio still starts Remotion's own Studio.

## Workflow
- Import a validated v1/v2 example or JSON file, or create a project with the offline Director (topic/script, duration, voice, backend and profile). Offline factual topic patterns remain finite; provider-assisted planning is still available through the CLI, not the Studio form.
- Project ID/title/default voice, graph backend/profile, timeline scrub and play, graph shot heading/subheading/narration/duration/camera/environment, shot reordering, search/category-filtered 250-object catalog, add/remove objects and edit X track. Full advanced JSON editor permits other supported contract fields, including identity library, cue/mix settings and animation controls. Invalid transactions fail rather than silently deleting references or altering identity continuity. Reordering a speech/identity film may require coordinated JSON edits; no automatic event rewriting. V1 supports import/export, preview and render; detailed inspector is v2 graph only.
- Save local JSON in studio-data/projects. Atomic writes and revision hashes reject stale saves. Import a different ID for a separate project. Draft edits remain local until save. Export authored JSON via browser download. No project deletion or migration beyond current validated v1/v2 formats.
- Preview uses shared drawFilm at 360x640, selected actual CPU or WebGL backend; no automatic fallback. Silent estimated draft timeline has no invented speech alignment. Prepare audio to produce measured timeline, then select Prepared snapshot; playback uses local audio and shared drawFilm. Actual browser performance varies, no realtime guarantee. Native render uses existing Remotion CLI at 1080x1920. Quality inspect is read-only; optional explicit repair applies existing bounded camera optimizer to job snapshot only. A job's repaired project is exported separately, not silently written back.
- Native job snapshot receives unique safe run ID and saved revision. One active native job per server, phases/logs and errors, actual artifact allowlist, byte-range media serving, local subtitle and quality exports. Jobs in current session only; output folders and authored projects persist on disk. There is no automatic cancellation or job recovery after server restart. Keep server running during a job. No arbitrary command or path accepted; loopback-only, strict Host/Origin, custom write header, JSON bounds, no arbitrary filesystem exposure. Local trusted machine and data directory, not a multi-user hardened server; do not expose via reverse proxy.

## Verification
Tests cover transactional edits, estimated budget, reference rejection, atomic project roundtrip/revision conflict, cross-origin writes, path denial, duplicate simultaneous jobs, immutable snapshot and explicit runner failure. CI native acceptance uses actual HTTP service to import matched 50-second fixture, persist and edit first shot, inspect, start exactly one real CLI render with quality/repair, retrieve report and byte-range MP4, verify measured 1500 frames, copy output to fixture artifact folder. Matched Three.js fixture retained for authorized full matrix. Browser manual interaction and WebGL preview are distinct verification surfaces; HTTP acceptance does not certify them. Human artistic review remains required. No automatic merge.

## Speakers (TALK-04)
- The Director form option "Dialogue" generates a three-speaker conversation (engineer af_heart, robot am_michael, scientist bf_emma). It replaces the art-v1 staging option.
- The Speakers panel works on speech projects:
  - edit speaker names and voices (the language follows the voice), add or remove speakers, then "Apply speakers";
  - for the selected shot, pick the speaker of each line and which character each speaker appears as.
- Line and character edits apply immediately. They go through `setSpeakers`, `setLineSpeaker` and `bindSpeaker` (src/studio/model.js), which edit a validated copy, so a rejected edit changes nothing and the reason shows in the status bar. Examples of rejected edits: removing a speaker who still has lines, a character without a mouth, or leaving a dialogue shot with fewer than two bound speakers.
- The first speaker set on a shot that had no line speakers voices every line of that shot. The narrator cannot be mixed with named speakers.
- Changing a dialogue shot's line count is rejected until its line speakers match.
- Manual exercise (2026-11-25, headless Chrome from the pinned Remotion renderer, loopback server, temp data): every step was observed working, with no browser errors. Steps: generate a dialogue project, change a line speaker, rename a speaker and change its voice, unbind a character, then two rejected edits.
- GEN-01 adds three things:
  - "Stage dialogue" (`talk-v1`) and "Calm fast turns" buttons;
  - Inspect also shows the motion-speed and visibility warnings (estimated line timing on drafts).
  - Headless exercise observed, with no browser errors:
    - talk02 with its bindings removed: all speakers re-bound by name;
    - workshop-extended calm: 1 turn changed, 4 reported;
    - Inspect: 4 motion warnings, 0 visibility warnings, timeline estimated.
