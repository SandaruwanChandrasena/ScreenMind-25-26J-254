import emoji
import re

# ═══════════════════════════════════════════════════════════════════════════════
# EMOJI DISSONANCE & EMOTIONAL MASKING DETECTION
# ═══════════════════════════════════════════════════════════════════════════════
#
# RESEARCH BASIS:
# This module implements emoji-text dissonance detection based on established
# NLP research:
#
# [1] Novak et al. (2015) — Sentiment of Emojis (PLoS ONE)
#     First large-scale study mapping 751 emojis to sentiment scores.
#     Foundation for emoji sentiment dictionaries used here.
#
# [2] Felbo et al. (2017) — DeepMoji (MIT Media Lab, EMNLP 2017)
#     Trained on 1.2B tweets to predict emoji from text. Showed emojis
#     carry strong emotional signal, especially for sarcasm/irony detection.
#     Our sarcasm detection logic is inspired by this work.
#
# [3] Maity et al. (2022) — BullySentEmo Dataset (IEEE)
#     "Emoji, Sentiment and Emotion Aided Cyberbullying Detection"
#     Showed emoji + text multimodal analysis significantly improves
#     detection of harmful intent masked behind neutral/positive language.
#     Basis for our cyberbullying masking detection (Type 3).
#
# [4] Ouni et al. (2023) — "Just a Scratch" Self-harm Detection (arXiv)
#     Showed that 😂 and 🙃 are frequently used to MASK emotional pain,
#     and crisis emojis appear in distress contexts.
#     Basis for our crisis signal detection (Type 5).
#
# [5] Al-Baaj et al. (2023) — Emoji + Text Sentiment Polarity (MDPI)
#     Demonstrated that emoji presence can REVERSE the polarity of text
#     sentiment — a positive message becomes negative with negative emojis.
#     Confirms our polarity reversal detection (Type 1 & 2).
#
# [6] Florida Tech Study (2019) — Emoji Dissonance & Social Perception
#     Formal academic definition: "If emoji valence did not correspond
#     with message valence, the emoji was considered dissonant."
#     Direct basis for our dissonance_detected flag.
#
# ═══════════════════════════════════════════════════════════════════════════════

# ── Negative Emojis ───────────────────────────────────────────────────────────
# Emojis that clearly signal NEGATIVE emotion
# Source: Novak et al. (2015) + DeepMoji cluster analysis
NEGATIVE_EMOJIS = {
    # Sadness / crying
    "😢", "😭", "😞", "😔", "😟", "😩", "😫", "🥺", "😰", "😥",
    "😓", "😪", "💔", "🖤",
    # Pain / distress
    "😖", "😣", "🫠",
    # Anger / frustration
    "😤", "😠", "😡", "🤬", "😾",
    # Fear / anxiety
    "😨", "😱", "😶",
    # Exhaustion / overwhelm
    "🥴", "😵", "🤯", "😮‍💨", "😑", "😶‍🌫️",
    # Sarcasm / irony — Felbo et al. 2017
    "🙃", "😬", "😏", "🙄",
    # Dark humor / mocking — Ouni et al. 2023
    "💀", "☠️",
    # Mocking laughter (NOT genuine joy)
    "🤣",
}

# ── Positive Emojis ───────────────────────────────────────────────────────────
# Source: Novak et al. (2015) + emoji2vec embeddings
POSITIVE_EMOJIS = {
    # Happiness
    "😊", "😄", "😁", "🥰", "😍", "🤩", "😎", "🥳", "😀", "😃",
    "😆", "😋", "😛", "🤗", "😘", "😗", "😙",
    # Strength / affirmation
    "💪", "✨", "🌟", "💯", "👏", "🙌", "👍", "🙏", "🤝",
    # Love / hearts
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🩷", "🩵", "🤍", "❤️‍🔥",
    "💕", "💞", "💓", "💗", "💖", "💝",
    # Celebration
    "🎉", "🎊", "🎈", "🥂", "🎁",
    # Nature / beauty
    "💐", "🌈", "🌸", "🌺", "🌻", "🍀", "⭐", "🌙",
}

# ── Sarcasm / Mocking Emojis ──────────────────────────────────────────────────
# Ambiguous emojis — negative in specific contexts
# Source: Felbo et al. (2017) DeepMoji, Maity et al. (2022)
SARCASM_EMOJIS = {
    "🤣",  # Mocking laughter — top sarcasm marker (DeepMoji)
    "😂",  # Also used sarcastically with cruel comments
    "💀",  # "I'm dead" — mocking / cringe
    "☠️",  # Similar dark/mocking use
    "🙃",  # Upside-down — passive aggression / sarcasm
    "😏",  # Smirk — condescending
    "🙄",  # Eye roll — dismissal
    "🤡",  # Clown — calling someone a fool
    "🐑",  # Sheep — calling someone a mindless follower
}

# ── Crisis / Self-harm Signal Emojis ─────────────────────────────────────────
# Source: Ouni et al. (2023) "Just a Scratch" self-harm NLP study
CRISIS_EMOJIS = {
    "⚰️",  # coffin — thoughts of death
    "🔪",  # knife — self-harm signal
    "💊",  # pill — medication/overdose context
    "🩸",  # blood drop — self-harm
    "🥀",  # wilted flower — decay / hopelessness
    "🌑",  # new moon — darkness / isolation
    "😶",  # no mouth — speechless / suppressed
    "🫥",  # dotted face — feeling invisible
}

# ── Toxic Positivity Emojis ───────────────────────────────────────────────────
# Positive emojis used to DISMISS or INVALIDATE negative emotions
TOXIC_POSITIVE_EMOJIS = {
    "😊", "😄", "❤️", "🌈", "✨", "💪", "👍",
}

# ── High Positive Words (sarcasm context) ─────────────────────────────────────
HIGH_POSITIVE_WORDS = [
    "beautiful", "amazing", "perfect", "gorgeous", "stunning",
    "incredible", "wonderful", "fantastic", "brilliant", "excellent",
    "love you", "adore", "best", "greatest", "flawless", "angel",
    "sweetest", "kindest", "smartest", "talented",
]

# ── Toxic Positivity / Dismissive Phrases ────────────────────────────────────
DISMISSIVE_PHRASES = [
    "stop being sad", "just smile", "be happy", "get over it",
    "stop crying", "not a big deal", "you're overreacting",
    "calm down", "relax", "don't be so sensitive", "man up",
    "cheer up", "just be positive", "others have it worse",
]

# ── Crisis Text Indicators ────────────────────────────────────────────────────
CRISIS_WORDS = [
    "can't go on", "end it", "no point", "give up", "disappear",
    "no one cares", "better off without me", "tired of living",
    "want to die", "hurt myself", "done with everything",
]


# ─── Helper Functions ─────────────────────────────────────────────────────────

def extract_emojis(text: str) -> list:
    """Extract all emojis from text."""
    return [ch for ch in text if ch in emoji.EMOJI_DATA]


def detect_sarcasm_masking(text: str, found_emojis: list) -> bool:
    """
    TYPE 3 — Sarcastic Mocking (Cyberbullying Pattern)
    Highly positive words + mocking emoji = likely NOT genuine praise.
    e.g. "You are so beautiful 🤣💀" → sarcastic bullying
    Source: Felbo et al. (2017), Maity et al. (2022) BullySentEmo
    """
    has_sarcasm_emoji = any(e in SARCASM_EMOJIS for e in found_emojis)
    if not has_sarcasm_emoji:
        return False
    text_lower = text.lower()
    return any(word in text_lower for word in HIGH_POSITIVE_WORDS)


def detect_toxic_positivity(text: str, found_emojis: list, sentiment_label: str) -> bool:
    """
    TYPE 4 — Toxic Positivity / Emotional Invalidation
    Dismissive phrases + positive emojis = suppressing someone's pain.
    e.g. "Stop crying, just smile 😊❤️"
    Source: Ouni et al. (2023), Florida Tech Study (2019)
    """
    if sentiment_label != "Positive":
        return False
    has_toxic_emoji = any(e in TOXIC_POSITIVE_EMOJIS for e in found_emojis)
    if not has_toxic_emoji:
        return False
    text_lower = text.lower()
    return any(phrase in text_lower for phrase in DISMISSIVE_PHRASES)


def detect_crisis_signal(text: str, found_emojis: list) -> bool:
    """
    TYPE 5 — Crisis / Distress Signal
    Crisis emojis + distress words = possible self-harm indicator.
    e.g. "I want to disappear 🥀⚰️"
    Source: Ouni et al. (2023) "Just a Scratch" self-harm NLP study
    """
    has_crisis_emoji = any(e in CRISIS_EMOJIS for e in found_emojis)
    if not has_crisis_emoji:
        return False
    text_lower = text.lower()
    return any(phrase in text_lower for phrase in CRISIS_WORDS)


def detect_emoji_dissonance(text: str, sentiment_label: str) -> dict:
    """
    ═══════════════════════════════════════════════════════════════════════
    MAIN DISSONANCE DETECTION — 5 Research-Backed Types
    ═══════════════════════════════════════════════════════════════════════

    TYPE 1 — Hidden Distress (Emotional Masking)
      Text=Positive + Emojis=Negative
      e.g. "Everything is fine 😭💔"
      → Hiding real pain behind positive words
      Source: Novak et al. (2015), Al-Baaj et al. (2023)

    TYPE 2 — Suppressed Feelings (Polarity Reversal)
      Text=Negative + Emojis=Positive
      e.g. "I hate everything about you ❤️😍"
      → Confusing / toxic mixed signal
      Source: Florida Tech Study (2019), Al-Baaj et al. (2023)

    TYPE 3 — Sarcastic Mocking (Cyberbullying Pattern)
      Highly positive words + sarcasm/mocking emojis
      e.g. "You are so beautiful 🤣💀"
      → Not genuine — likely cyberbullying
      Source: Felbo et al. (2017) DeepMoji, Maity et al. (2022) BullySentEmo

    TYPE 4 — Toxic Positivity (Emotional Invalidation)
      Dismissive phrases + positive emojis
      e.g. "Stop crying, just smile 😊❤️"
      → Invalidating real emotional distress
      Source: Ouni et al. (2023), Florida Tech Study (2019)

    TYPE 5 — Crisis Signal (Distress Masking)
      Crisis emojis + distress language
      e.g. "I want to disappear 🥀⚰️"
      → Serious distress / possible self-harm indicator
      Source: Ouni et al. (2023) "Just a Scratch"
    ═══════════════════════════════════════════════════════════════════════
    """
    found_emojis = extract_emojis(text)

    negative_emoji_count = sum(1 for e in found_emojis if e in NEGATIVE_EMOJIS)
    positive_emoji_count = sum(1 for e in found_emojis if e in POSITIVE_EMOJIS)
    crisis_emoji_count   = sum(1 for e in found_emojis if e in CRISIS_EMOJIS)

    if negative_emoji_count > positive_emoji_count:
        emoji_sentiment = "Negative"
    elif positive_emoji_count > negative_emoji_count:
        emoji_sentiment = "Positive"
    else:
        emoji_sentiment = "Neutral"

    # ── Run all 5 type checks ─────────────────────────────────────────────
    type1 = sentiment_label == "Positive" and emoji_sentiment == "Negative"
    type2 = sentiment_label == "Negative" and emoji_sentiment == "Positive"
    type3 = detect_sarcasm_masking(text, found_emojis)
    type4 = detect_toxic_positivity(text, found_emojis, sentiment_label)
    type5 = detect_crisis_signal(text, found_emojis)

    dissonance_detected = any([type1, type2, type3, type4, type5])

    dissonance_types = []
    if type1: dissonance_types.append("TYPE_1_HIDDEN_DISTRESS")
    if type2: dissonance_types.append("TYPE_2_SUPPRESSED_FEELINGS")
    if type3: dissonance_types.append("TYPE_3_SARCASTIC_MOCKING")
    if type4: dissonance_types.append("TYPE_4_TOXIC_POSITIVITY")
    if type5: dissonance_types.append("TYPE_5_CRISIS_SIGNAL")

    if type5:
        risk_level   = "critical"
        masking_note = (
            "🚨 Crisis signal detected. Distress language combined with "
            "crisis-associated emojis may indicate serious emotional pain."
        )
    elif type3:
        masking_note = (
            "⚠️ Sarcastic/mocking tone detected. Positive words combined "
            "with mocking emojis (🤣💀🙄) suggest this is not genuine — "
            "possible cyberbullying pattern. [Felbo et al. 2017]"
        )
        risk_level = "high"
    elif type1:
        masking_note = (
            "⚠️ Type 1 Masking: Text appears positive but negative emojis "
            "suggest hidden distress or forced positivity. [Novak et al. 2015]"
        )
        risk_level = "high"
    elif type2:
        masking_note = (
            "⚠️ Type 2 Masking: Negative text with positive emojis suggests "
            "suppressed or conflicted emotions. [Florida Tech Study 2019]"
        )
        risk_level = "high"
    elif type4:
        masking_note = (
            "⚠️ Toxic positivity detected. Dismissive language with positive "
            "emojis may be invalidating real emotional distress. [Ouni et al. 2023]"
        )
        risk_level = "high"
    else:
        risk_level   = "low"
        masking_note = "No emotional dissonance detected."

    return {
        "dissonance_detected":   dissonance_detected,
        "dissonance_types":      dissonance_types,
        "emoji_sentiment":       emoji_sentiment,
        "text_sentiment":        sentiment_label,
        "negative_emojis_found": negative_emoji_count,
        "positive_emojis_found": positive_emoji_count,
        "crisis_emojis_found":   crisis_emoji_count,
        "total_emojis_found":    len(found_emojis),
        "risk_level":            risk_level,
        "masking_note":          masking_note,
    }