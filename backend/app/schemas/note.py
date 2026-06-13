from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from app.schemas.note_emotions import NoteEmotionBase
from app.schemas.song import SongCreate, SongResponse


class NoteAuthor(BaseModel):
    id: UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    is_followed: bool = False

class NoteBase(BaseModel):
    title: str
    content: str
    song_id: Optional[UUID] = None

class NoteCreate(NoteBase):
    song: Optional[SongCreate] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    song_id: Optional[UUID] = None
    song: Optional[SongCreate] = None

class NoteResponse(NoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    emotions: List[NoteEmotionBase] = []
    song: Optional[SongResponse] = None
    author: Optional[NoteAuthor] = None

    class Config:
        from_attributes = True
