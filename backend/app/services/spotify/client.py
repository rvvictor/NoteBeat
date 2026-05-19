import base64
import json
import os
import time
from typing import Optional
from urllib import error, parse, request

API_BASE_URL = "https://api.spotify.com/v1"
AUTHORIZE_URL = "https://accounts.spotify.com/authorize"

TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = f"{API_BASE_URL}/search"

_token_cache = {
    "access_token": None,
    "expires_at": 0
}


def _get_client_credentials():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise RuntimeError("Missing Spotify credentials")

    raw = f"{client_id}:{client_secret}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def _fetch_access_token():
    encoded = _get_client_credentials()
    data = parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")

    payload = _request_json(
        TOKEN_URL,
        method="POST",
        data=data,
        headers={
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    access_token = payload.get("access_token")
    expires_in = int(payload.get("expires_in", 3600))

    if not access_token:
        raise RuntimeError("Failed to obtain Spotify token")

    _token_cache["access_token"] = access_token
    _token_cache["expires_at"] = time.time() + expires_in - 30

    return access_token


def get_access_token():
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["access_token"]

    return _fetch_access_token()


def _request_json(url: str, token: Optional[str] = None, method: str = "GET", data=None, headers=None):
    req_headers = headers.copy() if headers else {}

    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    req = request.Request(
        url,
        data=data,
        headers=req_headers,
        method=method
    )

    with request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _build_track_payload(track: dict):
    album_images = track.get("album", {}).get("images", [])
    image_url = album_images[0].get("url") if album_images else None
    return {
        "id": track.get("id"),
        "title": track.get("name"),
        "artist": ", ".join([artist.get("name") for artist in track.get("artists", [])]),
        "album": track.get("album", {}).get("name"),
        "image_url": image_url,
        "preview_url": track.get("preview_url")
    }


def exchange_code_for_token(code: str, redirect_uri: str):
    encoded = _get_client_credentials()
    data = parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri
    }).encode("utf-8")

    payload = _request_json(
        TOKEN_URL,
        method="POST",
        data=data,
        headers={
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    return payload


def refresh_user_token(refresh_token: str):
    encoded = _get_client_credentials()
    data = parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }).encode("utf-8")

    payload = _request_json(
        TOKEN_URL,
        method="POST",
        data=data,
        headers={
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    return payload


def ensure_user_access_token(user, db):
    if not user.spotify_refresh_token:
        raise RuntimeError("Spotify not connected")

    if user.spotify_access_token and user.spotify_expires_at:
        if time.time() < user.spotify_expires_at:
            return user.spotify_access_token

    payload = refresh_user_token(user.spotify_refresh_token)
    access_token = payload.get("access_token")
    expires_in = int(payload.get("expires_in", 3600))

    if not access_token:
        raise RuntimeError("Failed to refresh Spotify token")

    user.spotify_access_token = access_token
    user.spotify_expires_at = time.time() + expires_in - 30
    db.add(user)
    db.commit()
    db.refresh(user)

    return access_token


def search_tracks(query: str, limit: int = 5):
    token = get_access_token()

    params = parse.urlencode({
        "q": query,
        "type": "track",
        "limit": limit
    })

    payload = _request_json(
        f"{SEARCH_URL}?{params}",
        token=token
    )

    tracks = payload.get("tracks", {}).get("items", [])
    results = []

    for track in tracks:
        results.append(_build_track_payload(track))

    return results


def search_tracks_with_token(query: str, token: str, limit: int = 5):
    params = parse.urlencode({
        "q": query,
        "type": "track",
        "limit": limit
    })

    try:
        payload = _request_json(
            f"{SEARCH_URL}?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    tracks = payload.get("tracks", {}).get("items", [])
    return [_build_track_payload(track) for track in tracks]


def search_artists_with_token(query: str, token: str, limit: int = 5):
    params = parse.urlencode({
        "q": query,
        "type": "artist",
        "limit": limit
    })

    try:
        payload = _request_json(
            f"{SEARCH_URL}?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    artists = payload.get("artists", {}).get("items", [])
    return [
        {"id": artist.get("id"), "name": artist.get("name")}
        for artist in artists
        if artist.get("id")
    ]


def get_followed_artists(token: str, limit: int = 20):
    params = parse.urlencode({
        "type": "artist",
        "limit": limit
    })

    try:
        payload = _request_json(
            f"{API_BASE_URL}/me/following?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    artists = payload.get("artists", {}).get("items", [])
    return [
        {"id": artist.get("id"), "name": artist.get("name")}
        for artist in artists
        if artist.get("id")
    ]


def get_recent_tracks(token: str, limit: int = 10):
    params = parse.urlencode({
        "limit": limit
    })

    try:
        payload = _request_json(
            f"{API_BASE_URL}/me/player/recently-played?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    items = payload.get("items", [])
    results = []

    for item in items:
        track = item.get("track")
        if not track:
            continue
        results.append(_build_track_payload(track))

    return results


def get_top_tracks(token: str, limit: int = 10, time_range: str = "medium_term"):
    params = parse.urlencode({
        "limit": limit,
        "time_range": time_range
    })

    try:
        payload = _request_json(
            f"{API_BASE_URL}/me/top/tracks?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    items = payload.get("items", [])
    return [_build_track_payload(track) for track in items]


def get_top_artists(token: str, limit: int = 10, time_range: str = "medium_term"):
    params = parse.urlencode({
        "limit": limit,
        "time_range": time_range
    })

    try:
        payload = _request_json(
            f"{API_BASE_URL}/me/top/artists?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    items = payload.get("items", [])
    return [
        {"id": artist.get("id"), "name": artist.get("name")}
        for artist in items
        if artist.get("id")
    ]


def get_artist_top_tracks(token: str, artist_id: str, market: str = "US"):
    params = parse.urlencode({
        "market": market
    })

    try:
        payload = _request_json(
            f"{API_BASE_URL}/artists/{artist_id}/top-tracks?{params}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    tracks = payload.get("tracks", [])
    return [_build_track_payload(track) for track in tracks]


def get_recommendations(token: str, seed_artists: list[str], seed_tracks: list[str], limit: int = 6):
    params = {
        "limit": limit
    }

    if seed_artists:
        params["seed_artists"] = ",".join(seed_artists)
    if seed_tracks:
        params["seed_tracks"] = ",".join(seed_tracks)

    try:
        payload = _request_json(
            f"{API_BASE_URL}/recommendations?{parse.urlencode(params)}",
            token=token
        )
    except (error.HTTPError, error.URLError, TimeoutError):
        return []

    tracks = payload.get("tracks", [])
    return [_build_track_payload(track) for track in tracks]
