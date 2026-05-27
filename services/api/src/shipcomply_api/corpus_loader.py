"""Bulk-load corpus/chunks.jsonl into corpus_chunks when the table is empty."""
from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

CHUNKS_FILE = Path(__file__).parents[4] / "corpus" / "chunks.jsonl"


async def maybe_bulk_load_corpus() -> None:
    if not CHUNKS_FILE.exists():
        log.debug("corpus/chunks.jsonl not found — skipping bulk load")
        return

    from sqlalchemy import text
    from shipcomply_api.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        count = (await db.execute(text("SELECT count(*) FROM corpus_chunks"))).scalar_one()
        if count > 0:
            log.debug("corpus_chunks already has %d rows — skipping bulk load", count)
            return

        chunks = [
            json.loads(line)
            for line in CHUNKS_FILE.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if not chunks:
            return

        for c in chunks:
            emb = c.get("embedding")
            await db.execute(
                text(
                    "INSERT INTO corpus_chunks "
                    "(chunk_id, jurisdiction, regulation_version, section, content, embedding, metadata) "
                    "VALUES (:chunk_id, :jurisdiction, :regulation_version, :section, :content, "
                    ":embedding, :metadata::jsonb) "
                    "ON CONFLICT (chunk_id) DO NOTHING"
                ),
                {
                    "chunk_id": c["chunk_id"],
                    "jurisdiction": c["jurisdiction"],
                    "regulation_version": c["regulation_version"],
                    "section": c["section"],
                    "content": c["content"],
                    "embedding": (
                        "[" + ",".join(f"{x:.6f}" for x in emb) + "]" if emb else None
                    ),
                    "metadata": json.dumps(c.get("metadata", {})),
                },
            )

        await db.commit()
        log.info("Bulk-loaded %d corpus chunks from %s", len(chunks), CHUNKS_FILE)
