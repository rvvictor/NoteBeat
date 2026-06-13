from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from typing import List
from uuid import UUID
from sqlalchemy import case
from sqlalchemy.orm import Session, joinedload
from app.db.deps import get_db
from app.schemas.note import NoteAuthor, NoteCreate, NoteResponse, NoteUpdate
from app.schemas.note_interaction import (
    NoteInteractionResponse,
    NoteInteractionUpdate,
)
from app.models.note import Note
from app.models.note_interaction import NoteInteraction
from app.models.song import Song
from app.models.user_follow import UserFollow
from app.models.note_emotions import NoteEmotion
from app.services.ai.emotions import analyze_and_store_emotions_for_note
from app.services.deps import get_current_user

router = APIRouter()
QUICK_NOTE_TITLE = "__notebeat_quick_note__"
INTERACTION_KINDS = {"like", "save", "repost"}


def get_following_ids(db: Session, user_id: UUID) -> set[UUID]:
    rows = (
        db.query(UserFollow.following_id)
        .filter(UserFollow.follower_id == user_id)
        .all()
    )
    return {row[0] for row in rows}


def build_note_author(note: Note, following_ids: set[UUID]) -> NoteAuthor | None:
    if note.user is None:
        return None

    return NoteAuthor(
        id=note.user.id,
        username=note.user.username,
        display_name=note.user.display_name,
        avatar_url=note.user.avatar_url,
        is_followed=note.user.id in following_ids,
    )


def build_note_response(
    note: Note,
    following_ids: set[UUID] | None = None,
) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        song_id=note.song_id,
        user_id=note.user_id,
        created_at=note.created_at,
        updated_at=note.updated_at,
        song=note.song,
        author=build_note_author(note, following_ids or set()),
    )

@router.get("/", response_model=List[NoteResponse])
def list_notes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notes = (
        db.query(Note)
        .options(joinedload(Note.song), joinedload(Note.user))
        .filter(Note.user_id == current_user.id)
        .order_by(Note.created_at.desc())
        .all()
    )

    return notes


@router.get("/feed", response_model=List[NoteResponse])
def list_feed_notes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    following_ids = get_following_ids(db, current_user.id)

    query = (
        db.query(Note)
        .options(joinedload(Note.song), joinedload(Note.user))
        .filter(Note.title == QUICK_NOTE_TITLE, Note.user_id != current_user.id)
    )

    if following_ids:
        query = query.order_by(
            case((Note.user_id.in_(list(following_ids)), 0), else_=1),
            Note.created_at.desc(),
        )
    else:
        query = query.order_by(Note.created_at.desc())

    notes = query.limit(80).all()

    return [build_note_response(note, following_ids) for note in notes]


@router.get("/interactions", response_model=List[NoteInteractionResponse])
def list_note_interactions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    following_ids = get_following_ids(db, current_user.id)
    interactions = (
        db.query(NoteInteraction)
        .options(
            joinedload(NoteInteraction.note).joinedload(Note.song),
            joinedload(NoteInteraction.note).joinedload(Note.user),
        )
        .filter(NoteInteraction.user_id == current_user.id)
        .all()
    )

    return [
        NoteInteractionResponse(
            note_id=interaction.note_id,
            kind=interaction.kind,
            active=True,
            created_at=interaction.created_at,
            note=build_note_response(interaction.note, following_ids)
            if interaction.note is not None
            else None,
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
        .options(joinedload(Note.song), joinedload(Note.user))
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
            note=build_note_response(note, get_following_ids(db, current_user.id)),
        )

    if interaction is not None:
        db.delete(interaction)
        db.commit()

    return NoteInteractionResponse(
        note_id=note_id,
        kind=kind,
        active=False,
        note=build_note_response(note, get_following_ids(db, current_user.id)),
    )


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
