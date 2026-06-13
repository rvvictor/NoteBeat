import os
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin, UserOut, UserUpdate
from app.models.user import User
from app.db.deps import get_db
from app.services.auth import hash_password, verify_password
from app.services.jwt import create_access_token
from app.services.deps import get_current_user

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "nb_access_token")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    existing_username = db.query(User).filter(User.username == user.username).first()

    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        email=user.email,
        password=hash_password(user.password),
        username=user.username,
        display_name=user.username
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created"}

@router.post("/login")
def login(user: UserLogin, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(
        {"sub": db_user.email},
        expires_delta=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {"message": "Login successful"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Logged out"}

@router.get("/me", response_model=UserOut)
def get_me(user=Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    profile: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    payload = profile.model_dump(exclude_unset=True)

    new_username = payload.get("username")
    if new_username and new_username != user.username:
        existing_username = (
            db.query(User)
            .filter(User.username == new_username, User.id != user.id)
            .first()
        )
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = new_username

    if "display_name" in payload:
        user.display_name = payload.get("display_name") or user.username
    if "bio" in payload:
        user.bio = payload.get("bio")
    if "avatar_url" in payload:
        user.avatar_url = payload.get("avatar_url")
    if "cover_url" in payload:
        user.cover_url = payload.get("cover_url")

    db.commit()
    db.refresh(user)

    return user
