"""
FAISS message embeddings store for semantic search.

Maintains a writable FAISS IndexFlatIP index over all persisted messages.
Vectors are L2-normalized so inner product = cosine similarity.

Index file: ai-services/models/messages.faiss
Meta file:  ai-services/models/messages_meta.json

add(message_id, text)           — embed and index a message
search(query, top_k=10)         — return ranked results
persist()                       — save index to disk
"""

import json
import logging
import os
import threading

import numpy as np

logger = logging.getLogger(__name__)

_INDEX_PATH = os.path.join(os.path.dirname(__file__), "models", "messages.faiss")
_META_PATH  = os.path.join(os.path.dirname(__file__), "models", "messages_meta.json")
_EMBED_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
_DIM         = 384  # all-MiniLM-L6-v2 output dimension

_index    = None
_meta     = []      # list of {message_id, conversation_id, sender, text}
_lock     = threading.Lock()
_write_count = 0
_PERSIST_EVERY = 100


def _get_encoder():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(_EMBED_MODEL)
    except Exception:
        return None


def _load_index():
    global _index, _meta
    if _index is not None:
        return _index

    try:
        import faiss
        if os.path.exists(_INDEX_PATH):
            _index = faiss.read_index(_INDEX_PATH)
            if os.path.exists(_META_PATH):
                with open(_META_PATH, "r") as f:
                    _meta = json.load(f)
            logger.info("Message embeddings index loaded: %d vectors", _index.ntotal)
        else:
            _index = faiss.IndexFlatIP(_DIM)
            logger.info("Created new message embeddings index")
    except ImportError:
        logger.warning("faiss-cpu not installed — semantic search disabled")
    except Exception as e:
        logger.error("Failed to load message index: %s", e)

    return _index


_load_index()


def add(message_id: str, text: str,
        conversation_id: str = "", sender: str = "") -> None:
    """
    Embed a message and add it to the FAISS index.

    Args:
        message_id:      Unique message ID (UUID).
        text:            Message text to embed.
        conversation_id: ID of the conversation (for access-scope filtering).
        sender:          Sender display name.
    """
    global _write_count

    index = _load_index()
    if index is None:
        return

    encoder = _get_encoder()
    if encoder is None:
        return

    try:
        vec = encoder.encode([text], normalize_embeddings=True).astype(np.float32)
        with _lock:
            index.add(vec)
            _meta.append({
                "message_id":      message_id,
                "conversation_id": conversation_id,
                "sender":          sender,
                "text":            text[:200],
            })
            _write_count += 1
            if _write_count % _PERSIST_EVERY == 0:
                persist()
    except Exception as e:
        logger.error("Failed to add embedding: %s", e)


def search(query: str, top_k: int = 10) -> list[dict]:
    """
    Search the message embeddings index for semantically similar messages.

    Args:
        query:  The search query string.
        top_k:  Maximum number of results to return.

    Returns:
        List of result dicts sorted by similarity score descending:
        [{message_id, conversation_id, sender, text, similarity_score}]
    """
    index = _load_index()
    if index is None or index.ntotal == 0:
        return []

    encoder = _get_encoder()
    if encoder is None:
        return []

    try:
        query_vec = encoder.encode([query], normalize_embeddings=True).astype(np.float32)
        k         = min(top_k, index.ntotal)
        scores, indices = index.search(query_vec, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(_meta):
                results.append({
                    **_meta[idx],
                    "similarity_score": float(score),
                })

        return sorted(results, key=lambda r: r["similarity_score"], reverse=True)
    except Exception as e:
        logger.error("Embedding search failed: %s", e)
        return []


def persist() -> None:
    """Save the FAISS index and metadata to disk."""
    index = _load_index()
    if index is None:
        return
    try:
        import faiss
        os.makedirs(os.path.dirname(_INDEX_PATH), exist_ok=True)
        faiss.write_index(index, _INDEX_PATH)
        with open(_META_PATH, "w") as f:
            json.dump(_meta, f)
        logger.debug("Message embeddings index persisted (%d vectors)", index.ntotal)
    except Exception as e:
        logger.error("Failed to persist index: %s", e)
