from fastapi import APIRouter, HTTPException
from app.api.v1.c4_social_media.schemas import (
    NotificationAnalysisRequest,
    NotificationAnalysisResponse
)
from app.api.v1.c4_social_media.service import analyze_notification

router = APIRouter()

# ─── Health Check ─────────────────────────────────────────────────────────────
@router.get("/health")
def health_check():
    return {
        "status": "success",
        "message": "Social Media Analysis API is online!"
    }

# ─── Main Analysis Endpoint ───────────────────────────────────────────────────
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