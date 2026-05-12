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
  }, [noteId]);

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
  }, [spotifyQuery]);

  useEffect(() => {
    if (!removeSong) {
      return;
    }

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
  }, [removeSong]);

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
      <section className="p-8">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </section>
    );
  }

  if (!note) {
    return (
      <section className="p-8">
        <div className="max-w-4xl mx-auto">Note not found.</div>
      </section>
    );
  }

  return (
    <section className="p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit note</h1>
          <p className="text-gray-600 mt-2">
            Update your note or delete it permanently.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="border-t pt-4">
            <h2 className="text-sm font-semibold text-gray-700">Song</h2>
            {selectedTrack && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="h-12 w-12 rounded-lg bg-white overflow-hidden flex items-center justify-center text-xs text-gray-400">
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
                <div className="flex-1 min-w-45">
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
                                className={`w-1 rounded-full ${
                                  isActive ? "bg-blue-600" : "bg-blue-200"
                                }`}
                                style={{ height: `${height * 4}px` }}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {previewDuration
                            ? `${Math.round(previewDuration)}s preview`
                            : "Loading preview..."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Preview not available for this track.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelected}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="mt-3">
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Buscar en Spotify
              </label>
              <div className="flex flex-col gap-3 mt-2">
                <input
                  value={spotifyQuery}
                  onChange={(event) => setSpotifyQuery(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Song, artist, album"
                  disabled={removeSong}
                />
                {spotifyMessage && (
                  <p className="text-xs text-gray-500">{spotifyMessage}</p>
                )}
              </div>

              {isSearching && (
                <p className="text-xs text-gray-500 mt-2">Searching...</p>
              )}

              {spotifyResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {spotifyResults.map((track) => (
                    <button
                      type="button"
                      key={track.id}
                      onClick={() => handleSelectTrack(track)}
                      className="w-full text-left border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50 flex gap-3"
                    >
                      <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xs text-gray-400">
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
            <div className="mt-3 grid gap-4">
              <input
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Song title"
                disabled={removeSong}
              />
              <input
                value={songArtist}
                onChange={(event) => setSongArtist(event.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Artist"
                disabled={removeSong}
              />
              <input
                value={songAlbum}
                onChange={(event) => setSongAlbum(event.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Album"
                disabled={removeSong}
              />
              <input
                value={songSpotifyId}
                onChange={(event) => setSongSpotifyId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Spotify ID"
                disabled={removeSong}
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={removeSong}
                  onChange={(event) => setRemoveSong(event.target.checked)}
                />
                Remove song from this note
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete note"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
