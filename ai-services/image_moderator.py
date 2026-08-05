"""
OpenCV-based image moderation module.

analyze(image_bytes) -> {nsfw: bool, processed_image: bytes}

Pipeline:
  1. NSFW detection — skin-tone pixel ratio heuristic (configurable threshold)
  2. Face detection — OpenCV Haar cascade (frontal face)
  3. Face blurring  — Gaussian blur applied to each detected face region

The processed_image in the return value has faces blurred.
If nsfw=True, the caller should reject the upload and NOT store in S3.
"""

import io
import logging
import os

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# NSFW threshold from environment (default 0.7 = 70% skin-tone pixels)
_NSFW_THRESHOLD = float(os.environ.get("NSFW_THRESHOLD", "0.7"))

# Path to OpenCV's built-in frontal face Haar cascade
_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_CASCADE_PATH)


def analyze(image_bytes: bytes) -> dict:
    """
    Analyze an image for NSFW content and blur detected faces.

    Args:
        image_bytes: Raw bytes of the uploaded image (JPEG, PNG, or GIF).

    Returns:
        {
            "nsfw":             bool,    — True if image should be rejected
            "processed_image":  bytes,   — image bytes with faces blurred
            "face_count":       int,     — number of faces detected and blurred
        }
    """
    try:
        # Decode image bytes to OpenCV BGR array
        img_array = np.frombuffer(image_bytes, dtype=np.uint8)
        img       = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("Could not decode image — treating as safe")
            return {"nsfw": False, "processed_image": image_bytes, "face_count": 0}

        # --- NSFW detection via skin-tone pixel ratio heuristic ---
        nsfw = _detect_nsfw(img)

        if nsfw:
            return {"nsfw": True, "processed_image": image_bytes, "face_count": 0}

        # --- Face detection and blurring ---
        processed_img, face_count = _blur_faces(img)

        # Encode processed image back to bytes (JPEG)
        _, encoded = cv2.imencode(".jpg", processed_img,
                                  [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        processed_bytes = encoded.tobytes()

        return {
            "nsfw":             False,
            "processed_image":  processed_bytes,
            "face_count":       face_count,
        }

    except Exception as e:
        logger.error("Image moderation failed: %s", e)
        # On error, allow the upload through (fail open to avoid blocking users)
        return {"nsfw": False, "processed_image": image_bytes, "face_count": 0}


def _detect_nsfw(img: np.ndarray) -> bool:
    """
    Heuristic NSFW detection using skin-tone pixel ratio.

    Converts the image to HSV color space and counts pixels within the
    skin-tone hue/saturation/value range. A high ratio of such pixels
    may indicate NSFW content.

    This is a lightweight proxy — in production, replace with a dedicated
    NSFW detection model (e.g., NudeNet or a fine-tuned CNN).
    """
    hsv        = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0,   48,  80],  dtype=np.uint8)
    upper_skin = np.array([20,  255, 255], dtype=np.uint8)
    mask       = cv2.inRange(hsv, lower_skin, upper_skin)

    total_pixels = img.shape[0] * img.shape[1]
    if total_pixels == 0:
        return False

    skin_ratio = cv2.countNonZero(mask) / total_pixels
    return skin_ratio > _NSFW_THRESHOLD


def _blur_faces(img: np.ndarray) -> tuple[np.ndarray, int]:
    """
    Detect faces using Haar cascade and apply Gaussian blur.

    Returns:
        (processed_image, face_count)
    """
    gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )

    result = img.copy()
    for (x, y, w, h) in faces:
        roi     = result[y:y + h, x:x + w]
        blurred = cv2.GaussianBlur(roi, (51, 51), 0)
        result[y:y + h, x:x + w] = blurred

    return result, len(faces)
