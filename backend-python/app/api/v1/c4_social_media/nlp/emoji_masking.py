import emoji
import re

# ─── Emoji Sentiment Dictionary ───────────────────────────────────────────────
# Emojis that suggest NEGATIVE emotion despite positive words
NEGATIVE_EMOJIS = {
    "😢", "😭", "😞", "😔", "😟", "😩", "😫", "🥺", "😰", "😥",
    "😓", "😪", "💔", "🖤", "😖", "😣", "😤", "😠", "😡", "🤬",
    "😨", "😱", "😶", "🙃", "😬", "🥴", "😵", "🤯", "😮‍💨", "😑"
}

# Emojis that suggest POSITIVE emotion
POSITIVE_EMOJIS = {
    "😊", "😄", "😁", "🥰", "😍", "🤩", "😎", "🥳", "😀", "😃",
    "😆", "😋", "😛", "🤗", "💪", "✨", "🌟", "💯", "❤️", "🧡",
    "💛", "💚", "💙", "💜", "🎉", "🎊", "👏", "🙌", "💐", "🌈"
}

# Words that suggest POSITIVE sentiment
POSITIVE_WORDS = [
    "fine", "good", "great", "okay", "ok", "happy", "love",
    "awesome", "wonderful", "amazing", "perfect", "well",
    "better", "best", "excited", "glad", "thank"
]

# Words that suggest NEGATIVE sentiment  
NEGATIVE_WORDS = [
    "sad", "bad", "terrible", "awful", "hate", "worst",
    "horrible", "depressed", "anxious", "stressed", "tired",
    "exhausted", "lonely", "miss", "hurt", "pain", "cry"
]

def extract_emojis(text: str) -> list:
    """Extract all emojis from text."""
    return [ch for ch in text if ch in emoji.EMOJI_DATA]

def detect_emoji_dissonance(text: str, sentiment_label: str) -> dict:
    """
    ─── CORE RESEARCH LOGIC ─────────────────────────────────────────────────
    Detects emotional masking by finding contradictions between:
    - The TEXT sentiment (from RoBERTa)
    - The EMOJI sentiment (from our dictionary)

    Example of masking:
        Text: "Everything is fine 🙃😭"
        RoBERTa says: Positive (because of "fine")
        But emojis say: Negative (🙃😭)
        Result: MASKING DETECTED ⚠️
    ─────────────────────────────────────────────────────────────────────────
    """
    found_emojis = extract_emojis(text)

    # Count emoji sentiments
    negative_emoji_count = sum(1 for e in found_emojis if e in NEGATIVE_EMOJIS)
    positive_emoji_count = sum(1 for e in found_emojis if e in POSITIVE_EMOJIS)

    # Determine emoji sentiment
    if negative_emoji_count > positive_emoji_count:
        emoji_sentiment = "Negative"
    elif positive_emoji_count > negative_emoji_count:
        emoji_sentiment = "Positive"
    else:
        emoji_sentiment = "Neutral"

    # ── Dissonance Detection Logic ────────────────────────────────────────
    # Case 1: RoBERTa says Positive BUT emojis are Negative → MASKING
    # Case 2: RoBERTa says Negative BUT emojis are Positive → MASKING
    dissonance_detected = (
        (sentiment_label == "Positive" and emoji_sentiment == "Negative") or
        (sentiment_label == "Negative" and emoji_sentiment == "Positive")
    )

    # ── Risk Level ────────────────────────────────────────────────────────
    if dissonance_detected:
        risk_level = "high"
        masking_note = (
            "⚠️ Emotional masking detected. "
            "Text appears positive but negative emojis suggest hidden distress."
            if sentiment_label == "Positive"
            else
            "⚠️ Emotional masking detected. "
            "Text appears negative but positive emojis suggest suppressed feelings."
        )
    else:
        risk_level = "low"
        masking_note = "No emotional dissonance detected."

    return {
        "dissonance_detected": dissonance_detected,
        "emoji_sentiment": emoji_sentiment,
        "text_sentiment": sentiment_label,
        "negative_emojis_found": negative_emoji_count,
        "positive_emojis_found": positive_emoji_count,
        "total_emojis_found": len(found_emojis),
        "risk_level": risk_level,
        "masking_note": masking_note
    }