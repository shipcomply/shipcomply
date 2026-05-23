#!/usr/bin/env python3
"""CLI wrapper: pnpm rag:query "email collection lawful basis"
Optionally pass --jurisdiction GDPR or DPDP (default DPDP).
"""
import sys
import argparse
import os

# Allow running without installed package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api", "src"))


def main():
    parser = argparse.ArgumentParser(description="Query the ShipComply RAG corpus")
    parser.add_argument("query", nargs="?", default="personal data processing consent")
    parser.add_argument("--jurisdiction", default="DPDP", choices=["DPDP", "GDPR", "CCPA"])
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    try:
        from shipcomply_api.rag.retriever import RAGRetriever
        retriever = RAGRetriever()
        chunks = retriever.retrieve(args.query, jurisdiction=args.jurisdiction, top_k=args.top_k)
        print(f"\nQuery: {args.query!r}  jurisdiction={args.jurisdiction}  top_k={args.top_k}\n")
        for i, chunk in enumerate(chunks, 1):
            src = f"{chunk.regulation} {chunk.section}" if hasattr(chunk, "regulation") else str(chunk)
            text = chunk.text[:200] if hasattr(chunk, "text") else str(chunk)
            print(f"[{i}] {src}\n    {text}\n")
    except Exception as exc:
        print(f"[rag:query] {type(exc).__name__}: {exc}", file=sys.stderr)
        print("Note: RAG query requires DATABASE_URL and corpus loaded via pnpm corpus:build", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
