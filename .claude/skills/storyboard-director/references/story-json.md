# story.json

All paths are relative to `productions/<slug>/`. Times are seconds. Scaffold with `python -m reelstudio.production new productions/<slug>`.

```jsonc
{
  "meta": { "title": "", "topic": "", "language": "English", "factuality": "fiction|true|inspired",
            "hook": "", "style": "", "characters": {}, "locations": {} },
  "scenes": [
    { "text": "words spoken in this scene",          // scene texts joined = the narration
      "transition": "fade",                           // INTO this scene: fade | slide-up | slide-left | zoom | cut
      "visual": {
        "prompt": "9:16 ... style bible ...",
        "file": "images/s01.png",                     // null until an asset exists
        "source": "user | stock | ai-generated | placeholder",
        "license": "", "url": "",                     // required for stock; note the tool for ai-generated
        "camera": "push-in",                          // push-in pull-out pan-left pan-right tilt-up tilt-down drift static
        "atmosphere": { "tint": "#10243a", "dim": 0.3 }
      } }
  ],
  "music": { "file": "audio/music.mp3", "volume": 0.18, "duckTo": 0.06, "source": "", "license": "" },   // or null
  "sfx": [ { "file": "audio/whoosh.wav", "at": 12.4, "volume": 0.6 } ],
  "captions": true,
  "theme": { "accent": "#ffd166", "text": "#ffffff", "bg": "#16324f" },     // optional
  "voice": { }                                                              // written by the voice step. Do not hand-edit.
}
```

Rules
- `voice` is filled by `python -m reelstudio.production voice <folder>`. If scene `text` changes afterwards, run the voice step again.
- Scene start/end are derived from the voice timings. Never type them.
- A video file (`.mp4 .mov .webm`) is detected by extension and played muted; an image gets the camera move.

Commands: `voice`, `placeholders`, `ambient` (local music bed), `build`, `render [--draft]`, `review [--video]`.
Preview in Remotion Studio: `cd remotion && npx remotion studio src/index.ts --props=../productions/<slug>/build/props.json --public-dir=../productions/<slug>/build/public`, composition **Story**.
