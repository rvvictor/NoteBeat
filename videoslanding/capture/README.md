# Capture pipeline

Everything the landing page shows is a recording of NoteBeat running locally —
no mock UI. This folder holds the scripts that produced it.

## What you need

- The app running locally: `docker compose up` in the repo root
  (frontend on `https://localhost:3000`, backend on `https://localhost:8000`).
- `ffmpeg` on the PATH.
- Playwright, installed on demand (it is not a dependency of this project):

  ```bash
  npm i --no-save playwright@1.63.0
  npx playwright install chromium   # skip if the browser is already cached
  ```

## Recording

```bash
cd capture

# 1. Sign in once; writes state.json (self-signed cert is accepted)
NOTEBEAT_EMAIL=you@example.com NOTEBEAT_PASSWORD=... node login.mjs

# 2. Record the scenes (one webm per scene under clips/, 2880x1800)
node scenes.mjs all          # or: node scenes.mjs quicknote

# 3. Cut the ranges in cuts.txt into public/capture
./pipeline.sh

# 4. Render the hero
cd .. && npx remotion render NoteBeatHero out/hero-raw.mp4
```

`scenes.mjs` prints a timestamp for every beat it records:

```
mark typed @ 11.68s
mark results @ 17.16s
```

Those marks are where the numbers in `cuts.txt` come from — re-record a scene,
read the new marks, update the cut.

`director.mjs` drives the browser like a camera operator: eased cursor moves
(the soft violet dot is injected into the page, headless Chromium has no real
cursor), click ripples, realistic typing delays, eased scrolling, and it hides
the Next.js dev indicator and scrollbars. It re-aims at a target right before
clicking, because the app re-renders debounced panels while the cursor travels.

## Shipping to the frontend

The render is 1920x1080 and far too large to serve raw:

```bash
ffmpeg -i out/hero-raw.mp4 -c:v libx264 -crf 29 -preset slow \
  -profile:v high -pix_fmt yuv420p -g 60 -an -movflags +faststart \
  ../frontend/public/media/hero.mp4

# poster frame (the establishing shot of the dashboard)
ffmpeg -ss 8.3 -i out/hero-raw.mp4 -frames:v 1 -q:v 4 \
  ../frontend/public/media/hero-poster.jpg
```

## Feature stills

`stills.mjs` captures the four landing images straight from the app, cropped to
the aspect ratios the page uses (4:3 rows, 1:1 for the recap panel):

```bash
node stills.mjs   # writes still-create/share/feed/ai.png

for p in "still-create:feature-create-note:1200:900" \
         "still-share:feature-share-note:1200:900" \
         "still-feed:feature-feed:1200:900" \
         "still-ai:ai-panel:1080:1080"; do
  IFS=: read src dst w h <<< "$p"
  ffmpeg -y -i $src.png -vf "scale=$w:$h:force_original_aspect_ratio=increase,crop=$w:$h" \
    ../frontend/public/media/$dst.png
done
```

## Note on demo content

The recordings show real data from a real account. The feed, threads and recap
only look alive because the account has content — a handful of notes with real
Spotify tracks, a few published threads, and a couple of accounts to follow.
Seed that through the app or its API before recording, not into the video.

The AI chat panel is deliberately absent from the hero: Gemini's free tier
allows 20 requests per day per model, and a recording session burns through it
with emotion analysis alone, so the shot cannot be relied on. The emotion
dashboard and the recap in the hero are both AI-generated output.
