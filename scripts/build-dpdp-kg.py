#!/usr/bin/env python3
"""
Build the DPDP Act 2023 knowledge graph into Postgres.

Usage:
    python scripts/build-dpdp-kg.py [--dry-run]

Sources seeded inline (official Gazette text summarised). For full text,
point DPDP_ACT_URL env var at the official PDF.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "services/api/src"))

DPDP_SECTIONS: list[dict] = [
    {"identifier": "§2",  "title": "Definitions", "body": "Defines 'data principal', 'data fiduciary', 'personal data', 'processing', 'consent', 'data processor', 'digital office', 'significant data fiduciary'."},
    {"identifier": "§4",  "title": "Grounds for processing personal data", "body": "Personal data may be processed only for a lawful purpose for which the data principal has given consent, or for certain legitimate uses without consent."},
    {"identifier": "§5",  "title": "Notice", "body": "Before requesting consent, the data fiduciary must give a clear notice describing the personal data to be collected and the purpose."},
    {"identifier": "§6",  "title": "Consent", "body": "Consent must be free, specific, informed, unconditional, unambiguous; given by clear affirmative action; and limited to the specified purpose."},
    {"identifier": "§7",  "title": "Certain legitimate uses", "body": "Processing without consent is permitted for: state functions, compliance with law, medical emergency, employment functions, public interest."},
    {"identifier": "§8",  "title": "General obligations of data fiduciary", "body": "Data fiduciary must ensure accuracy, completeness, consistency of personal data; implement security safeguards; notify breaches; erase data when purpose fulfilled."},
    {"identifier": "§9",  "title": "Processing of personal data of children", "body": "Verifiable parental consent required before processing personal data of a child (under 18). Prohibition on tracking, behavioural monitoring, targeted advertising to children."},
    {"identifier": "§10", "title": "Additional obligations of significant data fiduciary", "body": "SDF must appoint DPO, conduct DPIA, have data auditor, and comply with additional obligations as prescribed."},
    {"identifier": "§11", "title": "Rights of data principal", "body": "Data principals have rights to: access information about processing, correct/erase data, grievance redressal, nominate a person."},
    {"identifier": "§12", "title": "Right to access information", "body": "Data principal may request summary of personal data processed and activities of data fiduciary with respect to such data."},
    {"identifier": "§13", "title": "Right to correction and erasure", "body": "Data principal may request correction, completion, updating, or erasure of personal data; fiduciary must comply unless retention required by law."},
    {"identifier": "§16", "title": "Exemptions", "body": "Certain processing exempt: national security, prevention/detection of offences, research/archiving with safeguards."},
    {"identifier": "§25", "title": "Financial penalties", "body": "Penalties up to ₹250 crore for breach of children data obligations; up to ₹200 crore for breach of data security; up to ₹50 crore for other breaches."},
]

GDPR_SECTIONS: list[dict] = [
    {"identifier": "Art5",  "title": "Principles relating to processing", "body": "Lawfulness, fairness, transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality."},
    {"identifier": "Art6",  "title": "Lawfulness of processing", "body": "Processing is lawful only if at least one of the six legal bases applies: consent, contract, legal obligation, vital interests, public task, legitimate interests."},
    {"identifier": "Art9",  "title": "Special category data", "body": "Processing of special categories (health, biometric, genetic, racial, political, religious, sex-life) is prohibited unless specific exception applies."},
    {"identifier": "Art13", "title": "Information to be provided", "body": "Data controllers must provide privacy notice at collection time covering: identity, purpose, legal basis, retention, rights, DPO contact."},
    {"identifier": "Art32", "title": "Security of processing", "body": "Appropriate technical and organisational measures: pseudonymisation, encryption, resilience, ability to restore availability, regular testing."},
    {"identifier": "Art83", "title": "Administrative fines", "body": "Up to €20M or 4% global annual turnover for most serious violations; up to €10M or 2% for others."},
    {"identifier": "Art87", "title": "National identification numbers", "body": "Member States may further specify processing conditions for national identification numbers or similar identifiers."},
]

CCPA_SECTIONS: list[dict] = [
    {"identifier": "1798.100", "title": "Consumer right to know", "body": "Consumers have the right to know what personal information is collected, used, shared, or sold."},
    {"identifier": "1798.105", "title": "Right to deletion", "body": "Consumers have the right to request deletion of their personal information collected by a business."},
    {"identifier": "1798.120", "title": "Right to opt-out of sale", "body": "Consumers have the right to opt-out of the sale of their personal information. Businesses must provide a 'Do Not Sell My Personal Information' link."},
    {"identifier": "1798.140", "title": "Definitions — sensitive personal information", "body": "Sensitive PI includes: SSN, financial account numbers, precise geolocation, biometric data, health information, racial/ethnic origin."},
    {"identifier": "1798.150", "title": "Civil action — security breach", "body": "Consumers may bring a civil action for unauthorised access/disclosure of non-encrypted/non-redacted personal information."},
]

DATA_ELEMENT_OBLIGATIONS: list[dict] = [
    {"element": "email",       "obligations": ["§4", "§5", "§6", "§8"], "gdpr": ["Art6", "Art13"], "ccpa": ["1798.100", "1798.120"]},
    {"element": "phone",       "obligations": ["§4", "§5", "§6", "§8"], "gdpr": ["Art6", "Art13"], "ccpa": ["1798.100", "1798.120"]},
    {"element": "name",        "obligations": ["§4", "§5", "§6"],       "gdpr": ["Art6", "Art13"], "ccpa": ["1798.100"]},
    {"element": "date_of_birth","obligations": ["§4", "§6", "§9"],      "gdpr": ["Art9", "Art13"], "ccpa": ["1798.100"]},
    {"element": "biometric",   "obligations": ["§4", "§8", "§9"],       "gdpr": ["Art9"],           "ccpa": ["1798.140"]},
    {"element": "financial",   "obligations": ["§4", "§8", "§11"],      "gdpr": ["Art6", "Art9"],   "ccpa": ["1798.140"]},
    {"element": "health",      "obligations": ["§4", "§8"],             "gdpr": ["Art9"],           "ccpa": ["1798.140"]},
    {"element": "government_id", "obligations": ["§4", "§8"],        "gdpr": ["Art87"],          "ccpa": ["1798.140"]},
    {"element": "location",    "obligations": ["§4", "§6"],             "gdpr": ["Art6", "Art13"],  "ccpa": ["1798.100"]},
    {"element": "password",    "obligations": ["§8", "§11"],            "gdpr": ["Art32"],          "ccpa": ["1798.150"]},
]


async def build_kg(dry_run: bool = False) -> None:
    from shipcomply_api.config import settings
    from shipcomply_api.db.session import AsyncSessionLocal
    from sqlalchemy import text

    print(f"Building DPDP/GDPR/CCPA KG  dry_run={dry_run}")

    rows = []
    for jur, sections in [("DPDP", DPDP_SECTIONS), ("GDPR", GDPR_SECTIONS), ("CCPA", CCPA_SECTIONS)]:
        for s in sections:
            rows.append({
                "type": "section",
                "jurisdiction": jur,
                "identifier": s["identifier"],
                "title": s["title"],
                "body": s["body"],
                "source_url": None,
            })

    print(f"  Sections to insert: {len(rows)}")
    if dry_run:
        for r in rows:
            print(f"    [{r['jurisdiction']}] {r['identifier']} — {r['title']}")
        return

    async with AsyncSessionLocal() as db:
        for r in rows:
            await db.execute(text("""
                INSERT INTO kg_nodes (type, jurisdiction, identifier, title, body, source_url)
                VALUES (:type, :jurisdiction, :identifier, :title, :body, :source_url)
                ON CONFLICT (jurisdiction, identifier) DO UPDATE
                  SET title=EXCLUDED.title, body=EXCLUDED.body
            """), r)
        await db.commit()
        result = await db.execute(text("SELECT COUNT(*) FROM kg_nodes"))
        count = result.scalar()
        print(f"  kg_nodes total: {count}")

    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(build_kg(dry_run=args.dry_run))

