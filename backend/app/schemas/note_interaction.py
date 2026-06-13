from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


class NoteInteractionUpdate(BaseModel):
    active: bool


class NoteInteractionResponse(BaseModel):
    note_id: UUID
    kind: str
    active: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True
