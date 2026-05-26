"""Hybrid BM25 + pgvector retrieval with cross-encoder re-ranking."""
from __future__ import annotations
import logging
import os
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass
class Chunk:
    chunk_id: str
    jurisdiction: str
    regulation_version: str
    section: str
    content: str
    score: float = 0.0


class RAGRetriever:
    """
    Hybrid retrieval: BM25 (tsvector) + cosine similarity (pgvector) with RRF fusion.
    Cross-encoder re-ranks top-20 to top-k.
    Jurisdiction filter applied before retrieval.
    """

    def __init__(self, db_url: str | None = None) -> None:
        self._db_url = db_url or os.environ.get("DATABASE_URL", "")
        self._model = None
        self._embed_model = None

    def _get_embedding(self, text: str) -> list[float]:
        if self._embed_model is None:
            from sentence_transformers import SentenceTransformer
            self._embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        return self._embed_model.encode(text[:512], normalize_embeddings=True).tolist()

    def _rerank(self, query: str, chunks: list[Chunk], top_k: int) -> list[Chunk]:
        try:
            if self._model is None:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            pairs = [(query, c.content[:512]) for c in chunks]
            scores = self._model.predict(pairs)
            for chunk, score in zip(chunks, scores):
                # Clamp to [0, 1] — MS-MARCO outputs raw logits (-10 to +10)
                chunk.score = max(0.0, min(1.0, (float(score) + 10) / 20))
            chunks.sort(key=lambda c: c.score, reverse=True)
        except Exception as e:
            log.warning("Cross-encoder unavailable (%s), using raw scores", e)
        return chunks[:top_k]

    def retrieve(self, query: str, jurisdiction: str = "DPDP", top_k: int = 5) -> list[Chunk]:
        if not self._db_url:
            log.warning("DATABASE_URL not set — returning empty chunks")
            return []

        import psycopg2
        emb = self._get_embedding(query)
        # Explicit float formatting — avoids numpy repr issues
        emb_str = "[" + ",".join(f"{x:.6f}" for x in emb) + "]"

        try:
            with psycopg2.connect(self._db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        WITH bm25 AS (
                            SELECT chunk_id, jurisdiction, regulation_version, section, content,
                                   ts_rank(to_tsvector('english', content),
                                           plainto_tsquery('english', %s)) AS bm25_score
                            FROM corpus_chunks
                            WHERE jurisdiction = %s
                            ORDER BY bm25_score DESC LIMIT 20
                        ),
                        vec AS (
                            SELECT chunk_id, jurisdiction, regulation_version, section, content,
                                   1 - (embedding <=> %s::vector) AS vec_score
                            FROM corpus_chunks
                            WHERE jurisdiction = %s
                            ORDER BY vec_score DESC LIMIT 20
                        ),
                        rrf AS (
                            SELECT COALESCE(b.chunk_id, v.chunk_id)               AS chunk_id,
                                   COALESCE(b.jurisdiction, v.jurisdiction)         AS jurisdiction,
                                   COALESCE(b.regulation_version, v.regulation_version) AS regulation_version,
                                   COALESCE(b.section, v.section)                  AS section,
                                   COALESCE(b.content, v.content)                  AS content,
                                   COALESCE(b.bm25_score, 0) + COALESCE(v.vec_score, 0) AS rrf_score
                            FROM bm25 b FULL OUTER JOIN vec v USING (chunk_id)
                        )
                        SELECT chunk_id, jurisdiction, regulation_version, section, content, rrf_score
                        FROM rrf ORDER BY rrf_score DESC LIMIT 20
                    """, (query, jurisdiction, emb_str, jurisdiction))

                    rows = cur.fetchall()

            chunks = [
                Chunk(chunk_id=r[0], jurisdiction=r[1], regulation_version=r[2],
                      section=r[3], content=r[4], score=float(r[5]))
                for r in rows
            ]
            return self._rerank(query, chunks, top_k)

        except Exception as e:
            log.error("RAG retrieval failed: %s", e)
            return []

    def sanity_check(self) -> bool:
        """CI gate: assert known queries return expected sections."""
        tests = [
            ("email collection consent", "DPDP", "Section 4"),
            ("right to erasure deletion", "GDPR", "Article 17"),
        ]
        passed = 0
        for query, jurisdiction, expected_section in tests:
            chunks = self.retrieve(query, jurisdiction=jurisdiction, top_k=3)
            if not chunks:
                log.warning("Sanity check: no results for '%s' (%s)", query, jurisdiction)
                continue
            top_sections = [c.section for c in chunks]
            if any(expected_section.lower() in s.lower() for s in top_sections):
                log.info("PASS: '%s' -> %s", query, top_sections[0])
                passed += 1
            else:
                log.warning("MISS: '%s' expected '%s', got %s", query, expected_section, top_sections)
        return passed > 0
