"""
TensorFlow/Keras sentiment classifier.

Loads a saved Keras model from disk at module import time (singleton).
Model architecture: TextVectorization → Embedding → BiLSTM → Dense(3, softmax)

Model directory: ai-services/models/sentiment_model/
Train with:      python scripts/train_sentiment.py

predict(text) -> (label, score)
    label ∈ {"positive", "neutral", "negative"}
    score ∈ [0.0, 1.0]  — confidence of the predicted label
"""

import os
import logging

logger = logging.getLogger(__name__)

_MODEL_DIR  = os.path.join(os.path.dirname(__file__), "models", "sentiment_model")
_model      = None
_LABELS     = ["negative", "neutral", "positive"]


def _load_model():
    global _model
    if _model is not None:
        return _model

    if not os.path.isdir(_MODEL_DIR):
        logger.warning(
            "Sentiment model not found at %s. "
            "Run scripts/train_sentiment.py to generate it. "
            "Falling back to lexicon-based sentiment.",
            _MODEL_DIR
        )
        return None

    try:
        import tensorflow as tf
        _model = tf.keras.models.load_model(_MODEL_DIR)
        logger.info("Sentiment model loaded from %s", _MODEL_DIR)
    except Exception as e:
        logger.error("Failed to load sentiment model: %s", e)
        _model = None

    return _model


_load_model()


def predict(text: str) -> tuple[str, float]:
    """
    Predict the sentiment of a message.

    Args:
        text: Message text to analyse.

    Returns:
        (label, score) where label ∈ {"positive", "neutral", "negative"}
        and score ∈ [0.0, 1.0].
    """
    if not text or not text.strip():
        return "neutral", 1.0

    model = _load_model()

    if model is not None:
        try:
            import numpy as np
            proba      = model.predict([text], verbose=0)[0]
            label_idx  = int(np.argmax(proba))
            label      = _LABELS[label_idx]
            score      = float(proba[label_idx])
            return label, score
        except Exception as e:
            logger.error("Sentiment inference failed: %s", e)

    return _lexicon_sentiment(text)


def _lexicon_sentiment(text: str) -> tuple[str, float]:
    """Simple lexicon-based fallback when the trained model is unavailable."""
    positive_words = {"great", "awesome", "good", "love", "excellent",
                      "happy", "thanks", "wonderful", "perfect", "nice"}
    negative_words = {"bad", "hate", "terrible", "awful", "horrible",
                      "worst", "disgusting", "ugly", "fail", "broken"}
    lower = text.lower()
    pos   = sum(1 for w in positive_words if w in lower)
    neg   = sum(1 for w in negative_words if w in lower)

    if pos > neg:
        return "positive", 0.75
    if neg > pos:
        return "negative", 0.75
    return "neutral", 0.60
