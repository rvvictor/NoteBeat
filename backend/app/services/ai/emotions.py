from app.services.ai.base import run_ai_task
from .prompts.emotions_prompt import build_emotions_prompt
from app.models.note_emotions import NoteEmotion
import json

def safe_parse_json(text):
    if not text:
        return None

    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        print("❌ JSON inválido:", text)
        return None

def analyze_and_store_emotions(note, db):

    existing = db.query(NoteEmotion).filter(
        NoteEmotion.note_id == note.id
    ).all()

    if existing:
        return existing

    prompt = build_emotions_prompt(note.content)
    result = run_ai_task(prompt)

    try:
        parsed = safe_parse_json(result)
    except Exception:
        raise Exception(f"Invalid JSON from AI: {result}")

    emotions = parsed.get("emotions", [])

    saved = []

    for e in emotions:
        emotion_obj = NoteEmotion(
            note_id=note.id,
            user_id=note.user_id,
            emotion=e["emotion"],
            score=e["score"]
        )
        db.add(emotion_obj)
        saved.append(emotion_obj)

    db.commit()

    return saved