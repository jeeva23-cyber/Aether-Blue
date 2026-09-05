import os
import re
import math
from typing import List, Tuple

KNOWLEDGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge"))

class ArticleChunk:
    def __init__(self, article_id: str, title: str, section: str, content: str):
        self.article_id = article_id
        self.title = title
        self.section = section
        self.content = content

class SimpleRAG:
    def __init__(self):
        self.chunks: List[ArticleChunk] = []
        self.index_articles()

    def index_articles(self):
        self.chunks = []
        if not os.path.exists(KNOWLEDGE_DIR):
            return

        for fname in os.listdir(KNOWLEDGE_DIR):
            if fname.endswith(".md"):
                article_id = fname.replace(".md", "")
                fpath = os.path.join(KNOWLEDGE_DIR, fname)
                with open(fpath, "r", encoding="utf-8") as f:
                    text = f.read()

                title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
                title = title_match.group(1) if title_match else article_id

                sections = re.split(r"\n(?=##\s+)", text)
                for sec in sections:
                    sec_title_match = re.search(r"^##\s+(.+)$", sec, re.MULTILINE)
                    sec_title = sec_title_match.group(1) if sec_title_match else "General"
                    self.chunks.append(ArticleChunk(article_id, title, sec_title, sec))

    def search(self, query: str, top_k: int = 3) -> List[Tuple[ArticleChunk, float]]:
        query_words = set(re.findall(r"\w+", query.lower()))
        results = []

        domain_boosts = {
            "internet": ["broadband", "wan", "fiber", "router", "light", "blinking", "red", "connection"],
            "payment": ["paid", "pending", "bank", "transaction", "utr", "billing", "bill"],
            "severed": ["cut", "cable", "excavator", "damage", "break"]
        }

        for chunk in self.chunks:
            chunk_text = f"{chunk.title} {chunk.section} {chunk.content}".lower()
            chunk_words = set(re.findall(r"\w+", chunk_text))

            if not query_words:
                score = 0.0
            else:
                score = len(query_words.intersection(chunk_words)) / len(query_words)

            for key, kws in domain_boosts.items():
                if any(w in query_words for w in [key] + kws):
                    if any(k in chunk_text for k in kws):
                        score += 0.35

            if score > 0:
                results.append((chunk, min(round(score, 2), 0.98)))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

rag_system = SimpleRAG()
