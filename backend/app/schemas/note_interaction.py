from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from app.schemas.note import NoteResponse


class NoteInteractionUpdate(BaseModel):
    active: bool


class NoteInteractionResponse(BaseModel):
    note_id: UUID
    kind: str
    active: bool
    created_at: datetime | None = None
    note: NoteResponse | None = None

    class Config:
        from_attributes = True
