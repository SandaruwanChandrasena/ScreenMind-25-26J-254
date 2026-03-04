import os
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ─── Load YOUR Fine-tuned Model ───────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "ScreenMind_model")

print("⏳ Loading your fine-tuned ScreenMind model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()

id2label = {0: "Negative", 1: "Neutral", 2: "Positive"}

print("✅ ScreenMind model loaded successfully!")

# ─── Analyze Sentiment ────────────────────────────────────────────────────────
def analyze_sentiment(text: str) -> dict:
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        pred_id = int(np.argmax(probs))

    label = id2label[pred_id]

    return {
        "label": label,
        "negative": round(float(probs[0]) * 100, 2),
        "neutral":  round(float(probs[1]) * 100, 2),
        "positive": round(float(probs[2]) * 100, 2),
        "confidence": round(float(probs[pred_id]) * 100, 2)
    }