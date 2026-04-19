import json
from .base import run_ai_task
from .utils import clean_json
from .schemas import SummaryResponse
from .prompts.summary_prompt import build_summary_prompt

def generate_summary(notes):
    text = "\n".join([n.content for n in notes])

    prompt = build_summary_prompt(text)
    raw = run_ai_task(prompt)

    try:
        cleaned = clean_json(raw)
        parsed = json.loads(cleaned)
        return SummaryResponse(**parsed)
    except Exception:
        return {
            "error": "Invalid AI response",
            "raw": raw
        }