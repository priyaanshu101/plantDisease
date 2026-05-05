"""
Plant Disease Detection - RAG Pipeline
=======================================
Steps: Extract → Chunk → Embed → Save

SETUP (run once in terminal):
    python -m venv venv
    source venv/bin/activate        # Windows: venv\Scripts\activate
    pip install langchain langchain-community sentence-transformers pypdf \
                python-docx tiktoken numpy faiss-cpu tqdm
"""

import os
import json
import pickle
import numpy as np
from pathlib import Path
from tqdm import tqdm

# ─────────────────────────────────────────────
# ✏️  SET YOUR DOCUMENTS FOLDER PATH HERE
# ─────────────────────────────────────────────
DOCUMENTS_DIR = r"D:\FinalY\docs"   # <── change this
# ─────────────────────────────────────────────

OUTPUT_DIR = "./rag_output"          # where chunks + embeddings are saved
CHUNK_SIZE = 512                     # tokens per chunk
CHUNK_OVERLAP = 64                   # overlap between consecutive chunks
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"   # fast & good


# ── 1. TEXT EXTRACTION ──────────────────────────────────────────────────────

def extract_from_pdf(path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(path)
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def extract_from_docx(path: str) -> str:
    from docx import Document
    doc = Document(path)
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_from_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


EXTRACTORS = {
    ".pdf":  extract_from_pdf,
    ".docx": extract_from_docx,
    ".txt":  extract_from_txt,
    ".md":   extract_from_txt,
}


def load_documents(folder: str) -> list[dict]:
    """Walk folder and extract text from all supported files."""
    docs = []
    folder_path = Path(folder)

    if not folder_path.exists():
        raise FileNotFoundError(f"Documents folder not found: {folder}")

    files = [f for f in folder_path.rglob("*") if f.suffix.lower() in EXTRACTORS]

    if not files:
        raise ValueError(f"No supported files (.pdf, .docx, .txt, .md) found in: {folder}")

    print(f"\n📂 Found {len(files)} file(s) in '{folder}'")

    for file in tqdm(files, desc="Extracting"):
        extractor = EXTRACTORS[file.suffix.lower()]
        try:
            text = extractor(str(file)).strip()
            if text:
                docs.append({"source": str(file), "text": text})
        except Exception as e:
            print(f"  ⚠️  Skipped {file.name}: {e}")

    print(f"✅ Extracted text from {len(docs)} document(s)")
    return docs


# ── 2. CHUNKING ─────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Token-aware chunking using tiktoken (cl100k tokenizer)."""
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        if end == len(tokens):
            break
        start += chunk_size - overlap   # slide forward with overlap

    return chunks


def build_chunks(docs: list[dict], chunk_size: int, overlap: int) -> list[dict]:
    """Split all documents into overlapping chunks."""
    all_chunks = []
    for doc in tqdm(docs, desc="Chunking"):
        parts = chunk_text(doc["text"], chunk_size, overlap)
        for i, part in enumerate(parts):
            all_chunks.append({
                "chunk_id":    f"{Path(doc['source']).stem}_chunk_{i}",
                "source":      doc["source"],
                "chunk_index": i,
                "total_chunks": len(parts),
                "text":        part,
            })
    print(f"✅ Created {len(all_chunks)} chunk(s) "
          f"(size={chunk_size} tokens, overlap={overlap} tokens)")
    return all_chunks


# ── 3. EMBEDDING ─────────────────────────────────────────────────────────────

def embed_chunks(chunks: list[dict], model_name: str) -> np.ndarray:
    """Generate embeddings for all chunks using SentenceTransformers."""
    from sentence_transformers import SentenceTransformer
    print(f"\n🔍 Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)

    texts = [c["text"] for c in chunks]
    print(f"⚙️  Embedding {len(texts)} chunk(s) ...")
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,   # cosine similarity ready
    )
    print(f"✅ Embeddings shape: {embeddings.shape}")
    return embeddings


# ── 4. SAVE ──────────────────────────────────────────────────────────────────

def save_outputs(chunks: list[dict], embeddings: np.ndarray, output_dir: str):
    """Persist chunks (JSON) and embeddings (numpy + FAISS index)."""
    import faiss
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # chunks metadata
    chunks_path = out / "chunks.json"
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

    # raw numpy embeddings
    np.save(out / "embeddings.npy", embeddings)

    # FAISS index for fast similarity search
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)   # inner product = cosine (vectors are normalized)
    index.add(embeddings)
    faiss.write_index(index, str(out / "faiss.index"))

    print(f"\n💾 Saved to '{output_dir}/'")
    print(f"   • chunks.json       ({len(chunks)} chunks)")
    print(f"   • embeddings.npy    {embeddings.shape}")
    print(f"   • faiss.index       (ready for similarity search)")


# ── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🌿 Plant Disease RAG Pipeline")
    print("=" * 40)

    docs       = load_documents(DOCUMENTS_DIR)
    chunks     = build_chunks(docs, CHUNK_SIZE, CHUNK_OVERLAP)
    embeddings = embed_chunks(chunks, EMBEDDING_MODEL)
    save_outputs(chunks, embeddings, OUTPUT_DIR)

    print("\n🎉 Pipeline complete! You can now build your retriever on top of rag_output/")
