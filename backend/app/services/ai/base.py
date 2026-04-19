from .client import generate

def run_ai_task(prompt: str):
    try:
        return generate(prompt)
    except Exception as e:
        return f"Error generating AI response: {str(e)}"