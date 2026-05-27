"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createNote,
  getCurrentUser,
  getEmotionDashboard,
  getNotes,
  logout,
} from "@/lib/api";
import { NoteItem } from "@/lib/notes";
import { EmotionDashboard } from "@/lib/emotions";
import NoteComposer from "@/components/NoteComposer";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const getNoteDateValue = (note: NoteItem) => note.updated_at || note.created_at;

const getNoteTime = (note: NoteItem) => {
  const date = new Date(getNoteDateValue(note));
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatNoteDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return dateFormatter.format(date);
};

const getNoteDateLabel = (note: NoteItem) => {
  const created = new Date(note.created_at);
  const updated = new Date(note.updated_at);
  if (
    !Number.isNaN(created.getTime()) &&
    !Number.isNaN(updated.getTime()) &&
    updated.getTime() > created.getTime()
  ) {
    return `Edited ${formatNoteDate(note.updated_at)}`;
  }
  return formatNoteDate(note.created_at);
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "NB";
};

const getEmotionTone = (emotion: string) => {
  const value = emotion.toLowerCase();
  if (["joy", "happy", "happiness", "love", "gratitude", "calm"].some((key) => value.includes(key))) {
    return "emotion-chip emotion-chip--sun";
  }
  if (["sad", "sadness", "lonely", "grief"].some((key) => value.includes(key))) {
    return "emotion-chip emotion-chip--cool";
  }
  if (["angry", "anger", "frustrated", "rage"].some((key) => value.includes(key))) {
    return "emotion-chip emotion-chip--ember";
  }
  if (["anxious", "anxiety", "fear", "stress"].some((key) => value.includes(key))) {
    return "emotion-chip emotion-chip--violet";
  }
  if (["neutral", "tired", "numb"].some((key) => value.includes(key))) {
    return "emotion-chip emotion-chip--stone";
  }
  return "emotion-chip emotion-chip--mint";
};

export default function DashboardHomePage() {
  const router = useRouter();
  const quickTitleRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [username, setUsername] = useState("");
  const [userError, setUserError] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);

  const [stats, setStats] = useState<EmotionDashboard | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullEditorOpen, setIsFullEditorOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(7);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUsername(user.username))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setUserError(message);
      });
  }, [router]);

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setNotesError(message);
      })
      .finally(() => setNotesLoading(false));
  }, [router]);

  useEffect(() => {
    getEmotionDashboard()
      .then(setStats)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setStatsError(message);
      })
      .finally(() => setStatsLoading(false));
  }, [router]);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => getNoteTime(b) - getNoteTime(a));
  }, [notes]);

  const visibleNotes = useMemo(() => {
    return sortedNotes.slice(0, visibleCount);
  }, [sortedNotes, visibleCount]);

  const groupedNotes = useMemo(() => {
    const groups = new Map<string, NoteItem[]>();
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - 7);
    const currentYear = now.getFullYear();

    const addGroup = (label: string, note: NoteItem) => {
      const items = groups.get(label);
      if (items) {
        items.push(note);
      } else {
        groups.set(label, [note]);
      }
    };

    visibleNotes.forEach((note) => {
      const noteDate = new Date(getNoteDateValue(note));
      if (Number.isNaN(noteDate.getTime())) {
        addGroup("Unknown date", note);
        return;
      }

      let label = "";
      if (noteDate >= startToday) {
        label = "Today";
      } else if (noteDate >= startYesterday) {
        label = "Yesterday";
      } else if (noteDate >= startWeek) {
        label = "Previous 7 days";
      } else if (noteDate.getFullYear() === currentYear) {
        label = monthFormatter.format(noteDate);
      } else {
        label = String(noteDate.getFullYear());
      }

      addGroup(label, note);
    });

    return Array.from(groups, ([label, items]) => ({ label, items }));
  }, [visibleNotes]);

  const notesCountLabel = notesLoading
    ? "Loading..."
    : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;

  const profileName = username || "Your profile";
  const profileInitials = username ? getInitials(username) : "NB";

  const avgIntensityLabel = useMemo(() => {
    if (!stats) {
      return "--";
    }
    const value = stats.summary.avg_intensity;
    return Number.isFinite(value) ? value.toFixed(1) : String(value);
  }, [stats]);

  const emotionHighlights = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [...stats.distribution]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stats]);

  const handleAddNoteClick = () => {
    setIsFullEditorOpen(true);
  };

  const handleQuickSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!quickTitle.trim() || !quickContent.trim()) {
      setQuickError("Title and note are required.");
      return;
    }

    setIsSaving(true);
    setQuickError(null);
    setQuickStatus(null);

    try {
      const created = await createNote({
        title: quickTitle.trim(),
        content: quickContent.trim(),
      });
      setNotes((prev) => [created, ...prev]);
      setQuickTitle("");
      setQuickContent("");
      setQuickStatus("Saved to notes.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setQuickError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFullNoteCreated = (created: NoteItem) => {
    setNotes((prev) => [created, ...prev]);
    setIsFullEditorOpen(false);
    setQuickStatus("Saved to notes.");
  };

  const recap = useMemo(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(startWeek.getDate() - 6);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = new Date(now.getFullYear(), 0, 1);

    const getTop = (
      items: NoteItem[],
      getKey: (note: NoteItem) => string | null,
      formatLabel: (key: string) => string
    ) => {
      const counts = new Map<string, number>();
      items.forEach((note) => {
        const key = getKey(note);
        if (!key) {
          return;
        }
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      let topKey: string | null = null;
      let topCount = 0;
      counts.forEach((count, key) => {
        if (count > topCount) {
          topCount = count;
          topKey = key;
        }
      });
      if (!topKey) {
        return { label: "No data yet", count: 0 };
      }
      return { label: formatLabel(topKey), count: topCount };
    };

    const buildRecap = (label: string, start: Date) => {
      const filtered = notes.filter((note) => {
        const date = new Date(note.created_at);
        return !Number.isNaN(date.getTime()) && date >= start;
      });
      const withSong = filtered.filter(
        (note) => note.song?.title && note.song?.artist
      );

      const topSong = getTop(
        withSong,
        (note) =>
          note.song?.title && note.song?.artist
            ? `${note.song.title}||${note.song.artist}`
            : null,
        (key) => {
          const [title, artist] = key.split("||");
          return `${title} · ${artist}`;
        }
      );

      const topAlbum = getTop(
        withSong,
        (note) => (note.song?.album ? note.song.album : null),
        (key) => key
      );

      const topArtist = getTop(
        withSong,
        (note) => (note.song?.artist ? note.song.artist : null),
        (key) => key
      );

      return {
        label,
        topSong,
        topAlbum,
        topArtist,
      };
    };

    return [
      buildRecap("This week", startWeek),
      buildRecap("This month", startMonth),
      buildRecap("This year", startYear),
    ];
  }, [notes]);

  useEffect(() => {
    if (!loadMoreRef.current) {
      return;
    }

    if (visibleCount >= sortedNotes.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 4, sortedNotes.length));
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [sortedNotes.length, visibleCount]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setLogoutError(message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-home-shell">
      <main className="dashboard-home-grid">
      <section
        className="home-panel home-notes-panel"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="home-panel-brand">
          <Link href="/dashboard" aria-label="NoteBeat dashboard home">
            <Image
              src="/brand/logoSOscuro.svg"
              alt="NoteBeat"
              width={160}
              height={44}
              className="home-logo"
              priority
            />
          </Link>
        </div>

        <div className="home-notes-header">
          <p className="home-notes-title">Notes</p>
          <p className="home-notes-count">{notesCountLabel}</p>
          <button
            type="button"
            className="home-add-note"
            onClick={handleAddNoteClick}
            aria-label="Create a new note"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 4.5v11M4.5 10h11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="home-notes-list no-scrollbar">
          {notesLoading && <div className="home-empty">Loading notes...</div>}

          {!notesLoading && notesError && (
            <div className="home-error">{notesError}</div>
          )}

          {!notesLoading && !notesError && groupedNotes.length === 0 && (
            <div className="home-empty">No notes yet.</div>
          )}

          {!notesLoading && !notesError && groupedNotes.length > 0 && (
            <div className="home-notes-groups">
              {groupedNotes.map((group) => (
                <div key={group.label} className="home-notes-group">
                  <p className="home-notes-group-title">{group.label}</p>
                  <div className="home-notes-cards">
                    {group.items.map((note) => {
                      const title = note.title?.trim() || "Untitled note";
                      const excerpt = note.content?.trim() || "No preview available.";
                      return (
                        <Link
                          key={note.id}
                          href={`/dashboard/notes/${note.id}`}
                          className="home-note-card"
                        >
                          <h4 className="home-note-title">{title}</h4>
                          <p className="home-note-meta">{getNoteDateLabel(note)}</p>
                          <p className="home-note-excerpt">{excerpt}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              {visibleCount < sortedNotes.length && (
                <div className="home-load-more" ref={loadMoreRef}>
                  Loading more notes...
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section
        className="home-panel home-center-panel"
        style={{ animationDelay: "0.12s" }}
      >
        <div className="home-profile">
          <div className="home-avatar" aria-hidden="true">
            {profileInitials}
          </div>
          <div>
            <p className="home-profile-label">Profile</p>
            <p className="home-profile-name">{profileName}</p>
            {userError && <p className="home-error">{userError}</p>}
          </div>
        </div>

        <div className="home-quick-note">
          <div className="home-panel-heading">
            <p className="home-panel-kicker">Quick note</p>
            <h2 className="home-panel-title">Capture a thought</h2>
            <p className="home-panel-subtitle">
              Save a short idea without leaving the dashboard.
            </p>
          </div>

          <form onSubmit={handleQuickSave} className="home-quick-form">
            <div className="form-field">
              <label className="form-label" htmlFor="quick-title">
                Title
              </label>
              <input
                ref={quickTitleRef}
                id="quick-title"
                value={quickTitle}
                onChange={(event) => {
                  setQuickTitle(event.target.value);
                  setQuickStatus(null);
                }}
                className="form-input"
                placeholder="e.g. Small wins today"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="quick-content">
                Note
              </label>
              <textarea
                id="quick-content"
                value={quickContent}
                onChange={(event) => {
                  setQuickContent(event.target.value);
                  setQuickStatus(null);
                }}
                className="form-textarea"
                rows={6}
                placeholder="Write a short note to keep this moment."
                required
              />
            </div>

            {quickError && <p className="home-error">{quickError}</p>}
            {quickStatus && <p className="home-quick-status">{quickStatus}</p>}

            <div className="home-quick-actions">
              <button
                type="button"
                className="home-quick-link"
                onClick={() => setIsFullEditorOpen(true)}
              >
                Open full editor
              </button>
              <button
                type="submit"
                className="home-quick-button"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Post quick note"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {isFullEditorOpen && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div
            className="home-modal-backdrop"
            onClick={() => setIsFullEditorOpen(false)}
          />
          <div className="home-modal-card">
            <div className="home-editor-header">
              <div>
                <p className="home-panel-kicker">Full note</p>
                <h2 className="home-panel-title">Compose with details</h2>
                <p className="home-panel-subtitle">
                  Add a song, attach context, and save the moment.
                </p>
              </div>
              <button
                type="button"
                className="home-editor-close"
                onClick={() => setIsFullEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <NoteComposer
              onCreated={handleFullNoteCreated}
              submitLabel="Post note"
            />
          </div>
        </div>
      )}

      <section
        className="home-panel home-stats-panel"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="home-stats-header">
          <div>
            <p className="home-panel-kicker">Dashboard</p>
            <h2 className="home-panel-title">Your emotion pulse</h2>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="home-logout"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>

        {logoutError && <p className="home-error">{logoutError}</p>}

        <div className="home-hero-mood">
          <div>
            <p className="home-stat-label">Dominant mood</p>
            <p className="home-hero-mood-value capitalize">
              {statsLoading || !stats ? "--" : stats.summary.dominant_emotion}
            </p>
          </div>
          <div className="home-hero-mood-meta">
            <div>
              <p className="home-stat-label">Intensity</p>
              <p className="home-hero-mood-number">{avgIntensityLabel}</p>
            </div>
            <div>
              <p className="home-stat-label">Entries</p>
              <p className="home-hero-mood-number">
                {statsLoading || !stats ? "--" : stats.summary.total_entries}
              </p>
            </div>
          </div>
        </div>

        <div className="home-emotion-card">
          <div className="home-emotion-header">
            <div>
              <p className="home-stat-label">Emotion pulse</p>
              <p className="home-emotion-title">Mood color map</p>
            </div>
            <span className="home-emotion-pill">Last 30 days</span>
          </div>
          {statsLoading && <p className="home-empty">Loading emotions...</p>}
          {!statsLoading && statsError && (
            <p className="home-error">{statsError}</p>
          )}
          {!statsLoading && !statsError && !stats && (
            <p className="home-empty">No emotion stats yet.</p>
          )}
          {!statsLoading && !statsError && stats && (
            <>
              <div className="home-emotion-chips">
                {emotionHighlights.map((item) => (
                  <div key={item.emotion} className={getEmotionTone(item.emotion)}>
                    <span className="emotion-chip__label capitalize">
                      {item.emotion}
                    </span>
                    <span className="emotion-chip__badge">{item.count}</span>
                  </div>
                ))}
              </div>
              <div className="home-emotion-trend">
                <span className="home-emotion-trend-label">Trend</span>
                <span className="home-emotion-trend-value capitalize">
                  {stats.summary.trend}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="home-recap">
          <p className="home-recap-title">Recap</p>
          <div className="home-recap-grid">
            {recap.map((item) => (
              <div key={item.label} className="home-recap-card">
                <p className="home-recap-label">{item.label}</p>
                {notesLoading ? (
                  <p className="home-empty">Loading recap...</p>
                ) : (
                  <div className="home-recap-list">
                    <div>
                      <p className="home-recap-key">Song</p>
                      <p className="home-recap-value">{item.topSong.label}</p>
                    </div>
                    <div>
                      <p className="home-recap-key">Album</p>
                      <p className="home-recap-value">{item.topAlbum.label}</p>
                    </div>
                    <div>
                      <p className="home-recap-key">Artist</p>
                      <p className="home-recap-value">{item.topArtist.label}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>
    </div>
  );
}
