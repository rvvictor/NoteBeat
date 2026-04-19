def clean_json(text: str):
    return text.replace("```json", "").replace("```", "").strip()