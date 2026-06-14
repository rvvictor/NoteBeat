# NoteBeat

NoteBeat is a social journaling app where private writing, emotional reflection, and music discovery meet in one place.

The project is still in active development. The current version is a working product prototype with authentication, private notes, public feed posts, long-form threads, Spotify-powered song selection, AI emotion analysis, recaps, and a profile/feed experience that is still being refined.

This README is written as a living product document, inspired by the clear catalog-style structure of [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md): concise purpose, current scope, design notes, and implementation details in one place.

## What NoteBeat Is

NoteBeat starts from a simple idea: notes are more expressive when they carry emotional context and a song.

Users can write private notes, attach music, analyze emotional patterns, and selectively share pieces of their writing into a social feed. The app is not meant to feel like a generic social network. The intended identity is more intimate, reflective, and music-led: a place where posts feel like emotional artifacts rather than disposable updates.

## Current Product Surface

### Private Notes

- Create and edit longer private notes.
- Attach Spotify songs to notes.
- Keep private writing separate from public posting.
- Publish a private note excerpt as a public long-form thread without converting the original note.

### Quick Notes

- Write short public posts directly from the dashboard feed.
- Attach a song quickly.
- Get Spotify recommendations based on note text.
- Quick song picks now require cover art so saved notes do not lose album imagery.

### Feed

- `Para ti`: posts from followed users.
- `Hilos`: long-form public notes derived from private writing.
- `Descubrir`: broader discovery feed, currently ranked with a provisional local signal until aggregate engagement metrics exist.
- Feed posts support likes, reposts, saves, shares, follows, and song cards.

### Threads

Threads are NoteBeat's first step toward a more distinctive content format.

They are designed for users who wrote something privately, then decide to publish a full story or a curated excerpt. Threads get a specific visual treatment with a NoteBeat seal and a "from private note" signal.

### Music Layer

- Spotify search.
- Spotify OAuth connection.
- Recently played, top tracks, followed artists, and seed-based recommendations.
- Album covers are now enforced when saving songs.
- Existing songs without covers are backfilled on backend startup when Spotify credentials are available.

### AI Layer

- Emotion dashboard.
- AI chat over the user's notes.
- Recap summaries by week, month, and year.
- Music mood, top songs/artists/albums, emotion-song patterns, and activity rhythm.

### Profile

- Editable display name, username, bio, avatar, and cover.
- Public post tabs: posts, reposts, likes, saved.
- Profile identity lives in the right panel entry point, while the center panel prioritizes feed browsing.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- Tailwind CSS 4
- Recharts
- TypeScript

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL-compatible database URL
- JWT cookie auth
- Spotify Web API
- Gemini API for AI features

### Local Orchestration

- Docker Compose
- Backend HTTPS through local certificates
- Frontend served through Next dev server and Caddy HTTPS proxy

## Local Development

The intended local workflow is Docker Compose from the repository root:

```bash
docker compose up --build
```

Default local services:

- Frontend HTTPS: `https://localhost:3000`
- Frontend dev server: `http://localhost:3001`
- Backend HTTPS API: `https://localhost:8000`

The compose setup expects backend environment values in `backend/.env`.

Useful frontend environment example:

```env
NEXT_PUBLIC_API_BASE_URL=https://localhost:8000
```

Common backend environment values:

```env
DATABASE_URL=
SECRET_KEY=
ALGORITHM=
GEMINI_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://localhost:8000/callback
SPOTIFY_POST_AUTH_REDIRECT=https://localhost:3000/dashboard
CORS_ORIGINS=https://localhost:3000,http://localhost:3001
COOKIE_SECURE=true
```

Song-cover repair can be disabled if needed:

```env
BACKFILL_SONG_COVERS_ON_STARTUP=false
```

## Current Design Direction

NoteBeat has a strong concept, but the current dashboard can feel dense because it tries to expose every system at once:

- private notes
- public feed
- quick composer
- profile
- emotion dashboard
- recap
- AI chat
- Spotify recommendations
- post interactions
- long-form thread publishing

The product essence is good: private emotional writing plus music plus selective sharing. The challenge is hierarchy.

### What Feels Heavy Right Now

- Three columns compete for attention at the same time.
- The right panel mixes identity, dashboard, logout, dominant mood, recap, top music, emotion shifts, and multiple charts/lists.
- The center feed now has tabs and a composer, but the page still exposes many actions per post.
- The left panel lists private notes while also offering creation, chat, and thread publishing actions.
- The app can feel like a dashboard, feed, notebook, analytics tool, and profile all at once.

### Recommended Product Balance

The app should move toward a calmer "journal first, social second, analytics when invited" structure.

Recommended hierarchy:

1. Center: the active workspace.
   - Feed, thread reading, or note writing.
   - One dominant task at a time.

2. Left: personal library.
   - Private notes.
   - Search/filter.
   - Create note.
   - Thread publishing should remain available, but not visually equal to editing.

3. Right: contextual companion.
   - Profile entry.
   - One emotional insight.
   - One music/recap card.
   - AI chat entry.
   - Deeper analytics should live behind a detail view.

### What To Remove Or Hide By Default

- Hide most recap detail behind "View recap".
- Collapse secondary post actions into icons or a compact action row.
- Move logout into profile/settings.
- Move AI chat out of the left header and into a dedicated floating/contextual action.
- Avoid showing all recap sections in the right rail simultaneously.
- Do not show both "private note publishing" and "edit note" as equally loud actions on every note card.

### What To Keep Visible

- The feed tabs: `Para ti`, `Hilos`, `Descubrir`.
- The quick note composer, but only in feed mode.
- Song cover art. This is a brand-level signal and should be consistent everywhere.
- One emotional signal, not the entire emotional dashboard.
- A clear profile entry.

### What To Add Later

- A focused thread reader view.
- A quieter note library with search, pinned notes, and filters.
- A "Today" mode that combines one prompt, one song recommendation, and one emotional reflection.
- Aggregated feed metrics for true trending ranking.
- A dedicated design system document (`DESIGN.md`) to lock NoteBeat's visual language.

## Design Principles

1. Music is not decoration.
   Album art should be present anywhere a song appears.

2. Private writing is the source of truth.
   Public posts and threads are excerpts or expressions derived from private notes.

3. Emotional insight should feel gentle.
   Recaps and charts should help users notice patterns without overwhelming the writing experience.

4. Social features should not overpower the diary.
   Likes, reposts, follows, and discovery matter, but NoteBeat should not feel like a clone of a timeline app.

5. Density should be progressive.
   Show a calm default view. Reveal depth when the user asks for it.

## Development Status

This project is under active development.

Current focus areas:

- Reducing dashboard saturation.
- Refining the feed and thread experience.
- Strengthening the NoteBeat brand language.
- Improving Spotify cover reliability.
- Separating deep analytics from everyday writing.
- Preparing a stronger design system for future UI work.

## Suggested Next Iteration

The next UI iteration should simplify the dashboard before adding more features:

- Make the center panel the only high-density area.
- Turn the right panel into a calm "Today / Profile / Pulse" rail.
- Move detailed recap into a separate route or modal.
- Make the left note list quieter and more library-like.
- Treat hilos as a premium NoteBeat-native format with a dedicated reader.

The goal is not to remove NoteBeat's depth. The goal is to reveal it in layers.
