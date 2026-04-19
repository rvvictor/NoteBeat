def build_summary_prompt(text: str):
    return f"""
    Analiza estas notas:

    {text}

    Responde SOLO en JSON válido:

    {{
      "summary": "string",
      "emotions": ["string"],
      "insight": "string"
    }}
    """