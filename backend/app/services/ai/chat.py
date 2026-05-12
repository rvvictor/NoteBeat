from .base import run_ai_task
from .prompts.chat_prompt import build_chat_context_prompt, build_chat_reply_prompt


def chat_with_notes(question: str, notes):
    notes_text = "\n\n".join([n.content for n in notes])

    context_prompt = build_chat_context_prompt(notes_text)
    context = run_ai_task(context_prompt)

    reply_prompt = build_chat_reply_prompt(question, context)
    return run_ai_task(reply_prompt)
