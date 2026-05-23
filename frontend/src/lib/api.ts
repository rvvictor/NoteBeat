import { EmotionDashboard } from "@/lib/emotions";
import { ChatRequest, ChatResponse } from "@/lib/ai";
import { LoginRequest, RegisterRequest } from "@/lib/auth";
import { NoteCreatePayload, NoteItem, SpotifyTrack } from "@/lib/notes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getEmotionDashboard(): Promise<EmotionDashboard> {
  const res = await fetch(`${API_BASE}/ai/dashboard`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function chatWithAI(
  payload: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function login(
  payload: LoginRequest
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function register(
  payload: RegisterRequest
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function logout(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function getCurrentUser(): Promise<{ id: string; email: string; username: string }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function getNotes(): Promise<NoteItem[]> {
  const res = await fetch(`${API_BASE}/notes`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function getNote(noteId: string): Promise<NoteItem> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function createNote(
  payload: NoteCreatePayload
): Promise<NoteItem> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function updateNote(
  noteId: string,
  payload: Partial<NoteCreatePayload>
): Promise<NoteItem> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function deleteNote(noteId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function searchSpotify(
  query: string,
  limit = 5
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const res = await fetch(`${API_BASE}/spotify/search?${params.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  const payload = await res.json();
  return payload.items as SpotifyTrack[];
}

export async function getSpotifyStatus(): Promise<{ connected: boolean }> {
  const res = await fetch(`${API_BASE}/spotify/status`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export async function getSpotifyRecommendations(
  text: string,
  limit = 6
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    text,
    limit: String(limit),
  });

  const res = await fetch(
    `${API_BASE}/spotify/recommendations?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  const payload = await res.json();
  return payload.items as SpotifyTrack[];
}

export async function disconnectSpotify(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/spotify/disconnect`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  return res.json();
}