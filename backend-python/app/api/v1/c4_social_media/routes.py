from fastapi import APIRouter, HTTPException
from app.api.v1.c4_social_media.schemas import (
    NotificationAnalysisRequest,
    NotificationAnalysisResponse,
    JournalAnalysisRequest,
    JournalAnalysisResponse,
)
from app.api.v1.c4_social_media.service import analyze_notification
from app.api.v1.c4_social_media.nlp.roberta_model import analyze_sentiment

router = APIRouter()

# ─── Health Check ─────────────────────────────────────────────────────────────
@router.get("/health")
def health_check():
    return {
        "status": "success",
        "message": "Social Media Analysis API is online!"
    }

# ─── Main Notification Analysis Endpoint ──────────────────────────────────────
@router.post("/analyze", response_model=NotificationAnalysisResponse)
def analyze(request: NotificationAnalysisRequest):
    """
    Receives a sanitized notification from React Native,
    runs RoBERTa sentiment analysis + Emoji Dissonance Detection,
    saves result to Firebase, and returns the full analysis.
    """
    try:
        if not request.cleaned_text.strip():
            raise HTTPException(
                status_code=400,
                detail="cleaned_text cannot be empty"
            )

        result = analyze_notification(
            user_id=request.user_id,
            app_source=request.app_source,
            cleaned_text=request.cleaned_text,
            timestamp=request.timestamp
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── NEW: Journal Text Analysis Endpoint ──────────────────────────────────────
@router.post("/analyze-text", response_model=JournalAnalysisResponse)
def analyze_journal_text(request: JournalAnalysisRequest):
    """
    Receives raw journal text from React Native Daily Journal screen.
    Runs RoBERTa sentiment analysis only (no Firebase save — 
    saving is handled by the frontend after user taps Save).

    Returns:
      sentimentLabel : "Positive" | "Neutral" | "Negative"
      sentimentScore : negative score 0.0 → 1.0
      riskLevel      : "LOW" | "MODERATE" | "HIGH"
    """
    try:
        text = request.text.strip()

        if not text:
            raise HTTPException(
                status_code=400,
                detail="text cannot be empty"
            )

        if len(text) < 3:
            raise HTTPException(
                status_code=400,
                detail="text is too short to analyze"
            )

        # ── Run RoBERTa sentiment analysis ──────────────────────────
        sentiment = analyze_sentiment(text)

        # ── Convert negative score (0-100) → risk level (0-1) ───────
        neg_score = float(sentiment["negative"]) / 100

        if   neg_score >= 0.7: risk_level = "HIGH"
        elif neg_score >= 0.4: risk_level = "MODERATE"
        else:                  risk_level = "LOW"

        print(f"📓 Journal analyzed: {sentiment['label']} | "
              f"neg={neg_score:.2f} | risk={risk_level}")

        return {
            "status":         "success",
            "sentimentLabel": sentiment["label"],
            "sentimentScore": neg_score,
            "riskLevel":      risk_level,
            "negative":       sentiment["negative"],
            "neutral":        sentiment["neutral"],
            "positive":       sentiment["positive"],
            "confidence":     sentiment["confidence"],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Journal analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))