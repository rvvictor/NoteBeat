import uuid
from sqlalchemy import Column, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(80), nullable=True)
    bio = Column(String(220), nullable=True)
    avatar_url = Column(Text, nullable=True)
    cover_url = Column(Text, nullable=True)
    spotify_access_token = Column(String(512), nullable=True)
    spotify_refresh_token = Column(String(512), nullable=True)
    spotify_expires_at = Column(Float, nullable=True)
