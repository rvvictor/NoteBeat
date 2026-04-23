from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from datetime import datetime
from app.db.database import Base

class NoteEmotion(Base):
    __tablename__ = "note_emotions"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    emotion = Column(String(50))
    score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)