from pydantic import BaseModel
from typing import List, Literal

class EmotionResponse(BaseModel):
    main_emotions: List[str]
    trend: Literal["positiva", "negativa", "neutra", "mixta"]
    intensity: Literal["baja", "media", "alta"]


class RecommendationResponse(BaseModel):
    suggestions: List[str]
    emotional_advice: List[str]


class SummaryResponse(BaseModel):
    summary: str
    emotions: List[str]
    insight: str


class ReflectionResponse(BaseModel):
    reflection: str