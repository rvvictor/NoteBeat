from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password too long")
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

    class Config:
        from_attributes = True

class UserResponse(UserOut):
    pass