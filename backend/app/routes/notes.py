from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.note import NoteCreate, NoteResponse
from app.models.note import Note
from app.services.ai.emotions import analyze_and_store_emotions # Tu servicio de IA
from app.routes.auth import get_current_user # Asumiendo que tienes esto para el JWT

router = APIRouter()

@router.post("/", response_model=NoteResponse)
async def create_note(
    note_data: NoteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    new_note = Note(
        title=note_data.title,
        content=note_data.content,
        user_id=current_user.id,
        song_id=note_data.song_id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)


    background_tasks.add_task(analyze_and_store_emotions, new_note, db)

    return new_note