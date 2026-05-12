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
    <section className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Conversacion con tus notas
          </h1>
          <p className="text-gray-600 mt-2">
            Pregunta cualquier cosa sobre tu estado emocional y tus experiencias.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="space-y-4 max-h-130 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-gray-500">
                Escribe una pregunta para comenzar.
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "bg-blue-50 border border-blue-100 rounded-xl p-4"
                    : "bg-emerald-50 border border-emerald-100 rounded-xl p-4"
                }
              >
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  {message.role === "user" ? "Tu" : "IA"}
                </p>
                <p className="text-gray-800 whitespace-pre-line">
                  {message.content}
                </p>
              </div>
            ))}

            {isLoading && (
              <div className="text-gray-500">Pensando...</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu pregunta
          </label>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Por que me siento mas feliz cuando escucho X cancion?"
          />

          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSend}
              disabled={!canSend || isLoading}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              {isLoading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
