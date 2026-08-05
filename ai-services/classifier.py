"""
Scikit-Learn message classifier.

Loads a TF-IDF + Logistic Regression pipeline from disk at module import
time (singleton pattern) — not re-trained on every request.

Model file: ai-services/models/classifier.joblib
Train with: python scripts/train_classifier.py

classify(text) -> (label, confidence)
    label      ∈ {"clean", "spam", "toxic"}
    confidence ∈ [0.0, 1.0]

Borderline detection:
    If 0.4 <= confidence <= 0.6 the caller should route to the
    LangGraph Moderation_Agent for a deep moderation check.
"""

import os
import logging

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "classifier.joblib")
_clf = None  # module-level singleton


def _load_model():
    """Load the classifier from disk. Called once at import time."""
    global _clf
    if _clf is not None:
        return _clf

    if not os.path.exists(_MODEL_PATH):
        logger.warning(
            "classifier.joblib not found at %s. "
            "Run scripts/train_classifier.py to generate it. "
            "Falling back to heuristic classifier.",
            _MODEL_PATH
        )
        return None

    try:
        import joblib
        _clf = joblib.load(_MODEL_PATH)
        logger.info("Classifier loaded from %s", _MODEL_PATH)
    except Exception as e:
        logger.error("Failed to load classifier: %s", e)
        _clf = None

    return _clf


# Load at import time
_load_model()


def classify(text: str) -> tuple[str, float]:
    """
    Classify a message text as clean, spam, or toxic.

    Args:
        text: The message text to classify.

    Returns:
        (label, confidence) where label ∈ {"clean", "spam", "toxic"}
        and confidence ∈ [0.0, 1.0].

    Falls back to a simple keyword heuristic if the model file is missing.
    """
    if not text or not text.strip():
        return "clean", 1.0

    model = _load_model()

    if model is not None:
        try:
            proba      = model.predict_proba([text])[0]
            label_idx  = proba.argmax()
            label      = model.classes_[label_idx]
            confidence = float(proba[label_idx])
            return label, confidence
        except Exception as e:
            logger.error("Classifier inference failed: %s", e)

    # Fallback heuristic classifier (no model file available)
    return _heuristic_classify(text)


def _heuristic_classify(text: str) -> tuple[str, float]:
    """
    Simple keyword-based fallback when the trained model is unavailable.
    Returns high-confidence clean for most messages.
    """
    lower = text.lower()
    toxic_keywords = {"spam", "buy now", "click here", "free money", "hate", "kill"}
    for kw in toxic_keywords:
        if kw in lower:
            return "spam", 0.85
    return "clean", 0.95
