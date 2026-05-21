export interface SongPayload {
  title: string;
  artist: string;
  album?: string;
  spotify_id?: string;
  image_url?: string;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  image_url?: string | null;
  preview_url?: string | null;
}

export interface NoteCreatePayload {
  title: string;
  content: string;
  song_id?: string | null;
  song?: SongPayload | null;
}

export interface NoteEmotionItem {
  emotion: string;
  score: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  song_id?: string | null;
  song?: SongPayload | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  emotions?: NoteEmotionItem[];
}
