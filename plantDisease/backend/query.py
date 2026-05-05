"""
Plant Disease Detection - RAG Query Pipeline (Groq API)
=============================================================
Requires:
  - rag_pipeline.py     to have been run (produces rag_output/)
  - store_chromadb.py   to have been run (produces chroma_db/)

Install dependencies in venv:
    pip install chromadb sentence-transformers groq
"""

import textwrap
from pathlib import Path

from groq import Groq
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer


# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
CHROMA_DIR       = "./chroma_db"
COLLECTION_NAME  = "plant_disease_docs"
EMBEDDING_MODEL  = "sentence-transformers/all-MiniLM-L6-v2"
TOP_K            = 10

from dotenv import load_dotenv
import os
load_dotenv()

GROQ_API_KEY     = os.getenv("API_KEY")
GROQ_MODEL       = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a helpful plant disease assistant.

Answer using ONLY the provided context.

Explain in simple, clear, and natural language as if talking to a farmer or beginner.
Avoid markdown formatting like ** or unnecessary symbols.

If helpful, you may present the answer in short points, but keep it natural and not overly structured.

Try to include:
- what the problem is
- key symptoms
- simple cause (if known)
- practical treatment or prevention

If the context is not enough, clearly say you don’t have enough information.

Keep answers short, easy to understand, and conversational.
Avoid sounding like a textbook."""


# ── RETRIEVER ────────────────────────────────────────────────────────────────

class Retriever:
    def __init__(self):
        print("🔗 Connecting to ChromaDB ...")
        client = PersistentClient(path=CHROMA_DIR)
        self.collection = client.get_collection(COLLECTION_NAME)
        print(f"✅ {self.collection.count()} chunks indexed")

        print(f"🔍 Loading embedding model ...")
        self.embedder = SentenceTransformer(EMBEDDING_MODEL)
        print("✅ Ready\n")

    def retrieve(self, question: str) -> list[dict]:
        vector = self.embedder.encode(
            question,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).tolist()

        results = self.collection.query(
            query_embeddings=[vector],
            n_results=TOP_K,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "text":     doc,
                "source":   Path(meta["source"]).name,
                "chunk":    meta["chunk_index"],
                "distance": round(dist, 4),
            })
        return chunks


# ── LLM CALL ─────────────────────────────────────────────────────────────────

def call_groq(system: str, user_message: str) -> str:
    client = Groq(api_key=GROQ_API_KEY)
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Groq Error: {e}"


# ── RAG ──────────────────────────────────────────────────────────────────────

def ask(question: str, retriever: Retriever) -> str:
    chunks = retriever.retrieve(question)

    context_parts = []
    for i, c in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {c['source']} — chunk {c['chunk']}]\n{c['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    user_message = f"""Context from plant disease documents:

{context}

---

Question: {question}"""

    answer = call_groq(SYSTEM_PROMPT, user_message)

    print("\n📚 Sources:")
    for i, c in enumerate(chunks, 1):
        print(f"   {i}. {c['source']}  [chunk {c['chunk']}]  dist={c['distance']}")

    return answer


# ── MAIN LOOP ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🌿 Plant Disease RAG — Groq Query Interface")
    print(f"   Model  : {GROQ_MODEL}")
    print(f"   DB     : {CHROMA_DIR}  |  top-k = {TOP_K}")
    print("=" * 48)

    retriever = Retriever()
    print("Type your question. Commands: 'quit' to exit, 'clear' to reset screen.\n")

    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not question:
            continue
        if question.lower() in {"quit", "exit", "q"}:
            print("Bye!")
            break
        if question.lower() == "clear":
            print("\033[2J\033[H", end="")
            continue

        print(f"\n⏳ Thinking ...")
        answer = ask(question, retriever)

        print(f"\n🤖 Answer:")
        print(textwrap.fill(answer, width=88))
        print("\n" + "─" * 88)
