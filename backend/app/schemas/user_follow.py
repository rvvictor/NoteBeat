from pydantic import BaseModel
from uuid import UUID


class UserFollowUpdate(BaseModel):
    active: bool


class UserFollowResponse(BaseModel):
    user_id: UUID
    active: bool
    follower_count: int
