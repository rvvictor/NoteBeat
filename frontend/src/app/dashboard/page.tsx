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

export default function DashboardHomePage() {
  const router = useRouter();
  const centerPanelRef = useRef<HTMLElement | null>(null);
  const quickTitleRef = useRef<HTMLInputElement | null>(null);

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

    sortedNotes.forEach((note) => {
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
  }, [sortedNotes]);

  const distribution = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [...stats.distribution]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stats]);

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

  const handleAddNoteClick = () => {
    centerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    quickTitleRef.current?.focus();
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
            </div>
          )}
        </div>
      </section>

      <section
        className="home-panel home-center-panel"
        style={{ animationDelay: "0.12s" }}
        ref={centerPanelRef}
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
              <Link href="/dashboard/notes" className="home-quick-link">
                Open full editor
              </Link>
              <button
                type="submit"
                className="home-quick-button"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save quick note"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section
        className="home-panel home-stats-panel"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="home-stats-header">
          <div>
            <p className="home-panel-kicker">Dashboard</p>
            <h2 className="home-panel-title">Stats overview</h2>
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

        {statsLoading && <div className="home-empty">Loading stats...</div>}

        {!statsLoading && statsError && (
          <div className="home-error">{statsError}</div>
        )}

        {!statsLoading && !statsError && !stats && (
          <div className="home-empty">No stats yet.</div>
        )}

        {!statsLoading && !statsError && stats && (
          <>
            <div className="home-stat-grid">
              <div className="home-stat-card">
                <p className="home-stat-label">Total entries</p>
                <p className="home-stat-value blue">
                  {stats.summary.total_entries}
                </p>
              </div>
              <div className="home-stat-card">
                <p className="home-stat-label">Dominant emotion</p>
                <p className="home-stat-value teal capitalize">
                  {stats.summary.dominant_emotion}
                </p>
              </div>
              <div className="home-stat-card">
                <p className="home-stat-label">Trend</p>
                <p className="home-stat-value capitalize">
                  {stats.summary.trend}
                </p>
              </div>
              <div className="home-stat-card">
                <p className="home-stat-label">Avg intensity</p>
                <p className="home-stat-value">{avgIntensityLabel}</p>
              </div>
            </div>

            <div className="home-distribution">
              <p className="home-distribution-title">Emotion breakdown</p>
              <div className="home-distribution-list">
                {distribution.length === 0 && (
                  <div className="home-empty">No emotions tracked yet.</div>
                )}
                {distribution.map((item) => (
                  <div key={item.emotion} className="home-distribution-item">
                    <span className="capitalize">{item.emotion}</span>
                    <span className="home-distribution-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
