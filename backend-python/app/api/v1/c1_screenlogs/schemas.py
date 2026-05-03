from pydantic import BaseModel, Field
from typing import List


class RiskPredictionRequest(BaseModel):
    phq9_score: int = Field(..., ge=0, le=27)
    gad7_score: int = Field(..., ge=0, le=21)

    screen_time_dev: float = Field(..., ge=0, le=1)
    session_fragmentation: float = Field(..., ge=0, le=1)
    app_switching: float = Field(..., ge=0, le=1)
    repeated_checking: float = Field(..., ge=0, le=1)
    usage_irregularity: float = Field(..., ge=0, le=1)


class RiskPredictionResponse(BaseModel):
    predicted_risk: str
    confidence: float
    top_factors: List[str]