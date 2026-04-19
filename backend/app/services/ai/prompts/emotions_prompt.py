def build_emotions_prompt(text: str):
    return f"""
    Analiza estas notas:

    {text}

    Responde SOLO en JSON válido:

    {{
      "main_emotions": ["string"],
      "trend": "positiva | negativa | neutra | mixta",
      "intensity": "baja | media | alta"
    }}
    """