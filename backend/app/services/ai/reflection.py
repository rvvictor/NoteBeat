import json
from .base import run_ai_task
from .utils import clean_json
from .schemas import ReflectionResponse
from .prompts.reflection_prompt import build_reflection_prompt

def reflect_on_note(content: str):
    prompt = build_reflection_prompt(content)
    raw = run_ai_task(prompt)

    try:
        cleaned = clean_json(raw)
        parsed = json.loads(cleaned)
        return ReflectionResponse(**parsed)
    except Exception:
        return {
            "error": "Invalid AI response",
            "raw": raw
        }