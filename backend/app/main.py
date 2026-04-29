from fastapi import FastAPI
from app.db.database import engine, Base
from app.models import user
from app.routes import auth
from app.models import note
from app.routes import notes
from app.models import song
from app.routes import ai
from app.models import note_emotions
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.get("/")
def root():
    return {"message": "API running"}

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/auth")
app.include_router(notes.router, prefix="/notes", tags=["Notes"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])