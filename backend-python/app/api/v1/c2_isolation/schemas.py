"""
schemas.py — Component 2: Social Isolation Detection
BACKEND-PYTHON/APP/api/v1/c2_isolation/schemas.py
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class DailyRecord(BaseModel):
    """One day of sensor features — matches isolationCollector.js output."""

    # Pillar 1: Mobility
    daily_distance_m:     float = Field(ge=0,   description="Total GPS distance in metres")
    time_at_home_pct:     float = Field(ge=0, le=1, description="Fraction of day at home location")
    location_entropy:     float = Field(ge=0,   description="Shannon entropy of location visits")
    transitions:          float = Field(ge=0,   description="Location transitions per day")
    radius_of_gyration_km: float = Field(ge=0,  description="Radius of gyration in km")

    # Pillar 2: Communication
    calls_per_day:        float = Field(ge=0,   description="Total calls made/received")
    avg_call_duration_s:  float = Field(ge=0,   description="Average call duration in seconds")
    unique_contacts:      float = Field(ge=0,   description="Number of distinct contacts interacted with")
    sms_per_day:          float = Field(ge=0,   description="SMS messages sent/received")
    silence_hours:        float = Field(ge=0, le=24, description="Hours with no call or SMS activity")

    # Pillar 3: Behaviour
    night_usage_min:      float = Field(ge=0,   description="Screen time after 11 PM in minutes")
    unlocks_per_day:      float = Field(ge=0,   description="Number of phone unlocks")
    total_screen_min:     float = Field(ge=0,   description="Total screen-on time in minutes")
    social_app_min:       float = Field(ge=0,   description="Time on social apps in minutes")
    social_pct:           float = Field(ge=0, le=1, description="Social app time as fraction of total")
    rhythm_irregularity:  float = Field(ge=0, le=1, description="Normalised daily rhythm irregularity")

    # Pillar 4: Proximity
    bluetooth_avg_devices: float = Field(ge=0,  description="Average nearby Bluetooth devices detected")
    wifi_diversity:        float = Field(ge=0,  description="Shannon entropy of WiFi SSIDs seen")


class IsolationRiskRequest(BaseModel):
    """Request body — send last 7+ days of daily records."""
    user_id:       str
    daily_records: List[DailyRecord] = Field(
        min_length=7,
        description="At least 7 days of daily feature records (most recent last)"
    )


class PillarBreakdown(BaseModel):
    mobility:      int = Field(ge=0, le=25)
    communication: int = Field(ge=0, le=25)
    behaviour:     int = Field(ge=0, le=25)
    proximity:     int = Field(ge=0, le=25)


class IsolationRiskResponse(BaseModel):
    """API response returned to React Native frontend."""
    user_id:       str
    score:         int   = Field(ge=0, le=100, description="Risk score 0–100")
    label:         str   = Field(description="Low | Moderate | High")
    probabilities: dict  = Field(description="Softmax probabilities per class")
    breakdown:     PillarBreakdown
    used_pillars:  List[str]
    message:       Optional[str] = None