from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID

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

    class Config:
        from_attributes = True

class UserResponse(UserOut):
    pass