"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getNotes } from "@/lib/api";
import EmotionChart from "@/components/EmotionChart";
import { NoteItem, NoteEmotionItem } from "@/lib/notes";

// ─── Types ───────────────────────────────────────────────────────────────────

type Timeframe = "week" | "month" | "year";

interface MusicEntry {
  key: string;
  count: number;
  imageUrl?: string;
  sub?: string;
}

interface PeakNote {
  note: NoteItem;
  topEmotion: string;
  topScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  week: 7,
  month: 30,
  year: 365,
};

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

function getMoodClass(emotion: string): string {
  const e = emotion.toLowerCase();
  if (e.includes("joy") || e.includes("happ") || e.includes("alegr") || e.includes("feliz") || e.includes("excit")) return "mood-joy";
  if (e.includes("sad") || e.includes("trist") || e.includes("grief") || e.includes("depress")) return "mood-sadness";
  if (e.includes("calm") || e.includes("serenity") || e.includes("serene") || e.includes("peace") || e.includes("tranq")) return "mood-serenity";
  if (e.includes("anger") || e.includes("angr") || e.includes("enojo") || e.includes("frust") || e.includes("rage")) return "mood-anger";
  return "mood-neutral";
}

function getBadgeClass(emotion: string): string {
  const e = emotion.toLowerCase();
  if (e.includes("joy") || e.includes("happ") || e.includes("alegr") || e.includes("excit")) return "badge-joy";
  if (e.includes("sad") || e.includes("trist") || e.includes("grief")) return "badge-sadness";
  if (e.includes("calm") || e.includes("serenity") || e.includes("peace")) return "badge-serenity";
  if (e.includes("anger") || e.includes("angr") || e.includes("enojo") || e.includes("frust")) return "badge-anger";
  return "badge-neutral";
}

function getMoodDescription(emotion: string): string {
  const e = emotion.toLowerCase();
  if (e.includes("joy") || e.includes("happ") || e.includes("alegr") || e.includes("excit"))
    return "Your journal has been full of light and warmth. You've been radiating positive energy.";
  if (e.includes("sad") || e.includes("trist") || e.includes("grief"))
    return "Your notes reflect some heavy moments. Writing through these feelings shows real courage.";
  if (e.includes("calm") || e.includes("serenity") || e.includes("peace"))
    return "A period of peace and balance. Your mind has found its quiet center.";
  if (e.includes("anger") || e.includes("angr") || e.includes("enojo") || e.includes("frust"))
    return "Strong emotions have been driving your writing. That intensity fuels creativity.";
  return "A mix of emotions have colored your journal entries this period.";
}

function getMoodEmoji(emotion: string): string {
  const e = emotion.toLowerCase();
  if (e.includes("joy") || e.includes("happ") || e.includes("alegr") || e.includes("excit")) return "✨";
  if (e.includes("sad") || e.includes("trist") || e.includes("grief")) return "🌧️";
  if (e.includes("calm") || e.includes("serenity") || e.includes("peace")) return "🌿";
  if (e.includes("anger") || e.includes("angr") || e.includes("enojo") || e.includes("frust")) return "🔥";
  return "💫";
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function filterByTimeframe(notes: NoteItem[], tf: Timeframe): NoteItem[] {
  const days = TIMEFRAME_DAYS[tf];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return notes.filter((n) => new Date(n.created_at) >= cutoff);
}

function computeDominantEmotion(notes: NoteItem[]): string {
  const scores: Record<string, number> = {};
  for (const note of notes) {
    if (!note.emotions) continue;
    for (const em of note.emotions) {
      scores[em.emotion] = (scores[em.emotion] ?? 0) + em.score;
    }
  }
  const entries = Object.entries(scores);
  if (entries.length === 0) return "neutral";
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function computeEmotionDistribution(notes: NoteItem[]) {
  const scores: Record<string, { total: number; count: number }> = {};
  for (const note of notes) {
    if (!note.emotions) continue;
    for (const em of note.emotions) {
      if (!scores[em.emotion]) scores[em.emotion] = { total: 0, count: 0 };
      scores[em.emotion].total += em.score;
      scores[em.emotion].count += 1;
    }
  }
  return Object.entries(scores).map(([emotion, { total, count }]) => ({
    emotion,
    count,
    avg_score: parseFloat((total / count).toFixed(2)),
  }));
}

function computeMusicRecap(notes: NoteItem[]) {
  const songs: Record<string, { count: number; imageUrl?: string; artist: string }> = {};
  const artists: Record<string, { count: number; imageUrl?: string }> = {};
  const albums: Record<string, { count: number; imageUrl?: string; artist: string }> = {};

  for (const note of notes) {
    if (!note.song) continue;
    const { title, artist, album, image_url } = note.song;
    const songKey = `${title} — ${artist}`;
    if (!songs[songKey]) songs[songKey] = { count: 0, imageUrl: image_url, artist };
    songs[songKey].count += 1;
    if (!artists[artist]) artists[artist] = { count: 0, imageUrl: image_url };
    artists[artist].count += 1;
    if (album) {
      const albumKey = `${album} — ${artist}`;
      if (!albums[albumKey]) albums[albumKey] = { count: 0, imageUrl: image_url, artist };
      albums[albumKey].count += 1;
    }
  }

  const topSong = Object.entries(songs)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 1)
    .map(([key, val]) => ({ key, count: val.count, imageUrl: val.imageUrl, sub: val.artist }))[0];

  const topArtist = Object.entries(artists)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 1)
    .map(([key, val]) => ({ key, count: val.count, imageUrl: val.imageUrl }))[0];

  const topAlbum = Object.entries(albums)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 1)
    .map(([key, val]) => ({ key, count: val.count, imageUrl: val.imageUrl, sub: val.artist }))[0];

  return { topSong, topArtist, topAlbum };
}

function computePeakNotes(notes: NoteItem[]): PeakNote[] {
  const peaks: PeakNote[] = [];
  for (const note of notes) {
    if (!note.emotions || note.emotions.length === 0) continue;
    const top = note.emotions.reduce((a: NoteEmotionItem, b: NoteEmotionItem) =>
      b.score > a.score ? b : a
    );
    peaks.push({ note, topEmotion: top.emotion, topScore: top.score });
  }
  return peaks.sort((a, b) => b.topScore - a.topScore).slice(0, 5);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── MusicCard ───────────────────────────────────────────────────────────────

function MusicCard({
  label,
  item,
  icon,
}: {
  label: string;
  item: MusicEntry | undefined;
  icon: React.ReactNode;
}) {
  if (!item) return null;
  return (
    <div className="recap-music-card">
      <div className="recap-music-art">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.key}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        )}
      </div>
      <div className="recap-music-info">
        <p className="recap-music-label">{label}</p>
        <p className="recap-music-title">{item.key.split(" — ")[0]}</p>
        {item.sub && <p className="recap-music-sub">{item.sub}</p>}
        <span className="recap-music-count">
          {item.count} {item.count === 1 ? "time" : "times"}
        </span>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EmotionPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("month");

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const filtered = useMemo(() => filterByTimeframe(notes, timeframe), [notes, timeframe]);

  const totalWords = useMemo(
    () => filtered.reduce((acc, n) => acc + countWords(n.content), 0),
    [filtered]
  );

  const dominantEmotion = useMemo(() => computeDominantEmotion(filtered), [filtered]);
  const distribution = useMemo(() => computeEmotionDistribution(filtered), [filtered]);
  const music = useMemo(() => computeMusicRecap(filtered), [filtered]);
  const peakNotes = useMemo(() => computePeakNotes(filtered), [filtered]);

  const hasMusic = !!(music.topSong || music.topArtist || music.topAlbum);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container">
          <div
            className="dashboard-card dashboard-state"
            style={{ padding: "4rem", fontSize: "1rem", color: "#6b7280" }}
          >
            <div className="auth-spinner" style={{ margin: "0 auto 1.2rem" }} />
            Loading your recap…
          </div>
        </div>
      </section>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-card dashboard-state" style={{ color: "#dc2626" }}>
            {error}
          </div>
        </div>
      </section>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <section className="dashboard-content">
      <div className="dashboard-container">

        {/* ── Page header ── */}
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-kicker">Insights</p>
            <h1 className="dashboard-title">Your Recap &amp; Rewind</h1>
            <p className="dashboard-subtitle">
              A Spotify-Wrapped–style look at your journal — emotions, music, and the moments that mattered most.
            </p>
          </div>

          {/* Timeframe toggle */}
          <div className="recap-timeframe-bar" role="group" aria-label="Select timeframe">
            {(["week", "month", "year"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                id={`recap-tab-${tf}`}
                className={`recap-tab-btn${timeframe === tf ? " active" : ""}`}
                onClick={() => setTimeframe(tf)}
                aria-pressed={timeframe === tf}
              >
                {tf === "week" ? "Week" : tf === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </header>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div
            className="dashboard-card dashboard-state"
            style={{ padding: "3rem", fontSize: "1rem" }}
          >
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📭</p>
            <p style={{ fontWeight: 600, color: "#374151" }}>
              No journal entries for {TIMEFRAME_LABELS[timeframe].toLowerCase()} yet.
            </p>
            <p style={{ color: "#6b7280", marginTop: "0.4rem", fontSize: "0.95rem" }}>
              Start writing to see your recap come alive.
            </p>
            <Link
              href="/dashboard/notes"
              className="btn-primary btn-small"
              style={{ display: "inline-flex", marginTop: "1.4rem" }}
            >
              Write a note
            </Link>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            {/* ── Stats row ── */}
            <div className="stat-grid" style={{ marginBottom: "1.6rem" }}>
              <div className="stat-card">
                <p className="stat-label">Entries</p>
                <p className="stat-value accent">{filtered.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Words written</p>
                <p className="stat-value accent">{totalWords.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Avg words/entry</p>
                <p className="stat-value">{filtered.length > 0 ? Math.round(totalWords / filtered.length) : 0}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Songs attached</p>
                <p className="stat-value teal">
                  {filtered.filter((n) => n.song).length}
                </p>
              </div>
            </div>

            {/* ── Dominant emotion hero card ── */}
            <div
              className={`mood-card ${getMoodClass(dominantEmotion)} rise`}
              style={{ marginBottom: "1.6rem" }}
              role="region"
              aria-label="Dominant emotion"
            >
              {/* Floating decorative orb */}
              <div
                className="float-slow"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-2rem",
                  right: "-2rem",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  filter: "blur(32px)",
                }}
              />
              <div
                className="float-slow"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: "-3rem",
                  left: "10%",
                  width: "280px",
                  height: "280px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  filter: "blur(48px)",
                  animationDelay: "2s",
                }}
              />

              <div className="mood-card-content">
                <p className="mood-title-small">
                  {getMoodEmoji(dominantEmotion)}  Dominant emotion — {TIMEFRAME_LABELS[timeframe]}
                </p>
                <p className="mood-title-large">{dominantEmotion}</p>
                <p className="mood-description">{getMoodDescription(dominantEmotion)}</p>

                {/* Mini emotion distribution pills */}
                {distribution.length > 1 && (
                  <div
                    style={{
                      marginTop: "1.4rem",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    {distribution
                      .sort((a, b) => b.avg_score - a.avg_score)
                      .slice(0, 4)
                      .map((d) => (
                        <span
                          key={d.emotion}
                          style={{
                            padding: "0.3rem 0.8rem",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.18)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            backdropFilter: "blur(4px)",
                            textTransform: "capitalize",
                          }}
                        >
                          {d.emotion}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Music recap ── */}
            <div className="dashboard-card" style={{ marginBottom: "1.6rem" }}>
              <h2 className="card-title">🎵 Music Recap</h2>
              <p className="card-subtitle">
                The tracks and artists that soundtracked your journal {TIMEFRAME_LABELS[timeframe].toLowerCase()}.
              </p>

              {hasMusic ? (
                <div className="recap-music-grid" style={{ marginTop: "1.4rem" }}>
                  <MusicCard label="Top song" item={music.topSong} icon="🎵" />
                  <MusicCard label="Top artist" item={music.topArtist} icon="🎤" />
                  <MusicCard label="Top album" item={music.topAlbum} icon="💿" />
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "1.4rem",
                    padding: "2rem",
                    borderRadius: "18px",
                    background: "rgba(108,99,255,0.05)",
                    border: "1px dashed rgba(108,99,255,0.2)",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>🎧</p>
                  <p style={{ fontWeight: 600, color: "#374151" }}>
                    No songs attached to your notes yet.
                  </p>
                  <p style={{ color: "#6b7280", marginTop: "0.35rem", fontSize: "0.9rem" }}>
                    Connect Spotify and attach tracks when writing to see your music wrapped here.
                  </p>
                  <Link
                    href="/dashboard/notes"
                    className="btn-primary btn-small"
                    style={{ display: "inline-flex", marginTop: "1.2rem" }}
                  >
                    Write &amp; attach a song
                  </Link>
                </div>
              )}
            </div>

            {/* ── Emotion chart ── */}
            {distribution.length > 0 && (
              <div className="dashboard-card" style={{ marginBottom: "1.6rem" }}>
                <h2 className="card-title">📊 Emotion Distribution</h2>
                <p className="card-subtitle">
                  Average intensity score per emotion across your entries this {timeframe}.
                </p>
                <div style={{ marginTop: "1.4rem" }}>
                  <EmotionChart data={distribution} />
                </div>
              </div>
            )}

            {/* ── Peak notes carousel ── */}
            {peakNotes.length > 0 && (
              <div className="dashboard-card" style={{ marginBottom: "1.6rem" }}>
                <h2 className="card-title">⚡ Emotional Peaks</h2>
                <p className="card-subtitle">
                  The journal entries with your highest emotional intensity this {timeframe}.
                </p>
                <div className="highlight-carousel" style={{ marginTop: "1.4rem" }}>
                  {peakNotes.map(({ note, topEmotion, topScore }) => (
                    <div key={note.id} className="highlight-card">
                      <div>
                        <div style={{ marginBottom: "0.75rem" }}>
                          <span
                            className={`highlight-badge ${getBadgeClass(topEmotion)}`}
                          >
                            {topEmotion}
                          </span>
                        </div>
                        <p
                          style={{
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: "0.5rem",
                            fontSize: "1rem",
                          }}
                        >
                          {note.title}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#4b5563",
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {note.content}
                        </p>
                      </div>

                      <div
                        style={{
                          marginTop: "1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#9ca3af",
                            fontWeight: 500,
                          }}
                        >
                          {formatDate(note.created_at)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#6c63ff",
                            background: "rgba(108,99,255,0.08)",
                            padding: "0.18rem 0.55rem",
                            borderRadius: "99px",
                          }}
                        >
                          {(topScore * 100).toFixed(0)}% intensity
                        </span>
                      </div>

                      {note.song && (
                        <div
                          style={{
                            marginTop: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            background: "rgba(108,99,255,0.06)",
                            border: "1px solid rgba(108,99,255,0.14)",
                            borderRadius: "12px",
                            padding: "0.5rem 0.7rem",
                          }}
                        >
                          {note.song.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={note.song.image_url}
                              alt={note.song.title}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "1rem" }}>🎵</span>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#374151",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {note.song.title}
                            </p>
                            <p
                              style={{
                                fontSize: "0.68rem",
                                color: "#6b7280",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {note.song.artist}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA to write more ── */}
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Keep journaling to grow your recap · 
              <Link
                href="/dashboard/notes"
                style={{ color: "#6c63ff", fontWeight: 600 }}
              >
                New entry →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}