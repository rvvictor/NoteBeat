from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.db.deps import get_db
from app.models.note import Note
from app.services.deps import get_current_user
from app.schemas.ai import ChatRequest, ChatResponse
from app.services.ai.summary import generate_summary
from app.services.ai.recommendations import recommend_actions
from app.services.ai.reflection import reflect_on_note
from app.services.ai.chat import chat_with_notes
from app.services.ai.emotions import analyze_and_store_emotions
from app.models.note_emotions import NoteEmotion
from collections import defaultdict
from uuid import UUID

router = APIRouter(tags=["AI"])

RECAP_RANGES = {
    "week": 7,
    "month": 30,
    "year": 365
}


def _empty_recap_item():
    return {
        "label": "No data yet",
        "count": 0,
        "image_url": None
    }


def _top_recap_item(notes, key_builder, label_builder):
    counts = {}

    for note in notes:
        if not note.song:
            continue

        key = key_builder(note)
        if not key:
            continue

        entry = counts.get(key)
        if entry:
            entry["count"] += 1
            if not entry.get("image_url") and note.song.image_url:
                entry["image_url"] = note.song.image_url
            continue

        counts[key] = {
            "label": label_builder(note),
            "count": 1,
            "image_url": note.song.image_url
        }

    if not counts:
        return _empty_recap_item()

    return max(counts.values(), key=lambda item: item["count"])


def _build_emotion_summary(emotions):
    if not emotions:
        return {
            "dominant_emotion": None,
            "avg_intensity": 0,
            "top_emotions": []
        }

    distribution = defaultdict(lambda: {"count": 0, "total_score": 0})

    for emotion in emotions:
        distribution[emotion.emotion]["count"] += 1
        distribution[emotion.emotion]["total_score"] += emotion.score

    top_emotions = []
    for emotion, data in distribution.items():
        top_emotions.append({
            "emotion": emotion,
            "count": data["count"],
            "avg_score": round(data["total_score"] / data["count"], 2)
        })

    top_emotions = sorted(
        top_emotions,
        key=lambda item: (item["count"], item["avg_score"]),
        reverse=True
    )

    avg_intensity = sum(emotion.score for emotion in emotions) / len(emotions)

    return {
        "dominant_emotion": top_emotions[0]["emotion"],
        "avg_intensity": round(avg_intensity, 2),
        "top_emotions": top_emotions[:3]
    }


@router.post("/emotions/{note_id}")
def analyze_emotions(note_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    emotions = analyze_and_store_emotions(note, db)

    return {
        "note_id": note.id,
        "emotions": [
            {
                "emotion": e.emotion,
                "score": e.score
            } for e in emotions
        ]
    }

@router.get("/emotions/{note_id}")
def get_emotions(note_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    emotions = db.query(NoteEmotion).filter(
        NoteEmotion.note_id == note_id,
        NoteEmotion.user_id == user.id
    ).all()

    return [
        {
            "emotion": e.emotion,
            "score": e.score
        } for e in emotions
    ]

@router.get("/summary")
def get_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return generate_summary(notes)


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return recommend_actions(notes)


@router.get("/reflection/{note_id}")
def get_reflection(note_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return reflect_on_note(note.content)

@router.get("/emotions")
def get_all_emotions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    emotions = db.query(NoteEmotion).filter(
        NoteEmotion.user_id == user.id
    ).all()

    return [
        {
            "emotion": e.emotion,
            "score": e.score,
            "note_id": e.note_id
        } for e in emotions
    ]


@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    notes_query = db.query(Note).filter(Note.user_id == user.id)

    if payload.note_ids:
        notes_query = notes_query.filter(Note.id.in_(payload.note_ids))

    notes = notes_query.order_by(Note.created_at.desc()).limit(50).all()

    if not notes:
        raise HTTPException(status_code=404, detail="No notes found")

    answer = chat_with_notes(payload.question, notes)

    return ChatResponse(
        answer=answer,
        used_note_ids=[note.id for note in notes]
    )

@router.get("/dashboard")
def emotions_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    emotions = db.query(NoteEmotion).filter(
        NoteEmotion.user_id == user.id
    ).all()

    if not emotions:
        return {
            "summary": {},
            "timeline": [],
            "distribution": []
        }

    # ── 1. Distribución de emociones ─────────────────
    distribution_map = defaultdict(lambda: {"count": 0, "total_score": 0})

    for e in emotions:
        distribution_map[e.emotion]["count"] += 1
        distribution_map[e.emotion]["total_score"] += e.score

    distribution = []
    for emotion, data in distribution_map.items():
        avg_score = data["total_score"] / data["count"]
        distribution.append({
            "emotion": emotion,
            "count": data["count"],
            "avg_score": round(avg_score, 2)
        })

    # ── 2. Emoción dominante ─────────────────
    dominant = max(distribution, key=lambda x: x["count"])

    # ── 3. Intensidad promedio ─────────────────
    avg_intensity = sum(e.score for e in emotions) / len(emotions)

    # ── 4. Timeline emocional ─────────────────
    timeline_map = defaultdict(list)

    for e in emotions:
        date = e.created_at.date() if hasattr(e, "created_at") else "unknown"
        timeline_map[date].append(e.score)

    timeline = []
    for date, scores in timeline_map.items():
        timeline.append({
            "date": str(date),
            "avg_score": round(sum(scores) / len(scores), 2)
        })

    timeline = sorted(timeline, key=lambda x: x["date"])

    # ── 5. Clasificación simple (positivo/negativo) ─────────────────
    positive_emotions = ["felicidad", "alegría", "motivación", "calma"]
    negative_emotions = ["tristeza", "ansiedad", "enojo", "frustración"]

    pos = sum(e.score for e in emotions if e.emotion in positive_emotions)
    neg = sum(e.score for e in emotions if e.emotion in negative_emotions)

    if pos > neg:
        trend = "positiva"
    elif neg > pos:
        trend = "negativa"
    else:
        trend = "neutra"

    # ── RESPONSE FINAL ─────────────────
    return {
        "summary": {
            "dominant_emotion": dominant["emotion"],
            "avg_intensity": round(avg_intensity, 2),
            "trend": trend,
            "total_entries": len(emotions)
        },
        "distribution": distribution,
        "timeline": timeline
    }


@router.get("/recap")
def get_recap(
    recap_range: str = Query("week", alias="range", pattern="^(week|month|year)$"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    days = RECAP_RANGES[recap_range]
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days - 1)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    notes = (
        db.query(Note)
        .options(joinedload(Note.song))
        .filter(
            Note.user_id == user.id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        )
        .order_by(Note.created_at.desc())
        .all()
    )

    note_ids = [note.id for note in notes]
    emotions = []
    if note_ids:
        emotions = (
            db.query(NoteEmotion)
            .filter(
                NoteEmotion.user_id == user.id,
                NoteEmotion.note_id.in_(note_ids)
            )
            .all()
        )

    notes_with_song = [note for note in notes if note.song]
    emotion_summary = _build_emotion_summary(emotions)

    top_song = _top_recap_item(
        notes_with_song,
        lambda note: (
            f"{note.song.title.lower()}::{note.song.artist.lower()}"
            if note.song.title and note.song.artist
            else None
        ),
        lambda note: f"{note.song.title} - {note.song.artist}"
    )

    top_album = _top_recap_item(
        notes_with_song,
        lambda note: note.song.album.lower() if note.song.album else None,
        lambda note: note.song.album
    )

    top_artist = _top_recap_item(
        notes_with_song,
        lambda note: note.song.artist.lower() if note.song.artist else None,
        lambda note: note.song.artist
    )

    return {
        "range": recap_range,
        "start_date": start_date.date().isoformat(),
        "end_date": end_date.date().isoformat(),
        "summary": {
            "total_notes": len(notes),
            "notes_with_song": len(notes_with_song),
            "dominant_emotion": emotion_summary["dominant_emotion"],
            "avg_intensity": emotion_summary["avg_intensity"]
        },
        "top_song": top_song,
        "top_album": top_album,
        "top_artist": top_artist,
        "top_emotions": emotion_summary["top_emotions"]
    }
