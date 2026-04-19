import json
from .base import run_ai_task
from .utils import clean_json
from .schemas import EmotionResponse
from .prompts.emotions_prompt import build_emotions_prompt

def analyze_emotions(notes):
    text = "\n".join([n.content for n in notes])

    prompt = build_emotions_prompt(text)
    raw = run_ai_task(prompt)

    try:
        cleaned = clean_json(raw)
        parsed = json.loads(cleaned)
        return EmotionResponse(**parsed)
    except Exception:
        return {
            "error": "Invalid AI response",
            "raw": raw
        }