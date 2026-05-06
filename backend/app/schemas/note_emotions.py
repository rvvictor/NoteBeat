from pydantic import BaseModel
from uuid import UUID

class NoteEmotionBase(BaseModel):
    emotion: str
    score: float

class NoteEmotionResponse(NoteEmotionBase):
    id: UUID
    note_id: UUID

    class Config:
        from_attributes = True