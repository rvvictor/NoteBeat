# Deploying NoteBeat

Frontend: Vercel. API: Render (free plan, Docker). Database: the existing
Supabase Postgres — Render's own free Postgres expires after 30 days, so it is
deliberately not part of the blueprint.

Everything Render needs lives in [`render.yaml`](render.yaml).

## 1. Get the database URL Render can actually reach

In Supabase → **Project Settings → Database → Connection string**, copy the
**Session pooler** URI (`...pooler.supabase.com:5432`), not the direct one.
The direct host resolves over IPv6 only and the connection will hang.

## 2. Create the service

Render dashboard → **New → Blueprint** → pick this repository → **Apply**.
Render reads `render.yaml`, builds `backend/Dockerfile` and asks for the
variables marked `sync: false`. Fill them like this:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the session pooler URI from step 1 |
| `SECRET_KEY` | any long random string (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | Google AI Studio key |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify developer app |
| `SPOTIFY_REDIRECT_URI` | `https://<service>.onrender.com/callback` |
| `SPOTIFY_POST_AUTH_REDIRECT` | `https://<vercel-domain>/dashboard/notes` |
| `CORS_ORIGINS` | `https://<vercel-domain>` (comma separated for more) |

The two URLs that contain the service's own hostname are only known once the
service exists; set them right after the first deploy and let it redeploy.

Check it with `curl https://<service>.onrender.com/` → `{"message":"API running"}`.

If you would rather not use the blueprint: **New → Web Service**, same repo,
language **Docker**, Dockerfile path `./backend/Dockerfile`, Docker build
context `./backend`, instance type **Free**, and add the variables from the
table plus `ALGORITHM=HS256`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax`,
`BACKFILL_SONG_COVERS_ON_STARTUP=false`, `SPOTIFY_SCOPES=user-follow-read
user-read-recently-played user-top-read`.

## 3. Whitelist the callback in Spotify

Spotify Developer Dashboard → the app → **Settings → Redirect URIs** → add the
exact `SPOTIFY_REDIRECT_URI` value. Spotify matches it literally.

## 4. Point Vercel at the API — through the proxy, not directly

The auth token is an httpOnly cookie, and `middleware.ts` reads it to guard
`/dashboard`. A cookie set by `onrender.com` is third-party to the Vercel
domain: Safari and Firefox drop it and the middleware never sees it, so every
login bounces straight back to `/login`.

`next.config.ts` therefore rewrites `/api/*` to the backend, which makes the
cookie first-party. On Vercel → **Settings → Environment Variables**:

```
BACKEND_ORIGIN=https://<service>.onrender.com
NEXT_PUBLIC_API_BASE_URL=/api
```

Then redeploy (`NEXT_PUBLIC_*` is inlined at build time, so a rebuild is
required — not just a restart).

Local development is unaffected: without `BACKEND_ORIGIN` no rewrite is added
and `.env.local` keeps pointing at `https://localhost:8000`.

## What the free plan means here

- The service sleeps after 15 minutes without traffic. The next request wakes
  it and takes roughly a minute — the app looks frozen on that first call.
- 750 instance hours a month, 512 MB RAM, shared CPU.
- Supabase free projects pause after a week of inactivity; the API returns
  connection errors until the project is resumed from its dashboard.
- Gemini's free tier allows about 20 requests per day per model, shared between
  emotion analysis and the AI chat.
- Deploys are triggered by every push to the default branch (`autoDeploy`).

## Notes on the container

`backend/Dockerfile` binds uvicorn to `$PORT` (Render injects it) and runs with
`--proxy-headers`, so the app sees the real scheme behind Render's proxy.
`docker-compose.yml` overrides the command for local HTTPS, so nothing changes
for development.

`BACKFILL_SONG_COVERS_ON_STARTUP` is `false` in production: that backfill talks
to Spotify at import time, before the port is bound, and a slow run would fail
the health check on a cold start.
