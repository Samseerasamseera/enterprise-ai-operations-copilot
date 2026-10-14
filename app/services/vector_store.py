
import chromadb

from app.services.document_processor import split_text

_client = chromadb.PersistentClient(path="./storage/chroma")
_collection = _client.get_or_create_collection(
    name="document_chunks",
    metadata={"hnsw:space": "cosine"},
)


def index_chunks(
    document_id: str,
    tenant_id: str,
    chunks: list[str],
) -> None:
    if not chunks:
        return

    ids = [
        f"{document_id}:{index}"
        for index in range(len(chunks))
    ]

    _collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=[
            {
                "document_id": document_id,
                "tenant_id": tenant_id,
                "chunk_index": index,
            }
            for index in range(len(chunks))
        ],
    )


def search_chunks(
    tenant_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    results = _collection.query(
        query_texts=[query],
        n_results=top_k,
        where={"tenant_id": tenant_id},
        include=["documents", "metadatas", "distances"],
    )

    matches = []
    documents = results.get("documents") or [[]]
    metadatas = results.get("metadatas") or [[]]
    distances = results.get("distances") or [[]]
    ids = results.get("ids") or [[]]

    for chunk_id, content, metadata, distance in zip(
        ids[0], documents[0], metadatas[0], distances[0]
    ):
        matches.append(
            {
                "chunk_id": chunk_id,
                "content": content,
                "document_id": metadata["document_id"],
                "chunk_index": metadata["chunk_index"],
                "distance": distance,
            }
        )

    return matches
