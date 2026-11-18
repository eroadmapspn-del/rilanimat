# Architecture

## Goal

A single-user tool that turns a product brief into a 30-second vertical reel, with a human approving each step.

## Layers

```
web/ (browser)  ──HTTP──►  api/  ──►  services/  ──►  domain/        (pure rules)
                                          │
                                          ├──► providers/   Gemini (or fake): script, voice
                                          ├──► media/       ffmpeg helpers, composition, Remotion runner
                                          ├──► storage/     ProjectRepository (JSON files)
                                          └──► jobs/        background job runner
                                                   │
                                           remotion/  (Node): renders composition.json to MP4
```

Dependency rule: arrows only point down. `domain/` imports nothing from the rest of the app.

| Folder | Responsibility |
|---|---|
| `api/` | Flask routes. Parse the request, call one service method, return JSON. No business rules. |
| `services/` | One use case per pipeline stage: `ScriptService`, `VoiceService`, `SceneService`, `ReelService`, `ProjectService`. |
| `domain/` | Approval gates, what resets when something changes (`workflow.py`), scene timing (`timing.py`), scene-plan repair (`planning.py`), brief validation (`project.py`). |
| `providers/` | The AI services behind two small interfaces (`ScriptWriter`, `VoiceSynth`). `gemini/` is real, `fake.py` is for tests and demos. |
| `media/` | `ffmpeg.py` (duration, audio conversion), `composition.py` (builds the Remotion props), `remotion.py` (runs the renderer, parses progress). |
| `storage/` | `ProjectRepository`: one folder per project with `project.json`. Atomic writes with retry for Windows/OneDrive locks. |
| `jobs/` | `JobRunner`: one background job per (project, kind). Failures are reported to the project, never lost. |
| `config.py` | One typed `Settings`, built once from `.env`. |
| `errors.py` | Typed errors (`WorkflowError`, `InvalidMedia`, `QuotaExceeded`...). The API turns each into a JSON error with the right status. |

## The workflow

```
brief ─► script ─approve─► voice ─approve─► scenes ─approve─► render
                  │           │                │
 changing it resets everything that depends on it (domain/workflow.py)
```

- Editing the **spoken words** resets the voice-over and later steps.
- Editing only the **look** (layout, photo, headline...) keeps the voice-over and just needs the scenes re-approved.
- Uploaded clips belong to a scene, so they survive voice changes. Writing a brand-new script clears them.
- Gates are enforced on the server, not just in the UI.

## How the reel is made

1. `media/composition.py` turns the approved project into `composition.json`: scene lengths (voice length split by text length), estimated word timings for captions, files to use, theme colours, end card.
2. `services/reel.py` stages only the needed files into `projects/<id>/render/` (hard links, so no copying) and calls Remotion with `--props` and `--public-dir`.
3. `remotion/src/` renders the `Reel` composition. Each scene is one template (`hook`, `full`, `card`, `feature`, `clip`) plus karaoke captions; then the end card; the voice-over plays across the scenes.
4. Progress lines from Remotion are parsed and stored in `project.final.progress`, which the UI polls.

The contract between Python and Remotion is `remotion/src/types.ts` and `media/composition.py`. Change both together. The test `test_composition_matches_remotion_contract` guards the Python side.

## Data model (project.json)

```
id, created, brief{...images}, approved{script,voice,scenes},
script{status,data{title,voice_style,scenes[],caption,hashtags},error},
voice{status,file,duration,voice,source,error},
scenes{ "<id>": uploaded clip {status,file,source,duration} },
final{status,file,progress,draft,error}, logs[]
```

Each script scene: `id, name, vo_text, vo_roman, template, image, motion, headline, bullets[], sticker`.

## Testing

- `tests/test_domain.py`: timing, gates, resets, plan repair.
- `tests/test_pipeline_api.py`: the whole pipeline through HTTP with a fake script writer, fake voice and fake renderer. Runs offline, spends no quota.
- Remotion: `npm run typecheck`, and `npm run studio` to look at templates.

## Decisions and how to evolve

| Decision | Why | When to change it |
|---|---|---|
| JSON files for storage | One user, easy to inspect and back up | Multiple users or accounts: implement `ProjectRepository` on SQLite/Postgres |
| In-process threads for jobs | Simple, enough for one user | Several users or long queues: replace `JobRunner` with RQ/Celery (same `start`/`running` interface) |
| Polling for progress | Simple, robust | If it feels laggy: Server-Sent Events from the same state |
| Estimated word timings | No extra dependency | For exact captions: run Whisper on the voice-over and fill `words` |
| Remotion instead of AI video | No video API or billing needed, deterministic output | If you later get a video model: add a `clip` provider that fills uploaded-clip slots |
| Projects inside the app folder | Easy to find | OneDrive locks files; set `REELSTUDIO_DATA_DIR` to a local folder |

## Ideas not built yet

- Brand kits (saved colours, fonts, logo, tagline) and reel templates (Product Ad, Story Reel, Festival Offer).
- Logo watermark and a music bed under the voice-over.
- Per-scene still preview without rendering the whole reel.
- Whisper-based caption timing.
