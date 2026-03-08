# backend-python/app/api/v1/c3_sleep/routes.py

from fastapi import APIRouter, HTTPException, UploadFile, File
from .schemas import SleepRiskRequest, SleepRiskResponse, SnoringResponse
from . import service

router = APIRouter(tags=["Sleep Module"])

@router.get("/health")
async def health_check():
    """Check if sleep module is running."""
    return {"status": "ok", "module": "c3_sleep"}

@router.post("/predict-risk", response_model=SleepRiskResponse)
async def predict_sleep_risk(request: SleepRiskRequest):
    """
    Predict sleep disruption risk from 7 days of behavior.
    Requires at least 1 day of data (pads with zeros if less than 7).
    """
    try:
        result = service.predict_sleep_risk(
            {"sessions": [s.dict() for s in request.sessions]}
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Risk prediction failed: {str(e)}"
        )

@router.post("/predict-snoring", response_model=SnoringResponse)
async def predict_snoring(audio: UploadFile = File(...)):
    """
    Classify 2-second audio clip as snoring or not.
    Accepts WAV audio file upload.
    """
    try:
        if not audio.filename.endswith(('.wav', '.mp3', '.ogg')):
            raise HTTPException(
                status_code=400,
                detail="Audio file must be WAV, MP3, or OGG"
            )
        
        audio_bytes = await audio.read()
        result = service.predict_snoring(audio_bytes)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Snoring prediction failed: {str(e)}"
        )

@router.post("/predict-risk-simple")
async def predict_sleep_risk_simple(data: dict):
    """
    Simple endpoint for quick testing.
    Accepts raw dict with session data.
    """
    try:
        result = service.predict_sleep_risk(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))