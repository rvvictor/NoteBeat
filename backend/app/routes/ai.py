from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.models.note import Note
from app.services.deps import get_current_user
from app.services.ai.emotions import analyze_emotions
from app.services.ai.summary import generate_summary
from app.services.ai.recommendations import recommend_actions
from app.services.ai.reflection import reflect_on_note

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/emotions")
def get_emotions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return analyze_emotions(notes)


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return generate_summary(notes)


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return recommend_actions(notes)


@router.get("/reflection/{note_id}")
def get_reflection(note_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return reflect_on_note(note.content)