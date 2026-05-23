# ShipComply — 3-Minute Demo Script

Rehearse this 5 times before judging.

## Setup (T-30 min before judging)

```bash
# Pre-warm cache
python scripts/prewarm-demo-cache.py --path examples/sample-nextjs-app

# Open tabs
open https://shipcomply.dev
open https://shipcomply.dev/dashboard
```

## The Script (3 min)

### 0:00 — Hook (20 s)
> "Every Indian startup that collects an email address is now subject to the DPDP Act.
> Penalties up to ₹250 crore. Most have no idea what data they're collecting or where.
> ShipComply fixes that in 5 minutes — automatically."

### 0:20 — Scan (90 s)
Open terminal:
```bash
npx shipcomply scan ./examples/sample-nextjs-app
```
While it runs, say:
> "ShipComply reads your source code — not your data. The AST scanner finds every
> PII field, every analytics SDK, every database write. No manual forms."

Point to the output:
> "7 PII types detected. Aadhaar, PAN, email, phone. All mapped to DPDP sections."

### 1:50 — Dashboard (40 s)
Open `https://shipcomply.dev/scans/<id>`:
> "Here's the compliance score — 60/100. Two HIGH findings: Aadhaar and PAN with
> no explicit consent gate. The score denominator accounts for what was scanned —
> a repo with no PII scores N/A, not 100."

Click a finding:
> "Every finding links to the exact file and line. No guessing."

### 2:30 — Artifacts (25 s)
```bash
cat examples/sample-nextjs-app/PRIVACY.md | head -40
```
> "ShipComply generated a complete privacy policy — with citations to the actual
> files where data is collected. And a consent banner, and deletion endpoints.
> All tagged AI-GENERATED DRAFT — you still need a lawyer, but you start with
> something real."

### 2:55 — Close (5 s)
> "ShipComply. DPDP compliance from zero to first draft in under 5 minutes."

## Backup if demo fails

Have `examples/sample-nextjs-app/PRIVACY.md` and `audit-report.md` pre-generated.
Open them in VS Code as static fallback. Score: 60/100, 4 findings.
