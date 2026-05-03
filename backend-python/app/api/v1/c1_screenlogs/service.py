from .model_utils import predict_risk


def get_risk_prediction(feature_data: dict) -> dict:
    return predict_risk(feature_data)