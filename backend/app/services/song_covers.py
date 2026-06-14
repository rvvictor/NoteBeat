from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.song import Song
from app.services.spotify.client import get_track, search_tracks


def _song_value(song_data: Any, key: str):
    if isinstance(song_data, dict):
        return song_data.get(key)
    return getattr(song_data, key, None)


def _clean(value):
    if isinstance(value, str):
        value = value.strip()
    return value or None


def _find_spotify_track(title: str | None, artist: str | None, spotify_id: str | None):
    if spotify_id:
        track = get_track(spotify_id)
        if track:
            return track

    if not title or not artist:
        return None

    queries = [
        f'track:"{title}" artist:"{artist}"',
        f"{title} {artist}",
    ]

    for query in queries:
        matches = search_tracks(query, limit=1)
        if matches:
            return matches[0]

    return None


def enrich_song_payload(song_data: Any) -> dict:
    title = _clean(_song_value(song_data, "title"))
    artist = _clean(_song_value(song_data, "artist"))
    album = _clean(_song_value(song_data, "album"))
    spotify_id = _clean(_song_value(song_data, "spotify_id"))
    image_url = _clean(_song_value(song_data, "image_url"))

    payload = {
        "title": title,
        "artist": artist,
        "album": album,
        "spotify_id": spotify_id,
        "image_url": image_url,
    }

    if image_url:
        return payload

    try:
        track = _find_spotify_track(title, artist, spotify_id)
    except Exception:
        return payload

    if not track:
        return payload

    payload["image_url"] = _clean(track.get("image_url")) or image_url
    payload["spotify_id"] = spotify_id or _clean(track.get("id"))
    payload["album"] = album or _clean(track.get("album"))

    return payload


def build_song(song_data: Any) -> Song:
    payload = enrich_song_payload(song_data)

    return Song(
        title=payload["title"],
        artist=payload["artist"],
        album=payload["album"],
        spotify_id=payload["spotify_id"],
        image_url=payload["image_url"],
    )


def backfill_missing_song_covers(db: Session, limit: int | None = None) -> int:
    query = db.query(Song).filter(or_(Song.image_url.is_(None), Song.image_url == ""))
    if limit is not None:
        query = query.limit(limit)
    songs = query.all()
    updated_count = 0

    for song in songs:
        payload = enrich_song_payload(
            {
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "spotify_id": song.spotify_id,
                "image_url": song.image_url,
            }
        )

        if not payload.get("image_url"):
            continue

        song.image_url = payload["image_url"]
        song.spotify_id = song.spotify_id or payload.get("spotify_id")
        song.album = song.album or payload.get("album")
        db.add(song)
        updated_count += 1

    if updated_count:
        db.commit()

    return updated_count
