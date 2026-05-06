import uuid
from sqlalchemy import Column, String, Float
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class Song(Base):
    __tablename__ = "songs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=False)
    album = Column(String(255), nullable=True)

    spotify_id = Column(String(255), nullable=True)
    valence = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)