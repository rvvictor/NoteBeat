"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmotionDashboard } from "@/lib/api";
import { EmotionDashboard } from "@/lib/emotions";
import { ApiError } from "@/lib/api";
import EmotionChart from "./EmotionChart";

export default function DashboardRightPanel() {
  const router = useRouter();
  const [emotionsData, setEmotionsData] = useState<EmotionDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmotionDashboard()
      .then(setEmotionsData)
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
    <div className="dashboard-right-panel">
      <div className="dashboard-right-header">
        <h2 className="dashboard-right-title">Statistics</h2>
        <p className="dashboard-right-subtitle">Your emotional insights</p>
      </div>

      {isLoading ? (
        <div className="dashboard-loading">Loading statistics...</div>
      ) : error ? (
        <div className="dashboard-error">{error}</div>
      ) : emotionsData ? (
        <div className="dashboard-stats-content">
          <div className="dashboard-stats-summary">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Total Entries</div>
              <div className="dashboard-stat-value">{emotionsData.summary.total_entries}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Dominant Emotion</div>
              <div className="dashboard-stat-value">{emotionsData.summary.dominant_emotion}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Avg Intensity</div>
              <div className="dashboard-stat-value">{emotionsData.summary.avg_intensity.toFixed(1)}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Trend</div>
              <div className="dashboard-stat-value">{emotionsData.summary.trend}</div>
            </div>
          </div>

          {emotionsData.distribution.length > 0 && (
            <div className="dashboard-chart-container">
              <h3 className="dashboard-chart-title">Emotion Distribution</h3>
              <EmotionChart data={emotionsData.distribution} />
            </div>
          )}

          <button
            onClick={() => router.push("/dashboard/emotions")}
            className="dashboard-view-details-btn"
          >
            View Details
          </button>
        </div>
      ) : (
        <div className="dashboard-empty">No statistics available yet.</div>
      )}
    </div>
  );
}
