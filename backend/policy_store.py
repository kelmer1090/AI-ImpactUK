from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import json
import pathlib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class Clause:
    id: str
    label: str
    text: str
    link: str
    category: str
    document: str
    framework: str


class PolicyStore:
    def __init__(self, path: pathlib.Path):
        self.path = path
        self.clauses: List[Clause] = []
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._matrix = None

    def load(self) -> int:
        data = json.loads(self.path.read_text())
        self.clauses = [
            Clause(
                id=row["id"],
                label=row.get("label", ""),
                text=row.get("text", ""),
                link=row.get("link", ""),
                category=row.get("category", ""),
                document=row.get("document", ""),
                framework=row.get("framework", ""),
            )
            for row in data
        ]
        # Build TF-IDF for quick lexical retrieval
        corpus = [f"{c.label}\n{c.text}\n{c.category}\n{c.document}" for c in self.clauses]
        self._vectorizer = TfidfVectorizer(stop_words="english", max_features=50000)
        self._matrix = self._vectorizer.fit_transform(corpus)
        return len(self.clauses)

    def top_k(self, query: str, k: int = 20, frameworks: Optional[List[str]] = None) -> List[Clause]:
        if not query.strip():
            return []
        vq = self._vectorizer.transform([query])
        sims = cosine_similarity(vq, self._matrix)[0]
        idxs = sims.argsort()[::-1]
        results: List[Clause] = []
        for idx in idxs:
            c = self.clauses[idx]
            if frameworks and c.framework not in frameworks:
                continue
            results.append(c)
            if len(results) >= k:
                break
        return results


def load_store(default_path: Optional[pathlib.Path] = None) -> PolicyStore:
    path = default_path or pathlib.Path(__file__).with_name("policy_corpus.json")
    store = PolicyStore(path)
    n = store.load()
    print(f"[policy_store] Loaded {n} clauses from {path}")
    return store
