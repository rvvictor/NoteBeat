from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID


def validate_username_value(value: str) -> str:
    if not value:
        raise ValueError("Username is required")
    if len(value) < 3:
        raise ValueError("Username must be at least 3 characters")
    if len(value) > 20:
        raise ValueError("Username must be less than 20 characters")
    if not value[0].isalpha():
        raise ValueError("Username must start with a letter")
    if not all(c.isalnum() or c == "_" for c in value):
        raise ValueError("Username can only contain letters, numbers, and underscores")
    return value

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    username: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password too long")
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return validate_username_value(value.strip())


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    username: str | None = None
    bio: str | None = Field(default=None, max_length=220)
    avatar_url: str | None = Field(default=None, max_length=2_200_000)
    cover_url: str | None = Field(default=None, max_length=2_200_000)

    @field_validator("display_name", "bio", "avatar_url", "cover_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("username")
    @classmethod
    def validate_optional_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return validate_username_value(value)

class UserLogin(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password too long")
        return value

class UserOut(UserBase):
    id: UUID
    username: str
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None

    class Config:
        from_attributes = True

class UserResponse(UserOut):
    pass
