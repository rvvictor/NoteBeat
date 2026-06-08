"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  chatWithAI,
  createNote,
  getCurrentUser,
  getEmotionDashboard,
  getNotes,
  getRecap,
  logout,
} from "@/lib/api";
import { NoteItem } from "@/lib/notes";
import { EmotionDashboard } from "@/lib/emotions";
import { RecapDashboard, RecapRange } from "@/lib/recap";
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MoodTheme = {
  background: string;
  border: string;
  accent: string;
  ink: string;
  muted: string;
  shadow: string;
};

const recapRangeOptions: { id: RecapRange; label: string; days: number }[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
];

const moodThemes: { keys: string[]; theme: MoodTheme }[] = [
  {
    keys: ["tristeza", "melancolia", "nostalgia", "sad"],
    theme: {
      background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #eff6ff 100%)",
      border: "rgba(37, 99, 235, 0.28)",
      accent: "#2563eb",
      ink: "#172554",
      muted: "#1d4ed8",
      shadow: "0 14px 30px rgba(37, 99, 235, 0.2)",
    },
  },
  {
    keys: ["felicidad", "alegria", "happy", "joy"],
    theme: {
      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 46%, #fff7ed 100%)",
      border: "rgba(217, 119, 6, 0.24)",
      accent: "#d97706",
      ink: "#78350f",
      muted: "#b45309",
      shadow: "0 14px 30px rgba(217, 119, 6, 0.18)",
    },
  },
  {
    keys: ["ansiedad", "estres", "nervios", "anxious", "stress"],
    theme: {
      background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 48%, #f5f3ff 100%)",
      border: "rgba(124, 58, 237, 0.24)",
      accent: "#7c3aed",
      ink: "#3b0764",
      muted: "#6d28d9",
      shadow: "0 14px 30px rgba(124, 58, 237, 0.18)",
    },
  },
  {
    keys: ["calma", "tranquilidad", "paz", "relajacion", "calm"],
    theme: {
      background: "linear-gradient(135deg, #ccfbf1 0%, #a7f3d0 48%, #ecfeff 100%)",
      border: "rgba(13, 148, 136, 0.25)",
      accent: "#0d9488",
      ink: "#134e4a",
      muted: "#0f766e",
      shadow: "0 14px 30px rgba(13, 148, 136, 0.18)",
    },
  },
  {
    keys: ["enojo", "ira", "frustracion", "rabia", "anger"],
    theme: {
      background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 48%, #fff1f2 100%)",
      border: "rgba(220, 38, 38, 0.24)",
      accent: "#dc2626",
      ink: "#7f1d1d",
      muted: "#b91c1c",
      shadow: "0 14px 30px rgba(220, 38, 38, 0.17)",
    },
  },
  {
    keys: ["motivacion", "esperanza", "energia", "inspiracion", "motivation"],
    theme: {
      background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 48%, #f0fdf4 100%)",
      border: "rgba(22, 163, 74, 0.24)",
      accent: "#16a34a",
      ink: "#14532d",
      muted: "#15803d",
      shadow: "0 14px 30px rgba(22, 163, 74, 0.17)",
    },
  },
];

const defaultMoodTheme: MoodTheme = {
  background: "linear-gradient(135deg, #eef2ff 0%, #dbeafe 52%, #ecfeff 100%)",
  border: "rgba(37, 99, 235, 0.22)",
  accent: "#2563eb",
  ink: "#172033",
  muted: "#475569",
  shadow: "0 14px 30px rgba(37, 99, 235, 0.16)",
};

const normalizeMood = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getMoodTheme = (emotion?: string | null) => {
  const normalized = normalizeMood(emotion);

  return (
    moodThemes.find(({ keys }) => keys.some((key) => normalized.includes(key)))
      ?.theme ?? defaultMoodTheme
  );
};

const getQuickNoteTitle = (content: string) => {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled note";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
};

const MAX_QUICK_NOTE_CHARS = 220;

const limitQuickNoteText = (value: string) =>
  value.slice(0, MAX_QUICK_NOTE_CHARS);

const getChangedEmotionLabel = (recap: RecapDashboard) => {
  const changed = recap.most_changed_emotion;

  if (!changed.emotion) {
    return "Not enough data yet";
  }

  const sign = changed.change > 0 ? "+" : "";
  return `${changed.emotion} ${sign}${changed.change.toFixed(2)}`;
};

const getChangedEmotionMeta = (recap: RecapDashboard) => {
  const changed = recap.most_changed_emotion;

  if (!changed.emotion) {
    return "Write more notes to compare emotional movement.";
  }

  if (changed.direction === "steady") {
    return "Your emotional signal stayed steady.";
  }

  const direction = changed.direction === "up" ? "increased" : "softened";
  return `Moved from ${changed.from_score.toFixed(2)} to ${changed.to_score.toFixed(2)}. It ${direction}.`;
};

export default function DashboardHomePage() {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [username, setUsername] = useState("");
  const [userError, setUserError] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);

  const [stats, setStats] = useState<EmotionDashboard | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [quickContent, setQuickContent] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullEditorOpen, setIsFullEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(7);
  const [recapRange, setRecapRange] = useState<RecapRange>("week");
  const [recap, setRecap] = useState<RecapDashboard | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(true);
  const [recapRefreshKey, setRecapRefreshKey] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

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

  useEffect(() => {
    getRecap(recapRange)
      .then(setRecap)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setRecapError(message);
      })
      .finally(() => setRecapLoading(false));
  }, [router, recapRange, recapRefreshKey]);

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

  const dominantMood = stats?.summary.dominant_emotion ?? null;
  const moodTheme = useMemo(() => getMoodTheme(dominantMood), [dominantMood]);
  const moodPanelStyle = {
    "--mood-bg": moodTheme.background,
    "--mood-border": moodTheme.border,
    "--mood-accent": moodTheme.accent,
    "--mood-ink": moodTheme.ink,
    "--mood-muted": moodTheme.muted,
    "--mood-shadow": moodTheme.shadow,
  } as CSSProperties;

  const canSendChat = useMemo(
    () => chatQuestion.trim().length > 0,
    [chatQuestion]
  );

  const handleAddNoteClick = () => {
    setIsFullEditorOpen(true);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleQuickContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setQuickContent(limitQuickNoteText(event.target.value));
    setQuickStatus(null);
    setQuickError(null);
  };

  const handleSendChat = async () => {
    if (!canSendChat || isChatLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: chatQuestion.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatQuestion("");
    setChatError(null);
    setIsChatLoading(true);

    try {
      const response = await chatWithAI({ question: userMessage.content });
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setChatError(message);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleQuickSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!quickContent.trim()) {
      setQuickError("Write something before saving.");
      return;
    }

    setIsSaving(true);
    setQuickError(null);
    setQuickStatus(null);

    try {
      const created = await createNote({
        title: getQuickNoteTitle(quickContent),
        content: quickContent.trim(),
      });
      setNotes((prev) => [created, ...prev]);
      setQuickContent("");
      setQuickStatus("Saved to notes.");
      setRecapLoading(true);
      setRecapError(null);
      setRecapRefreshKey((prev) => prev + 1);
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
    setRecapLoading(true);
    setRecapError(null);
    setRecapRefreshKey((prev) => prev + 1);
  };

  const handleEditNoteClick = (note: NoteItem) => {
    setEditingNote(note);
    setQuickStatus(null);
    setQuickError(null);
  };

  const handleNoteUpdated = (updated: NoteItem) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === updated.id ? updated : note))
    );
    setEditingNote(null);
    setQuickStatus("Note updated.");
    setRecapLoading(true);
    setRecapError(null);
    setRecapRefreshKey((prev) => prev + 1);
  };

  const handleRecapRangeChange = (range: RecapRange) => {
    if (range === recapRange) {
      return;
    }

    setRecapRange(range);
    setRecapLoading(true);
    setRecapError(null);
  };

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
            className="home-chat-button"
            onClick={handleOpenChat}
            aria-label="Open AI chat"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 15.5l-0.9 3L7 16.5h6.1c2 0 3.6-1.6 3.6-3.6V7.1C16.7 5.1 15.1 3.5 13.1 3.5H6.5C4.6 3.5 3 5.1 3 7.1v4.8c0 1.8 1.2 3.3 2.9 3.6z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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
                        <button
                          key={note.id}
                          type="button"
                          className="home-note-card"
                          onClick={() => handleEditNoteClick(note)}
                          aria-label={`Edit ${title}`}
                        >
                          <h4 className="home-note-title">{title}</h4>
                          <p className="home-note-meta">{getNoteDateLabel(note)}</p>
                          <p className="home-note-excerpt">{excerpt}</p>
                        </button>
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
          <form onSubmit={handleQuickSave} className="home-quick-form">
            <div className="home-quick-editor">
              <textarea
                id="quick-content"
                value={quickContent}
                onChange={handleQuickContentChange}
                className="home-quick-textarea"
                rows={5}
                placeholder="How do you feel today?"
                aria-label="Quick note"
                maxLength={MAX_QUICK_NOTE_CHARS}
                required
              />
              <div className="home-quick-count">
                {quickContent.length}/{MAX_QUICK_NOTE_CHARS}
              </div>
            </div>

            {quickError && <p className="home-error">{quickError}</p>}
            {quickStatus && <p className="home-quick-status">{quickStatus}</p>}

            <div className="home-quick-actions">
              <button
                type="submit"
                className="home-quick-button"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Post"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {isChatOpen && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div
            className="home-modal-backdrop"
            onClick={() => setIsChatOpen(false)}
          />
          <div className="home-modal-card">
            <div className="home-editor-header">
              <div>
                <p className="home-panel-kicker">AI chat</p>
                <h2 className="home-panel-title">Talk with your notes</h2>
                <p className="home-panel-subtitle">
                  Ask anything about your emotions and recent entries.
                </p>
              </div>
              <button
                type="button"
                className="home-editor-close"
                onClick={() => setIsChatOpen(false)}
              >
                Close
              </button>
            </div>

            <section className="dashboard-card">
              <div className="chat-thread">
                {chatMessages.length === 0 && (
                  <div className="form-helper">
                    Write a question to start the conversation.
                  </div>
                )}

                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chat-bubble ${
                      message.role === "user" ? "user" : "ai"
                    }`}
                  >
                    <p className="chat-label">
                      {message.role === "user" ? "You" : "AI"}
                    </p>
                    <p className="text-gray-800 whitespace-pre-line">
                      {message.content}
                    </p>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="form-helper">Thinking...</div>
                )}
              </div>
            </section>

            <section className="dashboard-card mt-6">
              <label className="form-label" htmlFor="chat-question">
                Your question
              </label>
              <textarea
                id="chat-question"
                value={chatQuestion}
                onChange={(event) => setChatQuestion(event.target.value)}
                rows={4}
                className="form-textarea"
                placeholder="e.g. Why do I feel happier when I listen to certain songs?"
              />

              {chatError && <p className="form-error mt-3">{chatError}</p>}

              <div className="chat-actions">
                <button
                  onClick={handleSendChat}
                  disabled={!canSendChat || isChatLoading}
                  className="btn-primary btn-small"
                >
                  {isChatLoading ? "Sending..." : "Send"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {isFullEditorOpen && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div
            className="home-modal-backdrop"
            onClick={() => setIsFullEditorOpen(false)}
          />
          <div className="home-modal-card home-note-modal-card">
            <div className="home-editor-header">
              <div>
                <p className="home-panel-kicker">New note</p>
                <h2 className="home-panel-title">Catch the moment</h2>
                <p className="home-panel-subtitle">
                  Write first. Add the song if it belongs here.
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
              submitLabel="Save note"
            />
          </div>
        </div>
      )}

      {editingNote && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div
            className="home-modal-backdrop"
            onClick={() => setEditingNote(null)}
          />
          <div className="home-modal-card home-note-modal-card">
            <div className="home-editor-header">
              <div>
                <p className="home-panel-kicker">Edit note</p>
                <h2 className="home-panel-title">Revisit the moment</h2>
                <p className="home-panel-subtitle">
                  Adjust the words or the song without leaving your feed.
                </p>
              </div>
              <button
                type="button"
                className="home-editor-close"
                onClick={() => setEditingNote(null)}
              >
                Close
              </button>
            </div>
            <NoteComposer
              key={editingNote.id}
              initialNote={editingNote}
              onUpdated={handleNoteUpdated}
              submitLabel="Save changes"
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

        <div className="home-hero-mood" style={moodPanelStyle}>
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

        {statsError && <p className="home-error">{statsError}</p>}

        <div className="home-recap-panel">
          <div className="home-recap-header">
            <div>
              <p className="home-stat-label">Recap</p>
              <p className="home-recap-title">Your NoteBeat pulse</p>
            </div>
            <div
              className="home-recap-switch"
              role="tablist"
              aria-label="Recap range"
            >
              {recapRangeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`home-recap-tab${recapRange === option.id ? " active" : ""}`}
                  onClick={() => handleRecapRangeChange(option.id)}
                  role="tab"
                  aria-selected={recapRange === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {recapLoading ? (
            <p className="home-empty">Loading recap...</p>
          ) : recapError ? (
            <p className="home-error">{recapError}</p>
          ) : !recap || recap.summary.total_notes === 0 ? (
            <p className="home-empty">No data yet.</p>
          ) : (
            <div className="home-recap-scroll no-scrollbar">
              <section className="recap-hero-card">
                <p className="recap-hero-kicker">Mood musical</p>
                <h3 className="recap-hero-title">{recap.summary.music_mood}</h3>
                <p className="recap-hero-copy">{recap.summary.narrative_summary}</p>
                <p className="recap-hero-quote">{recap.summary.representative_phrase}</p>
              </section>

              <div className="recap-stat-strip">
                <div>
                  <p className="recap-stat-number">{recap.summary.total_notes}</p>
                  <p className="recap-stat-label">Notes</p>
                </div>
                <div>
                  <p className="recap-stat-number">{recap.summary.notes_with_song}</p>
                  <p className="recap-stat-label">Songs</p>
                </div>
                <div>
                  <p className="recap-stat-number">{recap.summary.private_notes}</p>
                  <p className="recap-stat-label">Private</p>
                </div>
                <div>
                  <p className="recap-stat-number">{recap.summary.shared_notes}</p>
                  <p className="recap-stat-label">Shared</p>
                </div>
              </div>

              <section className="recap-section">
                <div className="recap-section-header">
                  <p className="home-recap-key">Top music moments</p>
                  <span className="recap-section-pill">{recap.range}</span>
                </div>
                <div className="home-recap-list">
                  {[
                    { label: "Song", item: recap.top_song, alt: "Song cover" },
                    { label: "Album", item: recap.top_album, alt: "Album art" },
                    { label: "Artist", item: recap.top_artist, alt: "Artist photo" },
                  ].map((entry) => (
                    <div key={entry.label} className="home-recap-item recap-music-item">
                      <div className="home-recap-art">
                        {entry.item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.item.image_url}
                            alt={entry.alt}
                            className="home-recap-img"
                          />
                        ) : (
                          <span className="home-recap-art-placeholder">No art</span>
                        )}
                      </div>
                      <div className="home-recap-text">
                        <p className="home-recap-key">{entry.label}</p>
                        <p className="home-recap-value">{entry.item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="recap-section">
                <div className="recap-section-header">
                  <p className="home-recap-key">Emotion and rhythm</p>
                </div>
                <div className="recap-mini-grid">
                  <div className="recap-mini-card">
                    <p className="home-recap-key">Dominant emotion</p>
                    <p className="home-recap-value">
                      {recap.summary.dominant_emotion ?? "No data yet"}
                    </p>
                  </div>
                  <div className="recap-mini-card">
                    <p className="home-recap-key">Biggest shift</p>
                    <p className="home-recap-value">{getChangedEmotionLabel(recap)}</p>
                    <p className="recap-mini-copy">{getChangedEmotionMeta(recap)}</p>
                  </div>
                  <div className="recap-mini-card">
                    <p className="home-recap-key">Top day</p>
                    <p className="home-recap-value">{recap.activity.top_day.label}</p>
                    <p className="recap-mini-copy">{recap.activity.top_day.count} notes</p>
                  </div>
                  <div className="recap-mini-card">
                    <p className="home-recap-key">Top hour</p>
                    <p className="home-recap-value">{recap.activity.top_hour.label}</p>
                    <p className="recap-mini-copy">{recap.activity.top_hour.count} notes</p>
                  </div>
                </div>
              </section>

              <section className="recap-section">
                <div className="recap-section-header">
                  <p className="home-recap-key">Songs by feeling</p>
                </div>
                <div className="home-recap-list">
                  {[
                    { label: "When happy", item: recap.songs_by_emotion.happy },
                    { label: "When sad", item: recap.songs_by_emotion.sad },
                    { label: "When anxious", item: recap.songs_by_emotion.anxious },
                  ].map((entry) => (
                    <div key={entry.label} className="home-recap-item">
                      <div className="home-recap-art">
                        {entry.item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.item.image_url}
                            alt={`${entry.label} song cover`}
                            className="home-recap-img"
                          />
                        ) : (
                          <span className="home-recap-art-placeholder">No art</span>
                        )}
                      </div>
                      <div className="home-recap-text">
                        <p className="home-recap-key">{entry.label}</p>
                        <p className="home-recap-value">{entry.item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
      </main>
    </div>
  );
}
