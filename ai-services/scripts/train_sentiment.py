"""
Train the TensorFlow/Keras sentiment classifier.

Architecture:
    TextVectorization (vocab=20000, seq_len=100)
    → Embedding (dim=64)
    → Bidirectional LSTM (64 units)
    → Dense(3, softmax)

Dataset: Uses the Stanford SST-2 subset via the datasets library,
         mapped to 3-class labels (negative, neutral, positive).

Output: ai-services/models/sentiment_model/

Run with:
    cd ai-services
    python scripts/train_sentiment.py
"""

import os
import logging
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "sentiment_model")


def build_synthetic_dataset():
    """
    Build a small synthetic 3-class sentiment dataset for demonstration.
    In production, replace with a real labelled corpus (e.g. Twitter sentiment).
    """
    positives = [
        "This is great!", "I love this app", "Excellent work everyone",
        "Happy to be here", "Thanks, this is wonderful", "Perfect result",
        "Amazing feature, well done", "Best chat app I've used",
        "Super helpful, thank you", "Really enjoying this",
    ] * 30

    negatives = [
        "This is terrible", "I hate this bug", "Awful experience",
        "Broken feature again", "The worst app ever", "Completely useless",
        "I'm so frustrated with this", "Nothing works correctly",
        "Disgusting behaviour from the system", "Fails every time",
    ] * 30

    neutrals = [
        "The meeting is at 3pm", "Please review the document",
        "Can we schedule a call?", "I'll send the file tomorrow",
        "The server is running", "Deploy to staging first",
        "Let me check the logs", "Database migration complete",
        "See you tomorrow", "Pushing the changes now",
    ] * 30

    texts  = positives + negatives + neutrals
    labels = [2] * len(positives) + [0] * len(negatives) + [1] * len(neutrals)

    indices = np.random.permutation(len(texts))
    texts   = [texts[i] for i in indices]
    labels  = [labels[i] for i in indices]

    return texts, labels


def train():
    import tensorflow as tf

    os.makedirs(MODEL_DIR, exist_ok=True)

    texts, labels = build_synthetic_dataset()
    labels_arr    = np.array(labels)
    split         = int(len(texts) * 0.8)
    train_texts, val_texts   = texts[:split], texts[split:]
    train_labels, val_labels = labels_arr[:split], labels_arr[split:]

    # TextVectorization layer
    vectorize_layer = tf.keras.layers.TextVectorization(
        max_tokens=20000,
        output_mode="int",
        output_sequence_length=100,
    )
    vectorize_layer.adapt(train_texts)

    # Model
    model = tf.keras.Sequential([
        vectorize_layer,
        tf.keras.layers.Embedding(input_dim=20001, output_dim=64, mask_zero=True),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64)),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(3, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    logger.info("Training sentiment model...")
    model.fit(
        train_texts, train_labels,
        validation_data=(val_texts, val_labels),
        epochs=5,
        batch_size=32,
    )

    model.save(MODEL_DIR)
    logger.info("Sentiment model saved to %s", MODEL_DIR)
    return model


if __name__ == "__main__":
    train()
