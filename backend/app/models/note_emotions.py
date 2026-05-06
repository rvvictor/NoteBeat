import uuid
from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.database import Base

class NoteEmotion(Base):
    __tablename__ = "note_emotions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    emotion = Column(String(50))
    score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)