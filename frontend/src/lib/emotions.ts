export interface EmotionItem {
  emotion: string;
  count: number;
}

export interface EmotionDashboard {
  summary: {
    dominant_emotion: string;
    avg_intensity: number;
    trend: string;
    total_entries: number;
  };
  distribution: {
    emotion: string;
    count: number;
    avg_score: number;
  }[];
  timeline: {
    date: string;
    avg_score: number;
  }[];
}