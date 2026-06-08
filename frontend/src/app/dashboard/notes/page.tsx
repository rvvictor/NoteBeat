"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getNotes } from "@/lib/api";
import { NoteItem } from "@/lib/notes";
import NoteComposer from "@/components/NoteComposer";

const NOTE_EMPTY_CONTENT_LABEL = "No additional text";

const getFirstContentLine = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";

const getNotePreviewTitle = (note: NoteItem) =>
  note.title?.trim() || getFirstContentLine(note.content) || "Untitled note";

const getNotePreviewContent = (note: NoteItem) => {
  const title = getNotePreviewTitle(note);
  const content = note.content?.trim();

  if (!content) {
    return NOTE_EMPTY_CONTENT_LABEL;
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
    return remainingContent || NOTE_EMPTY_CONTENT_LABEL;
  }

  return content;
};

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
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

  const handleNoteUpdated = (updated: NoteItem) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === updated.id ? updated : note))
    );
    setEditingNote(null);
  };

  return (
    <section className="dashboard-content">
      <div className="dashboard-container">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-kicker">Notes</p>
            <h1 className="dashboard-title">Capture the moment</h1>
            <p className="dashboard-subtitle">
              Write a new note, attach a song, and let NoteBeat remember how it
              felt.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid-2">
          <div className="dashboard-card">
            <h2 className="card-title">New note</h2>
            <p className="card-subtitle">
              Write your note and optionally attach a song.
            </p>
            <NoteComposer
              onCreated={(created) => setNotes((prev) => [created, ...prev])}
            />
          </div>

          <div className="dashboard-card">
            <h2 className="card-title">Recent notes</h2>
            <p className="card-subtitle">
              Your latest entries will appear here.
            </p>

            {error && <p className="form-error mt-4">{error}</p>}

            {isLoading ? (
              <p className="form-helper mt-6">Loading...</p>
            ) : notes.length === 0 ? (
              <p className="form-helper mt-6">No notes yet.</p>
            ) : (
              <div className="list-stack mt-6">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="dashboard-card dashboard-card-tight dashboard-note-edit-card"
                    onClick={() => setEditingNote(note)}
                    aria-label={`Edit ${getNotePreviewTitle(note)}`}
                  >
                    <p className="form-helper">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      {getNotePreviewTitle(note)}
                    </h3>
                    <p className="text-gray-700 mt-2 whitespace-pre-line">
                      {getNotePreviewContent(note)}
                    </p>
                    {note.song && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-semibold text-gray-800">
                          {note.song.title}
                        </span>
                        <span className="text-gray-500">
                          {` · ${note.song.artist}`}
                        </span>
                        {note.song.album && (
                          <span className="text-gray-500">
                            {` · ${note.song.album}`}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                  Adjust the words or the song without leaving this page.
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
    </section>
  );
}
