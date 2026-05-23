"use client";

import { useState } from "react";
import { createNote } from "@/lib/api";

export default function DashboardCenterPanel() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        song: null,
      };

      await createNote(payload);
      setTitle("");
      setContent("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-center-panel">
      <div className="dashboard-center-header">
        <h2 className="dashboard-center-title">Quick Note</h2>
        <p className="dashboard-center-subtitle">Write down your thoughts quickly</p>
      </div>

      <form onSubmit={handleSubmit} className="dashboard-quick-note-form">
        {error && <div className="dashboard-form-error">{error}</div>}
        
        <div className="dashboard-form-group">
          <label htmlFor="quick-title" className="dashboard-form-label">
            Title
          </label>
          <input
            id="quick-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            className="dashboard-form-input"
          />
        </div>

        <div className="dashboard-form-group">
          <label htmlFor="quick-content" className="dashboard-form-label">
            Content
          </label>
          <textarea
            id="quick-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="dashboard-form-textarea"
            rows={6}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="dashboard-form-submit"
        >
          {isSaving ? "Saving..." : "Save Note"}
        </button>
      </form>
    </div>
  );
}
