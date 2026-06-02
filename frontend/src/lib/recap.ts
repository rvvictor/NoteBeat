export type RecapRange = "week" | "month" | "year";

export interface RecapItem {
  label: string;
  count: number;
  image_url?: string | null;
}

export interface RecapEmotion {
  emotion: string;
  count: number;
  avg_score: number;
}

export interface RecapDashboard {
  range: RecapRange;
  start_date: string;
  end_date: string;
  summary: {
    total_notes: number;
    notes_with_song: number;
    dominant_emotion: string | null;
    avg_intensity: number;
  };
  top_song: RecapItem;
  top_album: RecapItem;
  top_artist: RecapItem;
  top_emotions: RecapEmotion[];
}
