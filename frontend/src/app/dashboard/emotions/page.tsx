"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getEmotionDashboard } from "@/lib/api";
import EmotionChart from "@/components/EmotionChart";
import { EmotionDashboard } from "@/lib/emotions";

export default function EmotionPage() {
  const router = useRouter();
  const [data, setData] = useState<EmotionDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEmotionDashboard()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-card dashboard-state">
            Loading emotion insights...
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-card dashboard-state">{error}</div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-container">
          <div className="dashboard-card dashboard-state">
            No emotion data yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-content">
      <div className="dashboard-container">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-kicker">Emotions</p>
            <h1 className="dashboard-title">Emotion dashboard</h1>
            <p className="dashboard-subtitle">
              Track your entries, dominant moods, and emotional patterns over time.
            </p>
          </div>
          <span className="dashboard-pill">Last 30 days</span>
        </header>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Total entries</p>
            <p className="stat-value accent">{data.summary.total_entries}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Dominant emotion</p>
            <p className="stat-value teal capitalize">
              {data.summary.dominant_emotion}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Trend</p>
            <p className="stat-value accent capitalize">
              {data.summary.trend}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Avg intensity</p>
            <p className="stat-value">{data.summary.avg_intensity}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-title">Emotion distribution</h2>
          <p className="card-subtitle">
            A snapshot of the moods showing up in your recent notes.
          </p>
          <div className="mt-6">
            <EmotionChart data={data.distribution} />
          </div>
        </div>

        <div className="dashboard-card mt-6">
          <h2 className="card-title">Emotion breakdown</h2>
          <p className="card-subtitle">Entry count by emotion label.</p>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Emotion</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.distribution.map((item) => (
                <tr key={item.emotion}>
                  <td className="capitalize">{item.emotion}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}