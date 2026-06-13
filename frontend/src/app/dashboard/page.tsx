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
  getSpotifyRecommendations,
  getSpotifyStatus,
  logout,
  searchSpotify,
} from "@/lib/api";
import { isQuickNote, NoteItem, QUICK_NOTE_TITLE, SpotifyTrack } from "@/lib/notes";
import { EmotionDashboard } from "@/lib/emotions";
import { RecapDashboard, RecapRange } from "@/lib/recap";
import NoteComposer from "@/components/NoteComposer";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

type CenterPanelView = "feed" | "profile";
type ProfileTab = "posts" | "likes";

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

const getFirstContentLine = (content: string) =>
  content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

const getPrivateNoteTitle = (content: string) => {
  const firstLine = getFirstContentLine(content);

  if (!firstLine) {
    return "Untitled note";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
};

const MAX_QUICK_NOTE_CHARS = 220;

const limitQuickNoteText = (value: string) =>
  value.slice(0, MAX_QUICK_NOTE_CHARS);

const getSongLabel = (note: NoteItem) => {
  if (!note.song?.title?.trim() || !note.song.artist?.trim()) {
    return "Post";
  }

  return `${note.song.title} by ${note.song.artist}`;
};

const getNotePreviewTitle = (note: NoteItem) => {
  if (isQuickNote(note)) {
    return getFirstContentLine(note.content) || getSongLabel(note);
  }

  return note.title?.trim() || getPrivateNoteTitle(note.content);
};

const getNotePreviewExcerpt = (note: NoteItem) => {
  const title = getNotePreviewTitle(note);
  const content = note.content?.trim();

  if (!content) {
    return "";
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());
  const firstContentLine =
    firstContentIndex === -1 ? "" : lines[firstContentIndex].trim();

  if (firstContentLine === title) {
    const remainingContent = lines
      .slice(firstContentIndex + 1)
      .join("\n")
      .trim();
    return remainingContent;
  }

  return content;
};

const getUserHandle = (name: string) => {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);

  return normalized ? `@${normalized}` : "@notebeat";
};

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
  const [quickSongQuery, setQuickSongQuery] = useState("");
  const [quickSpotifyResults, setQuickSpotifyResults] = useState<SpotifyTrack[]>(
    []
  );
  const [quickRecommendations, setQuickRecommendations] = useState<
    SpotifyTrack[]
  >([]);
  const [quickSelectedTrack, setQuickSelectedTrack] =
    useState<SpotifyTrack | null>(null);
  const [isQuickSongSearching, setIsQuickSongSearching] = useState(false);
  const [isQuickRecommending, setIsQuickRecommending] = useState(false);
  const [quickSongMessage, setQuickSongMessage] = useState<string | null>(null);
  const [quickRecommendationMessage, setQuickRecommendationMessage] = useState<
    string | null
  >(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean | null>(
    null
  );
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [centerPanelView, setCenterPanelView] =
    useState<CenterPanelView>("feed");
  const [profileTab, setProfileTab] = useState<ProfileTab>("posts");
  const [isQuickComposerOpen, setIsQuickComposerOpen] = useState(false);
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

  useEffect(() => {
    getSpotifyStatus()
      .then((status) => {
        setIsSpotifyConnected(status.connected);
        setQuickRecommendationMessage(
          status.connected ? "Write a little or search a song." : "Connect Spotify to get song picks."
        );
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }

        setIsSpotifyConnected(false);
        setQuickRecommendationMessage("Connect Spotify to get song picks.");
      });
  }, [router]);

  useEffect(() => {
    const query = quickSongQuery.trim();

    if (query.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchSpotify(query, 6)
        .then((results) => {
          setQuickSpotifyResults(results);
          setQuickSongMessage(results.length === 0 ? "No songs found." : null);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.push("/login");
            return;
          }

          setQuickSongMessage("We couldn't search Spotify.");
        })
        .finally(() => setIsQuickSongSearching(false));
    }, 380);

    return () => window.clearTimeout(timeoutId);
  }, [quickSongQuery, router]);

  useEffect(() => {
    const noteText = quickContent.trim();
    const timeoutId = window.setTimeout(
      () => {
        if (isSpotifyConnected !== true) {
          setQuickRecommendations([]);
          setIsQuickRecommending(false);
          return;
        }

        if (noteText.length < 20) {
          setQuickRecommendations([]);
          setIsQuickRecommending(false);
          setQuickRecommendationMessage(
            noteText
              ? "Write a bit more for matches."
              : "Write a little or search a song."
          );
          return;
        }

        setIsQuickRecommending(true);
        setQuickRecommendationMessage(null);

        getSpotifyRecommendations(noteText, 6)
          .then((items) => {
            setQuickRecommendations(items);
            setQuickRecommendationMessage(
              items.length === 0 ? "No recommendations yet." : null
            );
          })
          .catch((err) => {
            if (err instanceof ApiError && err.status === 401) {
              router.push("/login");
              return;
            }

            if (err instanceof ApiError && err.status === 409) {
              setIsSpotifyConnected(false);
              setQuickRecommendations([]);
              setQuickRecommendationMessage("Connect Spotify to get song picks.");
              return;
            }

            if (err instanceof ApiError && err.status === 429) {
              setQuickRecommendationMessage(
                "Please wait before asking for more picks."
              );
              return;
            }

            setQuickRecommendationMessage("We couldn't load song picks.");
          })
          .finally(() => setIsQuickRecommending(false));
      },
      isSpotifyConnected === true && noteText.length >= 20 ? 900 : 0
    );

    return () => window.clearTimeout(timeoutId);
  }, [isSpotifyConnected, quickContent, router]);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => getNoteTime(b) - getNoteTime(a));
  }, [notes]);

  const privateNotes = useMemo(
    () => sortedNotes.filter((note) => !isQuickNote(note)),
    [sortedNotes]
  );

  const visibleNotes = useMemo(() => {
    return privateNotes.slice(0, visibleCount);
  }, [privateNotes, visibleCount]);

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
    : `${privateNotes.length} ${privateNotes.length === 1 ? "note" : "notes"}`;

  const profileName = username || "Your profile";
  const profileInitials = username ? getInitials(username) : "NB";
  const profileHandle = getUserHandle(profileName);
  const feedNotes = useMemo(
    () => sortedNotes.filter((note) => isQuickNote(note)).slice(0, 8),
    [sortedNotes]
  );
  const likedNotes = useMemo<NoteItem[]>(() => [], []);
  const profilePostCountLabel = `${feedNotes.length} ${
    feedNotes.length === 1 ? "post" : "posts"
  }`;
  const hasQuickSearch = quickSongQuery.trim().length >= 2;
  const quickPanelTracks = hasQuickSearch
    ? quickSpotifyResults
    : quickRecommendations;
  const quickPanelMessage = hasQuickSearch
    ? quickSongMessage
    : quickRecommendationMessage;
  const canPostQuick =
    quickContent.trim().length > 0 || Boolean(quickSelectedTrack);

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

  const profileInlineStyles = useMemo(
    () =>
      ({
        view: {
          display: "grid",
          gap: 0,
          minHeight: "100%",
          paddingBottom: "0.8rem",
        },
        topbar: {
          position: "sticky",
          top: "-1.4rem",
          zIndex: 3,
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "0.8rem",
          margin: "-1.4rem -0.4rem 0 -1.3rem",
          padding: "0.8rem 0.95rem",
          borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
          background: "rgba(248, 250, 252, 0.92)",
          backdropFilter: "blur(16px)",
        },
        iconButton: {
          width: "34px",
          height: "34px",
          borderRadius: "999px",
          border: "1px solid rgba(148, 163, 184, 0.28)",
          background: "#ffffff",
          color: "#111827",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        },
        postButton: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
          borderRadius: "999px",
          border: "1px solid rgba(37, 99, 235, 0.38)",
          background: "#2563eb",
          color: "#ffffff",
          padding: "0.52rem 0.84rem",
          fontSize: "0.78rem",
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
        },
        topbarName: {
          color: "#111827",
          fontSize: "0.98rem",
          fontWeight: 800,
          lineHeight: 1.15,
        },
        topbarCount: {
          marginTop: "0.12rem",
          color: "#64748b",
          fontSize: "0.72rem",
          fontWeight: 600,
        },
        hero: {
          display: "grid",
          gridTemplateRows: "132px auto minmax(116px, auto)",
          minHeight: "300px",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(203, 213, 225, 0.8)",
          borderTop: "none",
          background: "#ffffff",
        },
        cover: {
          height: "132px",
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(20, 184, 166, 0.2)), linear-gradient(90deg, #172033, #334155 46%, #0f766e)",
        },
        identity: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          minHeight: "50px",
          padding: "0 1rem",
          background: "#ffffff",
        },
        avatar: {
          width: "118px",
          height: "118px",
          marginTop: "-58px",
          border: "5px solid #ffffff",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #dbeafe, #ccfbf1)",
          color: "#1d4ed8",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.55rem",
          fontWeight: 900,
          boxShadow: "0 14px 28px rgba(15, 23, 42, 0.14)",
        },
        editButton: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "0.9rem",
          border: "1px solid rgba(15, 23, 42, 0.2)",
          borderRadius: "999px",
          background: "#ffffff",
          color: "#111827",
          padding: "0.55rem 0.9rem",
          fontSize: "0.78rem",
          fontWeight: 800,
          cursor: "pointer",
        },
        copy: {
          position: "relative",
          zIndex: 1,
          display: "grid",
          alignContent: "start",
          gap: "0.42rem",
          minHeight: "116px",
          padding: "0.15rem 1rem 1rem",
          background: "#ffffff",
        },
        nameRow: {
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          minWidth: 0,
        },
        name: {
          color: "#111827",
          fontSize: "1.25rem",
          fontWeight: 900,
          lineHeight: 1.12,
          overflowWrap: "anywhere",
        },
        badge: {
          border: "1px solid rgba(37, 99, 235, 0.22)",
          borderRadius: "999px",
          background: "rgba(37, 99, 235, 0.07)",
          color: "#1d4ed8",
          fontSize: "0.68rem",
          fontWeight: 800,
          padding: "0.18rem 0.45rem",
          whiteSpace: "nowrap",
        },
        handle: {
          color: "#64748b",
          fontSize: "0.84rem",
          lineHeight: 1.4,
        },
        bio: {
          color: "#334155",
          fontSize: "0.84rem",
          lineHeight: 1.4,
        },
        stats: {
          display: "flex",
          flexWrap: "wrap",
          gap: "0.9rem",
          color: "#64748b",
          marginTop: "0.1rem",
          fontSize: "0.84rem",
        },
        tabs: {
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          borderRight: "1px solid rgba(203, 213, 225, 0.8)",
          borderLeft: "1px solid rgba(203, 213, 225, 0.8)",
          borderBottom: "1px solid rgba(203, 213, 225, 0.82)",
          background: "rgba(255, 255, 255, 0.82)",
        },
        tab: {
          position: "relative",
          border: "none",
          background: "transparent",
          color: "#64748b",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 800,
          padding: "0.85rem 0.7rem",
        },
        activeTab: {
          color: "#111827",
          boxShadow: "inset 0 -3px 0 #2563eb",
        },
        posts: {
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: "0.8rem",
          paddingTop: "0.8rem",
        },
      }) satisfies Record<string, CSSProperties>,
    []
  );

  const handleAddNoteClick = () => {
    setIsFullEditorOpen(true);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleOpenProfile = () => {
    setCenterPanelView("profile");
    setProfileTab("posts");
    setQuickStatus(null);
    setQuickError(null);
  };

  const handleBackToFeed = () => {
    setCenterPanelView("feed");
  };

  const handleOpenProfileComposer = () => {
    setIsQuickComposerOpen(true);
    setQuickStatus(null);
    setQuickError(null);
  };

  const handleQuickContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setQuickContent(limitQuickNoteText(event.target.value));
    setQuickStatus(null);
    setQuickError(null);
  };

  const handleQuickSongQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const query = value.trim();

    setQuickSongQuery(value);
    setQuickStatus(null);
    setQuickError(null);

    if (!query) {
      setQuickSpotifyResults([]);
      setQuickSongMessage(null);
      setIsQuickSongSearching(false);
      return;
    }

    if (query.length < 2) {
      setQuickSpotifyResults([]);
      setQuickSongMessage("Type at least 2 characters.");
      setIsQuickSongSearching(false);
      return;
    }

    setIsQuickSongSearching(true);
    setQuickSongMessage(null);
  };

  const handleQuickTrackSelect = (track: SpotifyTrack) => {
    setQuickSelectedTrack(track);
    setQuickSongQuery("");
    setQuickSpotifyResults([]);
    setQuickSongMessage("Song attached.");
    setQuickStatus(null);
    setQuickError(null);
    setIsQuickSongSearching(false);
  };

  const handleQuickTrackClear = () => {
    setQuickSelectedTrack(null);
    setQuickSongMessage(null);
    setQuickError(null);
  };

  const handleQuickConnectSpotify = () => {
    window.location.href = `${API_BASE}/spotify/login`;
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

    if (!canPostQuick) {
      setQuickError("Write something or attach a song before posting.");
      return;
    }

    setIsSaving(true);
    setQuickError(null);
    setQuickStatus(null);

    try {
      const created = await createNote({
        title: QUICK_NOTE_TITLE,
        content: quickContent.trim(),
        song: quickSelectedTrack
          ? {
              title: quickSelectedTrack.title,
              artist: quickSelectedTrack.artist,
              album: quickSelectedTrack.album || undefined,
              spotify_id: quickSelectedTrack.id || undefined,
              image_url: quickSelectedTrack.image_url ?? undefined,
            }
          : null,
      });
      setNotes((prev) => [created, ...prev]);
      setQuickContent("");
      setQuickSongQuery("");
      setQuickSpotifyResults([]);
      setQuickSelectedTrack(null);
      setQuickSongMessage(null);
      setQuickStatus("Posted to feed.");
      if (isQuickComposerOpen) {
        setIsQuickComposerOpen(false);
      }
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
    setQuickStatus("Saved to private notes.");
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

    if (visibleCount >= privateNotes.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 4, privateNotes.length));
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [privateNotes.length, visibleCount]);

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

  const renderQuickComposer = () => (
    <form onSubmit={handleQuickSave} className="home-quick-form">
      <div className="home-quick-compose-grid">
        <div className="home-quick-editor">
          <textarea
            id="quick-content"
            value={quickContent}
            onChange={handleQuickContentChange}
            className="home-quick-textarea"
            rows={5}
            placeholder="What's playing in your head?"
            aria-label="Quick note"
            maxLength={MAX_QUICK_NOTE_CHARS}
          />
          <div className="home-quick-count">
            {quickContent.length}/{MAX_QUICK_NOTE_CHARS}
          </div>
        </div>

        <aside className="home-quick-recs" aria-label="Song picks">
          <div className="home-quick-recs-header">
            <p className="home-quick-recs-title">
              {hasQuickSearch ? "Search results" : "Recommended"}
            </p>
            {isSpotifyConnected === false && (
              <button
                type="button"
                className="home-quick-link"
                onClick={handleQuickConnectSpotify}
              >
                Connect
              </button>
            )}
          </div>

          {isQuickSongSearching && hasQuickSearch && (
            <p className="home-quick-muted">Searching...</p>
          )}

          {isQuickRecommending && !hasQuickSearch && (
            <p className="home-quick-muted">Finding matches...</p>
          )}

          {quickPanelMessage && (
            <p className="home-quick-muted">{quickPanelMessage}</p>
          )}

          {quickPanelTracks.length > 0 && (
            <div className="home-quick-track-list">
              {quickPanelTracks.map((track, index) => (
                <button
                  type="button"
                  key={`quick-track-${track.id}-${index}`}
                  className="home-quick-track"
                  onClick={() => handleQuickTrackSelect(track)}
                >
                  <span className="home-quick-track-art" aria-hidden="true">
                    {track.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      track.title.slice(0, 1)
                    )}
                  </span>
                  <span className="home-quick-track-copy">
                    <span className="home-quick-track-title">{track.title}</span>
                    <span className="home-quick-track-meta">
                      {track.artist}
                      {track.album ? ` - ${track.album}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="home-quick-song-panel">
          {quickSelectedTrack && (
            <div className="home-quick-selected">
              <span className="home-quick-track-art" aria-hidden="true">
                {quickSelectedTrack.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={quickSelectedTrack.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  quickSelectedTrack.title.slice(0, 1)
                )}
              </span>
              <span className="home-quick-track-copy">
                <span className="home-quick-track-title">
                  {quickSelectedTrack.title}
                </span>
                <span className="home-quick-track-meta">
                  {quickSelectedTrack.artist}
                  {quickSelectedTrack.album
                    ? ` - ${quickSelectedTrack.album}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                className="home-quick-clear"
                onClick={handleQuickTrackClear}
              >
                Remove
              </button>
            </div>
          )}

          <input
            id="quick-song-search"
            value={quickSongQuery}
            onChange={handleQuickSongQueryChange}
            className="home-quick-search-input"
            placeholder="Search a song"
            aria-label="Search song"
          />
        </div>
      </div>

      {quickError && <p className="home-error">{quickError}</p>}
      {quickStatus && <p className="home-quick-status">{quickStatus}</p>}

      <div className="home-quick-actions">
        <button
          type="submit"
          className="home-quick-button"
          disabled={isSaving || !canPostQuick}
        >
          {isSaving ? "Saving..." : "Post"}
        </button>
      </div>
    </form>
  );

  const renderPostCard = (note: NoteItem, variant: "feed" | "profile") => {
    const body = note.content?.trim() ?? "";
    const hasSong =
      Boolean(note.song?.title?.trim()) && Boolean(note.song?.artist?.trim());

    return (
      <article
        key={`${variant}-${note.id}`}
        className={`feed-post${!body && hasSong ? " is-song-only" : ""}${
          variant === "profile" ? " profile-post-card" : ""
        }`}
      >
        <header className="feed-post-header">
          <div className="feed-post-avatar" aria-hidden="true">
            {profileInitials}
          </div>
          <div className="feed-post-user">
            <p className="feed-post-name">{profileName}</p>
            <p className="feed-post-meta">
              {profileHandle} - {getNoteDateLabel(note)}
            </p>
          </div>
          {variant === "feed" && (
            <button
              type="button"
              className="feed-post-edit"
              onClick={() => handleEditNoteClick(note)}
            >
              Edit
            </button>
          )}
        </header>

        {body && <p className="feed-post-body">{body}</p>}

        {hasSong && note.song && (
          <div className="feed-post-song">
            <div className="feed-song-art" aria-hidden="true">
              {note.song.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={note.song.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{note.song.title.slice(0, 1)}</span>
              )}
            </div>
            <div className="feed-song-info">
              <p className="feed-song-label">Soundtrack</p>
              <p className="feed-song-title">{note.song.title}</p>
              <p className="feed-song-artist">
                {note.song.artist}
                {note.song.album ? ` - ${note.song.album}` : ""}
              </p>
            </div>
          </div>
        )}

        <footer className="feed-post-footer" aria-label="Post actions">
          <span>Reflect</span>
          <span>Save</span>
          <span>Share</span>
        </footer>
      </article>
    );
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
                      const title = getNotePreviewTitle(note);
                      const excerpt = getNotePreviewExcerpt(note);
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
                          {excerpt && (
                            <p className="home-note-excerpt">{excerpt}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {visibleCount < privateNotes.length && (
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
        {centerPanelView === "feed" ? (
          <>
            <button
              type="button"
              className="home-profile home-profile-trigger"
              onClick={handleOpenProfile}
              aria-label="View profile"
            >
              <div className="home-avatar" aria-hidden="true">
                {profileInitials}
              </div>
              <div>
                <p className="home-profile-label">Profile</p>
                <p className="home-profile-name">{profileName}</p>
                {userError && <p className="home-error">{userError}</p>}
              </div>
            </button>

            <div className="home-quick-note">{renderQuickComposer()}</div>

            <section className="home-feed">
              <div className="home-feed-header">
                <div>
                  <p className="home-panel-kicker">Feed</p>
                  <h2 className="home-feed-title">Recent pulses</h2>
                </div>
              </div>

              {notesLoading && (
                <div className="home-feed-empty">Loading posts...</div>
              )}

              {!notesLoading && notesError && (
                <div className="home-error">{notesError}</div>
              )}

              {!notesLoading && !notesError && feedNotes.length === 0 && (
                <div className="home-feed-empty">No posts yet.</div>
              )}

              {!notesLoading && !notesError && feedNotes.length > 0 && (
                <div className="home-feed-list">
                  {feedNotes.map((note) => renderPostCard(note, "feed"))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section
            className="profile-view"
            style={profileInlineStyles.view}
            aria-label="Profile"
          >
            <header className="profile-topbar" style={profileInlineStyles.topbar}>
              <button
                type="button"
                className="profile-back-button"
                style={profileInlineStyles.iconButton}
                onClick={handleBackToFeed}
                aria-label="Back to feed"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  style={{ width: "19px", height: "19px" }}
                >
                  <path
                    d="M12.5 4.5 7 10l5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div>
                <p
                  className="profile-topbar-name"
                  style={profileInlineStyles.topbarName}
                >
                  {profileName}
                </p>
                <p
                  className="profile-topbar-count"
                  style={profileInlineStyles.topbarCount}
                >
                  {profilePostCountLabel}
                </p>
              </div>
              <button
                type="button"
                className="profile-post-button"
                style={profileInlineStyles.postButton}
                onClick={handleOpenProfileComposer}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  style={{ width: "15px", height: "15px" }}
                >
                  <path
                    d="M10 4.5v11M4.5 10h11"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Post
              </button>
            </header>

            <div className="profile-hero" style={profileInlineStyles.hero}>
              <div
                className="profile-cover"
                style={profileInlineStyles.cover}
                aria-hidden="true"
              />
              <div className="profile-identity" style={profileInlineStyles.identity}>
                <div
                  className="profile-avatar"
                  style={profileInlineStyles.avatar}
                  aria-hidden="true"
                >
                  {profileInitials}
                </div>
                <button
                  type="button"
                  className="profile-edit-button"
                  style={profileInlineStyles.editButton}
                >
                  Edit profile
                </button>
              </div>
              <div className="profile-copy" style={profileInlineStyles.copy}>
                <div className="profile-name-row" style={profileInlineStyles.nameRow}>
                  <h2 className="profile-name" style={profileInlineStyles.name}>
                    {profileName}
                  </h2>
                  <span className="profile-badge" style={profileInlineStyles.badge}>
                    NoteBeat
                  </span>
                </div>
                <p className="profile-handle" style={profileInlineStyles.handle}>
                  {profileHandle}
                </p>
                <p className="profile-bio" style={profileInlineStyles.bio}>
                  Quick notes, songs, and small signals from the day.
                </p>
                <div className="profile-stats" style={profileInlineStyles.stats}>
                  <span>
                    <strong>{feedNotes.length}</strong> Posts
                  </span>
                  <span>
                    <strong>{likedNotes.length}</strong> Likes
                  </span>
                </div>
              </div>
            </div>

            <nav
              className="profile-tabs"
              style={profileInlineStyles.tabs}
              aria-label="Profile sections"
            >
              <button
                type="button"
                className={`profile-tab${profileTab === "posts" ? " active" : ""}`}
                style={{
                  ...profileInlineStyles.tab,
                  ...(profileTab === "posts" ? profileInlineStyles.activeTab : {}),
                }}
                onClick={() => setProfileTab("posts")}
              >
                Posts
              </button>
              <button
                type="button"
                className={`profile-tab${profileTab === "likes" ? " active" : ""}`}
                style={{
                  ...profileInlineStyles.tab,
                  ...(profileTab === "likes" ? profileInlineStyles.activeTab : {}),
                }}
                onClick={() => setProfileTab("likes")}
              >
                Likes
              </button>
            </nav>

            <div className="profile-posts" style={profileInlineStyles.posts}>
              {profileTab === "posts" && notesLoading && (
                <div className="home-feed-empty">Loading posts...</div>
              )}

              {profileTab === "posts" && !notesLoading && notesError && (
                <div className="home-error">{notesError}</div>
              )}

              {profileTab === "posts" &&
                !notesLoading &&
                !notesError &&
                feedNotes.length === 0 && (
                  <div className="home-feed-empty">No posts yet.</div>
                )}

              {profileTab === "posts" &&
                !notesLoading &&
                !notesError &&
                feedNotes.map((note) => renderPostCard(note, "profile"))}

              {profileTab === "likes" && likedNotes.length === 0 && (
                <div className="home-feed-empty">No liked posts yet.</div>
              )}
            </div>
          </section>
        )}
      </section>

      {isQuickComposerOpen && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div
            className="home-modal-backdrop"
            onClick={() => setIsQuickComposerOpen(false)}
          />
          <div className="home-modal-card home-quick-modal-card">
            <div className="home-editor-header">
              <div>
                <p className="home-panel-kicker">Quick note</p>
                <h2 className="home-panel-title">Post to your profile</h2>
              </div>
              <button
                type="button"
                className="home-editor-close"
                onClick={() => setIsQuickComposerOpen(false)}
              >
                Close
              </button>
            </div>
            {renderQuickComposer()}
          </div>
        </div>
      )}

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
                <h2 className="home-panel-title">New Note</h2>
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
