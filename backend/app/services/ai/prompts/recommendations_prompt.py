def build_recommendations_prompt(text: str):
    return f"""
    Basado en estas notas:

    {text}

    Responde SOLO en JSON válido:

    {{
      "suggestions": ["string"],
      "emotional_advice": ["string"]
    }}
    """