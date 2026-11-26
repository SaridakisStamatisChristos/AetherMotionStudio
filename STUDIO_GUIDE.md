# AetherMotion Studio: how to make a film

A short guide for making a vertical explainer film from your own script, on this PC, without VS Code.

## 1. Start the Studio
1. Open the folder `C:\Users\scsar\AetherMotionStudio` in File Explorer.
2. Double-click **`Start-AetherMotion-Studio.cmd`**.
   - A black window titled **AetherMotion Studio** opens. Keep it open while you work: it is the Studio.
   - After a few seconds your browser opens **http://127.0.0.1:4173**. If it does not, open that address yourself.
   - The launcher uses the NVIDIA RTX card for Three.js films. It changes nothing on your PC.
3. If the Studio is already running, double-clicking the launcher just opens the page again.

**Desktop shortcut (optional):** right-click the launcher → **Show more options** → **Send to** → **Desktop (create shortcut)**.

**From a terminal** (PowerShell or the VS Code terminal), type the `.\` in front:
```
.\Start-AetherMotion-Studio.cmd
```

## 2. Make a film
The page opens on **Make a film** (the simple view).

1. **Topic:** one short question, for example *How do bees make honey?* It picks the set and shows as the subtitle.
2. **Cast:**
   - *Student + Explorer (interview)* is the normal choice: the Student asks, the Explorer explains.
   - *Engineer, Robot, Scientist*: three people take turns.
   - *Narrator only*: one voice, no characters talking.
3. **Seconds:** 60 for a normal film (30 for a short one).
4. **Backend:** keep **Three.js (RTX)**. CPU Canvas is slower and looks slightly different.
5. **Get a script from Claude:**
   - In the box **Need a script? Get one from Claude chat**, press **Copy prompt**. The prompt already contains your topic, cast and length.
   - Paste it into a Claude chat, then copy Claude's whole answer.
6. **Script:**
   - Paste the answer into the Script box.
   - You do not need to tidy it. A "Topic:" line, speaker names, numbering and headings are removed automatically when you start the film. (**Clean up pasted script** does the same right away, if you want to see it.)
7. **Read the line under the Script box.** It counts the words and tells you how the length fits:
   - **Good length, calm pace:** nothing to do.
   - **A little faster / too long:** choose **Use N s** (the Studio sets Seconds for you, and the film is only as long as the speech needs) or **Keep**. When the script is much too long, it also suggests how many words to cut; cut a question together with its answer.
   - **Short script:** the film will simply be shorter (it follows the speech, with no long silences).
8. **Options:**
   - **Instagram Reels layout:** a layout made for Reels.
   - **Speaker names in captions:** shows "Student" or "Explorer" above each caption. Untick it for captions with words only.
9. Press **Generate & render film**.

The Studio remembers your choices (cast, seconds, backend, Reels, speaker names, Simple or Advanced view) in this browser, so the next film starts with them. The topic and the script are not kept. **Reset choices** (next to Clean up) goes back to the defaults.

## 3. Get the finished film
- While it works, a progress bar under **Production** shows the step (speech, rendering frames, checking the film), the percentage, the frame being rendered, about how long is left and how long it has run. During speech the bar only shows that it is working (speech has no frame count). A 60-second film usually takes 1 to 4 minutes.
- If a film fails, the bar turns orange and says at which step it stopped.
- When it is done, the page scrolls to **Your film is ready**:
  - the film, ready to play;
  - **Download film (MP4)**: the file to post;
  - **Captions (.srt)**: subtitle file, if you want it;
  - one line with the length, the size and whether the checks passed.
- **Make Reels cover** (under the film) picks a cover picture from the film and checks it for Instagram Reels (size, sound, length, layout). It shows the cover, **Download cover (JPG)** and the result in plain words. The film itself is not changed. For the best Reels result, tick **Instagram Reels layout** before you make the film.
- **Render log** and **All files** are folded underneath, for when something goes wrong.
- Every film is also saved on disk in `C:\Users\scsar\AetherMotionStudio\out\studio-…` (one folder per film).

## 4. Stop the Studio
Close the black **AetherMotion Studio** window. Do not close it while a film is rendering.

## 5. If something goes wrong
| What you see | What to do |
|---|---|
| "Windows cannot find …" | Double-click the file in File Explorer, or type `.\Start-AetherMotion-Studio.cmd` in a terminal |
| "A render tool is missing" in the black window | The setup is incomplete. Ask Claude Code to check the local setup (docs/continuity/LOCAL_DEVELOPMENT.md) |
| The browser shows nothing | Check that the black window is still open; open http://127.0.0.1:4173 yourself |
| The film failed | Open **Render log** and copy its last lines to Claude Code |
| Roles look swapped (the Student explains) | The script did not alternate. Check that the first line is the Student's question and each answer follows its question |

## 6. More
- **Advanced** (top right) shows the full editor: saved projects, examples, the asset library, Foundry packs, the timeline, the shot inspector, speakers and JSON. **Simple view** returns to the film form.
- Script rules and the Claude prompt in detail: docs/SCRIPT_FORMAT.md. Studio details: docs/STUDIO.md.
