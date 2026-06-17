"""Schemas Pydantic de entrada/salida de la API."""
from pydantic import BaseModel, Field


class UserIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=40)


class PredictionIn(BaseModel):
    user_id: int
    match_id: int
    pred_home: int = Field(..., ge=0, le=30)
    pred_away: int = Field(..., ge=0, le=30)


class ResultIn(BaseModel):
    match_id: int
    home_score: int = Field(..., ge=0, le=30)
    away_score: int = Field(..., ge=0, le=30)
