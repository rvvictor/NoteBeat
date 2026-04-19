from pydantic import BaseModel
from typing import Optional

class NoteCreate(BaseModel):
    title: Optional[str]
    content: str
    emotion: Optional[str]

    song_title: Optional[str]
    artist: Optional[str]
    album: Optional[str]