from fastapi import FastAPI
from app.db.database import engine, Base
from app.models import user
from app.routes import auth

app = FastAPI()

@app.get("/")
def root():
    return {"message": "API running"}

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/auth")