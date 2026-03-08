# backend-python/app/api/v1/c3_sleep/schemas.py

from pydantic import BaseModel
from typing import List, Optional, Dict

class SessionData(BaseModel):
    screen_time_night_mins: float = 0
    unlocks_night: float = 0
    notifications_night: float = 0
    social_media_mins: float = 0
    last_screen_off_hour: float = 0
    snoring_mins: float = 0
    restlessness_percent: float = 0
    day_of_week: int = 0

class SleepRiskRequest(BaseModel):
    sessions: List[SessionData]
    user_id: Optional[str] = None

class SleepRiskResponse(BaseModel):
    risk_class: int
    risk_label: str
    risk_score: float
    probabilities: Dict[str, float]
    bilstm_prediction: str
    rf_prediction: str
    contributing_factors: List[str]

class SnoringResponse(BaseModel):
    is_snoring: bool
    confidence: float
    label: str
    threshold: float