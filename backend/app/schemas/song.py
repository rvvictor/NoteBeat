from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SongBase(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    spotify_id: Optional[str] = None
    image_url: Optional[str] = None

class SongCreate(SongBase):
    pass

class SongResponse(SongBase):
    id: UUID
    valence: Optional[float] = None
    energy: Optional[float] = None

    class Config:
        from_attributes = True