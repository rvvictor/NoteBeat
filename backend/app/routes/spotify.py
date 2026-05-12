from fastapi import APIRouter, Depends, HTTPException
from app.services.deps import get_current_user
from app.services.spotify.client import search_tracks

router = APIRouter()


@router.get("/search")
def search_spotify(q: str, limit: int = 5, user=Depends(get_current_user)):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        return {"items": search_tracks(q, limit=limit)}
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Spotify request failed")
