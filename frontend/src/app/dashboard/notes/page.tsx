"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getNotes } from "@/lib/api";
import { NoteItem } from "@/lib/notes";
import NoteComposer from "@/components/NoteComposer";

export default function NotesPage() {
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
                  <div key={note.id} className="dashboard-card dashboard-card-tight">
                    <p className="form-helper">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
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
                    <div className="mt-4">
                      <Link
                        href={`/dashboard/notes/${note.id}`}
                        className="text-link"
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
      </div>
    </section>
  );
}
