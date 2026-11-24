# v2 film timeline

V1 single-scene JSON and its 12-second output remain unchanged. V2 film JSON is an ordered shot list (see examples/blockchain-60s.json). All videos are currently vertical 1080×1920, 30 fps. Each shot has an ID, a registered template, integer durationFrames (60–3600) or null for duration based on measured speech, transitionFrames (0–15, zero on first shot), and 1–8 narration phrases. Film limit 9000 frames (300s). Use copy for legacy templates; use chapter, heading and subheading for blockchain-chapter. All fields strictly validated. No arbitrary code.

Kokoro generates every phrase first at natural speed. Fixed slots can increase speed up to 1.25; if speech does not fit, fail, never cut it. Auto slots ceil measured speech plus padding to frames. Integer 48kHz sample positions map to 1600 samples/frame; shots contiguous, no overlap. Silence is distributed over pauses. Captions use measured phrase bounds (not word-level forced alignment); long sentences wrap. Transitions fade through dark at boundaries without changing duration. Single continuous score and ducking across the whole film. Compiled timeline.json is validated independently by JS before rendering; media verification checks actual MP4 frames, decoded streams and per-phrase PCM.

## Commands
npm run render -- examples/blockchain-60s.json
npm run render -- examples/auto-robot.json

The first is exactly five 360-frame shots; the second tests speech-derived duration and legacy rig reuse. 15, 30, 60, 120 and other durations are supported by choosing shot frame counts; max 300s. No automatic shot selection/AI director yet. The five chapter diagrams are original procedural visuals, illustrative hash labels not computed real hashes.

## Evidence
v0.2 apt-free CI passed at commit 36b10ae7b6be241ce1cada5abfb8a6d1acdbda55 (run 45346406933). v0.3 acceptance requires fresh unit tests, 3 legacy renders, exact 1800-frame film, and automatic duration render. Visual/narration quality remains reviewable separately.
