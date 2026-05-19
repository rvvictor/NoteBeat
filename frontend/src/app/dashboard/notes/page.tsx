"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  createNote,
  disconnectSpotify,
  getNotes,
  getSpotifyRecommendations,
  getSpotifyStatus,
  searchSpotify,
} from "@/lib/api";
import { NoteItem, SpotifyTrack } from "@/lib/notes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, []);

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
  }, []);

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
      setNotes((prev) => [created, ...prev]);
      setTitle("");
      setContent("");
      setSongTitle("");
      setSongArtist("");
      setSongAlbum("");
      setSongSpotifyId("");
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
    const noteText = content.trim();

    if (isSpotifyConnected === false) {
      setRecommendations([]);
      setRecommendationMessage("Conecta Spotify para ver recomendaciones.");
      setIsRecommending(false);
      return;
    }

    if (isSpotifyConnected !== true) {
      return;
    }

    if (noteText.length < 20) {
      setRecommendations([]);
      setRecommendationMessage("Escribe un poco mas para recomendaciones.");
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
            setRecommendationMessage("No encontramos recomendaciones aun.");
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
            setRecommendationMessage("Conecta Spotify para ver recomendaciones.");
            return;
          }
          if (err instanceof ApiError && err.status === 429) {
            setRecommendationMessage("Espera un momento antes de pedir mas recomendaciones.");
            return;
          }
          setRecommendationMessage("No pudimos cargar recomendaciones.");
        })
        .finally(() => setIsRecommending(false));
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [content, isSpotifyConnected]);

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
      setRecommendationMessage("Conecta Spotify para ver recomendaciones.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setRecommendationMessage("No pudimos desconectar Spotify.");
    }
  };

  const waveformBars = useMemo(
    () => [2, 4, 7, 5, 8, 4, 6, 3, 8, 6, 4, 7, 3, 6, 5, 8, 4, 6, 3, 7],
    []
  );

  const previewProgress = previewDuration
    ? Math.min(previewTime / previewDuration, 1)
    : 0;

  return (
    <section className="p-8">
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">New note</h1>
          <p className="text-gray-600 mt-2">
            Write your note and optionally attach a song.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A short title"
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
                placeholder="What are you feeling today?"
                required
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Recomendaciones de Spotify
                </p>
                {isSpotifyConnected === false && (
                  <button
                    type="button"
                    onClick={handleConnectSpotify}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Conectar Spotify
                  </button>
                )}
                {isSpotifyConnected === true && (
                  <button
                    type="button"
                    onClick={handleDisconnectSpotify}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Desconectar
                  </button>
                )}
              </div>

              {recommendationMessage && (
                <p className="text-xs text-gray-500 mt-2">
                  {recommendationMessage}
                </p>
              )}

              {isRecommending && (
                <p className="text-xs text-gray-500 mt-2">
                  Buscando recomendaciones...
                </p>
              )}

              {recommendations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {recommendations.map((track, index) => (
                    <button
                      type="button"
                      key={`rec-${track.id ?? "unknown"}-${index}`}
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

            <div className="border-t pt-4">
              <h2 className="text-sm font-semibold text-gray-700">
                Song (optional)
              </h2>
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
                                    isActive
                                      ? "bg-blue-600"
                                      : "bg-blue-200"
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
              <div className="grid gap-4 mt-3">
                <input
                  value={songTitle}
                  onChange={(event) => setSongTitle(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Song title"
                />
                <input
                  value={songArtist}
                  onChange={(event) => setSongArtist(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Artist"
                />
                <input
                  value={songAlbum}
                  onChange={(event) => setSongAlbum(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Album"
                />
                <input
                  value={songSpotifyId}
                  onChange={(event) => setSongSpotifyId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Spotify ID"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save note"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent notes</h2>
          <p className="text-gray-600 mt-2">
            Your latest entries will appear here.
          </p>

          {isLoading ? (
            <p className="text-gray-500 mt-6">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-gray-500 mt-6">No notes yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border border-gray-100 rounded-xl p-4"
                >
                  <p className="text-sm text-gray-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">
                    {note.title}
                  </h3>
                  <p className="text-gray-700 mt-2 whitespace-pre-line">
                    {note.content}
                  </p>
                  {note.song && (
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">
                        {note.song.title}
                      </span>
                      <span className="text-gray-500"> · {note.song.artist}</span>
                      {note.song.album && (
                        <span className="text-gray-500"> · {note.song.album}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-4">
                    <Link
                      href={`/dashboard/notes/${note.id}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
