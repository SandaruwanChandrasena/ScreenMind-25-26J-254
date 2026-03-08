"""
service.py — Component 2: Social Isolation Detection
BACKEND-PYTHON/APP/api/v1/c2_isolation/service.py

Loads the trained multimodal LSTM model and serves predictions.
"""

import os
import json
import numpy as np
import joblib
import tensorflow as tf
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
MODEL_DIR    = Path(__file__).parent / "model"
MODEL_PATH   = MODEL_DIR / "isolation_model.h5"
SCALER_PATH  = MODEL_DIR / "scaler.pkl"
CONFIG_PATH  = MODEL_DIR / "feature_config.json"


# ── Load once at startup ───────────────────────────────────────────────────
_model  = None
_scaler = None
_config = None

def _load_artifacts():
    global _model, _scaler, _config
    if _model is None:
        print("[C2] Loading isolation model...")
        _model  = tf.keras.models.load_model(str(MODEL_PATH))
        _scaler = joblib.load(str(SCALER_PATH))
        with open(CONFIG_PATH) as f:
            _config = json.load(f)
        print(f"[C2] Model loaded. Window size: {_config['window_size']}")
    return _model, _scaler, _config


# ── Main prediction function ───────────────────────────────────────────────

def predict_isolation_risk(daily_records: list[dict]) -> dict:
    """
    Predict isolation risk from a list of daily feature records.

    Parameters
    ----------
    daily_records : list of dicts, length >= 7
        Each dict must contain all 18 features.
        The LAST 7 records are used as the prediction window.
        Keys must match ALL_FEATURES in feature_config.json.

    Returns
    -------
    dict with:
        score       : int   0-100
        label       : str   "Low" | "Moderate" | "High"
        probabilities: dict  {"Low": 0.x, "Moderate": 0.x, "High": 0.x}
        breakdown   : dict  per-pillar confidence scores
        used_pillars: list  which pillars were used
    """
    model, scaler, config = _load_artifacts()

    WINDOW    = config["window_size"]          # 7
    ALL_FEAT  = config["all_features"]         # 18 features
    MOB_FEAT  = config["mobility_features"]
    COMM_FEAT = config["communication_features"]
    BEH_FEAT  = config["behaviour_features"]
    PROX_FEAT = config["proximity_features"]
    CLASSES   = config["class_names"]          # ["Low","Moderate","High"]

    if len(daily_records) < WINDOW:
        raise ValueError(
            f"Need at least {WINDOW} days of data, got {len(daily_records)}"
        )

    # Take last WINDOW records
    window_records = daily_records[-WINDOW:]

    # ── Build feature matrix (WINDOW × 18) ──────────────────────────────
    try:
        raw = np.array([[rec[f] for f in ALL_FEAT] for rec in window_records],
                       dtype=np.float32)
    except KeyError as e:
        raise ValueError(f"Missing feature in daily record: {e}")

    # Scale
    raw_scaled = scaler.transform(raw)           # (7, 18)
    seq = raw_scaled[np.newaxis, :, :]           # (1, 7, 18)

    # ── Split into 4 pillar inputs ───────────────────────────────────────
    def pillar_slice(feature_list):
        indices = [ALL_FEAT.index(f) for f in feature_list]
        return seq[:, :, indices]

    mob_input  = pillar_slice(MOB_FEAT)
    comm_input = pillar_slice(COMM_FEAT)
    beh_input  = pillar_slice(BEH_FEAT)
    prox_input = pillar_slice(PROX_FEAT)

    # ── Predict ──────────────────────────────────────────────────────────
    proba = model.predict(
        [mob_input, comm_input, beh_input, prox_input],
        verbose=0
    )[0]  # shape (3,)

    predicted_class = int(np.argmax(proba))
    label           = CLASSES[predicted_class]

    # Map probability to 0-100 score (weighted by class severity)
    # Low=0, Moderate=50, High=100 centre points
    score = int(round(proba[0] * 16 + proba[1] * 50 + proba[2] * 84))
    score = max(0, min(100, score))

    # ── Per-pillar breakdown (simple: run rule-based sub-score) ──────────
    last = window_records[-1]   # use most recent day for breakdown
    breakdown = _pillar_breakdown(last, MOB_FEAT, COMM_FEAT, BEH_FEAT, PROX_FEAT)

    return {
        "score":         score,
        "label":         label,
        "probabilities": {
            "Low":      round(float(proba[0]), 4),
            "Moderate": round(float(proba[1]), 4),
            "High":     round(float(proba[2]), 4),
        },
        "breakdown":     breakdown,
        "used_pillars":  ["mobility", "communication", "behaviour", "proximity"],
    }


def _pillar_breakdown(rec: dict, mob, comm, beh, prox) -> dict:
    """Quick per-pillar rule score (0-25 each) for the dashboard breakdown."""

    def clamp(x, lo, hi): return max(lo, min(hi, x))
    def risk_low(v, good, bad): return clamp((good - v) / (good - bad + 1e-9), 0, 1)
    def risk_high(v, good, bad): return clamp((v - good) / (bad - good + 1e-9), 0, 1)

    mob_score = (
        risk_low(rec.get("daily_distance_m", 0),   3000, 300)  +
        risk_high(rec.get("time_at_home_pct", 0),  0.55, 0.85) +
        risk_low(rec.get("location_entropy", 0),   1.2,  0.3)  +
        risk_low(rec.get("transitions", 0),        6,    1)
    ) / 4 * 25

    comm_score = (
        risk_low(rec.get("calls_per_day", 0),    4,   0.5) +
        risk_low(rec.get("unique_contacts", 0),  6,   1)   +
        risk_high(rec.get("silence_hours", 0),   8,   20)  +
        risk_low(rec.get("sms_per_day", 0),      10,  1)
    ) / 4 * 25

    beh_score = (
        risk_high(rec.get("night_usage_min", 0),    20,  120) +
        risk_high(rec.get("unlocks_per_day", 0),    45,  110) +
        risk_high(rec.get("rhythm_irregularity", 0), 0.2, 0.8)
    ) / 3 * 25

    prox_score = (
        risk_low(rec.get("bluetooth_avg_devices", 0), 8,   1)  +
        risk_low(rec.get("wifi_diversity", 0),        1.2, 0.2)
    ) / 2 * 25

    return {
        "mobility":      round(mob_score),
        "communication": round(comm_score),
        "behaviour":     round(beh_score),
        "proximity":     round(prox_score),
    }