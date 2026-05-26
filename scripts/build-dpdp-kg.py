#!/usr/bin/env python3
"""Build DPDP/GDPR/CCPA knowledge graph into Postgres kg_nodes table."""
from __future__ import annotations
import argparse, asyncio, sys, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "services/api/src"))

SECTIONS = [
    ("DPDP","§2","Definitions","Defines data principal, data fiduciary, personal data, processing, consent, data processor, digital office, significant data fiduciary."),
    ("DPDP","§4","Grounds for processing personal data","Personal data may be processed only for a lawful purpose for which the data principal has given consent, or for certain legitimate uses."),
    ("DPDP","§5","Notice","Before requesting consent the data fiduciary must give a clear notice describing the personal data to be collected and the purpose."),
    ("DPDP","§6","Consent","Consent must be free, specific, informed, unconditional, unambiguous; given by clear affirmative action; limited to the specified purpose."),
    ("DPDP","§7","Certain legitimate uses","Processing without consent permitted for: state functions, compliance with law, medical emergency, employment, public interest."),
    ("DPDP","§8","General obligations of data fiduciary","Ensure accuracy; implement security safeguards; notify breaches; erase data when purpose fulfilled."),
    ("DPDP","§9","Processing of personal data of children","Verifiable parental consent required for under-18. Prohibition on tracking, behavioural monitoring, targeted advertising to children."),
    ("DPDP","§10","Additional obligations of significant data fiduciary","SDF must appoint DPO, conduct DPIA, have data auditor, comply with additional obligations."),
    ("DPDP","§11","Rights of data principal","Rights to: access information, correct/erase data, grievance redressal, nominate a person."),
    ("DPDP","§13","Right to correction and erasure","Data principal may request correction, completion, updating, or erasure; fiduciary must comply unless retention required by law."),
    ("DPDP","§16","Exemptions","Exempt: national security, prevention/detection of offences, research/archiving with safeguards."),
    ("DPDP","§25","Financial penalties","Penalties up to 250 crore for children data breach; 200 crore for data security breach; 50 crore for other breaches."),
    ("GDPR","Art5","Principles relating to processing","Lawfulness, fairness, transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality."),
    ("GDPR","Art6","Lawfulness of processing","Processing lawful only if one of six legal bases applies: consent, contract, legal obligation, vital interests, public task, legitimate interests."),
    ("GDPR","Art9","Special category data","Processing of health, biometric, genetic, racial, political, religious data prohibited unless specific exception applies."),
    ("GDPR","Art13","Information to be provided","Controllers must provide privacy notice covering: identity, purpose, legal basis, retention, rights, DPO contact."),
    ("GDPR","Art32","Security of processing","Appropriate technical and organisational measures: pseudonymisation, encryption, resilience, regular testing."),
    ("GDPR","Art83","Administrative fines","Up to 20M EUR or 4% global annual turnover for most serious violations."),
    ("GDPR","Art87","National identification numbers","Member States may further specify conditions for processing national identification numbers."),
    ("CCPA","1798.100","Consumer right to know","Consumers have the right to know what personal information is collected, used, shared, or sold."),
    ("CCPA","1798.105","Right to deletion","Consumers have the right to request deletion of their personal information."),
    ("CCPA","1798.120","Right to opt-out of sale","Consumers have the right to opt-out of the sale of their personal information."),
    ("CCPA","1798.140","Sensitive personal information","Sensitive PI includes: SSN, financial account numbers, precise geolocation, biometric data, health information."),
    ("CCPA","1798.150","Civil action — security breach","Consumers may bring a civil action for unauthorised access/disclosure of non-encrypted personal information."),
    ("CCPA","1798.155","Attorney General enforcement","AG may bring civil action; civil penalties up to $2500 per violation, $7500 per intentional violation."),
]

async def build_kg(dry_run: bool = False) -> None:
    from shipcomply_api.db.session import AsyncSessionLocal
    from sqlalchemy import text

    print(f"Building KG  sections={len(SECTIONS)}  dry_run={dry_run}")
    if dry_run:
        for jur, ident, title, _ in SECTIONS:
            print(f"  [{jur}] {ident} -- {title}")
        return

    async with AsyncSessionLocal() as db:
        for jur, ident, title, body in SECTIONS:
            await db.execute(text("""
                INSERT INTO kg_nodes (id, node_type, jurisdiction, identifier, title, body, source_url)
                VALUES (:id, :node_type, :jurisdiction, :identifier, :title, :body, :source_url)
                ON CONFLICT (jurisdiction, identifier) DO UPDATE
                  SET title=EXCLUDED.title, body=EXCLUDED.body
            """), {
                "id": str(uuid.uuid4()),
                "node_type": "section",
                "jurisdiction": jur,
                "identifier": ident,
                "title": title,
                "body": body,
                "source_url": None,
            })
        await db.commit()
        result = await db.execute(text("SELECT COUNT(*) FROM kg_nodes"))
        print(f"  kg_nodes total: {result.scalar()}")
    print("Done.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(build_kg(dry_run=parser.parse_args().dry_run))