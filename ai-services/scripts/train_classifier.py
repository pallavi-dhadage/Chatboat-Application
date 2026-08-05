"""
Train the TF-IDF + Logistic Regression message classifier.

Dataset: Uses a combined spam/toxicity dataset. Downloads the SMS Spam Collection
dataset from UCI if not present, and supplements with simple toxicity samples.

Output: ai-services/models/classifier.joblib

Run with:
    cd ai-services
    python scripts/train_classifier.py
"""

import os
import urllib.request
import zipfile
import logging

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR  = os.path.join(os.path.dirname(__file__), "..", "models")
OUTPUT_PATH = os.path.join(MODELS_DIR, "classifier.joblib")
DATA_DIR    = os.path.join(os.path.dirname(__file__), "..", "data")


def download_sms_spam():
    """Download the SMS Spam Collection dataset."""
    os.makedirs(DATA_DIR, exist_ok=True)
    zip_path = os.path.join(DATA_DIR, "smsspam.zip")
    if not os.path.exists(zip_path):
        logger.info("Downloading SMS Spam Collection dataset...")
        url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00228/smsspamcollection.zip"
        urllib.request.urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(DATA_DIR)
    tsv_path = os.path.join(DATA_DIR, "SMSSpamCollection")
    df = pd.read_csv(tsv_path, sep="\t", header=None, names=["label", "text"])
    df["label"] = df["label"].map({"ham": "clean", "spam": "spam"})
    return df


def build_dataset() -> pd.DataFrame:
    """Build combined dataset with clean, spam, and toxic samples."""
    sms_df = download_sms_spam()

    # Add toxic samples (manually curated small set)
    toxic_samples = [
        ("toxic", "I hate you and wish you were dead"),
        ("toxic", "You are worthless and pathetic"),
        ("toxic", "Get out of here you idiot"),
        ("toxic", "This is disgusting content that should be banned"),
        ("toxic", "You are a terrible person"),
        ("clean", "Hey, how are you doing today?"),
        ("clean", "Can we meet for coffee tomorrow?"),
        ("clean", "The project deadline is next Friday"),
        ("clean", "Great work on the presentation!"),
        ("clean", "Please review the attached document"),
    ] * 20  # repeat to balance

    toxic_df = pd.DataFrame(toxic_samples, columns=["label", "text"])
    df       = pd.concat([sms_df, toxic_df], ignore_index=True)

    logger.info("Dataset distribution:\n%s", df["label"].value_counts())
    return df


def train():
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = build_dataset()
    X  = df["text"].values
    y  = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=50000,
            strip_accents="unicode",
            analyzer="word",
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            C=1.0,
            multi_class="multinomial",
            max_iter=1000,
            random_state=42,
        )),
    ])

    logger.info("Training classifier...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    logger.info("\n%s", classification_report(y_test, y_pred))

    joblib.dump(pipeline, OUTPUT_PATH)
    logger.info("Model saved to %s", OUTPUT_PATH)
    return pipeline


if __name__ == "__main__":
    train()
