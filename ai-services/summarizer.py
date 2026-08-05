"""
LangGraph multi-agent system for the AI Chat Platform.

Graph structure (Supervisor pattern):
    START → Supervisor → Summarizer_Agent | Moderation_Agent | RAG_Tool → Supervisor → END

Nodes:
    Supervisor       — routes tasks to appropriate sub-agents via tool calling
    Summarizer_Agent — summarizes conversation message history (≤250 words)
    Moderation_Agent — deep moderation check for borderline messages
    RAG_Tool         — wraps rag_pipeline.answer() as a LangGraph tool

Extensibility: New agents are added as new StateGraph nodes connected to the
Supervisor. Existing nodes are never modified to add new capabilities.

Public API:
    summarize(messages: list[str]) -> str
    moderate_message(text: str) -> str    (label: clean|spam|toxic)
    ask_assistant(query: str) -> str      (RAG-grounded answer)
"""

import os
import logging
from typing import Annotated, TypedDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LangSmith tracing configuration
# ---------------------------------------------------------------------------
if os.environ.get("LANGCHAIN_TRACING_V2") == "true":
    os.environ.setdefault("LANGCHAIN_PROJECT",
                          os.environ.get("LANGCHAIN_PROJECT", "ai-chat-platform"))


# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    task:     str          # "summarize" | "moderate" | "assist"
    input:    str          # raw input (messages joined or query text)
    result:   str          # final output
    metadata: dict         # token counts, latency, etc.


# ---------------------------------------------------------------------------
# Node implementations
# ---------------------------------------------------------------------------

def _get_groq_llm(temperature: float = 0.3):
    """Return a ChatGroq instance."""
    from langchain_groq import ChatGroq
    return ChatGroq(
        model=os.environ.get("GROQ_MODEL", "llama3-70b-8192"),
        groq_api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=temperature,
        max_tokens=512,
        timeout=30,
    )


def supervisor_node(state: AgentState) -> AgentState:
    """
    Supervisor: determines which sub-agent to call based on state.task.
    In the LangGraph graph, this routes to the correct next node.
    """
    # Routing is handled by the conditional_edges in the graph
    # The supervisor node itself just passes state through
    return state


def summarizer_agent_node(state: AgentState) -> AgentState:
    """
    Summarizer_Agent: generates a conversation summary ≤250 words.
    """
    try:
        llm    = _get_groq_llm(temperature=0.3)
        prompt = (
            "Summarize the following conversation in 250 words or less. "
            "Be concise and capture the key points and decisions made.\n\n"
            f"Conversation:\n{state['input']}"
        )
        response = llm.invoke(prompt)
        summary  = response.content.strip()

        # Enforce 250-word limit
        words = summary.split()
        if len(words) > 250:
            summary = " ".join(words[:250]) + "..."

        return {**state, "result": summary, "metadata": {
            **state.get("metadata", {}),
            "word_count": len(summary.split()),
        }}
    except Exception as e:
        logger.error("Summarizer_Agent failed: %s", e)
        return {**state, "result": "Summary unavailable at this time."}


def moderation_agent_node(state: AgentState) -> AgentState:
    """
    Moderation_Agent: deep content moderation check using Groq.
    Returns final label: clean | spam | toxic.
    """
    try:
        llm    = _get_groq_llm(temperature=0.0)
        prompt = (
            "You are a content moderation system. Classify the following message "
            "as exactly one of: clean, spam, or toxic.\n"
            "Respond with ONLY one word: clean, spam, or toxic.\n\n"
            f"Message: {state['input']}"
        )
        response = llm.invoke(prompt)
        label    = response.content.strip().lower()
        if label not in ("clean", "spam", "toxic"):
            label = "clean"
        return {**state, "result": label}
    except Exception as e:
        logger.error("Moderation_Agent failed: %s", e)
        return {**state, "result": "clean"}


def rag_tool_node(state: AgentState) -> AgentState:
    """
    RAG_Tool: delegates knowledge-base queries to rag_pipeline.answer().
    This node wraps the RAG pipeline so the Supervisor can invoke it.
    """
    try:
        from rag_pipeline import answer
        result = answer(state["input"])
        return {**state, "result": result.get("answer", "No information found.")}
    except Exception as e:
        logger.error("RAG_Tool failed: %s", e)
        return {**state, "result": "Knowledge base unavailable."}


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def _route_task(state: AgentState) -> str:
    """Conditional edge: route to the correct agent based on state.task."""
    task = state.get("task", "summarize")
    if task == "moderate":
        return "moderation_agent"
    if task == "assist":
        return "rag_tool"
    return "summarizer_agent"


def _build_graph():
    """Build and compile the LangGraph StateGraph."""
    try:
        from langgraph.graph import StateGraph, END

        graph = StateGraph(AgentState)

        graph.add_node("supervisor",        supervisor_node)
        graph.add_node("summarizer_agent",  summarizer_agent_node)
        graph.add_node("moderation_agent",  moderation_agent_node)
        graph.add_node("rag_tool",          rag_tool_node)

        graph.set_entry_point("supervisor")

        graph.add_conditional_edges(
            "supervisor",
            _route_task,
            {
                "summarizer_agent": "summarizer_agent",
                "moderation_agent": "moderation_agent",
                "rag_tool":         "rag_tool",
            }
        )

        graph.add_edge("summarizer_agent", END)
        graph.add_edge("moderation_agent", END)
        graph.add_edge("rag_tool",         END)

        return graph.compile()
    except ImportError:
        logger.warning("langgraph not installed — LangGraph features disabled")
        return None


_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def summarize(messages: list[str]) -> str:
    """
    Summarize a list of conversation messages.

    Args:
        messages: List of message strings (e.g. ["Alice: hello", "Bob: hi"])

    Returns:
        Summary string ≤250 words, or raises TimeoutError on timeout.
    """
    joined = "\n".join(messages) if messages else ""
    if not joined:
        return "No messages to summarize."

    graph = _get_graph()
    if graph is None:
        return _fallback_summarize(joined)

    state = AgentState(task="summarize", input=joined, result="", metadata={})
    result_state = graph.invoke(state)
    return result_state.get("result", "Summary unavailable.")


def moderate_message(text: str) -> str:
    """
    Perform deep moderation on a borderline message.

    Args:
        text: Message text to moderate.

    Returns:
        Label string: "clean", "spam", or "toxic".
    """
    graph = _get_graph()
    if graph is None:
        return "clean"

    state = AgentState(task="moderate", input=text, result="", metadata={})
    result_state = graph.invoke(state)
    return result_state.get("result", "clean")


def ask_assistant(query: str) -> str:
    """
    Answer a user query via the RAG pipeline through the LangGraph Supervisor.

    Args:
        query: The user's question.

    Returns:
        Answer string.
    """
    graph = _get_graph()
    if graph is None:
        return "Assistant unavailable."

    state = AgentState(task="assist", input=query, result="", metadata={})
    result_state = graph.invoke(state)
    return result_state.get("result", "No answer available.")


def _fallback_summarize(text: str) -> str:
    """Simple extractive summary fallback when LangGraph is unavailable."""
    sentences = text.split(".")[:5]
    return ". ".join(s.strip() for s in sentences if s.strip()) + "."
