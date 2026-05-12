import base64
import json
import os
import time
from urllib import parse, request

TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = "https://api.spotify.com/v1/search"

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

    req = request.Request(
        TOKEN_URL,
        data=data,
        headers={
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST"
    )

    with request.urlopen(req, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

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


def search_tracks(query: str, limit: int = 5):
    token = get_access_token()

    params = parse.urlencode({
        "q": query,
        "type": "track",
        "limit": limit
    })

    req = request.Request(
        f"{SEARCH_URL}?{params}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        method="GET"
    )

    with request.urlopen(req, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    tracks = payload.get("tracks", {}).get("items", [])
    results = []

    for track in tracks:
        album_images = track.get("album", {}).get("images", [])
        image_url = album_images[0].get("url") if album_images else None
        results.append({
            "id": track.get("id"),
            "title": track.get("name"),
            "artist": ", ".join([artist.get("name") for artist in track.get("artists", [])]),
            "album": track.get("album", {}).get("name"),
            "image_url": image_url,
            "preview_url": track.get("preview_url")
        })

    return results
