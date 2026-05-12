import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.database import Base
from sqlalchemy.orm import relationship

class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255))
    content = Column(Text)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    song_id = Column(UUID(as_uuid=True), ForeignKey("songs.id"), nullable=True)

    song = relationship("Song", back_populates="notes")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)