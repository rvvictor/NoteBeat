def build_chat_context_prompt(text: str):
    return f"""
    Eres un asistente que resume notas personales.

    Notas:
    {text}

    Devuelve un resumen corto y estructurado con:
    - temas clave
    - emociones predominantes
    - eventos o personas relevantes
    - cambios en el tiempo
    """


def build_chat_reply_prompt(question: str, context: str):
    return f"""
    Eres un amigo cercano, empatico y honesto. Responde a la pregunta del usuario
    usando el contexto. Si falta informacion, pide una aclaracion concreta.

    Contexto:
    {context}

    Pregunta:
    {question}

    Responde en texto claro, sin JSON.
    """
