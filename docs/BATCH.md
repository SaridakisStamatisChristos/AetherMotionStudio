# Batch production (DUAL-08, `batch-v1`)

A batch is a local queue of films. Each job is a Director request or an authored project with an explicit backend, output format and job ID. Jobs run **one at a time** through the normal production path (`scripts/produce.mjs`, unchanged), under the machine's render lock. There is no scheduling, posting, SaaS or network in this path.

## Commands
| Command | What it does |
|---|---|
| `node scripts/batch.mjs create <batch.json>` | validates every job, copies each input into the batch (a snapshot that never changes) and prints the batch folder |
| `node scripts/batch.mjs run <batch folder>` | runs or resumes the batch (`resume` is the same command) |
| `node scripts/batch.mjs status <batch folder>` | one line per job: state, attempts, backend, format, film hash or error |
| `node scripts/batch.mjs stop <batch folder>` | ends the running job's whole process tree; that job stays queued and the batch stops (resumable) |
| `node scripts/batch.mjs cancel <batch folder> [--job <id>]` | cancels one job (or every unfinished job); a running one has its process tree ended first |
| `node scripts/batch.mjs verify <batch folder>` | re-hashes every finished film against the batch record; never renders |

Exit codes: 0 all jobs succeeded (or verify found no problem); 1 finished with failed or cancelled jobs (or verify found a problem); 2 stopped and resumable; 3 refused (invalid input, render lock held, unknown batch).

## Batch file
```json
{
  "version": 1,
  "id": "dual08-small-r1",
  "outputRoot": "out/batches",
  "retries": 1,
  "minFreeGB": 10,
  "jobs": [
    {"id": "dual08-narrator", "request": "examples/dual07-narrator.request.json", "backend": "both", "format": "vertical-v1", "concurrency": 8},
    {"id": "gallery", "project": "studio-data/projects/gallery.json", "backend": "cpu", "format": "vertical-v1"}
  ]
}
```
- `id`: lowercase slug of up to 32 characters. The batch folder is `<outputRoot>/<id>`, and creating it again is refused.
- `outputRoot`: a folder inside `out/` (1–3 lowercase levels). Links are refused.
- `retries` (0–3, default 0): automatic re-runs after a failed attempt. A job may override it.
- `minFreeGB` (1–1000, default 5): checked before every job. Below it, the batch stops and the job stays queued.
- `jobs` (1–50): each needs `id` (a slug of up to 20 characters, unique), exactly one of `request` or `project` (a repository-relative `.json` path, at most 1 MB, no `..`, no links, not in `.git` or `node_modules`), `backend` (`cpu`, `three` or `both`) and `format` (`vertical-v1`, `landscape-v1` or `square-v1`).
  - `concurrency` (1–16) sets AETHER_CONCURRENCY for that job only.
  - The format must agree with the input. A request may omit its format (the job's format is used), but it must not name a different one. An authored project is never re-formatted.
  - Every input is parsed exactly as `produce.mjs` would parse it when the batch is created, so a bad request is refused before anything runs. Problems found later (for example a picture missing from the library) fail that job with the production's own message.

## Folder layout
```
out/batches/<batch>/
  batch.json              batch manifest: jobs, input hashes, status, runs, requests taken
  inputs/<job>.json       input snapshots (byte copies, SHA-256 in batch.json; a changed snapshot fails its job)
  jobs/<job>.json         job manifest: state, append-only history, attempts, outputs
  logs/<attempt>.log      one log per attempt, capped at 8 MB (a marker line shows the cut)
  films/<job>/            the verified outputs of the succeeded attempt (production, prepared and per-backend folders)
  attempts/<attempt>/     the folders of failed, cancelled, stopped or interrupted attempts, kept for diagnosis
  requests/               cancel and stop requests waiting for the running process
```
The temporary soundtracks that `produce.mjs` writes to `public/audio` are left there; the owner's after-milestone cleanup removes them.

## Job states and guarantees
`queued → preparing → (rendering) → verifying → placing → succeeded`, with `failed` and `cancelled` as the other ends. **Terminal states never change.** Any other transition is refused, and every transition is written before the step it announces. Manifests are rewritten atomically (a temporary file, then a rename).
- **Attempts:** every attempt has its own production ID (`<job>-a<n>-<4 hex>`) and fresh folders; nothing is reused.
  - A finished production is verified in place: the production manifest, each film's SHA-256 against it, the probe, a quality report with 0 errors, and the backend comparison for pairs. Its folders are then moved into `films/<job>/` and verified again.
  - Failed, cancelled, stopped and interrupted attempts are moved to `attempts/`. A failed attempt of a pair keeps its successful backend output there.
- **Retries** are bounded: at most `retries` automatic re-runs after failures, at most 3 restarts that interrupt a job, and at most 50 attempts. There is no retry after cancel. A job is never retried forever.
- **Restart recovery:** when a run starts, any job a dead runner left in flight is handled first:
  - a production that is still running without its runner is ended (whole tree, verified gone);
  - a production that had already succeeded is verified and kept, never rendered again;
  - an interrupted placement is completed;
  - anything else becomes an "interrupted" attempt, set aside, and the job is queued again under a new attempt.
- **Idempotent resume:** `run` on a finished batch renders nothing and touches no output.
- **Cancellation** ends the whole process tree: node, Remotion, the Chromium tabs and ffmpeg.
  - Windows: the tree is read from Win32_Process (parent PID plus creation time, so a reused PID is never adopted), ended with `taskkill /T /F`, and re-read until no member is alive.
  - POSIX: the production runs in its own process group (SIGTERM, then SIGKILL).
  - A job is recorded as cancelled only after the tree is gone. If it does not stop, the runner stops and names the PIDs.
- **Requests:** while a runner is active, `cancel` and `stop` leave a small request file that the runner takes within a second. With no runner, cancels apply at once.
  - A stop left behind for an earlier runner never stops a new run.
  - A cancel for a job a dead runner left in flight waits for the next run's recovery.

- **Manifests are checked when loaded (repair pass):**
  - `batch.json` and every job manifest must hold exactly what this code writes: the input `inputs/<job>.json`, output suffixes derived from the backend, attempt IDs `<job>-a<n>-<4 hex>`, folders derived from the attempt ID, logs `logs/<attempt>.log`, and outputs in `films/<job>`;
  - a tampered or corrupt manifest is refused with "Corrupt batch manifest" or "Corrupt job manifest", and nothing is moved.
- **Orphan identity:** each production's PID is saved as soon as it is spawned, followed by its measured start time. Recovery ends a live PID only when its start time matches (±2 s). Older manifests without a start time use a 10-minute window.
- **Fail closed:** if free disk space cannot be measured, the batch stops with that reason. On Windows, a process tree that cannot be listed is never reported as gone.

## The render lock (shared with the Studio and the CLI)
`out/.render.lock` is held by any process that prepares speech or renders. That covers `produce.mjs`, `cli.mjs prepare|render`, each Studio job and the batch runner. A second one is refused with a message naming the holder (label, PID and start time).
- Children inherit their parent's lock through `AETHER_RENDER_LOCK_TOKEN`; the token must match the live lock.
- A stale lock is taken over under a short exclusive guard. A lock is stale when its PID is gone, or when the PID now belongs to a process that started after the lock was taken.
- A corrupt lock file is respected for 10 s, because its holder may still be writing it.
- `AETHER_RENDER_LOCK` (an absolute path) moves the lock; the tests use it.
- The Studio answers 409 with the holder's name while a batch or a CLI production renders.

## Limits (recorded)
- One render at a time; there is no parallel mode. A measured bound for parallel jobs would be a later, owner-approved change.
- A cancelled or stopped pair re-renders both backends, because `produce.mjs` prepares and renders a pair as one production.
- The Studio keeps its own job list in memory. It honours the lock, but it does not list batches and its jobs are not restart-recovered (DUAL-08 is CLI-first).
- PID-reuse detection uses process start times (PowerShell on Windows, `ps -o etimes` on Linux); elsewhere only the PID is checked.
- On Windows, a production started by the runner sits in libuv's kill-on-close job object, so if only the runner is killed, Windows ends the production with it. Restart recovery also covers productions that outlive their runner (POSIX, detached processes).
