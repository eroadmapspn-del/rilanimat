# 🎬 Reel Studio

Make a 30-second Instagram Reel / product ad: **script → voice-over → scenes → reel**.
You approve every step. Gemini writes the script and the voice. **Remotion** (video made with React)
renders the reel, so you need **no video-generation API**.

## Setup (first time)

```powershell
cd reel-studio
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"

cd remotion
npm install          # video templates (needs Node.js 18+)
cd ..

copy .env.example .env   # then put your Gemini key in .env
```

## Run

```powershell
.venv\Scripts\activate
python -m reelstudio
```

Open **http://127.0.0.1:5000**.

The first render downloads a headless browser (a few minutes, once). Later renders take about a minute for a draft.

Try it with no key and no quota: set `REELSTUDIO_PROVIDER=fake` in `.env`. The script and voice are then demo stand-ins.

## The flow

| Step | What happens | You do |
|---|---|---|
| 1. Brief | Brand, product, real features, language, tone, colour, photos | Fill the form |
| 2. Script | Gemini writes the voice-over, a headline and a visual plan for each scene | Edit, then **Approve** |
| 3. Voice-over | Gemini TTS records ONE continuous narration, **or upload your own recording** | Listen, regenerate or change voice, **Approve** |
| 4. Scenes | Pick the layout, photo, camera motion, headline, chips and emoji for each scene. Optionally **upload your own clip** for any scene | Adjust, **Approve** |
| 5. Reel | Remotion renders scenes timed to the words spoken, karaoke captions, end card and voice | Quick draft, then final render, download, copy caption |

### Scene layouts

| Layout | Look |
|---|---|
| Big text (hook) | Headline on the brand gradient, emoji sticker, photo peeking from the bottom |
| Full-screen photo | Photo fills the screen with slow zoom/pan |
| Photo card | Photo in a rounded card on a blurred copy of itself |
| Photo + feature chips | Photo and 2-3 feature chips that pop in |
| Your own clip | An uploaded video, slowed slightly if it is shorter than the scene |

Scene length follows how many words the scene speaks. Captions are estimated word by word from the script text.

## Important: your photos appear in the reel

The reel shows your product photos directly. Use clean photos of your own Onomie bag. Photos that show
another brand's name or logo will show it in the video too. The sample photos in `assets/` are only for trying the app.

## Layout of this project

```
reel-studio/
├─ src/reelstudio/      Python app (see docs/architecture.md)
├─ remotion/            React video templates
├─ web/                 browser UI (HTML, CSS, ES modules)
├─ tests/               pytest, runs offline with fake providers
├─ docs/                architecture notes
├─ assets/              sample product photos
└─ projects/            your reels (git-ignored)
```

## Settings (.env)

| Name | Meaning |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_TEXT_MODEL` | Writes the script, e.g. `gemini-2.5-flash` |
| `GEMINI_TTS_MODEL` | Voice-over, e.g. `gemini-3.8-flash-tts` |
| `REELSTUDIO_PROVIDER` | `gemini` (default) or `fake` (offline demo) |
| `REELSTUDIO_DATA_DIR` | Where projects are stored (default `projects/`; consider a folder outside OneDrive) |
| `REELSTUDIO_PORT` | Port (default 5000) |

## Develop

```powershell
pytest                    # Python tests
ruff check src tests      # lint
cd remotion
npm run typecheck         # TypeScript
npm run studio            # live-preview the templates in the Remotion Studio
```

## Known limits

- **Free-tier voice limit:** about 10 text-to-speech requests per day. Uploading your own recording avoids it.
- **No AI footage.** Scenes are designed from your photos, text, stickers and your own clips.
- **Remotion licence:** free for individuals and small companies; larger companies need a paid licence. Check remotion.dev/license.
- **Fonts:** captions use system fonts (Segoe UI on Windows). Devanagari text falls back to a system font.
