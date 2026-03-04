from pydantic import BaseModel
from typing import Optional

# ─── INPUT ────────────────────────────────────────────────────────────────────

class NotificationAnalysisRequest(BaseModel):
    """What React Native sends to the Python server."""
    user_id: str
    app_source: str        # e.g. "com.whatsapp"
    cleaned_text: str      # Already sanitized in headlessTask.js
    timestamp: Optional[str] = None

# ─── OUTPUT ───────────────────────────────────────────────────────────────────

class SentimentResult(BaseModel):
    """RoBERTa sentiment scores."""
    label: str             # "Positive", "Neutral", "Negative"
    negative: float
    neutral: float
    positive: float
    confidence: float

class DissonanceResult(BaseModel):
    """Emoji Dissonance Detection result."""
    dissonance_detected: bool
    emoji_sentiment: str
    text_sentiment: str
    negative_emojis_found: int
    positive_emojis_found: int
    total_emojis_found: int
    risk_level: str        # "low", "high"
    masking_note: str

class NotificationAnalysisResponse(BaseModel):
    """Full response sent back to React Native."""
    status: str
    user_id: str
    app_source: str
    cleaned_text: str
    sentiment: SentimentResult
    dissonance: DissonanceResult
    firebase_saved: bool