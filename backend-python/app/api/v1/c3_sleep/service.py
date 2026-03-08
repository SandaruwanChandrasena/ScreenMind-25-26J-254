# backend-python/app/api/v1/c3_sleep/service.py

import numpy as np
import json
import os
import pickle
import librosa
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler

# Paths to model files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODAL_DIR = os.path.join(BASE_DIR, 'modal')

# ──────────────────────────────────────────
# MODEL LOADING
# ──────────────────────────────────────────

_snoring_model = None
_risk_model = None
_rf_model = None
_snoring_config = None
_risk_config = None

def load_snoring_model():
    global _snoring_model, _snoring_config
    if _snoring_model is None:
        model_path = os.path.join(MODAL_DIR, 'snoring_model.h5')
        config_path = os.path.join(MODAL_DIR, 'snoring_model_config.json')
        
        _snoring_model = tf.keras.models.load_model(model_path)
        with open(config_path, 'r') as f:
            _snoring_config = json.load(f)
        print("✅ Snoring model loaded")
    return _snoring_model, _snoring_config

def load_risk_model():
    global _risk_model, _rf_model, _risk_config
    if _risk_model is None:
        model_path = os.path.join(MODAL_DIR, 'sleep_risk_model.h5')
        config_path = os.path.join(MODAL_DIR, 'sleep_risk_config.json')
        rf_path = os.path.join(MODAL_DIR, 'random_forest_model.pkl')
        
        _risk_model = tf.keras.models.load_model(model_path)
        with open(config_path, 'r') as f:
            _risk_config = json.load(f)
        with open(rf_path, 'rb') as f:
            _rf_model = pickle.load(f)
        print("✅ Sleep risk model loaded")
    return _risk_model, _rf_model, _risk_config


# ──────────────────────────────────────────
# SNORING PREDICTION
# ──────────────────────────────────────────

# def extract_mfcc_from_bytes(audio_bytes, 
#                              sample_rate=22050, 
#                              duration=2.0,
#                              n_mfcc=40, 
#                              max_pad_len=174):
#     """Extract MFCC features from audio bytes."""
#     import io
#     import soundfile as sf
    
#     # Load audio from bytes
#     audio, sr = sf.read(io.BytesIO(audio_bytes))
    
#     # Resample if needed
#     if sr != sample_rate:
#         audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
    
#     # Truncate or pad to duration
#     target_length = int(sample_rate * duration)
#     if len(audio) > target_length:
#         audio = audio[:target_length]
#     else:
#         audio = np.pad(audio, (0, target_length - len(audio)))
    
#     # Extract MFCC
#     mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=n_mfcc)
    
#     # Pad/truncate time dimension
#     if mfccs.shape[1] < max_pad_len:
#         pad_width = max_pad_len - mfccs.shape[1]
#         mfccs = np.pad(mfccs, ((0, 0), (0, pad_width)), mode='constant')
#     else:
#         mfccs = mfccs[:, :max_pad_len]
    
#     return mfccs

def extract_mfcc_from_bytes(audio_bytes, 
                             sample_rate=22050, 
                             duration=2.0,
                             n_mfcc=40, 
                             max_pad_len=174):
    """Extract MFCC features EXACTLY how it was trained in Colab."""
    import io
    import librosa
    import numpy as np
    
    # 1. Trick librosa into thinking the bytes are a real file
    audio_file = io.BytesIO(audio_bytes)
    
    # 2. LOAD EXACTLY LIKE TRAINING
    # This automatically handles Mono conversion and standard normalization!
    audio, _ = librosa.load(
        audio_file, 
        sr=sample_rate, 
        duration=duration,
        mono=True  # Force 1 channel exactly like Colab
    )
    
    # 3. Extract MFCC coefficients
    mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=n_mfcc)
    
    # 4. Pad or truncate the 2D array to the exact shape the CNN expects (40, 174)
    if mfccs.shape[1] < max_pad_len:
        pad_width = max_pad_len - mfccs.shape[1]
        mfccs = np.pad(mfccs, ((0, 0), (0, pad_width)), mode='constant')
    else:
        mfccs = mfccs[:, :max_pad_len]
    
    return mfccs

def predict_snoring(audio_bytes: bytes) -> dict:
    """
    Predict if audio contains snoring.
    Returns prediction result.
    """
    try:
        model, config = load_snoring_model()
        
        # Extract features
        mfcc = extract_mfcc_from_bytes(
            audio_bytes,
            sample_rate=config['sample_rate'],
            duration=config['duration'],
            n_mfcc=config['mfcc_features'],
            max_pad_len=config['max_pad_len']
        )
        
        # Reshape for model input
        X = mfcc.reshape(1, mfcc.shape[0], mfcc.shape[1], 1)
        
        # Predict
        prediction = model.predict(X, verbose=0)[0][0]
        threshold = config.get('threshold', 0.75)
        
        is_snoring = bool(prediction > threshold)
        
        return {
            "is_snoring": is_snoring,
            "confidence": float(prediction),
            "label": "snoring" if is_snoring else "not_snoring",
            "threshold": threshold
        }
        
    except Exception as e:
        print(f"Snoring prediction error: {e}")
        raise


# ──────────────────────────────────────────
# RISK PREDICTION
# ──────────────────────────────────────────

def predict_sleep_risk(behavioral_data: dict) -> dict:
    """
    Predict sleep disruption risk from 7 days of behavior.
    
    behavioral_data format:
    {
        "sessions": [
            {
                "screen_time_night_mins": 120,
                "unlocks_night": 8,
                "notifications_night": 15,
                "social_media_mins": 60,
                "last_screen_off_hour": 23.5,
                "snoring_mins": 20,
                "restlessness_percent": 45,
                "day_of_week": 1
            },
            ... (7 days total)
        ]
    }
    """
    try:
        model, rf_model, config = load_risk_model()
        
        sessions = behavioral_data.get('sessions', [])
        features = config['features']
        
        # Validate we have enough data
        if len(sessions) < 7:
            # Pad with zeros if less than 7 days
            while len(sessions) < 7:
                sessions.insert(0, {f: 0 for f in features})
        
        # Use last 7 sessions
        sessions = sessions[-7:]
        
        # Build feature matrix
        feature_matrix = []
        for session in sessions:
            row = [float(session.get(f, 0)) for f in features]
            feature_matrix.append(row)
        
        X = np.array(feature_matrix)
        
        # Normalize
        scaler = MinMaxScaler()
        X_normalized = scaler.fit_transform(X)
        
        # Reshape for BiLSTM: (1, 7, 8)
        X_input = X_normalized.reshape(1, 7, len(features))
        
        # BiLSTM prediction
        predictions = model.predict(X_input, verbose=0)[0]
        predicted_class = int(np.argmax(predictions))
        confidence = float(np.max(predictions))
        
        # Random Forest backup prediction
        X_flat = X_normalized.reshape(1, -1)
        rf_pred = int(rf_model.predict(X_flat)[0])
        rf_proba = rf_model.predict_proba(X_flat)[0]
        
        # Ensemble: 70% BiLSTM + 30% RF
        ensemble_proba = 0.7 * predictions + 0.3 * rf_proba
        ensemble_class = int(np.argmax(ensemble_proba))
        
        labels = config['labels']
        risk_score = calculate_risk_score(ensemble_proba)
        
        return {
            "risk_class": ensemble_class,
            "risk_label": labels[str(ensemble_class)],
            "risk_score": risk_score,
            "probabilities": {
                "LOW": float(ensemble_proba[0]),
                "MODERATE": float(ensemble_proba[1]),
                "HIGH": float(ensemble_proba[2])
            },
            "bilstm_prediction": labels[str(predicted_class)],
            "rf_prediction": labels[str(rf_pred)],
            "contributing_factors": get_contributing_factors(
                sessions[-1], ensemble_class
            )
        }
        
    except Exception as e:
        print(f"Risk prediction error: {e}")
        raise

def calculate_risk_score(probabilities):
    """Convert probabilities to 0-100 score."""
    # Weighted sum: LOW=0, MODERATE=50, HIGH=100
    score = (probabilities[0] * 0 + 
             probabilities[1] * 50 + 
             probabilities[2] * 100)
    return round(float(score), 1)

def get_contributing_factors(latest_session, risk_class):
    """Generate human-readable contributing factors."""
    factors = []
    
    screen_time = latest_session.get('screen_time_night_mins', 0)
    unlocks = latest_session.get('unlocks_night', 0)
    social_media = latest_session.get('social_media_mins', 0)
    snoring = latest_session.get('snoring_mins', 0)
    last_off = latest_session.get('last_screen_off_hour', 0)
    
    if screen_time > 90:
        factors.append(
            f"High screen time before sleep ({int(screen_time)} mins)")
    if unlocks > 6:
        factors.append(
            f"Frequent phone unlocks at night ({int(unlocks)} times)")
    if social_media > 45:
        factors.append(
            f"Heavy social media use ({int(social_media)} mins)")
    if snoring > 20:
        factors.append(
            f"Significant snoring detected ({int(snoring)} mins)")
    if last_off > 24 or (last_off < 6 and last_off > 0):
        factors.append("Phone used after midnight")
    
    if not factors:
        factors.append("Sleep patterns within normal range")
    
    return factors[:3]