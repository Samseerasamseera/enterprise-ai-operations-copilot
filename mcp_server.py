
from mcp.server.fastmcp import FastMCP

from app.core.config import get_settings
from app.services.rag_service import answer_question
from app.services.vector_store import search_chunks

mcp = FastMCP("Enterprise AI Operations Copilot")


def get_tenant_id() -> str:
    tenant_id = get_settings().mcp_tenant_id
    if not tenant_id:
        raise ValueError("MCP_TENANT_ID is not configured.")
    return tenant_id


@mcp.tool()
def search_documents(query: str, top_k: int = 5) -> dict:
    """Search uploaded documents belonging to the configured development tenant."""
    tenant_id = get_tenant_id()

    if not query.strip():
        raise ValueError("Query cannot be empty.")
    if not 1 <= top_k <= 10:
        raise ValueError("top_k must be between 1 and 10.")

    return {
        "query": query,
        "results": search_chunks(
            tenant_id=tenant_id,
            query=query,
            top_k=top_k,
        ),
    }


@mcp.tool()
async def ask_copilot(question: str, top_k: int = 5) -> dict:
    """Answer a question using retrieved documents from the configured development tenant."""
    tenant_id = get_tenant_id()

    if not question.strip():
        raise ValueError("Question cannot be empty.")
    if not 1 <= top_k <= 10:
        raise ValueError("top_k must be between 1 and 10.")

    return await answer_question(
        tenant_id=tenant_id,
        question=question,
        top_k=top_k,
    )


@mcp.tool()
def check_copilot_status() -> str:
    """Check whether the MCP server is available."""
    return "Enterprise AI Operations Copilot MCP server is running."


if __name__ == "__main__":
    mcp.run()
