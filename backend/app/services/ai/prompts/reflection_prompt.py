def build_reflection_prompt(text: str):
    return f"""
    Lee esta nota:

    {text}

    Responde SOLO en JSON válido:

    {{
      "reflection": "respuesta empática, humana y breve"
    }}
    """