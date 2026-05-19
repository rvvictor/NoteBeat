import os
import secrets
import time
from typing import Optional
from urllib import parse
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.services.deps import get_current_user
from app.models.user import User
from app.services.spotify.client import (
    AUTHORIZE_URL,
    ensure_user_access_token,
    exchange_code_for_token,
    get_followed_artists,
    get_recent_tracks,
    get_top_artists,
    get_top_tracks,
    get_artist_top_tracks,
    get_recommendations,
    search_artists_with_token,
    search_tracks,
    search_tracks_with_token
)

router = APIRouter()
callback_router = APIRouter()

SPOTIFY_STATE_COOKIE = "spotify_oauth_state"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SPOTIFY_REDIRECT_URI = os.getenv(
    "SPOTIFY_REDIRECT_URI",
    "https://localhost:8000/callback"
)
SPOTIFY_POST_AUTH_REDIRECT = os.getenv(
    "SPOTIFY_POST_AUTH_REDIRECT",
    "http://localhost:3000/dashboard/notes"
)
SPOTIFY_SCOPES = os.getenv(
    "SPOTIFY_SCOPES",
    "user-follow-read user-read-recently-played user-top-read"
)
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_STATE_TTL = int(os.getenv("SPOTIFY_STATE_TTL", "600"))

_spotify_state_cache: dict[str, tuple[str, float]] = {}
_recommendation_cache: dict[tuple[str, str], tuple[float, list]] = {}
_recommendation_last_call: dict[str, float] = {}

RECOMMENDATION_CACHE_TTL = int(os.getenv("SPOTIFY_RECOMMENDATION_CACHE_TTL", "45"))
RECOMMENDATION_RATE_LIMIT_SECONDS = float(
    os.getenv("SPOTIFY_RECOMMENDATION_RATE_LIMIT", "2.0")
)


def _cache_spotify_state(state: str, user_id: str):
    expires_at = time.time() + SPOTIFY_STATE_TTL
    _spotify_state_cache[state] = (user_id, expires_at)


def _consume_spotify_state(state: str) -> Optional[str]:
    now = time.time()
    expired_states = [key for key, (_, exp) in _spotify_state_cache.items() if exp <= now]
    for key in expired_states:
        _spotify_state_cache.pop(key, None)

    entry = _spotify_state_cache.pop(state, None)
    if not entry:
        return None

    user_id, expires_at = entry
    if expires_at <= now:
        return None

    return user_id


@router.get("/search")
def search_spotify(q: str, limit: int = 5, user=Depends(get_current_user)):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        return {"items": search_tracks(q, limit=limit)}
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Spotify request failed")


@router.get("/status")
def spotify_status(user=Depends(get_current_user)):
    return {
        "connected": bool(user.spotify_refresh_token)
    }


@router.post("/disconnect")
def spotify_disconnect(user=Depends(get_current_user), db: Session = Depends(get_db)):
    user.spotify_access_token = None
    user.spotify_refresh_token = None
    user.spotify_expires_at = None

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Spotify disconnected"}


@router.get("/login")
def spotify_login(user=Depends(get_current_user)):
    if not SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Missing Spotify client id")

    state = secrets.token_urlsafe(16)
    _cache_spotify_state(state, str(user.id))
    params = parse.urlencode({
        "response_type": "code",
        "client_id": SPOTIFY_CLIENT_ID,
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": SPOTIFY_SCOPES,
        "state": state
    })

    response = RedirectResponse(f"{AUTHORIZE_URL}?{params}")
    response.set_cookie(
        key=SPOTIFY_STATE_COOKIE,
        value=state,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=600
    )

    return response


@callback_router.get("/callback")
def spotify_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if error:
        raise HTTPException(status_code=400, detail=error)

    if not state:
        raise HTTPException(status_code=400, detail="Invalid Spotify state")

    user_id = _consume_spotify_state(state)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid Spotify state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing Spotify code")

    payload = exchange_code_for_token(code, SPOTIFY_REDIRECT_URI)
    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token")
    expires_in = int(payload.get("expires_in", 3600))

    if not access_token:
        raise HTTPException(status_code=502, detail="Spotify token exchange failed")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.spotify_access_token = access_token
    if refresh_token:
        user.spotify_refresh_token = refresh_token
    user.spotify_expires_at = time.time() + expires_in - 30

    db.add(user)
    db.commit()
    db.refresh(user)

    response = RedirectResponse(SPOTIFY_POST_AUTH_REDIRECT)
    response.delete_cookie(SPOTIFY_STATE_COOKIE)
    return response


@router.get("/recommendations")
def spotify_recommendations(
    text: str,
    limit: int = 6,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    now = time.time()
    cache_key = (str(user.id), text.strip().lower())
    cached = _recommendation_cache.get(cache_key)
    if cached and now - cached[0] <= RECOMMENDATION_CACHE_TTL:
        return {"items": cached[1]}

    last_call = _recommendation_last_call.get(str(user.id))
    if last_call and now - last_call < RECOMMENDATION_RATE_LIMIT_SECONDS:
        if cached:
            return {"items": cached[1]}
        raise HTTPException(status_code=429, detail="Too many recommendation requests")

    _recommendation_last_call[str(user.id)] = now

    try:
        token = ensure_user_access_token(user, db)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    followed = get_followed_artists(token, limit=10)
    recent = get_recent_tracks(token, limit=10)
    top_tracks = get_top_tracks(token, limit=10)
    top_artists = get_top_artists(token, limit=10)

    seed_artists = [artist.get("id") for artist in followed if artist.get("id")]
    seed_tracks = [track.get("id") for track in recent if track.get("id")]
    seed_tracks.extend([track.get("id") for track in top_tracks if track.get("id")])

    note_text = text.strip()[:160]
    note_text_lower = note_text.lower()
    artist_name_lookup = {}
    mentioned_artist = None
    mentioned_artist_id = None
    artist_recent = []
    artist_top = []
    artist_priority = []

    def _extract_artist_candidate(text_value: str) -> Optional[str]:
        normalized = text_value.replace("\n", " ").strip()
        lowered = normalized.lower()
        markers = [
            "cancion de ",
            "canción de ",
            "cancion del ",
            "canción del ",
            "me recuerda a ",
            "me recuerdas a ",
            "me recordaste a ",
            "me recordo a ",
        ]
        for marker in markers:
            if marker in lowered:
                start = lowered.rfind(marker) + len(marker)
                candidate = normalized[start:]
                break
        else:
            return None

        candidate = candidate.replace("una cancion de", "").replace("una canción de", "")
        candidate = candidate.split(".")[0].split(",")[0].split("!")[0].split("?")[0]
        words = [word.strip() for word in candidate.split() if word.strip()]
        if not words:
            return None
        return " ".join(words[:3])

    for artist in followed + top_artists:
        name = (artist.get("name") or "").strip()
        if name:
            artist_name_lookup[name.lower()] = name

    for track in recent + top_tracks:
        artist_names = (track.get("artist") or "").split(",")
        for name in artist_names:
            clean_name = name.strip()
            if clean_name:
                artist_name_lookup[clean_name.lower()] = clean_name

    for candidate in sorted(artist_name_lookup.keys(), key=len, reverse=True):
        if candidate and candidate in note_text_lower:
            mentioned_artist = artist_name_lookup[candidate]
            break

    if not mentioned_artist:
        candidate = _extract_artist_candidate(note_text_lower)
        if candidate:
            artist_matches = search_artists_with_token(candidate, token, limit=1)
            if artist_matches:
                mentioned_artist = artist_matches[0].get("name")
                mentioned_artist_id = artist_matches[0].get("id")

    if mentioned_artist:
        artist_recent = [
            track for track in recent
            if mentioned_artist.lower() in (track.get("artist") or "").lower()
        ]
        artist_top = [
            track for track in top_tracks
            if mentioned_artist.lower() in (track.get("artist") or "").lower()
        ]

        matching_artist = next(
            (artist for artist in followed + top_artists
             if (artist.get("name") or "").lower() == mentioned_artist.lower()),
            None
        )
        if matching_artist and matching_artist.get("id"):
            mentioned_artist_id = matching_artist.get("id")

        artist_catalog_top = []
        if mentioned_artist_id:
            artist_catalog_top = get_artist_top_tracks(token, mentioned_artist_id)

        artist_search = search_tracks_with_token(
            f"artist:{mentioned_artist}",
            token,
            limit=max(limit * 2, 6)
        )

        artist_priority = artist_recent + artist_top + artist_catalog_top + artist_search
        deduped = []
        seen = set()
        for track in artist_priority:
            track_id = track.get("id")
            if not track_id or track_id in seen:
                continue
            seen.add(track_id)
            deduped.append(track)
        artist_priority = deduped

        if artist_priority:
            recommendations = artist_priority[:limit]
            if len(recommendations) >= limit:
                return {"items": recommendations}

        if mentioned_artist_id:
            seed_artists = [mentioned_artist_id]
        seed_tracks = [track.get("id") for track in artist_priority if track.get("id")]

    if note_text:
        matched = search_tracks_with_token(note_text, token, limit=1)
        if matched and matched[0].get("id"):
            seed_tracks.append(matched[0]["id"])

    recommendations = []
    if mentioned_artist and artist_priority:
        recommendations = artist_priority[:limit]

    seed_artists = [value for value in seed_artists if value][:2]
    seed_tracks = [value for value in seed_tracks if value][:3]

    if seed_artists or seed_tracks:
        seed_recommendations = get_recommendations(token, seed_artists, seed_tracks, limit=limit)
        if recommendations:
            seen = {track.get("id") for track in recommendations if track.get("id")}
            for track in seed_recommendations:
                track_id = track.get("id")
                if not track_id or track_id in seen:
                    continue
                recommendations.append(track)
                seen.add(track_id)
                if len(recommendations) >= limit:
                    break
        else:
            recommendations = seed_recommendations

    if not recommendations and mentioned_artist:
        artist_fallback = [track for track in (artist_recent + artist_top) if track.get("id")]
        if artist_fallback:
            recommendations = artist_fallback[:limit]

    if not recommendations and recent:
        recommendations = recent[:limit]

    if recommendations:
        deduped = []
        seen = set()
        for track in recommendations:
            track_id = track.get("id")
            if not track_id or track_id in seen:
                continue
            seen.add(track_id)
            deduped.append(track)
        recommendations = deduped[:limit]

    _recommendation_cache[cache_key] = (time.time(), recommendations)
    return {"items": recommendations}
