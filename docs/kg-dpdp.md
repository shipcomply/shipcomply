# ShipComply — Knowledge Graph: DPDP / GDPR / CCPA

## What Is the KG?

Every scan produces a **per-scan knowledge graph** linking detected code elements to the regulation sections they trigger. Computed per scan, stored in Cloudflare R2, served via `GET /scans/<id>/graph`.

---

## Current State: Static Map (BUILT, WORKING)

`kg/retriever.py` uses hardcoded lookup tables:

```python
_DPDP_MAP = {
    "email":   ["DPDP:§4", "DPDP:§6", "DPDP:§7"],
    "dob":     ["DPDP:§4", "DPDP:§9"],        # children's data
    "aadhaar": ["DPDP:§4", "DPDP:§8", "DPDP:§11"],
    "payment": ["DPDP:§4", "DPDP:§8"],
}
_GDPR_MAP  = { "email": ["GDPR:Art6", "GDPR:Art13"], "biometric": ["GDPR:Art9"], ... }
_CCPA_MAP  = { "email": ["CCPA:1798.100", "CCPA:1798.120"], ... }
```

**Fully working.** `pnpm scan:sample` uses this. Every scan produces correct DPDP/GDPR/CCPA citations.

---

## KG Output Schema

```json
{
  "nodes": [
    {"id": "<uuid>",     "type": "data_element", "label": "emailAddress", "element_type": "email"},
    {"id": "DPDP:§4",   "type": "section",       "label": "DPDP §4 — Processing grounds", "body": ""},
    {"id": "GDPR:Art6", "type": "section",        "label": "GDPR Art 6 — Lawfulness",     "body": ""}
  ],
  "edges": [
    {"from": "<uuid>", "to": "DPDP:§4",   "relation": "triggers"},
    {"from": "<uuid>", "to": "GDPR:Art6", "relation": "triggers"}
  ]
}
```

Dashboard renders via `cytoscape.js` (already installed).

---

## DPDP Section Coverage

| Section | Topic | Triggers When |
|---------|-------|---------------|
| §4 | Grounds for processing | Any PII detected |
| §6 | Consent requirement | email, phone, name, location |
| §7 | Legitimate uses | email, phone, name |
| §8 | Additional obligations | financial, health, biometric |
| §9 | Children's data | date_of_birth detected |
| §11 | Rights of data principal | biometric, aadhaar, password |

---

## pgvector RAG Upgrade (NOT YET BUILT)

`rag/retriever.py` and `kg/loader.py` stubs exist. Once corpus populated:

1. `KGRetriever.__init__` loads nodes from Neon `corpus_chunks` table (migration 0003 already exists)
2. Section `body` fields get real regulation text
3. Policy citations quote actual legal text vs just section IDs
4. KG structure, KGBuilder, all agents, routes — unchanged

**How to trigger:**
```bash
# Add legal text to corpus/sources/*.md (see corpus/sources/README.md)
pnpm corpus:build    # chunks, embeds via BGE-small (local), uploads to pgvector
```

---

## Storage

| Artifact | Location | Notes |
|----------|----------|-------|
| Per-scan KG | R2 `scans/<id>/kg.json` | Served by `GET /scans/<id>/graph` |
| Corpus chunks | Neon `corpus_chunks` table | BGE-small-en-v1.5 512-dim embeddings |
| Source legal text | `corpus/sources/*.md` | Manual population required |
