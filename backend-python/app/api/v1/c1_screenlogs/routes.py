from fastapi import APIRouter
from .schemas import RiskPredictionRequest, RiskPredictionResponse
from .service import get_risk_prediction

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "success", "message": "Screen Logs API is online!"}

@router.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_risk_route(payload: RiskPredictionRequest):
    result = get_risk_prediction(payload.model_dump())
    return result