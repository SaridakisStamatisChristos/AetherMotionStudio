# Owner scripts: format and workflow (2026-11-25)
The owner writes video scripts in Claude chat and brings them into the app ("yeah i prefer bring in my script"). For now this replaces GEN-14 (a local writing model). The rules below come from what the Director accepts (src/director/schema.js, offline.js `splitScript`, dialogue.js `turnSpeaker`).

## Rules
| Rule | Why |
|---|---|
| Plain text only: no headings, speaker names, bullets, links or code | `request.script` is plain text (max 12,000 characters); links and markup are rejected |
| One sentence per line, ending in `.` `?` or `!` | Each sentence becomes one spoken turn |
| Two speakers alternate on every sentence, starting with the first (Student, Explorer, …) | Turns are assigned in order (`turnSpeaker`). Two sentences in a row by one person get split between the speakers |
| Each sentence under about 140 characters | `splitScript` breaks lines at 145 characters |
| About 2.2 words per second: 60 s needs 120–140 words, 30 s needs 60–70 | Too few words leave long silences (gen15-forest: 14 s of talk in 60 s); too many speed the speech up |
| 10+ words in a line gives that speaker a close-up | GEN-06 singles |
| No word longer than 32 letters; numbers and short forms spelled out | Caption line limit and pronunciation |
| A topic: one short question (under 60 characters) | It picks the location and set pieces (GEN-12) and shows as the subtitle |

## Prompt the owner pastes into Claude chat
```
Write a script for a 60-second vertical educational video: a dialogue between a curious Student and an expert Explorer robot.
Topic: <YOUR TOPIC>

Rules:
- Plain text only, one sentence per line, no speaker names, no headings, no numbering.
- Lines alternate strictly: line 1 Student, line 2 Explorer, line 3 Student, and so on. Start with the Student, end with either.
- Every line is exactly one sentence ending in . ? or !
- Each line under 140 characters. Student lines short (questions or reactions); Explorer lines 10–20 words.
- 14–16 lines, 120–140 words in total.
- Spell out numbers and abbreviations (say "carbon dioxide", not "CO2"). No word longer than 32 letters.
- Facts must be accurate and simple for curious beginners; friendly tone.
Also give me a one-line topic question (under 60 characters).
```
For 30 s, ask for "8 lines, 60–70 words" instead.

## Worked example
`examples/gen12-forest-script.request.json` (first committed as ad893f7; added to main with STUDIO-01).
- Render `forest-script-r1` from clean ad893f7: CPU 93324d88432897bb…, Three 9d6034c9e7c6084f…. All gates PASS, glitch clean, −16.0 LUFS.
- Talk fills 47 of 60 s (78 %), with about 1 s between lines. 6 lines were slowed to 0.85 for readable captions.
- Known: section headings are generic (INTRODUCTION, KEY IDEA, …) because a supplied script has no headings.

## How the owner will feed it in (STUDIO-01)
1. Double-click `Start-AetherMotion-Studio.cmd` in the repository folder. The Studio opens at http://127.0.0.1:4173 (keep its window open).
2. In **Creative Director**, type the topic and choose the cast and seconds. Under **Need a script? Get one from Claude chat**, press **Copy prompt** (the prompt above, filled in for that topic, cast and seconds) and paste it into Claude chat.
   - Paste Claude's answer into **Script** and press **Clean up pasted script**. It removes speaker names, numbering, headings and blank lines, and a "Topic:" line fills an empty Topic box.
   - The live count under the box shows the words and the range for the chosen seconds.
3. Leave **Cast** on *Student + Explorer (interview)*, **Backend** on *Three.js*, and Seconds on 60 (or 30). Tick **Instagram Reels layout** for Reels.
4. Click **Generate & render film**. When the job says succeeded, the film plays below and **film.mp4** is in the download links (the output folder is `out/studio-…`).
Details: docs/STUDIO.md "Script to film (STUDIO-01)".
