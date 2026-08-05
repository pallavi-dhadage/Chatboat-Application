"""
RAG (Retrieval-Augmented Generation) pipeline for the AI Support Assistant.

Uses:
    - sentence-transformers/all-MiniLM-L6-v2 for embedding queries
    - FAISS IndexFlatIP (cosine similarity via L2-normalized vectors) for retrieval
    - Groq API for grounded answer generation
    - LangSmith for tracing

answer(query) -> {answer: str, sources: list[dict]}

The FAISS knowledge-base index (kb.faiss) is loaded from disk at module
import time. To rebuild it, run scripts/build_kb_index.py.
"""

import os
import json
import logging
import time

import numpy as np

logger = logging.getLogger(__name__)

_KB_INDEX_PATH = os.path.join(os.path.dirname(__file__), "models", "kb.faiss")
_KB_META_PATH  = os.path.join(os.path.dirname(__file__), "models", "kb_meta.json")
_EMBED_MODEL   = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
_MIN_SIMILARITY = 0.5   # minimum cosine similarity to consider a result relevant

_encoder = None
_kb_index = None
_kb_meta  = []  # list of {title, text, source} dicts


def _load_encoder():
    global _encoder
    if _encoder is not None:
        return _encoder
    try:
        from sentence_transformers import SentenceTransformer
        _encoder = SentenceTransformer(_EMBED_MODEL)
        logger.info("Loaded embedding model: %s", _EMBED_MODEL)
    except Exception as e:
        logger.error("Failed to load encoder: %s", e)
    return _encoder


def _load_kb_index():
    global _kb_index, _kb_meta
    if _kb_index is not None:
        return _kb_index

    if not os.path.exists(_KB_INDEX_PATH):
        logger.warning("KB index not found at %s — RAG disabled", _KB_INDEX_PATH)
        return None

    try:
        import faiss
        _kb_index = faiss.read_index(_KB_INDEX_PATH)
        if os.path.exists(_KB_META_PATH):
            with open(_KB_META_PATH, "r") as f:
                _kb_meta = json.load(f)
        logger.info("KB FAISS index loaded: %d vectors", _kb_index.ntotal)
    except Exception as e:
        logger.error("Failed to load KB index: %s", e)
    return _kb_index


# Load at import time
_load_encoder()
_load_kb_index()


def _embed(text: str) -> np.ndarray:
    """Embed text and L2-normalize for cosine similarity via inner product."""
    encoder = _load_encoder()
    if encoder is None:
        return np.zeros((1, 384), dtype=np.float32)
    vec = encoder.encode([text], normalize_embeddings=True)
    return vec.astype(np.float32)


def answer(query: str) -> dict:
    """
    Answer a user query using RAG.

    Args:
        query: The user's question string.

    Returns:
        {
            "answer":  str,
            "sources": [{"title": str, "score": float}]
        }

    If no document exceeds the similarity threshold (0.5), returns a
    "no relevant information found" response without calling the LLM.
    """
    start = time.time()
    index = _load_kb_index()

    if index is None or index.ntotal == 0:
        return {
            "answer": "No relevant information found.",
            "sources": []
        }

    # Embed and search
    query_vec = _embed(query)
    k         = min(5, index.ntotal)

    try:
        scores, indices = index.search(query_vec, k)
        scores  = scores[0].tolist()
        indices = indices[0].tolist()
    except Exception as e:
        logger.error("FAISS search failed: %s", e)
        return {"answer": "Search service unavailable.", "sources": []}

    # Filter by minimum similarity threshold
    max_score = max(scores) if scores else 0.0
    if max_score < _MIN_SIMILARITY:
        return {
            "answer": "No relevant information found in the knowledge base.",
            "sources": []
        }

    # Build context from top documents
    top_docs = []
    for score, idx in zip(scores, indices):
        if score >= _MIN_SIMILARITY and idx < len(_kb_meta):
            top_docs.append({**_kb_meta[idx], "score": float(score)})

    context_text = "\n\n".join(
        f"[{doc.get('title', 'Doc')}]: {doc.get('text', '')}"
        for doc in top_docs
    )

    # Generate grounded answer via Groq
    try:
        from groq import Groq
        groq   = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
        model  = os.environ.get("GROQ_MODEL", "llama3-70b-8192")
        prompt = (
            f"Answer the following question using ONLY the provided context. "
            f"If the context doesn't contain enough information, say so.\n\n"
            f"Context:\n{context_text}\n\n"
            f"Question: {query}"
        )
        resp    = groq.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful support assistant."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=512,
            timeout=15,
        )
        grounded_answer = resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Groq grounding failed: %s", e)
        grounded_answer = context_text[:500] if context_text else "Service unavailable."

    # Emit LangSmith trace
    _emit_langsmith_trace(query, top_docs, grounded_answer, time.time() - start)

    return {
        "answer":  grounded_answer,
        "sources": [{"title": d.get("title", ""), "score": d["score"]}
                    for d in top_docs],
    }


def _emit_langsmith_trace(query: str, docs: list, answer: str, latency: float):
    """Best-effort LangSmith trace emission."""
    try:
        api_key = os.environ.get("LANGSMITH_API_KEY")
        if not api_key:
            return
        from langsmith import Client
        client = Client(api_key=api_key)
        client.create_run(
            name="rag_pipeline",
            inputs={"query": query[:200]},
            outputs={"answer": answer[:200], "retrieval_hits": len(docs)},
            run_type="retriever",
            extra={"latency_ms": int(latency * 1000),
                   "source_titles": [d.get("title") for d in docs]},
        )
    except Exception:
        pass
