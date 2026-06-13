import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class NoteInteraction(Base):
    __tablename__ = "note_interactions"
    __table_args__ = (
        UniqueConstraint("user_id", "note_id", "kind", name="uq_note_interaction"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id"), nullable=False)
    kind = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
