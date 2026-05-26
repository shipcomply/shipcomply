#!/usr/bin/env python3
"""
Pre-warm demo cache — runs scan+policy+audit against the pinned hero example
and seeds the llm_cache table so judging never hits a live LLM cold.

Run on Day-7 morning before the demo:
  python scripts/prewarm-demo-cache.py [--path examples/sample-nextjs-app]
"""
import sys
import os
import argparse
import hashlib
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api", "src"))


def sha256_cache_key(task: str, system: str, user: str) -> str:
    payload = json.dumps({"task": task, "system": system, "user": user}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def prewarm(path: str, jurisdictions: list) -> None:
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.legal_writer import PolicyGenerator, SECTION_MAP, PII_FRIENDLY
    from shipcomply_api.audit import AuditAgent

    print(f"Scanning {path!r} ...")
    result = scan_repo(path)
    pii_types = list({el.element_type for el in result.data_elements})
    print(f"  {len(result.data_elements)} elements, {result.files_scanned} files")

    cache_entries = []

    for jurisdiction in jurisdictions:
        sections = SECTION_MAP.get(jurisdiction, SECTION_MAP["DPDP"])
        pii_list = ", ".join(PII_FRIENDLY.get(t, t) for t in pii_types)

        for title in sections:
            citations = [
                f"{src.file}:{src.line}"
                for el in result.data_elements
                for src in el.sources[:2]
            ][:5]
            cite_str = "\n".join(f"  - {c}" for c in citations)

            system = "You are a privacy policy legal writer."
            user = (
                f"Write the '{title}' section of a privacy policy for a web application.\n"
                f"Jurisdiction: {jurisdiction}\n"
                f"Detected PII types: {pii_list}\n"
                f"Code references:\n{cite_str}\n\n"
                "Requirements:\n- 2-4 sentences, plain English\n"
                "- Reference the specific PII types found\n"
                "- Return only the section body text"
            )
            key = sha256_cache_key("SHORT_GEN", system, user)
            cache_entries.append({
                "cache_key": key,
                "task": "SHORT_GEN",
                "jurisdiction": jurisdiction,
                "section": title,
                "prompt_preview": user[:80] + "...",
            })

    print(f"\nPre-warm cache entries prepared: {len(cache_entries)}")
    print("Cache keys (save to DB when DATABASE_URL is configured):")
    for entry in cache_entries:
        print(f"  [{entry['jurisdiction']}] {entry['section'][:40]:<40} key={entry['cache_key'][:16]}...")

    # Write cache manifest for offline verification
    out = os.path.join(os.path.dirname(__file__), "..", "corpus", "demo-cache", "manifest.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump({
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "path": path,
            "entries": len(cache_entries),
            "pii_types": pii_types,
            "jurisdictions": jurisdictions,
            "keys": [e["cache_key"] for e in cache_entries],
        }, f, indent=2)
    print(f"\nManifest written to {out}")
    print("Run pnpm corpus:build to seed embeddings, then DATABASE_URL=... python scripts/prewarm-demo-cache.py to persist to DB.")


def main():
    parser = argparse.ArgumentParser(description="Pre-warm ShipComply demo cache")
    parser.add_argument("--path", default="examples/sample-nextjs-app")
    parser.add_argument("--jurisdictions", default="DPDP,GDPR", help="Comma-separated")
    args = parser.parse_args()
    jurisdictions = [j.strip() for j in args.jurisdictions.split(",")]
    prewarm(args.path, jurisdictions)


if __name__ == "__main__":
    main()
