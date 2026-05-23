import uuid
from sqlalchemy import Column, Float, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    spotify_access_token = Column(String(512), nullable=True)
    spotify_refresh_token = Column(String(512), nullable=True)
    spotify_expires_at = Column(Float, nullable=True)