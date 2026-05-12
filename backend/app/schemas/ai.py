from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


class ChatRequest(BaseModel):
    question: str
    note_ids: Optional[List[UUID]] = None


class ChatResponse(BaseModel):
    answer: str
    used_note_ids: List[UUID]
