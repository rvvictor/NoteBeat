from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.db.deps import get_db
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.schemas.note_interaction import (
    NoteInteractionResponse,
    NoteInteractionUpdate,
)
from app.models.note import Note
from app.models.note_interaction import NoteInteraction
from app.models.song import Song
from app.models.note_emotions import NoteEmotion
from app.services.ai.emotions import analyze_and_store_emotions_for_note
from app.services.deps import get_current_user

router = APIRouter()
QUICK_NOTE_TITLE = "__notebeat_quick_note__"
INTERACTION_KINDS = {"like", "save", "repost"}

@router.get("/", response_model=List[NoteResponse])
def list_notes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notes = (
        db.query(Note)
        .options(joinedload(Note.song))
        .filter(Note.user_id == current_user.id)
        .order_by(Note.created_at.desc())
        .all()
    )

    return notes


@router.get("/interactions", response_model=List[NoteInteractionResponse])
def list_note_interactions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    interactions = (
        db.query(NoteInteraction)
        .filter(NoteInteraction.user_id == current_user.id)
        .all()
    )

    return [
        NoteInteractionResponse(
            note_id=interaction.note_id,
            kind=interaction.kind,
            active=True,
            created_at=interaction.created_at,
        )
        for interaction in interactions
    ]


@router.put("/{note_id}/interactions/{kind}", response_model=NoteInteractionResponse)
def update_note_interaction(
    note_id: UUID,
    kind: str,
    interaction_data: NoteInteractionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if kind not in INTERACTION_KINDS:
        raise HTTPException(status_code=400, detail="Invalid interaction")

    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.title == QUICK_NOTE_TITLE)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Post not found")

    interaction = (
        db.query(NoteInteraction)
        .filter(
            NoteInteraction.user_id == current_user.id,
            NoteInteraction.note_id == note_id,
            NoteInteraction.kind == kind,
        )
        .first()
    )

    if interaction_data.active:
        if interaction is None:
            interaction = NoteInteraction(
                user_id=current_user.id,
                note_id=note_id,
                kind=kind,
            )
            db.add(interaction)
            db.commit()
            db.refresh(interaction)

        return NoteInteractionResponse(
            note_id=interaction.note_id,
            kind=interaction.kind,
            active=True,
            created_at=interaction.created_at,
        )

    if interaction is not None:
        db.delete(interaction)
        db.commit()

    return NoteInteractionResponse(note_id=note_id, kind=kind, active=False)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    note = (
        db.query(Note)
        .options(joinedload(Note.song))
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return note

@router.post("/", response_model=NoteResponse)
async def create_note(
    note_data: NoteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    song_id = note_data.song_id

    if note_data.song is not None:
        new_song = Song(
            title=note_data.song.title,
            artist=note_data.song.artist,
            album=note_data.song.album,
            spotify_id=note_data.song.spotify_id,
            image_url=note_data.song.image_url
        )
        db.add(new_song)
        db.commit()
        db.refresh(new_song)
        song_id = new_song.id

    new_note = Note(
        title=note_data.title,
        content=note_data.content,
        user_id=current_user.id,
        song_id=song_id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    if song_id is not None:
        new_note.song = db.query(Song).filter(Song.id == song_id).first()


    background_tasks.add_task(analyze_and_store_emotions_for_note, new_note.id)

    return new_note


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: UUID,
    note_data: NoteUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    payload = note_data.dict(exclude_unset=True)

    if "song" in payload:
        song_payload = payload.get("song")
        if song_payload is None:
            note.song_id = None
        else:
            new_song = Song(
                title=song_payload.get("title"),
                artist=song_payload.get("artist"),
                album=song_payload.get("album"),
                spotify_id=song_payload.get("spotify_id"),
                image_url=song_payload.get("image_url")
            )
            db.add(new_song)
            db.commit()
            db.refresh(new_song)
            note.song_id = new_song.id

    if "song_id" in payload and payload.get("song_id") is not None:
        note.song_id = payload.get("song_id")

    if "title" in payload:
        note.title = payload.get("title")
    if "content" in payload:
        note.content = payload.get("content")

    db.commit()
    db.refresh(note)
    note.song = db.query(Song).filter(Song.id == note.song_id).first()

    return note


@router.delete("/{note_id}")
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.query(NoteEmotion).filter(NoteEmotion.note_id == note.id).delete()
    db.delete(note)
    db.commit()

    return {"message": "Note deleted"}
