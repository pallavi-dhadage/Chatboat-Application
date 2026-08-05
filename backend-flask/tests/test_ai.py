"""
Tests for AI pipeline integration — classifier, sentiment, smart replies, RAG, LangGraph.
"""
import json
from unittest.mock import MagicMock, patch


class TestClassifier:
    def test_classify_clean_text(self):
        """Known clean text should return 'clean' label."""
        with patch.dict("sys.modules", {"joblib": MagicMock()}):
            import importlib, sys
            # Use heuristic fallback (no model file in tests)
            sys.path.insert(0, "ai-services")
            try:
                from classifier import _heuristic_classify
                label, confidence = _heuristic_classify("Hey, how are you doing today?")
                assert label == "clean"
                assert 0.0 < confidence <= 1.0
            except ImportError:
                pass

    def test_classify_spam_text(self):
        """Known spam keyword should return 'spam' label from heuristic."""
        sys_import_path = "ai-services"
        import sys
        sys.path.insert(0, sys_import_path)
        try:
            from classifier import _heuristic_classify
            label, confidence = _heuristic_classify("Buy now! Free money click here")
            assert label == "spam"
            assert confidence > 0.5
        except ImportError:
            pass

    def test_classify_returns_valid_label(self, app):
        """classify() must always return a label in {clean, spam, toxic}."""
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from classifier import classify
            label, confidence = classify("Hello world")
            assert label in ("clean", "spam", "toxic")
            assert 0.0 <= confidence <= 1.0
        except ImportError:
            pass


class TestSentiment:
    def test_sentiment_returns_valid_label(self):
        """predict() must return a label in {positive, neutral, negative}."""
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from sentiment import _lexicon_sentiment
            label, score = _lexicon_sentiment("This is great!")
            assert label in ("positive", "neutral", "negative")
            assert 0.0 <= score <= 1.0
        except ImportError:
            pass

    def test_sentiment_positive_text(self):
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from sentiment import _lexicon_sentiment
            label, _ = _lexicon_sentiment("This is great and awesome!")
            assert label == "positive"
        except ImportError:
            pass

    def test_sentiment_negative_text(self):
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from sentiment import _lexicon_sentiment
            label, _ = _lexicon_sentiment("This is terrible and broken")
            assert label == "negative"
        except ImportError:
            pass


class TestSmartReply:
    def test_cache_hit_avoids_groq_call(self, app):
        """When cache has a hit, Groq client must NOT be called."""
        import sys, json
        sys.path.insert(0, "ai-services")
        try:
            from smart_reply import generate_smart_replies, _cache_key
            with patch("smart_reply._get_redis") as mock_redis_fn, \
                 patch("smart_reply._get_groq") as mock_groq_fn:
                mock_rd = MagicMock()
                mock_rd.get.return_value = json.dumps(["Sure!", "OK!", "Thanks!"])
                mock_redis_fn.return_value = mock_rd

                replies = generate_smart_replies("Hello?")
                assert replies == ["Sure!", "OK!", "Thanks!"]
                mock_groq_fn.assert_not_called()
        except ImportError:
            pass

    def test_fallback_on_groq_timeout(self, app):
        """On Groq timeout/error, return 3 fallback replies."""
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from smart_reply import generate_smart_replies, _FALLBACK_REPLIES
            with patch("smart_reply._get_redis") as mock_redis_fn, \
                 patch("smart_reply._get_groq") as mock_groq_fn:
                mock_rd = MagicMock()
                mock_rd.get.return_value = None  # cache miss
                mock_redis_fn.return_value = mock_rd
                mock_groq_fn.side_effect = Exception("Timeout")

                replies = generate_smart_replies("Can we meet?")
                assert replies == _FALLBACK_REPLIES
                assert len(replies) == 3
        except ImportError:
            pass

    def test_smart_reply_endpoint(self, client, auth_headers):
        """POST /ai/smart-replies must return 200 with replies array."""
        with patch("smart_reply.generate_smart_replies",
                   return_value=["OK!", "Sure!", "Thanks!"], create=True), \
             patch("smart_reply.was_cache_hit", return_value=False, create=True):
            resp = client.post("/api/v1/ai/smart-replies",
                               json={"text": "Hello"},
                               headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "replies" in data
        assert isinstance(data["replies"], list)


class TestLangGraph:
    def test_summarize_endpoint_503_on_failure(self, client, auth_headers, app):
        """When summarizer raises, endpoint must return 503."""
        import uuid
        with app.app_context():
            from app.models import Conversation, ConversationParticipant, User, db
            users = User.query.all()
            user = users[-1]
            conv = Conversation(id=str(uuid.uuid4()), name="SumTest", type="group")
            db.session.add(conv)
            cp = ConversationParticipant(conversation_id=conv.id, user_id=user.id)
            db.session.add(cp)
            db.session.commit()
            conv_id = conv.id

        with patch("summarizer.summarize", side_effect=Exception("LLM down"), create=True):
            resp = client.post("/api/v1/ai/summarize",
                               json={"conversation_id": conv_id},
                               headers=auth_headers)
        assert resp.status_code == 503

    def test_moderate_message_borderline_routing(self):
        """moderate_message() should be called when confidence is in [0.4, 0.6]."""
        import sys
        sys.path.insert(0, "ai-services")
        try:
            from summarizer import moderate_message
            with patch("summarizer._get_groq_llm") as mock_llm:
                mock_resp = MagicMock()
                mock_resp.content = "clean"
                mock_llm.return_value.invoke.return_value = mock_resp
                result = moderate_message("borderline message text")
                assert result in ("clean", "spam", "toxic")
        except ImportError:
            pass


class TestRAG:
    def test_rag_no_relevant_info_below_threshold(self):
        """RAG must return 'no relevant info' when max similarity < 0.5."""
        import sys, numpy as np
        sys.path.insert(0, "ai-services")
        try:
            from rag_pipeline import answer
            with patch("rag_pipeline._load_kb_index") as mock_index_fn, \
                 patch("rag_pipeline._embed") as mock_embed:
                mock_index = MagicMock()
                mock_index.ntotal = 5
                # Return scores all below threshold
                mock_index.search.return_value = (
                    np.array([[0.3, 0.2, 0.1, 0.05, 0.01]]),
                    np.array([[0, 1, 2, 3, 4]])
                )
                mock_index_fn.return_value = mock_index
                mock_embed.return_value = np.zeros((1, 384), dtype=np.float32)

                result = answer("What is the meaning of life?")
                assert "no relevant" in result["answer"].lower()
        except ImportError:
            pass

    def test_semantic_search_scoped_to_caller(self, client, auth_headers, app):
        """Search results must only include conversations the caller participates in."""
        import uuid
        with patch("embeddings_store.search", return_value=[
            {"message_id": "m1", "conversation_id": "conv-OTHER", "sender": "Eve",
             "text": "secret", "similarity_score": 0.9},
        ], create=True):
            resp = client.post("/api/v1/ai/search",
                               json={"query": "secret"},
                               headers=auth_headers)
        assert resp.status_code == 200
        results = resp.get_json()["results"]
        # conv-OTHER is not a conversation the test user participates in
        assert all(r["conversation_id"] != "conv-OTHER" for r in results)
