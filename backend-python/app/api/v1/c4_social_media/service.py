from datetime import datetime, timezone
from app.api.v1.c4_social_media.nlp.roberta_model import analyze_sentiment
from app.api.v1.c4_social_media.nlp.emoji_masking import detect_emoji_dissonance
from app.core.config import get_firestore_client

def analyze_notification(user_id: str, app_source: str, cleaned_text: str, timestamp: str = None) -> dict:
    """
    ─── MAIN SERVICE FUNCTION ────────────────────────────────────────────────
    1. Run RoBERTa sentiment analysis on cleaned text
    2. Run Emoji Dissonance Detection
    3. Save results to Firebase Firestore
    4. Return full result to routes.py
    ─────────────────────────────────────────────────────────────────────────
    """

    # ── Step 1: RoBERTa Sentiment Analysis ───────────────────────────────
    sentiment = analyze_sentiment(cleaned_text)

    # ── Step 2: Emoji Dissonance Detection ───────────────────────────────
    dissonance = detect_emoji_dissonance(cleaned_text, sentiment["label"])

    # ── Step 3: Save to Firebase Firestore ───────────────────────────────
    firebase_saved = False
    try:
        db = get_firestore_client()

        # Build the document to save
        doc_data = {
            "user_id": user_id,
            "app_source": app_source,
            "cleaned_text": cleaned_text,
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
            "sentiment": {
                "label":      sentiment["label"],
                "negative":   sentiment["negative"],
                "neutral":    sentiment["neutral"],
                "positive":   sentiment["positive"],
                "confidence": sentiment["confidence"],
            },
            "dissonance": {
                # ── Core detection fields ──────────────────────────────
                "dissonance_detected":  dissonance["dissonance_detected"],
                "emoji_sentiment":      dissonance["emoji_sentiment"],
                "text_sentiment":       dissonance["text_sentiment"],
                "negative_emojis_found": dissonance["negative_emojis_found"],
                "positive_emojis_found": dissonance["positive_emojis_found"],
                "total_emojis_found":   dissonance["total_emojis_found"],
                "risk_level":           dissonance["risk_level"],
                "masking_note":         dissonance["masking_note"],

                # ── Research-backed type classification ────────────────
                # Added: Felbo et al. (2017), Maity et al. (2022)
                # e.g. ["TYPE_3_SARCASTIC_MOCKING", "TYPE_5_CRISIS_SIGNAL"]
                "dissonance_types":     dissonance.get("dissonance_types", []),

                # ── Crisis signal count ────────────────────────────────
                # Added: Ouni et al. (2023) — crisis emoji detection
                # Used by headlessTask to force score = 1.0 for TYPE 5
                "crisis_emojis_found":  dissonance.get("crisis_emojis_found", 0),
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Save under: users → user_id → social_media_analysis → auto ID
        db.collection("users") \
          .document(user_id) \
          .collection("social_media_analysis") \
          .add(doc_data)

        firebase_saved = True
        print(f"✅ Firebase saved for user: {user_id}")
        print(f"   Sentiment : {sentiment['label']} ({sentiment['negative']:.1f}% neg)")
        print(f"   Dissonance: {dissonance['dissonance_detected']} | "
              f"Types: {dissonance.get('dissonance_types', [])} | "
              f"Risk: {dissonance['risk_level']}")

    except Exception as e:
        print(f"❌ Firebase save error: {e}")
        firebase_saved = False

    # ── Step 4: Return Full Result ────────────────────────────────────────
    return {
        "status":        "success",
        "user_id":       user_id,
        "app_source":    app_source,
        "cleaned_text":  cleaned_text,
        "sentiment":     sentiment,
        "dissonance":    dissonance,
        "firebase_saved": firebase_saved,
    }