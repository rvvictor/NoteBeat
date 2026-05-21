"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, chatWithAI } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => question.trim().length > 0, [question]);

  const handleSend = async () => {
    if (!canSend || isLoading) {
      return;
    }

    const userMessage: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await chatWithAI({
        question: userMessage.content,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="dashboard-content">
      <div className="dashboard-container dashboard-container-narrow">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-kicker">AI chat</p>
            <h1 className="dashboard-title">Talk with your notes</h1>
            <p className="dashboard-subtitle">
              Ask anything about your emotions and recent entries.
            </p>
          </div>
        </header>

        <section className="dashboard-card">
          <div className="chat-thread">
            {messages.length === 0 && (
              <div className="form-helper">
                Write a question to start the conversation.
              </div>
            )}

            {messages.map((message, index) => (
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

            {isLoading && <div className="form-helper">Thinking...</div>}
          </div>
        </section>

        <section className="dashboard-card mt-6">
          <label className="form-label" htmlFor="chat-question">
            Your question
          </label>
          <textarea
            id="chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="form-textarea"
            placeholder="e.g. Why do I feel happier when I listen to certain songs?"
          />

          {error && <p className="form-error mt-3">{error}</p>}

          <div className="chat-actions">
            <button
              onClick={handleSend}
              disabled={!canSend || isLoading}
              className="btn-primary btn-small"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
