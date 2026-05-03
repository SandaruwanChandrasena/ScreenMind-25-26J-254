import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = Path(__file__).resolve().parent

# Updated hybrid dataset
DATASET_PATH = BASE_DIR / "screen_usage_hybrid_dataset_150.csv"

MODEL_DIR = BASE_DIR / "ml_model"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODEL_DIR / "risk_model.pkl"
ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"


def main():
    data = pd.read_csv(DATASET_PATH)

    feature_columns = [
        "phq9_score",
        "gad7_score",
        "screen_time_dev",
        "session_fragmentation",
        "app_switching",
        "repeated_checking",
        "usage_irregularity",
    ]

    X = data[feature_columns]
    y = data["risk_label"]

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded,
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

    joblib.dump(model, MODEL_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    print(f"\nModel saved to: {MODEL_PATH}")
    print(f"Encoder saved to: {ENCODER_PATH}")


if __name__ == "__main__":
    main()