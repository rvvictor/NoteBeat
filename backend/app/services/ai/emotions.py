import json
import logging
from sqlalchemy.orm import Session
from app.models.note_emotions import NoteEmotion
from app.services.ai.base import run_ai_task
from .prompts.emotions_prompt import build_emotions_prompt

logger = logging.getLogger(__name__)

def safe_parse_json(text: str):
    if not text:
        return None
    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON inválido: {text} | Error: {e}")
        return None

def analyze_and_store_emotions(note, db: Session):

    existing = db.query(NoteEmotion).filter(NoteEmotion.note_id == note.id).all()
    if existing:
        return existing


    try:
        prompt = build_emotions_prompt(note.content)
        result = run_ai_task(prompt)

        parsed = safe_parse_json(result)
        if not parsed or "emotions" not in parsed:
            logger.error(f"Estructura de IA inesperada: {result}")
            return []

        emotions_data = parsed.get("emotions", [])
        saved_objects = []


        for e in emotions_data:
            emotion_obj = NoteEmotion(
                note_id=note.id,
                user_id=note.user_id,
                emotion=e["emotion"],
                score=float(e["score"])
            )
            db.add(emotion_obj)
            saved_objects.append(emotion_obj)

        db.commit()
        return saved_objects

    except Exception as e:
        db.rollback()
        logger.error(f"Error procesando emociones con IA: {str(e)}")
        return []