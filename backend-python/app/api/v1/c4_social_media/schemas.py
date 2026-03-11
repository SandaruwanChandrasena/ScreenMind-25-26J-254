from pydantic import BaseModel
from typing import Optional

# ─── INPUT ────────────────────────────────────────────────────────────────────

class NotificationAnalysisRequest(BaseModel):
    """What React Native sends to the Python server."""
    user_id: str
    app_source: str        # e.g. "com.whatsapp"
    cleaned_text: str      # Already sanitized in headlessTask.js
    timestamp: Optional[str] = None

# ─── NEW: Journal Analysis Request ───────────────────────────────────────────
class JournalAnalysisRequest(BaseModel):
    """What React Native sends for journal text analysis."""
    text: str              # Raw journal text typed by user

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
    risk_level: str        # "low", "high", "critical"
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

# ─── NEW: Journal Analysis Response ──────────────────────────────────────────
class JournalAnalysisResponse(BaseModel):
    """Response sent back to React Native for journal analysis."""
    status: str
    sentimentLabel: str    # "Positive", "Neutral", "Negative"
    sentimentScore: float  # negative score 0-1 (e.g. 0.62)
    riskLevel: str         # "LOW", "MODERATE", "HIGH"
    negative: float        # raw % from RoBERTa (0-100)
    neutral: float
    positive: float
    confidence: float