from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from app.schemas.note_emotions import NoteEmotionBase

class NoteBase(BaseModel):
    title: str
    content: str
    song_id: Optional[UUID] = None

class NoteCreate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    emotions: List[NoteEmotionBase] = []

    class Config:
        from_attributes = True