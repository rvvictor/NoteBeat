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

export interface RecapChangedEmotion {
  emotion: string | null;
  from_score: number;
  to_score: number;
  change: number;
  direction: "up" | "down" | "steady";
}

export interface RecapActivityItem {
  label: string;
  count: number;
}

export interface RecapDashboard {
  range: RecapRange;
  start_date: string;
  end_date: string;
  summary: {
    total_notes: number;
    notes_with_song: number;
    private_notes: number;
    shared_notes: number;
    dominant_emotion: string | null;
    avg_intensity: number;
    music_mood: string;
    representative_phrase: string;
    narrative_summary: string;
  };
  top_song: RecapItem;
  top_album: RecapItem;
  top_artist: RecapItem;
  most_changed_emotion: RecapChangedEmotion;
  activity: {
    top_day: RecapActivityItem;
    top_hour: RecapActivityItem;
  };
  songs_by_emotion: {
    happy: RecapItem;
    sad: RecapItem;
    anxious: RecapItem;
  };
  top_emotions: RecapEmotion[];
}
