export interface SongPayload {
  title: string;
  artist: string;
  album?: string;
  spotify_id?: string;
  image_url?: string;
}

export const QUICK_NOTE_TITLE = "__notebeat_quick_note__";

export const isQuickNote = (note: { title?: string | null }) =>
  note.title === QUICK_NOTE_TITLE;

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

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  song_id?: string | null;
  song?: SongPayload | null;
  user_id: string;
  author?: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    is_followed?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export type NoteInteractionKind = "like" | "save" | "repost";

export interface NoteInteraction {
  note_id: string;
  kind: NoteInteractionKind;
  active: boolean;
  created_at?: string | null;
  note?: NoteItem | null;
}
