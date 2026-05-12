import os
from fastapi import FastAPI
from app.db.database import engine, Base
from app.models import user
from app.routes import auth
from app.models import note
from app.routes import notes
from app.models import song
from app.routes import ai
from app.routes import spotify
from app.models import note_emotions
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.get("/")
def root():
    return {"message": "API running"}

Base.metadata.create_all(bind=engine)

raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router, prefix="/auth")
app.include_router(notes.router, prefix="/notes", tags=["Notes"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(spotify.router, prefix="/spotify", tags=["Spotify"])