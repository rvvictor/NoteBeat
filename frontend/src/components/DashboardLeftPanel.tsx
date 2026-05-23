"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getNotes } from "@/lib/api";
import { NoteItem } from "@/lib/notes";
import { ApiError } from "@/lib/api";

interface NoteGroup {
  title: string;
  notes: NoteItem[];
}

export default function DashboardLeftPanel() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [router]);

  const groupNotesByDate = (notes: NoteItem[]): NoteGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups: NoteGroup[] = [
      { title: "Today", notes: [] },
      { title: "Yesterday", notes: [] },
      { title: "Previous 30 days", notes: [] },
      { title: "Older", notes: [] },
    ];

    notes.forEach((note) => {
      const noteDate = new Date(note.created_at);
      const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());

      if (noteDay.getTime() === today.getTime()) {
        groups[0].notes.push(note);
      } else if (noteDay.getTime() === yesterday.getTime()) {
        groups[1].notes.push(note);
      } else if (noteDay >= thirtyDaysAgo) {
        groups[2].notes.push(note);
      } else {
        groups[3].notes.push(note);
      }
    });

    return groups.filter((group) => group.notes.length > 0);
  };

  const noteGroups = groupNotesByDate(notes);

  return (
    <div className="dashboard-left-panel">
      <div className="dashboard-left-header">
        <Image
          src="/brand/logoSOscuro.svg"
          alt="NoteBeat"
          width={160}
          height={42}
          className="dashboard-left-logo"
          priority
        />
        <button
          onClick={() => router.push("/dashboard/notes")}
          className="dashboard-new-note-btn"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            className="dashboard-new-note-icon"
          >
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" />
          </svg>
          New Note
        </button>
      </div>

      <div className="dashboard-notes-list">
        {isLoading ? (
          <div className="dashboard-loading">Loading notes...</div>
        ) : error ? (
          <div className="dashboard-error">{error}</div>
        ) : noteGroups.length === 0 ? (
          <div className="dashboard-empty">No notes yet. Create your first note!</div>
        ) : (
          noteGroups.map((group) => (
            <div key={group.title} className="dashboard-note-group">
              <h3 className="dashboard-note-group-title">{group.title}</h3>
              <div className="dashboard-note-items">
                {group.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                    className="dashboard-note-item"
                  >
                    <div className="dashboard-note-item-title">{note.title}</div>
                    <div className="dashboard-note-item-preview">
                      {note.content.substring(0, 60)}
                      {note.content.length > 60 ? "..." : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
