import json
from .base import run_ai_task
from .utils import clean_json
from .schemas import RecommendationResponse
from .prompts.recommendations_prompt import build_recommendations_prompt

def recommend_actions(notes):
    text = "\n".join([n.content for n in notes])

    prompt = build_recommendations_prompt(text)
    raw = run_ai_task(prompt)

    try:
        cleaned = clean_json(raw)
        parsed = json.loads(cleaned)
        return RecommendationResponse(**parsed)
    except Exception:
        return {
            "error": "Invalid AI response",
            "raw": raw
        }