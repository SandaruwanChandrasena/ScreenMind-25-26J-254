"""
routes.py — Component 2: Social Isolation Detection
BACKEND-PYTHON/APP/api/v1/c2_isolation/routes.py
"""

from fastapi import APIRouter, HTTPException
from .schemas import IsolationRiskRequest, IsolationRiskResponse
from .service import predict_isolation_risk

router = APIRouter(prefix="/c2", tags=["C2 - Social Isolation"])


@router.post("/isolation-risk", response_model=IsolationRiskResponse)
async def get_isolation_risk(request: IsolationRiskRequest):
    """
    Predict social isolation risk for a user.

    Send the last 7+ days of daily feature records.
    Returns a risk score (0-100), label, and per-pillar breakdown.
    """
    try:
        records = [rec.model_dump() for rec in request.daily_records]
        result  = predict_isolation_risk(records)

        return IsolationRiskResponse(
            user_id      = request.user_id,
            score        = result["score"],
            label        = result["label"],
            probabilities= result["probabilities"],
            breakdown    = result["breakdown"],
            used_pillars = result["used_pillars"],
            message      = _label_message(result["label"]),
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/isolation-risk/{user_id}/health")
async def health_check(user_id: str):
    """Quick health check — verifies model is loaded."""
    try:
        from .service import _load_artifacts
        _, _, config = _load_artifacts()
        return {
            "status":     "ok",
            "user_id":    user_id,
            "model_type": config.get("model_type"),
            "window":     config.get("window_size"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _label_message(label: str) -> str:
    return {
        "Low":      "Your social connection patterns look healthy. Keep it up!",
        "Moderate": "Some isolation signals detected. Consider reaching out to friends.",
        "High":     "High isolation risk. We recommend connecting with someone today.",
    }.get(label, "")