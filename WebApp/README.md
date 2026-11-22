# Reel Studio web app

Next.js 16 + Auth.js (Google, GitHub, email + password; JWT sessions) + Prisma/Postgres + Razorpay + Gemini + Remotion.

## Run it

```powershell
cd WebApp
npm install
copy .env.example .env      # fill in DATABASE_URL, GEMINI_*, RAZORPAY_*; AUTH_SECRET (`npx auth secret`), AUTH_GOOGLE_*, AUTH_GITHUB_*
npx prisma migrate deploy
npm run dev                 # the website, http://localhost:3000
npm run worker              # in a second terminal: renders videos (first run downloads headless Chrome)
```

## The pipeline (per episode)

`script (Gemini)` -> you approve -> `voice-over (Gemini TTS)` -> you approve -> `render (Remotion, worker)`

- Code: `src/lib/pipeline/` (catalog, prompts, scriptwriter, voice, audio, timeline, workflow, service).
- Rendering: `worker/` claims `RenderJob` rows; the video itself is `remotion/src/` (art library + Story composition).
- Files: `src/lib/storage.ts`. Local disk in `.storage/` for development; set `S3_BUCKET` and friends for R2/S3.
- A render counts against the plan's video cap when requested; a failed render stops counting.
- `RENDER_SCALE=0.5` in `.env` makes quick low-resolution test renders.

## Plans and roles

Limits live in `src/lib/plans.ts`. `FREE`: 3 videos in total, up to 30 s. `PRO` (Rs 499): 180 videos a month, up to 60 s. `STUDIO` (Rs 999): 600 videos a month, up to 90 s, 3D (not built yet). `ADMIN`: no cap.
A payment gives 30 days (`fulfillOrder` in `src/lib/billing.ts`); after `planExpiresAt` the user is treated as FREE. Failed renders do not count.
Admins get `/admin` to change plans. Make the first admin in SQL: `UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';`
The JWT carries the role for quick redirects; server code (`requireUser`, `requireRole`, `entitlements`) re-reads it from the database.
