import joblib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "ml_model"

MODEL_PATH = MODEL_DIR / "risk_model.pkl"
ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)


def generate_top_factors(features: dict) -> list:
    factor_labels = {
        "phq9_score": "Higher PHQ-9 depression score",
        "gad7_score": "Higher GAD-7 anxiety score",
        "screen_time_dev": "Elevated screen time deviation",
        "session_fragmentation": "High session fragmentation",
        "app_switching": "Increased app switching intensity",
        "repeated_checking": "Frequent repeated checking behavior",
        "usage_irregularity": "Irregular usage pattern",
    }

    sorted_features = sorted(
        features.items(),
        key=lambda x: float(x[1]),
        reverse=True,
    )

    top_factors = []

    for feature_name, value in sorted_features:
        if feature_name in ["phq9_score", "gad7_score"]:
            if value >= 10:
                top_factors.append(factor_labels[feature_name])
        else:
            if value >= 0.5:
                top_factors.append(factor_labels[feature_name])

        if len(top_factors) == 2:
            break

    if not top_factors:
        top_factors.append("Behavioral and questionnaire indicators are within lower ranges")

    return top_factors


def predict_risk(features: dict) -> dict:
    input_df = pd.DataFrame([{
        "phq9_score": features["phq9_score"],
        "gad7_score": features["gad7_score"],
        "screen_time_dev": features["screen_time_dev"],
        "session_fragmentation": features["session_fragmentation"],
        "app_switching": features["app_switching"],
        "repeated_checking": features["repeated_checking"],
        "usage_irregularity": features["usage_irregularity"],
    }])

    prediction = model.predict(input_df)[0]
    predicted_label = label_encoder.inverse_transform([prediction])[0]

    probabilities = model.predict_proba(input_df)[0]
    confidence = float(max(probabilities))

    top_factors = generate_top_factors(features)

    return {
        "predicted_risk": predicted_label,
        "confidence": round(confidence, 4),
        "top_factors": top_factors,
    }