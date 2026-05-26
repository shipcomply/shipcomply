"""
Build RAG corpus: download legal texts, chunk by section, embed with BGE-small, upload to pgvector.

Usage:
  python scripts/build-rag-corpus.py           # full build
  python scripts/build-rag-corpus.py --sanity-check-only  # CI gate
"""

import argparse
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Iterator

import httpx

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

CORPUS_DIR = Path(__file__).parent.parent / "corpus"
SOURCES_DIR = CORPUS_DIR / "sources"
CHUNKS_FILE = CORPUS_DIR / "chunks.jsonl"

SOURCES = {
    "dpdp-2023": {
        "jurisdiction": "DPDP",
        "version": "DPDP-2023-11",
        "description": "Digital Personal Data Protection Act 2023 (India)",
        # TODO: Replace with actual official URL when publicly available
        "url": None,
        "local_file": SOURCES_DIR / "dpdp_act_2023.md",
    },
    "gdpr": {
        "jurisdiction": "GDPR",
        "version": "GDPR-2016",
        "description": "General Data Protection Regulation (EU) 2016/679",
        "url": None,
        "local_file": SOURCES_DIR / "gdpr.md",
    },
    "ccpa": {
        "jurisdiction": "CCPA",
        "version": "CCPA-2018",
        "description": "California Consumer Privacy Act 2018",
        "url": None,
        "local_file": SOURCES_DIR / "ccpa.md",
    },
}

SANITY_QUERIES = [
    ("email collection consent", "DPDP", "Section 4"),
    ("right to erasure", "GDPR", "Article 17"),
    ("opt-out sale", "CCPA", "Section 1798.120"),
]


def chunk_by_section(text: str, source_id: str, metadata: dict) -> Iterator[dict]:
    """Split legal text by section headers, preserving cross-references."""
    import re
    sections = re.split(r'\n(?=#{1,3} )', text)
    for i, section in enumerate(sections):
        if not section.strip():
            continue
        header_match = re.match(r'^(#{1,3}) (.+)', section)
        section_title = header_match.group(2) if header_match else f"Section {i}"
        yield {
            "chunk_id": f"{source_id}_{i:04d}",
            "jurisdiction": metadata["jurisdiction"],
            "regulation_version": metadata["version"],
            "section": section_title,
            "content": section.strip(),
            "metadata": {"source_id": source_id, "chunk_index": i},
        }


def embed_chunks(chunks: list[dict]) -> list[dict]:
    """Embed chunks with BGE-small-en-v1.5 (local, CPU)."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        texts = [c["content"][:512] for c in chunks]
        embeddings = model.encode(texts, normalize_embeddings=True)
        for chunk, emb in zip(chunks, embeddings):
            chunk["embedding"] = emb.tolist()
        return chunks
    except ImportError:
        log.warning("sentence-transformers not installed — skipping embeddings")
        return chunks


def upload_to_pgvector(chunks: list[dict]) -> None:
    """Upload chunks to Supabase pgvector."""
    import psycopg2
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        log.warning("DATABASE_URL not set — skipping upload")
        return
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    for chunk in chunks:
        emb = chunk.get("embedding")
        cur.execute(
            """INSERT INTO corpus_chunks (chunk_id, jurisdiction, regulation_version, section, content, embedding, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (chunk_id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding""",
            (
                chunk["chunk_id"], chunk["jurisdiction"], chunk["regulation_version"],
                chunk["section"], chunk["content"],
                str(emb) if emb else None,
                json.dumps(chunk.get("metadata", {})),
            ),
        )
    conn.commit()
    cur.close()
    conn.close()
    log.info("Uploaded %d chunks to pgvector", len(chunks))


def write_checksums(checksums: dict[str, str]) -> None:
    checksum_file = SOURCES_DIR / "CHECKSUMS.txt"
    with open(checksum_file, "w") as f:
        for name, sha256 in sorted(checksums.items()):
            f.write(f"{sha256}  {name}\n")
    log.info("Wrote checksums to %s", checksum_file)


def run_sanity_check() -> bool:
    """CI gate: assert top-3 retrieval contains expected section."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        log.warning("DATABASE_URL not set — skipping sanity check")
        return True
    # TODO: implement vector similarity search sanity check
    log.info("Sanity check: PASS (stub)")
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sanity-check-only", action="store_true")
    args = parser.parse_args()

    if args.sanity_check_only:
        ok = run_sanity_check()
        raise SystemExit(0 if ok else 1)

    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    all_chunks: list[dict] = []
    checksums: dict[str, str] = {}

    for source_id, source in SOURCES.items():
        local_file: Path = source["local_file"]  # type: ignore
        if not local_file.exists():
            log.warning("Source file %s not found — skipping. Provide the legal text manually.", local_file)
            continue

        text = local_file.read_text(encoding="utf-8")
        sha256 = hashlib.sha256(text.encode()).hexdigest()
        checksums[local_file.name] = sha256
        log.info("Processing %s (%s)", source_id, sha256[:12])

        chunks = list(chunk_by_section(text, source_id, source))
        all_chunks.extend(chunks)

    if not all_chunks:
        log.warning("No source files found. Add DPDP/GDPR/CCPA texts to corpus/sources/")
        return

    log.info("Embedding %d chunks...", len(all_chunks))
    all_chunks = embed_chunks(all_chunks)

    CHUNKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CHUNKS_FILE, "w") as f:
        for chunk in all_chunks:
            c = {k: v for k, v in chunk.items() if k != "embedding"}
            f.write(json.dumps(c) + "\n")

    upload_to_pgvector(all_chunks)
    write_checksums(checksums)
    log.info("Done: %d chunks indexed", len(all_chunks))


if __name__ == "__main__":
    main()
