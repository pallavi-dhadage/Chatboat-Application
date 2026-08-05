def classify_message(text: str) -> str:
    text = text.lower()
    if any(x in text for x in ['spam', 'buy now', 'free money']):
        return 'spam'
    if any(x in text for x in ['idiot', 'stupid', 'hate']):
        return 'toxic'
    return 'clean'


def generate_smart_reply(text: str) -> list[str]:
    if 'hello' in text.lower():
        return ['Hi there!', 'How can I help today?', 'Great to hear from you.']
    if 'thanks' in text.lower():
        return ['You’re welcome!', 'Happy to help.', 'Anytime!']
    return ['Can you share more detail?', 'I can help with that.', 'Let me know what you need.']


def summarize_conversation(conversation_id: str, messages: list[dict]) -> str:
    recent = messages[-3:]
    return f'Conversation {conversation_id} includes {len(recent)} recent messages about the current thread.'


def search_knowledge_base(query: str) -> list[dict]:
    knowledge = [
        {'title': 'How to start a chat', 'content': 'Use the sidebar to open a conversation and send a message.'},
        {'title': 'Moderation', 'content': 'Toxic content is automatically flagged for review.'},
    ]
    return [item for item in knowledge if query.lower() in item['title'].lower() or query.lower() in item['content'].lower()]
