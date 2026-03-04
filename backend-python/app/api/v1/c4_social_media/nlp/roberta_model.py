from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

# ─── Load RoBERTa Model ───────────────────────────────────────────────────────
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"

print("⏳ Loading RoBERTa sentiment model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()
print("✅ RoBERTa model loaded successfully!")

# Labels from the model
LABELS = ["Negative", "Neutral", "Positive"]

def analyze_sentiment(text: str) -> dict:
    """
    Takes a cleaned text string and returns sentiment scores.
    Returns: { label, negative, neutral, positive, confidence }
    """
    try:
        # Tokenize the input text
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128
        )

        # Run through model (no gradient needed)
        with torch.no_grad():
            outputs = model(**inputs)

        # Convert logits to percentages using Softmax
        scores = F.softmax(outputs.logits, dim=1)[0]

        negative = round(scores[0].item() * 100, 2)
        neutral  = round(scores[1].item() * 100, 2)
        positive = round(scores[2].item() * 100, 2)

        # The dominant label
        dominant_index = scores.argmax().item()
        dominant_label = LABELS[dominant_index]
        confidence = round(scores[dominant_index].item() * 100, 2)

        return {
            "label": dominant_label,
            "negative": negative,
            "neutral": neutral,
            "positive": positive,
            "confidence": confidence
        }

    except Exception as e:
        print(f"RoBERTa analysis error: {e}")
        return {
            "label": "Neutral",
            "negative": 0.0,
            "neutral": 100.0,
            "positive": 0.0,
            "confidence": 100.0
        }