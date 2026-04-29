import { EmotionDashboard } from "@/lib/emotions";

export async function getEmotionDashboard(
  token: string
): Promise<EmotionDashboard> {
  const res = await fetch("http://127.0.0.1:8000/ai/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}