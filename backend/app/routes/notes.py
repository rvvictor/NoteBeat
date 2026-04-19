from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.note import NoteCreate
from app.models.note import Note
from app.services.deps import get_current_user
from app.db.deps import get_db
from app.models.song import Song

router = APIRouter()

@router.post("/")
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    song = None

    if note.song_title and note.artist:
        song = db.query(Song).filter(
            Song.title == note.song_title,
            Song.artist == note.artist
        ).first()

        if not song:
            song = Song(
                title=note.song_title,
                artist=note.artist,
                album=note.album
            )
            db.add(song)
            db.commit()
            db.refresh(song)

    new_note = Note(
        title=note.title,
        content=note.content,
        emotion=note.emotion,
        user_id=user.id,
        song_id=song.id if song else None
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note

@router.get("/")
def get_notes(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return notes