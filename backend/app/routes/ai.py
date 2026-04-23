from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.models.note import Note
from app.services.deps import get_current_user
from app.services.ai.summary import generate_summary
from app.services.ai.recommendations import recommend_actions
from app.services.ai.reflection import reflect_on_note
from app.services.ai.emotions import analyze_and_store_emotions
from app.models.note_emotions import NoteEmotion
from collections import defaultdict
from datetime import datetime

router = APIRouter(tags=["AI"])


@router.post("/emotions/{note_id}")
def analyze_emotions(note_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
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
def get_emotions(note_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
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
def get_reflection(note_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
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