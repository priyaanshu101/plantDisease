"""
Plant Disease Detection - Store in ChromaDB
============================================
Reads the output of rag_pipeline.py (chunks.json + embeddings.npy)
and stores everything in a persistent local ChromaDB collection.

Run AFTER rag_pipeline.py:
    python store_chromadb.py

Add to venv if not already installed:
    pip install chromadb numpy
"""

import json
import numpy as np
from pathlib import Path

# ─────────────────────────────────────────────
# ✏️  PATHS — adjust if you changed them in rag_pipeline.py
# ─────────────────────────────────────────────
RAG_OUTPUT_DIR   = "./rag_output"           # folder produced by rag_pipeline.py
CHROMA_DIR       = "./chroma_db"            # local ChromaDB will be stored here
COLLECTION_NAME  = "plant_disease_docs"     # name your collection
# ─────────────────────────────────────────────

BATCH_SIZE = 100    # ChromaDB add() works best in batches


def load_rag_output(output_dir: str):
    out = Path(output_dir)

    chunks_path     = out / "chunks.json"
    embeddings_path = out / "embeddings.npy"

    if not chunks_path.exists():
        raise FileNotFoundError(f"chunks.json not found in '{output_dir}'. Run rag_pipeline.py first.")
    if not embeddings_path.exists():
        raise FileNotFoundError(f"embeddings.npy not found in '{output_dir}'. Run rag_pipeline.py first.")

    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    embeddings = np.load(embeddings_path)

    print(f"✅ Loaded {len(chunks)} chunks  |  embeddings shape: {embeddings.shape}")
    return chunks, embeddings


def get_or_create_collection(chroma_dir: str, collection_name: str):
    import chromadb
    client = chromadb.PersistentClient(path=chroma_dir)

    # cosine similarity — matches normalized embeddings from rag_pipeline.py
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"📦 ChromaDB collection '{collection_name}'  |  existing docs: {collection.count()}")
    return client, collection


def store_in_chroma(collection, chunks: list[dict], embeddings: np.ndarray):
    """Upsert chunks + embeddings into ChromaDB in batches."""
    total = len(chunks)
    added = 0

    for start in range(0, total, BATCH_SIZE):
        end   = min(start + BATCH_SIZE, total)
        batch_chunks     = chunks[start:end]
        batch_embeddings = embeddings[start:end]

        ids        = [c["chunk_id"]   for c in batch_chunks]
        documents  = [c["text"]       for c in batch_chunks]
        metadatas  = [
            {
                "source":       c["source"],
                "chunk_index":  c["chunk_index"],
                "total_chunks": c["total_chunks"],
            }
            for c in batch_chunks
        ]

        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=batch_embeddings.tolist(),
            metadatas=metadatas,
        )
        added += len(batch_chunks)
        print(f"  ↑ Upserted {added}/{total} chunks ...", end="\r")

    print(f"\n✅ Done. Collection now holds {collection.count()} document(s).")


def verify(collection, embeddings: np.ndarray):
    """Quick sanity-check: query with the first chunk's embedding."""
    print("\n🔎 Sanity check — querying with first chunk's embedding ...")
    results = collection.query(
        query_embeddings=[embeddings[0].tolist()],
        n_results=3,
        include=["documents", "metadatas", "distances"],
    )
    for i, (doc, meta, dist) in enumerate(zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    )):
        print(f"\n  Result {i+1}  (distance={dist:.4f})")
        print(f"  Source : {Path(meta['source']).name}  [chunk {meta['chunk_index']}]")
        print(f"  Preview: {doc[:120].strip()} ...")


if __name__ == "__main__":
    print("🌿 Plant Disease RAG — ChromaDB Storage")
    print("=" * 42)

    chunks, embeddings = load_rag_output(RAG_OUTPUT_DIR)
    client, collection = get_or_create_collection(CHROMA_DIR, COLLECTION_NAME)
    store_in_chroma(collection, chunks, embeddings)
    verify(collection, embeddings)

    print(f"\n💾 ChromaDB persisted at: '{CHROMA_DIR}/'")
    print("   You can now query it with:")
    print("   collection.query(query_embeddings=[...], n_results=5)")