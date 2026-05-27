"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createNote,
  disconnectSpotify,
  getSpotifyRecommendations,
  getSpotifyStatus,
  searchSpotify,
} from "@/lib/api";
import { NoteItem, SpotifyTrack } from "@/lib/notes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type NoteComposerProps = {
  onCreated?: (note: NoteItem) => void;
  submitLabel?: string;
};

export default function NoteComposer({
  onCreated,
  submitLabel = "Save note",
}: NoteComposerProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songAlbum, setSongAlbum] = useState("");
  const [songSpotifyId, setSongSpotifyId] = useState("");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean | null>(
    null
  );
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpotifyStatus()
      .then((status) => setIsSpotifyConnected(status.connected))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setIsSpotifyConnected(false);
      });
  }, [router]);

  useEffect(() => {
    const query = spotifyQuery.trim();

    if (!query) {
      setSpotifyResults([]);
      setSpotifyMessage(null);
      setIsSearching(false);
      return;
    }

    if (query.length < 2) {
      setSpotifyResults([]);
      setSpotifyMessage("Type at least 2 characters to search.");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSpotifyMessage(null);

    const timeoutId = setTimeout(() => {
      searchSpotify(query, 6)
        .then((results) => {
          setSpotifyResults(results);
          if (results.length === 0) {
            setSpotifyMessage("No results found.");
          }
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.push("/login");
            return;
          }
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [router, spotifyQuery]);

  useEffect(() => {
    const noteText = content.trim();

    if (isSpotifyConnected === false) {
      setRecommendations([]);
      setRecommendationMessage("Connect Spotify to see recommendations.");
      setIsRecommending(false);
      return;
    }

    if (isSpotifyConnected !== true) {
      return;
    }

    if (noteText.length < 20) {
      setRecommendations([]);
      setRecommendationMessage("Write a bit more to get recommendations.");
      setIsRecommending(false);
      return;
    }

    setIsRecommending(true);
    setRecommendationMessage(null);

    const timeoutId = setTimeout(() => {
      getSpotifyRecommendations(noteText, 6)
        .then((items) => {
          setRecommendations(items);
          if (items.length === 0) {
            setRecommendationMessage("No recommendations yet.");
          }
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.push("/login");
            return;
          }
          if (err instanceof ApiError && err.status === 409) {
            setIsSpotifyConnected(false);
            setRecommendations([]);
            setRecommendationMessage("Connect Spotify to see recommendations.");
            return;
          }
          if (err instanceof ApiError && err.status === 429) {
            setRecommendationMessage(
              "Please wait a moment before requesting more recommendations."
            );
            return;
          }
          setRecommendationMessage("We couldn't load recommendations.");
        })
        .finally(() => setIsRecommending(false));
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [content, isSpotifyConnected, router]);

  const waveformBars = useMemo(
    () => [2, 4, 7, 5, 8, 4, 6, 3, 8, 6, 4, 7, 3, 6, 5, 8, 4, 6, 3, 7],
    []
  );

  const previewProgress = previewDuration
    ? Math.min(previewTime / previewDuration, 1)
    : 0;

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSongTitle(track.title);
    setSongArtist(track.artist);
    setSongAlbum(track.album ?? "");
    setSongSpotifyId(track.id ?? "");
    setSpotifyQuery(`${track.title} - ${track.artist}`);
    setSpotifyResults([]);
    setSpotifyMessage("Selected from Spotify.");
    setSelectedTrack(track);
    setPreviewDuration(null);
    setPreviewTime(0);
  };

  const handleClearSelected = () => {
    setSelectedTrack(null);
    setSongTitle("");
    setSongArtist("");
    setSongAlbum("");
    setSongSpotifyId("");
    setPreviewDuration(null);
    setPreviewTime(0);
  };

  const handleConnectSpotify = () => {
    window.location.href = `${API_BASE}/spotify/login`;
  };

  const handleDisconnectSpotify = async () => {
    try {
      await disconnectSpotify();
      setIsSpotifyConnected(false);
      setRecommendations([]);
      setRecommendationMessage("Connect Spotify to see recommendations.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setRecommendationMessage("We couldn't disconnect Spotify.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    const hasSongData =
      songTitle.trim() ||
      songArtist.trim() ||
      songAlbum.trim() ||
      songSpotifyId.trim();

    if (hasSongData && (!songTitle.trim() || !songArtist.trim())) {
      setError("Song title and artist are required when adding a song.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        song: hasSongData
          ? {
              title: songTitle.trim(),
              artist: songArtist.trim(),
              album: songAlbum.trim() || undefined,
              spotify_id: songSpotifyId.trim() || undefined,
              image_url: selectedTrack?.image_url ?? undefined,
            }
          : null,
      };

      const created = await createNote(payload);
      onCreated?.(created);
      setTitle("");
      setContent("");
      setSongTitle("");
      setSongArtist("");
      setSongAlbum("");
      setSongSpotifyId("");
      setSpotifyQuery("");
      setSpotifyResults([]);
      setSpotifyMessage(null);
      setSelectedTrack(null);
      setRecommendations([]);
      setRecommendationMessage(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <div className="form-field">
        <label className="form-label" htmlFor="note-title">
          Title
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="form-input"
          placeholder="A short title"
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="note-content">
          Content
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={6}
          className="form-textarea"
          placeholder="What are you feeling today?"
          required
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <p className="panel-title">Spotify recommendations</p>
          {isSpotifyConnected === false && (
            <button
              type="button"
              onClick={handleConnectSpotify}
              className="text-link"
            >
              Connect Spotify
            </button>
          )}
          {isSpotifyConnected === true && (
            <button
              type="button"
              onClick={handleDisconnectSpotify}
              className="text-link"
            >
              Disconnect
            </button>
          )}
        </div>

        {recommendationMessage && (
          <p className="form-helper mt-2">{recommendationMessage}</p>
        )}

        {isRecommending && (
          <p className="form-helper mt-2">Finding recommendations...</p>
        )}

        {recommendations.length > 0 && (
          <div className="list-stack mt-3">
            {recommendations.map((track, index) => (
              <button
                type="button"
                key={`rec-${track.id ?? "unknown"}-${index}`}
                onClick={() => handleSelectTrack(track)}
                className="list-item"
              >
                <div className="list-art">
                  {track.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.image_url}
                      alt={`${track.title} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "No art"
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-field">
        <p className="form-label">Song (optional)</p>
        {selectedTrack && (
          <div className="track-selected mt-3">
            <div className="list-art">
              {selectedTrack.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedTrack.image_url}
                  alt={`${selectedTrack.title} cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                "No art"
              )}
            </div>
            <div className="track-info">
              <p className="text-sm font-semibold text-gray-900">
                {selectedTrack.title}
              </p>
              <p className="text-xs text-gray-600">
                {selectedTrack.artist}
                {selectedTrack.album ? ` · ${selectedTrack.album}` : ""}
              </p>
              {selectedTrack.preview_url ? (
                <div className="mt-2">
                  <audio
                    ref={audioRef}
                    controls
                    autoPlay
                    className="w-full"
                    src={selectedTrack.preview_url}
                    onLoadedMetadata={(event) => {
                      setPreviewDuration(event.currentTarget.duration);
                    }}
                    onTimeUpdate={(event) => {
                      setPreviewTime(event.currentTarget.currentTime);
                    }}
                  />
                  <div className="mt-2">
                    <div className="flex items-end gap-1 h-10">
                      {waveformBars.map((height, index) => {
                        const percent = waveformBars.length
                          ? index / waveformBars.length
                          : 0;
                        const isActive = percent <= previewProgress;
                        return (
                          <span
                            key={`bar-${index}`}
                            className={`wave-bar${isActive ? " active" : ""}`}
                            style={{ height: `${height * 4}px` }}
                          />
                        );
                      })}
                    </div>
                    <p className="form-helper mt-2">
                      {previewDuration
                        ? `${Math.round(previewDuration)}s preview`
                        : "Loading preview..."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="form-helper mt-2">
                  Preview not available for this track.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearSelected}
              className="text-link"
            >
              Clear
            </button>
          </div>
        )}

        <div className="form-field mt-4">
          <label className="form-label" htmlFor="spotify-search">
            Search Spotify
          </label>
          <input
            id="spotify-search"
            value={spotifyQuery}
            onChange={(event) => setSpotifyQuery(event.target.value)}
            className="form-input"
            placeholder="Song, artist, album"
          />
          {spotifyMessage && <p className="form-helper">{spotifyMessage}</p>}
        </div>

        {isSearching && <p className="form-helper mt-2">Searching...</p>}

        {spotifyResults.length > 0 && (
          <div className="list-stack mt-3">
            {spotifyResults.map((track) => (
              <button
                type="button"
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className="list-item"
              >
                <div className="list-art">
                  {track.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.image_url}
                      alt={`${track.title} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "No art"
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="form-field mt-4">
          <label className="form-label" htmlFor="song-title">
            Song title
          </label>
          <input
            id="song-title"
            value={songTitle}
            onChange={(event) => setSongTitle(event.target.value)}
            className="form-input"
            placeholder="Song title"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="song-artist">
            Artist
          </label>
          <input
            id="song-artist"
            value={songArtist}
            onChange={(event) => setSongArtist(event.target.value)}
            className="form-input"
            placeholder="Artist"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="song-album">
            Album
          </label>
          <input
            id="song-album"
            value={songAlbum}
            onChange={(event) => setSongAlbum(event.target.value)}
            className="form-input"
            placeholder="Album"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="song-spotify">
            Spotify ID
          </label>
          <input
            id="song-spotify"
            value={songSpotifyId}
            onChange={(event) => setSongSpotifyId(event.target.value)}
            className="form-input"
            placeholder="Spotify ID"
          />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" disabled={isSaving} className="btn-primary">
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
