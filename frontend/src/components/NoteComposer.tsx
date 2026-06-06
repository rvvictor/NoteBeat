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

const getNoteTitle = (title: string, content: string) => {
  const explicitTitle = title.trim();

  if (explicitTitle) {
    return explicitTitle.length > 90
      ? `${explicitTitle.slice(0, 87)}...`
      : explicitTitle;
  }

  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled note";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
};

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
      .then((status) => {
        setIsSpotifyConnected(status.connected);
        if (!status.connected) {
          setRecommendationMessage("Connect Spotify to see recommendations.");
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setIsSpotifyConnected(false);
        setRecommendationMessage("Connect Spotify to see recommendations.");
      });
  }, [router]);

  useEffect(() => {
    const query = spotifyQuery.trim();

    if (query.length < 2) {
      return;
    }

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

    if (isSpotifyConnected !== true || noteText.length < 20) {
      return;
    }

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

  const handleContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    const noteText = value.trim();

    setContent(value);
    setError(null);

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
  };

  const handleSpotifyQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const query = value.trim();

    setSpotifyQuery(value);

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
  };

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSongTitle(track.title);
    setSongArtist(track.artist);
    setSongAlbum(track.album ?? "");
    setSongSpotifyId(track.id ?? "");
    setSpotifyQuery("");
    setSpotifyResults([]);
    setSpotifyMessage("Selected from Spotify.");
    setSelectedTrack(track);
    setPreviewDuration(null);
    setPreviewTime(0);
    setIsSearching(false);
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

    if (!content.trim()) {
      setError("Write something before saving.");
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
        title: getNoteTitle(title, content),
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
    <form onSubmit={handleSubmit} className="note-composer">
      <section className="composer-paper" aria-label="Write a note">
        <input
          id="note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="composer-title-input"
          placeholder="Untitled"
          aria-label="Note title, optional"
        />
        <textarea
          id="note-content"
          value={content}
          onChange={handleContentChange}
          rows={10}
          className="composer-body-textarea"
          placeholder="How do you feel today?"
          aria-label="Note content"
          required
        />
      </section>

      <section className="composer-sound-panel" aria-label="Song connection">
        <div className="composer-sound-header">
          <div>
            <p className="composer-sound-kicker">Soundtrack</p>
            <p className="composer-sound-copy">Optional</p>
          </div>
          <div className="composer-sound-actions">
            {isSpotifyConnected === false && (
              <button
                type="button"
                onClick={handleConnectSpotify}
                className="composer-link-button"
              >
                Connect Spotify
              </button>
            )}
            {isSpotifyConnected === true && (
              <button
                type="button"
                onClick={handleDisconnectSpotify}
                className="composer-link-button"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {recommendationMessage && (
          <p className="composer-helper">{recommendationMessage}</p>
        )}

        {isRecommending && (
          <p className="composer-helper">Finding a song for this note...</p>
        )}

        {recommendations.length > 0 && (
          <div className="composer-track-list">
            {recommendations.map((track, index) => (
              <button
                type="button"
                key={`rec-${track.id ?? "unknown"}-${index}`}
                onClick={() => handleSelectTrack(track)}
                className="composer-track-option"
              >
                <div className="composer-track-art">
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
                  <p className="composer-track-title">{track.title}</p>
                  <p className="composer-track-meta">
                    {track.artist}
                    {track.album ? ` - ${track.album}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedTrack && (
          <div className="composer-selected-track">
            <div className="composer-track-art">
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
            <div className="composer-selected-info">
              <p className="composer-track-title">{selectedTrack.title}</p>
              <p className="composer-track-meta">
                {selectedTrack.artist}
                {selectedTrack.album ? ` - ${selectedTrack.album}` : ""}
              </p>
              {selectedTrack.preview_url ? (
                <div className="composer-preview">
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
                  <div className="composer-wave">
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
                  <p className="composer-helper">
                    {previewDuration
                      ? `${Math.round(previewDuration)}s preview`
                      : "Loading preview..."}
                  </p>
                </div>
              ) : (
                <p className="composer-helper">
                  Preview not available for this track.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearSelected}
              className="composer-clear-button"
            >
              Remove
            </button>
          </div>
        )}

        <div className="composer-search-row">
          <input
            id="spotify-search"
            value={spotifyQuery}
            onChange={handleSpotifyQueryChange}
            className="composer-search-input"
            placeholder="Search Spotify or type a song you remember"
            aria-label="Search Spotify"
          />
        </div>
        {spotifyMessage && <p className="composer-helper">{spotifyMessage}</p>}
        {isSearching && <p className="composer-helper">Searching...</p>}

        {spotifyResults.length > 0 && (
          <div className="composer-track-list">
            {spotifyResults.map((track) => (
              <button
                type="button"
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className="composer-track-option"
              >
                <div className="composer-track-art">
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
                  <p className="composer-track-title">{track.title}</p>
                  <p className="composer-track-meta">
                    {track.artist}
                    {track.album ? ` - ${track.album}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="composer-manual-grid">
          <input
            id="song-title"
            value={songTitle}
            onChange={(event) => setSongTitle(event.target.value)}
            className="composer-chip-input"
            placeholder="Song title"
            aria-label="Song title"
          />
          <input
            id="song-artist"
            value={songArtist}
            onChange={(event) => setSongArtist(event.target.value)}
            className="composer-chip-input"
            placeholder="Artist"
            aria-label="Artist"
          />
          <input
            id="song-album"
            value={songAlbum}
            onChange={(event) => setSongAlbum(event.target.value)}
            className="composer-chip-input"
            placeholder="Album"
            aria-label="Album"
          />
        </div>
      </section>

      <div className="composer-footer">
        {error && <p className="form-error composer-error">{error}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="composer-submit"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
