export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

export interface ProfileUpdateRequest {
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
}
