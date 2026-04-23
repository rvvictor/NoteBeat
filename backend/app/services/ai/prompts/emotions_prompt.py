def build_emotions_prompt(text: str):
    return f"""
    Analiza esta nota:

    {text}

    Devuelve SOLO JSON válido con este formato exacto:

    {{
      "emotions": [
        {{"emotion": "felicidad", "score": 0.9}},
        {{"emotion": "motivación", "score": 0.7}}
      ]
    }}

    REGLAS:
    - score debe ser entre 0 y 1
    - máximo 5 emociones
    - NO texto adicional
    """