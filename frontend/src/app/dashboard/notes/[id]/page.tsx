"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ApiError,
  deleteNote,
  getNote,
  searchSpotify,
  updateNote,
} from "@/lib/api";
import { NoteItem, SongPayload, SpotifyTrack } from "@/lib/notes";

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const noteId = params?.id;
  const [note, setNote] = useState<NoteItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songAlbum, setSongAlbum] = useState("");
  const [songSpotifyId, setSongSpotifyId] = useState("");
  const [removeSong, setRemoveSong] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [previewTime, setPreviewTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!noteId) {
      return;
    }

    getNote(noteId)
      .then((data) => {
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        if (data.song) {
          setSongTitle(data.song.title);
          setSongArtist(data.song.artist);
          setSongAlbum(data.song.album ?? "");
          setSongSpotifyId(data.song.spotify_id ?? "");
          setSelectedTrack({
            id: data.song.spotify_id ?? "",
            title: data.song.title,
            artist: data.song.artist,
            album: data.song.album,
            image_url: data.song.image_url,
          });
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
      .finally(() => setIsLoading(false));
  }, [noteId, router]);

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

  const clearSongFields = () => {
    setSelectedTrack(null);
    setSongTitle("");
    setSongArtist("");
    setSongAlbum("");
    setSongSpotifyId("");
    setSpotifyQuery("");
    setSpotifyResults([]);
    setSpotifyMessage(null);
    setPreviewDuration(null);
    setPreviewTime(0);
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

  const handleRemoveSongChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;

    setRemoveSong(checked);

    if (checked) {
      clearSongFields();
    }
  };

  const buildSongPayload = (): SongPayload | null => {
    if (removeSong) {
      return null;
    }

    if (!songTitle.trim() && !songArtist.trim()) {
      return null;
    }

    if (!songTitle.trim() || !songArtist.trim()) {
      setError("Song title and artist are required.");
      return null;
    }

    return {
      title: songTitle.trim(),
      artist: songArtist.trim(),
      album: songAlbum.trim() || undefined,
      spotify_id: songSpotifyId.trim() || undefined,
      image_url: selectedTrack?.image_url ?? undefined,
    };
  };

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
    setRemoveSong(false);
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

  const waveformBars = useMemo(
    () => [2, 4, 7, 5, 8, 4, 6, 3, 8, 6, 4, 7, 3, 6, 5, 8, 4, 6, 3, 7],
    []
  );

  const previewProgress = previewDuration
    ? Math.min(previewTime / previewDuration, 1)
    : 0;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const songPayload = buildSongPayload();
    if (removeSong && songPayload !== null) {
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        song: songPayload,
      };

      if (!noteId) {
        setError("Note not found.");
        return;
      }

      const updated = await updateNote(noteId, payload);
      setNote(updated);
      setRemoveSong(false);
      router.push("/dashboard/notes");
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

  const handleDelete = async () => {
    if (!note || isDeleting) {
      return;
    }

    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteNote(note.id);
      router.push("/dashboard/notes");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container dashboard-container-narrow">
          <div className="dashboard-card dashboard-state">Loading...</div>
        </div>
      </section>
    );
  }

  if (!note) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container dashboard-container-narrow">
          <div className="dashboard-card dashboard-state">Note not found.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-content">
      <div className="dashboard-container dashboard-container-narrow">
        <div className="dashboard-card">
          <header className="mb-6">
            <h1 className="card-title">Edit note</h1>
            <p className="card-subtitle">
              Update your note or delete it permanently.
            </p>
          </header>

          <form onSubmit={handleSave} className="form-stack">
            <div className="form-field">
              <label className="form-label" htmlFor="note-title">
                Title
              </label>
              <input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
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
                required
              />
            </div>

            <div className="form-field">
              <p className="form-label">Song</p>
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
                                  className={`wave-bar${
                                    isActive ? " active" : ""
                                  }`}
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
                  onChange={handleSpotifyQueryChange}
                  className="form-input"
                  placeholder="Song, artist, album"
                  disabled={removeSong}
                />
                {spotifyMessage && (
                  <p className="form-helper">{spotifyMessage}</p>
                )}
              </div>

              {isSearching && (
                <p className="form-helper mt-2">Searching...</p>
              )}

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
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="song-title">
                Song title
              </label>
              <input
                id="song-title"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                className="form-input"
                placeholder="Song title"
                disabled={removeSong}
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
                disabled={removeSong}
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
                disabled={removeSong}
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
                disabled={removeSong}
              />
            </div>
            <label className="form-check">
              <input
                type="checkbox"
                checked={removeSong}
                onChange={handleRemoveSongChange}
              />{" "}
              Remove song from this note
            </label>

            {error && <p className="form-error">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary btn-small"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-danger"
              >
                {isDeleting ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
