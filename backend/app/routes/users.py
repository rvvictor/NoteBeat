from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.deps import get_db
from app.models.user import User
from app.models.user_follow import UserFollow
from app.schemas.user_follow import UserFollowResponse, UserFollowUpdate
from app.services.deps import get_current_user


router = APIRouter()


@router.put("/{user_id}/follow", response_model=UserFollowResponse)
def update_user_follow(
    user_id: UUID,
    follow_data: UserFollowUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")

    target_user = db.query(User).filter(User.id == user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    follow = (
        db.query(UserFollow)
        .filter(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == user_id,
        )
        .first()
    )

    if follow_data.active and follow is None:
        follow = UserFollow(follower_id=current_user.id, following_id=user_id)
        db.add(follow)
        db.commit()
    elif not follow_data.active and follow is not None:
        db.delete(follow)
        db.commit()

    follower_count = (
        db.query(UserFollow).filter(UserFollow.following_id == user_id).count()
    )

    return UserFollowResponse(
        user_id=user_id,
        active=follow_data.active,
        follower_count=follower_count,
    )
