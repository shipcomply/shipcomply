# ShipComply — Technical Architecture & Product Specification

**Version:** 1.0
**Last Updated:** May 23, 2026
**Status:** Pre-Build (Hackathon kickoff May 25, 2026)
**Author:** Harsh Thapliyal (Product), with Martha Kumari (PM)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Target Users & Use Cases](#3-target-users--use-cases)
4. [What DPDP Actually Requires (Technical Translation)](#4-what-dpdp-actually-requires-technical-translation)
5. [Competitive Landscape & Differentiation](#5-competitive-landscape--differentiation)
6. [System Architecture (High Level)](#6-system-architecture-high-level)
7. [Component Deep Dives](#7-component-deep-dives)
8. [Tech Stack & Rationale](#8-tech-stack--rationale)
9. [Database Schema](#9-database-schema)
10. [API Design](#10-api-design)
11. [Product Surfaces & Features](#11-product-surfaces--features)
12. [UI Design Requirements](#12-ui-design-requirements)
13. [Hackathon Build Plan (7 Days)](#13-hackathon-build-plan-7-days)
14. [Risks, Limitations & Mitigations](#14-risks-limitations--mitigations)
15. [Open Source vs Commercial Strategy](#15-open-source-vs-commercial-strategy)

---

## 1. Product Overview

### What ShipComply Is

ShipComply is a **codebase-aware privacy compliance engine** that scans source code, detects all data collection and processing patterns, and generates the technical and legal artifacts needed to comply with India's DPDP Act 2023 (and optionally GDPR, CCPA).

### What It Generates from a Single Repo Scan

| Output | Format | DPDP Mapping |
|---|---|---|
| Data flow inventory (RoPA-ready) | JSON + UI dashboard | Section 8 — Data Fiduciary obligations |
| Privacy notice with code citations | Markdown + PDF | Section 5 — Notice requirements |
| Consent banner component | React/Next.js TSX | Section 6 — Valid consent |
| Consent management API | REST endpoints (TypeScript) | Section 6 + 7 — Consent recording |
| Data deletion endpoint | REST endpoint | Section 12 — Right to correction & erasure |
| Data export endpoint | REST endpoint | Section 11 — Right to nominate / portability |
| 72-hr breach notification template | Markdown + workflow | Rule 7 (DPDP Rules 2025) |
| Compliance gap report | PDF + dashboard | Audit-ready document |

### Core Architectural Principle

ShipComply does **not** replace lawyers. It produces a *compliance-ready first draft* by reading what the code actually does, so the legal review starts from a 90% accurate baseline instead of a blank page.

---

## 2. The Problem We're Solving

### Regulatory Context (Verified)

- **DPDP Act 2023** was notified November 2025; full enforcement expected May 2027
- Penalties: **up to ₹250 Crore for security breach**, up to ₹200 Crore for failure to protect children's data
- **Business Requirements Document (BRD)** for Consent Management was released by MeitY on June 6, 2025 — this is the technical blueprint we must align with
- DPDP Rules 2025 require: 72-hour breach notification, automated data deletion on retention expiry, verifiable parental consent for under-18 users, English + regional language notices

### The Three Pain Points

**Pain 1 — The Compliance Gap is Massive**
68% of companies operating in India admit incomplete understanding of DPDP Phase 1 obligations (source: industry reports). Most haven't started.

**Pain 2 — Existing Solutions Don't Work**
- Law firms: ₹2-5 lakhs, 2-3 months, doesn't scale to product velocity
- Template generators (Termly, Iubenda): Produce generic policies disconnected from actual code behavior — a liability when the policy says "we don't sell data" but the code sends events to 6 third-party SDKs
- Enterprise compliance platforms (Privado AI, OneTrust): Enterprise pricing, sales-led, built for compliance teams not developers
- Consent SDKs (Consentin, OneTrust SDK): Solve consent recording but don't generate the policies, don't read code, don't catch new data flows

**Pain 3 — The Policy-Code Drift Problem**
Even compliant companies drift. A developer adds Mixpanel to track button clicks → privacy policy is now outdated → no one notices until an audit. There is no tool that watches code changes and auto-updates compliance artifacts.

---

## 3. Target Users & Use Cases

### Primary Persona: The Startup CTO/Founding Engineer

**Profile:** 5-50 person Indian startup, recently funded or about to be, just got asked about DPDP by an investor or got a regulatory notice.

**Job to be Done:** "I need to know what data my app collects, what my exposure is, and what I need to fix — without spending ₹5 lakhs on lawyers or 3 months learning the law."

**Where they live:** GitHub, terminal, Slack, VS Code

**Surface they'll use:** CLI first (`npx shipcomply scan`), then Web Dashboard for the audit report, then GitHub App for continuous monitoring

### Secondary Persona: The Enterprise DPO

**Profile:** Privacy lead at 200+ person company, reports to CISO or General Counsel, responsible for DPIA, RoPA, breach response

**Job to be Done:** "I need automated, audit-defensible documentation across all our products — not a once-a-year manual exercise."

**Surface:** Web Dashboard with portfolio view + API access for integration with existing GRC tools (OneTrust, TrustArc)

### Tertiary Persona: The Compliance Consultant

**Profile:** Boutique privacy consultancy serving 10-50 startup clients in India

**Job to be Done:** "Help my clients become compliant faster, charge less, deliver more."

**Surface:** Multi-tenant dashboard with white-labeling

### Core Use Cases (Ranked by Priority)

1. **First Scan** — Founder pastes GitHub URL, gets data flow map + draft policy in <5 minutes
2. **Continuous PR Monitoring** — GitHub App auto-comments on PRs that add new data collection
3. **Investor Due Diligence** — Founder generates an audit report PDF in one click during DD
4. **Policy Update Workflow** — Code change triggers policy diff for review
5. **Multi-Repo Portfolio Scan** — CTO of multi-product company scans 10 repos and gets unified compliance dashboard
6. **Regulatory Update** — DPDP Rules change, all customer policies auto-flag affected sections

---

## 4. What DPDP Actually Requires (Technical Translation)

This is the source of truth for what the system must detect, generate, and validate.

### Section 4 — Lawful Processing

Personal data may only be processed for a lawful purpose with consent OR for legitimate uses (Section 7).

**Technical implication:** Every data flow detected must be tagged with its lawful basis. Default = "consent required."

### Section 5 — Notice (Privacy Policy)

Notice must contain:
- (a) Identity of Data Fiduciary (company legal name, address)
- (b) Description of personal data being processed
- (c) Purposes for each category of processing
- (d) Manner in which Data Principals can exercise their rights
- (e) Manner of filing a complaint with the Data Protection Board

**Notice must be available in English plus 22 scheduled languages.**

**Technical implication:** Our generator must produce sectioned notices with each detected data type mapped to its purpose and lawful basis. Multilingual output is V2.

### Section 6 — Valid Consent

Consent must be: **free, specific, informed, unconditional, unambiguous, demonstrated by clear affirmative action.**

**Prohibited patterns:**
- Pre-checked boxes
- Prominent "Accept" + hidden "Reject"
- Consent walls
- Bundled consents
- Confusing language

**Technical implication:** Our generated consent banner code must enforce these rules architecturally. Equal visual weight for accept/reject. Granular per-purpose consent. No dark patterns.

### Section 8 — Data Fiduciary Obligations

Must:
- Process data only for the stated purpose
- Maintain data accuracy
- Implement reasonable security safeguards
- Notify breaches to DPB and affected Principals
- Erase data when purpose is fulfilled OR consent is withdrawn

**Technical implication:** We must detect data storage points and check for: retention configuration, encryption at rest, breach detection hooks.

### Section 11 — Right to Information

Data Principal can request: summary of personal data being processed + processing activities undertaken.

**Technical implication:** Generated `/api/user/data-summary` endpoint.

### Section 12 — Right to Correction and Erasure

Data Principal can request correction, completion, updating, or erasure of their data.

**Technical implication:** Generated `/api/user/data` (PATCH for correction, DELETE for erasure) endpoints.

### Rule 7 of DPDP Rules 2025 — Breach Notification

72-hour notification window to DPB. Must include: nature of breach, affected data categories, mitigation steps, contact details.

**Technical implication:** Generated incident logging middleware + breach notification template.

### Rule 10 — Consent Manager Interoperability (Future)

The BRD specifies APIs for secure communication between Data Fiduciaries and registered Consent Managers. Encryption, time-stamped consent artifacts, privacy-by-design.

**Technical implication:** Generated consent storage must use the BRD's recommended data structure for future Consent Manager integration.

---

## 5. Competitive Landscape & Differentiation

### Privado AI (Closest Competitor)

**What they do:** Static code scanning for data flow detection. Open-source CLI scanner (Privado OSS) + paid Cloud platform. Supports Java, Python (GA), JS/TS coming.

**Architecture:** Static code analysis → knowledge graph → JSON output (`.privado/privado.json`) → optional sync to Cloud Dashboard. Open-source uses regex; paid uses AI for detection.

**Output:** PII inventory + data flow map + RoPA-ready reports. **Detects 110+ personal data elements.** Maps flows to sinks (third parties, databases, logs, internal APIs).

**Strengths:** Mature scanner, enterprise customers, open-source distribution, knowledge graph approach.

**Weaknesses:**
- Enterprise-priced, sales-led GTM
- Detects but doesn't *generate* — no privacy policy generation, no consent code generation, no audit reports
- No India-specific DPDP focus
- No continuous PR-level monitoring (it's scan-on-demand)

### Other Competitors

| Tool | What They Do | Where ShipComply Wins |
|---|---|---|
| **Termly / Iubenda** | Template-based privacy policy generators | We read your actual code; they assume |
| **OneTrust** | Enterprise GRC platform | We're developer-first, they're sales-led |
| **Consentin** | India-focused consent SDK | We generate the consent code; they provide an embeddable SDK |
| **CodeRabbit** | AI code review for PRs | We focus on compliance specifically, not general code review |
| **Apiiro** | ASPM (Application Security Posture Management) | We focus on privacy/data flows; they focus on security |

### ShipComply's Unique Position

We're the **only tool that does all four**:
1. Scans code to detect data flows (like Privado)
2. Generates policy text mapped to code (unlike everyone)
3. Generates consent management code (unlike everyone)
4. Continuously monitors PRs for compliance drift (unlike everyone)

**Tagline for positioning:** *"Privado finds the problems. ShipComply ships the solutions."*

---

## 6. System Architecture (High Level)

### Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SURFACES                                │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │   CLI    │  │ Web Dashboard│  │ GitHub App │  │ VS Code Ext  │   │
│  │ (npm pkg)│  │  (Next.js)   │  │  (Probot)  │  │   (V2)       │   │
│  └────┬─────┘  └──────┬──────┘  └──────┬─────┘  └──────┬───────┘   │
└───────┼───────────────┼─────────────────┼────────────────┼──────────┘
        │               │                 │                │
        └───────────────┴────────┬────────┴────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                           │
│        Auth · Rate Limiting · Request Routing · Webhooks             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                             │
│              Job Queue (Redis + BullMQ) · Workflow Engine            │
└─────┬──────────┬─────────────┬─────────────┬─────────────┬──────────┘
      │          │             │             │             │
      ▼          ▼             ▼             ▼             ▼
┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ SCANNER  │ │  LEGAL  │ │  CODE    │ │  AUDIT   │ │ SENTINEL │
│  AGENT   │ │  WRITER │ │  GEN     │ │  AGENT   │ │  AGENT   │
│          │ │  AGENT  │ │  AGENT   │ │          │ │ (V2)     │
└────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │           │            │            │
     ▼            ▼           ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                             │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ Tree-sitter│ │ Vector   │ │ Codex /  │ │  Knowledge       │    │
│  │  Parsers   │ │ DB       │ │ GPT-5.5  │ │  Graph (Neo4j)   │    │
│  │            │ │ (Chroma) │ │   API    │ │                  │    │
│  └────────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                               │
│   PostgreSQL (metadata)  ·  S3 (artifacts)  ·  Redis (cache)        │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow (End-to-End)

```
1. User triggers scan
   └─> CLI command OR Dashboard URL paste OR GitHub PR webhook
2. API receives request, validates auth, creates Scan Job
3. Job pushed to Redis queue
4. Scanner Worker picks up job
   ├─> Clones repo (or fetches changed files for PR scans)
   ├─> Detects language/framework (package.json, requirements.txt)
   ├─> Runs tree-sitter parsers on relevant files
   ├─> Builds AST → CFG (Control Flow Graph) → PDG (Program Dependence Graph)
   ├─> Pattern-matches PII collection points
   ├─> Maps data flows to sinks
   └─> Writes Knowledge Graph to Neo4j + structured JSON to S3
5. Legal Writer Worker picks up next stage
   ├─> Reads Knowledge Graph
   ├─> Queries Vector DB for relevant DPDP/GDPR sections
   ├─> Generates policy sections with code citations
   └─> Outputs Markdown to S3
6. Code Generator Worker
   ├─> Reads Knowledge Graph + detected framework
   ├─> Generates consent banner, deletion API, export API
   └─> Outputs code files to S3
7. Audit Worker
   ├─> Compares Knowledge Graph against DPDP requirement matrix
   ├─> Scores compliance per regulation
   └─> Generates PDF + JSON report
8. API marks job complete, notifies user
9. User downloads artifacts via Dashboard / CLI
```

---

## 7. Component Deep Dives

### 7.1 Scanner Agent

**Purpose:** Convert source code into a structured Knowledge Graph of data flows.

**Tech Stack:**
- **Tree-sitter** for multi-language AST parsing (Wikipedia: incremental parser used by static analyzers, supports 40+ languages with grammars)
- **Custom CFG/PDG builders** (inspired by `static-pdg-js` approach: AST → CFG via control flow edges → PDG via data flow edges)
- **Codex API** for semantic disambiguation of ambiguous code patterns

**What It Detects (Modeled on Privado's 110+ data elements):**

| Category | Detection Method | Examples |
|---|---|---|
| **PII Sources** | AST pattern matching | Form input names (`email`, `phone`, `aadhar`, `pan`), API request body fields, user profile schemas |
| **Sensitive Data** | Field name + context | Health data, biometric, financial, sexual preferences, location, IP address |
| **Online Identifiers** | Library imports + usage | Cookies (js-cookie, document.cookie), device IDs (IDFA), Mac/IP capture |
| **Children's Data** | Field name detection | Birthdate, age, parent_email — triggers under-18 flag |
| **Data Sinks: Storage** | Database client calls | Prisma `create`, Mongoose `save`, raw SQL inserts |
| **Data Sinks: Third Party** | Package imports | `@segment/analytics`, `mixpanel-browser`, `posthog-js`, `@google-analytics/gtag`, Razorpay, Stripe |
| **Data Sinks: Leakage** | Logger calls | `console.log` with PII vars, Winston, Pino, Sentry capture |
| **Data Sinks: Internal APIs** | Network calls | `fetch`, `axios`, `got` to internal services |
| **File Uploads** | Middleware patterns | `multer`, S3 SDK, Cloudinary, formidable |
| **Authentication** | Auth library detection | NextAuth, Passport, Firebase Auth, Clerk |
| **Consent Tracking** | Existing CMS detection | OneTrust, Cookiebot, Consentin SDK presence |

**Scanner Output Format (Knowledge Graph Node Schema):**

```json
{
  "scan_id": "scan_abc123",
  "repo": "github.com/example/myapp",
  "commit_sha": "a1b2c3d4",
  "scanned_at": "2026-05-26T10:30:00Z",
  "language_stack": ["TypeScript", "Next.js 14"],
  "data_elements": [
    {
      "id": "de_001",
      "category": "PII",
      "type": "email_address",
      "sensitivity": "medium",
      "confidence": 0.95,
      "sources": [
        {
          "file": "src/components/SignupForm.tsx",
          "line": 24,
          "context": "<input name='email' type='email' />"
        }
      ],
      "sinks": [
        {
          "type": "storage",
          "file": "src/api/auth/signup.ts",
          "line": 12,
          "destination": "prisma.user.create",
          "table": "users.email"
        },
        {
          "type": "third_party",
          "file": "src/lib/analytics.ts",
          "line": 8,
          "destination": "mixpanel.identify",
          "vendor": "Mixpanel"
        }
      ]
    }
  ],
  "data_flows": [
    {
      "id": "df_001",
      "from": "de_001",
      "path": ["SignupForm.tsx:24", "signup.ts:12", "prisma.user.create"],
      "purpose_inferred": "user_account_creation",
      "lawful_basis_required": "consent"
    }
  ],
  "frameworks_detected": {
    "frontend": "next.js@14",
    "auth": "next-auth@4",
    "analytics": ["mixpanel-browser", "@vercel/analytics"],
    "payment": "razorpay@2",
    "database": "prisma@5"
  },
  "compliance_flags": {
    "missing_consent_management": true,
    "missing_data_deletion_endpoint": true,
    "logs_pii_in_plaintext": false,
    "third_parties_without_dpa": ["Mixpanel"]
  }
}
```

**Critical Engineering Decisions:**

1. **AST + CFG + PDG** (not just regex like Privado OSS). This gives us *true data flow tracking* — we know not just that email is collected, but that it flows through specific transformations to specific sinks.

2. **Two-stage detection:** Tree-sitter for structural patterns (fast, deterministic) + Codex for semantic disambiguation (when context matters — is `name` user's name or a variable label?).

3. **Local-first scanning:** Code never leaves the user's machine if they run via CLI. Only the structured Knowledge Graph JSON is uploaded for analysis. (Privado does this; it's table stakes for enterprise.)

### 7.2 Legal Writer Agent (RAG Pipeline)

**Purpose:** Generate legally-grounded policy text from the Knowledge Graph.

**Research-Backed Architecture:**

Based on RAG research for legal/regulatory documents:
- **Recursive chunking** by document structure (Section → Sub-section → Clause) — preserves semantic boundaries
- **Cross-encoder re-ranking** improves faithfulness scores from 0.621 → 0.797 in policy QA tasks
- **Document-Level Retrieval Mismatch (DRM)** is the #1 failure mode — chunks pulled from wrong regulation can cause hallucination. Mitigation: per-jurisdiction filtering on retrieval.
- **Late chunking** (Günther et al. 2024) preserves cross-clause references in legal text where "Section 3.2 above" matters

**Source Corpus (Pre-indexed before hackathon):**

| Document | Source | Chunks (~) |
|---|---|---|
| DPDP Act 2023 (full text) | egazette.nic.in | ~150 |
| DPDP Draft Rules 2025 | meity.gov.in | ~80 |
| BRD for Consent Management (June 2025) | MeitY | ~40 |
| GDPR Articles 5-22 | EUR-Lex | ~50 |
| CCPA full text | OAG California | ~60 |
| ASCI Code (for advertising compliance overlap) | ASCI | ~30 |

**Pipeline:**

```
Knowledge Graph + Detected Jurisdiction
            │
            ▼
   ┌──────────────────┐
   │ Prompt Builder   │  ── Constructs structured prompt per policy section
   └────────┬─────────┘
            ▼
   ┌──────────────────┐
   │ Hybrid Retrieval │  ── BM25 (keyword) + Vector Search (semantic)
   │  + Re-ranker     │      Top-20 → Cross-encoder → Top-5
   └────────┬─────────┘
            ▼
   ┌──────────────────┐
   │ Codex/GPT-5.5    │  ── Generates section with citations
   │ Function Calling │
   └────────┬─────────┘
            ▼
   ┌──────────────────┐
   │ Citation Validator│  ── Ensures every claim links to retrieved chunk
   └────────┬─────────┘
            ▼
       Policy Markdown
```

**Generated Privacy Policy Structure (DPDP-compliant):**

```markdown
# Privacy Policy

## 1. Identity of the Data Fiduciary [DPDP §5(a)]
[Auto-generated from package.json author / GitHub org]

## 2. Personal Data We Collect [DPDP §5(b)]
### 2.1 Account Information
We collect your **email address** when you create an account through our signup form.
*Source: `src/components/SignupForm.tsx` line 24*

### 2.2 Behavioral Data
We collect **page views and click events** through Mixpanel.
*Source: `src/lib/analytics.ts` line 8*

[...continues per detected data element]

## 3. Purposes of Processing [DPDP §5(c)]
[Mapped from inferred purposes in Knowledge Graph]

## 4. Lawful Basis [DPDP §4]
[Per-purpose lawful basis statement]

## 5. Your Rights as a Data Principal [DPDP §11, §12, §13]
- Right to information and confirmation
- Right to correction and erasure
- Right to grievance redressal
- Right to nominate

## 6. How to Exercise Your Rights
- Email: privacy@[company].com
- Self-service: [link to /privacy-center]

## 7. Grievance Officer [DPDP §10]
[Placeholder — requires manual designation]

## 8. Filing a Complaint with the DPB [DPDP §5(e)]
You may file a complaint with the Data Protection Board of India at [link].

## 9. Third Parties We Share Data With
| Vendor | Data Shared | Purpose | DPA Status |
|---|---|---|---|
| Mixpanel | Behavioral events | Analytics | ⚠️ DPA needed |
| Razorpay | Payment info | Payment processing | ✓ Standard DPA |

## 10. Data Retention [DPDP §8(7)]
[Per-category retention periods]

## 11. Security Measures [DPDP §8(5)]
[Auto-detected encryption, hashing, TLS practices]

## 12. Children's Data [DPDP §9]
[If under-18 fields detected, requires verifiable parental consent flow]
```

**Each generated section includes:**
- A code citation (specific file + line)
- A DPDP section reference
- A confidence score (0-100%)
- A "Manual review recommended" flag where ambiguous

### 7.3 Code Generator Agent

**Purpose:** Generate framework-specific, deployment-ready code that implements compliance.

**Detection → Generation Mapping:**

| Detected Framework | Generated Artifacts |
|---|---|
| Next.js 13+ App Router | `app/components/ConsentBanner.tsx`, `app/api/consent/route.ts`, `app/api/user/data/route.ts`, `middleware.ts` for consent gating |
| Next.js Pages Router | `components/ConsentBanner.tsx`, `pages/api/consent.ts`, `pages/api/user/data.ts` |
| Express/Node | `middleware/consent.ts`, `routes/consent.ts`, `routes/userData.ts` |
| FastAPI Python | `middleware/consent.py`, `routers/consent.py`, `routers/user_data.py` |
| React (CRA/Vite) | `components/ConsentBanner.jsx`, `hooks/useConsent.js` |

**Generated Consent Banner Requirements (DPDP §6 compliant):**

```typescript
// All generated banners MUST enforce:
// 1. Equal visual weight: "Accept" and "Reject" buttons same size/color
// 2. Granular: separate toggles for Analytics, Marketing, Functional
// 3. No pre-checked boxes
// 4. Withdrawal as easy as giving consent
// 5. Plain language description per category
// 6. Persisted consent receipt with timestamp + IP + version
```

**Generated Code Quality Standards:**
- Zero external dependencies beyond what's already in `package.json`
- TypeScript strict mode compatible
- Tailwind classes (if Tailwind detected) OR vanilla CSS
- Inline comments explaining DPDP mapping
- Copy-paste ready: drop file into project, it works

### 7.4 Audit Agent

**Purpose:** Score compliance, identify gaps, generate regulator-ready reports.

**Compliance Scoring Matrix:**

| DPDP Requirement | Detection Method | Weight | Score |
|---|---|---|---|
| Privacy Notice exists | Check repo for `PRIVACY.md` or `/privacy` route | 10% | 0/100 |
| Consent management implemented | Detect consent SDK or generated code | 15% | 0/100 |
| Data deletion endpoint | Detect DELETE `/api/user` route | 10% | 0/100 |
| Data export endpoint | Detect GET `/api/user/export` route | 5% | 0/100 |
| Encryption at rest | Detect DB encryption config | 10% | 0/100 |
| TLS in transit | Check for HTTPS-only headers | 5% | 0/100 |
| PII not logged in plaintext | AST scan of logger calls | 10% | 0/100 |
| Third-party DPAs in place | Cross-ref detected vendors with known DPA list | 10% | 0/100 |
| Breach notification mechanism | Detect error monitoring + incident response code | 5% | 0/100 |
| Retention policy implemented | Detect TTL fields or scheduled deletion jobs | 10% | 0/100 |
| Children's data protection | If under-18 fields detected, verify parental consent | 5% | 0/100 |
| Grievance officer designation | Check policy text for officer details | 5% | 0/100 |

**Total: 0-100 ShipComply Compliance Score**

**Output: PDF Audit Report Structure:**

1. Executive Summary (1 page)
2. Compliance Score Breakdown (visualizations)
3. Data Processing Inventory (RoPA format)
4. Gap Analysis with Severity Ratings
5. Remediation Roadmap with Code Snippets
6. Audit Trail (scan history with timestamps)
7. Appendix: Full Data Flow Graph

### 7.5 Sentinel Agent (V2 — Post-Hackathon Killer Feature)

**Purpose:** Continuous compliance monitoring via GitHub App.

**Architecture (Based on Industry-Standard PR Bot Pattern):**

```
GitHub PR Event
       │
       ▼
GitHub Webhook → Webhook API (FastAPI/Fastify)
       │
       ▼
Validate + Enqueue Job (Redis Queue)
       │
       ▼
Analyzer Worker
   ├─> Fetch base + head commits
   ├─> Run Scanner Agent on changed files only
   ├─> Diff Knowledge Graph: what's new?
   ├─> If new data collection detected → run Legal Writer to draft policy diff
   ├─> Post structured PR comment via GitHub Checks API
   └─> Set status check (pass/fail based on severity)
       │
       ▼
GitHub Status Check on PR
   ├─> ✅ No compliance changes
   ├─> ⚠️  New data collection — policy update needed (warning)
   └─> ❌ Critical: PII logging detected (blocks merge if configured)
```

**Why GitHub App (not just Action):**
Per industry research (CodeRabbit, Privado, Qodo, etc.), GitHub Apps provide:
- Inline PR comments
- Status checks for merge blocking
- Persistent installation across all repos in org
- Higher API rate limits
- Better security (no token-in-CI exposure)

GitHub Actions alone limit you to CI-scoped operations and per-workflow tokens.

---

## 8. Tech Stack & Rationale

### Decision Matrix

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend (Dashboard)** | Next.js 14 + Tailwind + shadcn/ui | Standard, fast, hackathon-friendly |
| **API** | FastAPI (Python) | Native fit with Codex SDK + Tree-sitter Python bindings + RAG ecosystem |
| **Job Queue** | Redis + BullMQ (Node) OR Celery (Python) | Industry standard for async workers; matches reference architecture |
| **Database** | PostgreSQL (Neon serverless) | Free tier, serverless autoscaling, pgvector built-in |
| **Vector DB** | ChromaDB (hackathon) → Pinecone (production) | Chroma is local + free for hackathon; Pinecone scales |
| **Knowledge Graph** | Neo4j (V2) — for hackathon, JSON in Postgres | Neo4j is overkill for 7-day build; defer to V2 |
| **Code Parsing** | tree-sitter (npm: web-tree-sitter for browser, py-tree-sitter for backend) | Industry standard; supports 40+ languages via grammars |
| **LLM** | OpenAI Codex + GPT-5.5 (function calling) | Hackathon is Codex-themed; use it deeply |
| **Embeddings** | OpenAI text-embedding-3-small | Cheap, fast, good enough for legal corpus this size |
| **Storage** | Cloudflare R2 / S3 | For generated artifacts |
| **PDF Generation** | Puppeteer (Node) OR WeasyPrint (Python) | Both work; Puppeteer renders HTML→PDF cleanly |
| **CLI** | Node.js + Commander.js + Ink (React for CLI) | `npx shipcomply` distribution; Ink gives us the streaming-UI demo magic |
| **GitHub App** | Probot (Node) — Octokit-based | Standard for GitHub App development |
| **Deployment** | Vercel (frontend) + Railway/Render (backend) | Hackathon-friendly free tiers |
| **Auth** | Clerk (Google OAuth + GitHub OAuth) | Built-in, free tier, Clerk v5 |

### Why Python Backend + Node CLI (Hybrid)

- **Python backend:** Best ecosystem for LLM/RAG work (LangChain, ChromaDB, tree-sitter Python bindings, scientific computing for graph algorithms)
- **Node CLI:** `npx shipcomply` is the developer-native distribution; Ink lets us build the streaming terminal UI that makes the demo unforgettable

The CLI calls the backend API. No duplicated logic.

### What We're NOT Using (and Why)

| Avoided | Reason |
|---|---|
| LangChain | Too much abstraction overhead; direct OpenAI SDK is cleaner |
| Docker (for hackathon) | Adds setup complexity; deploy directly to Vercel/Railway |
| GraphQL | REST is faster to build; no client need for GraphQL flexibility |
| Multi-language scanner support (V1) | Scope: JS/TS + Next.js only for hackathon. Python in V2. |
| Custom auth | Use Clerk; don't roll our own |

---

## 9. Database Schema

### PostgreSQL Tables (Simplified for V1)

```sql
-- Organizations (multi-tenant from day one)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  github_org TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- free|indie|startup|business|enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  github_username TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- owner|admin|member|viewer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repos
CREATE TABLE repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  github_url TEXT NOT NULL,
  github_installation_id BIGINT, -- for GitHub App installations
  default_branch TEXT DEFAULT 'main',
  language_stack JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, github_url)
);

-- Scans (every analysis = one row)
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  commit_sha TEXT,
  branch TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|scanning|generating|complete|failed
  trigger TEXT NOT NULL, -- manual|cli|webhook|scheduled
  scan_started_at TIMESTAMPTZ,
  scan_completed_at TIMESTAMPTZ,
  compliance_score INTEGER, -- 0-100
  error_message TEXT
);

-- Knowledge Graph (data flows discovered in this scan)
CREATE TABLE data_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- PII|sensitive|online_identifier|children
  data_type TEXT NOT NULL, -- email|phone|aadhar|cookie|etc
  sensitivity TEXT NOT NULL, -- low|medium|high
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  sources JSONB NOT NULL, -- [{file, line, context}]
  sinks JSONB NOT NULL, -- [{type, file, line, destination, vendor}]
  metadata JSONB
);

-- Generated artifacts
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL, -- privacy_policy|tos|cookie_policy|consent_banner|deletion_api|export_api|audit_report
  format TEXT NOT NULL, -- markdown|tsx|ts|py|pdf|json
  storage_url TEXT NOT NULL, -- Cloudflare R2 / S3 URL
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance findings (gaps + recommendations)
CREATE TABLE compliance_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  severity TEXT NOT NULL, -- critical|high|medium|low|info
  regulation TEXT NOT NULL, -- DPDP|GDPR|CCPA
  regulation_section TEXT, -- e.g. "Section 5(b)"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_fix JSONB, -- {code_snippet, file_to_edit, line_range}
  status TEXT DEFAULT 'open', -- open|acknowledged|resolved|dismissed
  needs_human_review BOOLEAN DEFAULT FALSE
);

-- PR-level scans (V2 — Sentinel Agent)
CREATE TABLE pr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  pr_title TEXT,
  base_scan_id UUID REFERENCES scans(id),
  head_scan_id UUID REFERENCES scans(id),
  diff_summary JSONB, -- new_data_collection, removed_data_collection, severity
  posted_comment_id BIGINT, -- GitHub comment ID
  status_check TEXT, -- pass|warning|fail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (for compliance audit trail)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- scan_started|policy_generated|finding_resolved|etc
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. API Design

### Core Endpoints

```
POST   /api/v1/scans                    Create a new scan
GET    /api/v1/scans/:id                Get scan status + results
GET    /api/v1/scans/:id/artifacts      List generated artifacts
GET    /api/v1/scans/:id/artifacts/:type Download specific artifact
GET    /api/v1/scans/:id/findings       List compliance findings
PATCH  /api/v1/findings/:id             Update finding status

POST   /api/v1/repos                    Connect a new repo
GET    /api/v1/repos                    List connected repos
GET    /api/v1/repos/:id/scans          List scans for a repo

POST   /api/v1/webhooks/github          GitHub App webhook receiver
POST   /api/v1/cli/scan                 CLI-specific scan endpoint (returns SSE stream)
```

### Scan Request Schema

```json
POST /api/v1/scans
{
  "repo_url": "https://github.com/example/myapp",
  "branch": "main",
  "jurisdictions": ["DPDP", "GDPR"],
  "trigger": "manual",
  "deep_scan": true,
  "config": {
    "include_paths": ["src/**", "app/**"],
    "exclude_paths": ["**/*.test.*", "node_modules/**"],
    "framework_hint": "nextjs"
  }
}
```

### Server-Sent Events Stream (for live progress)

```
event: status
data: {"stage": "cloning", "progress": 10}

event: status
data: {"stage": "scanning", "progress": 30, "files_processed": 47}

event: detection
data: {"data_type": "email", "file": "SignupForm.tsx:24"}

event: status
data: {"stage": "generating_policy", "progress": 60}

event: status
data: {"stage": "complete", "progress": 100, "scan_id": "scan_abc123"}
```

---

## 11. Product Surfaces & Features

### 11.1 CLI Tool (`npx shipcomply`)

**Why this surface:** Developer-native, fastest path to demo magic, distribution via npm.

**Commands:**

```bash
# Scan current repo
npx shipcomply scan

# Scan specific repo URL
npx shipcomply scan https://github.com/user/repo

# Scan with specific jurisdictions
npx shipcomply scan --jurisdictions dpdp,gdpr

# Output to specific directory
npx shipcomply scan --out ./compliance/

# Watch mode (for development)
npx shipcomply watch

# Check status of running scan
npx shipcomply status <scan-id>

# Login (for paid features)
npx shipcomply login

# Initialize config file in repo
npx shipcomply init
```

**Generated `.shipcomply/` directory in user's repo:**

```
.shipcomply/
├── config.yml              # User config (jurisdictions, paths)
├── data-flow.json          # Latest Knowledge Graph
├── compliance-score.json   # Latest score breakdown
├── PRIVACY.md              # Generated privacy policy
├── TERMS.md                # Generated ToS
├── COOKIES.md              # Generated cookie policy
├── audit-report.pdf        # Latest audit
└── generated/              # Generated code files
    ├── ConsentBanner.tsx
    ├── api/
    │   ├── consent.ts
    │   ├── user-data.ts
    │   └── user-deletion.ts
    └── middleware/
        └── consent-gate.ts
```

### 11.2 Web Dashboard

**Pages & Features:**

#### Landing/Marketing Page (`/`)
- Hero: "Codebase → DPDP/GDPR Compliance in Minutes"
- Live demo: Paste GitHub URL to scan (without signup)
- Social proof, pricing teaser, FAQ

#### Auth (`/login`, `/signup`)
- Google OAuth + GitHub OAuth
- No password option for hackathon

#### Dashboard Home (`/dashboard`)
- List of connected repos
- Compliance scores at-a-glance
- Recent scans timeline
- Quick action: "New Scan"

#### Scan Detail (`/scans/:id`)
- **Header:** Compliance score (big number), regulation badges (DPDP/GDPR/CCPA)
- **Tab 1 — Overview:** Score breakdown, critical findings, scan metadata
- **Tab 2 — Data Flow:** Interactive graph visualization (D3.js or Mermaid)
  - Nodes = data elements + sinks
  - Edges = flows
  - Click node → see code locations
- **Tab 3 — Findings:** List of compliance gaps with severity, code refs, fix suggestions
- **Tab 4 — Artifacts:** Download generated policies, code, audit PDF
- **Tab 5 — Code View:** File tree with compliance annotations inline

#### Repo Settings (`/repos/:id/settings`)
- GitHub App installation status
- Branch protection rules
- Scan schedule (manual, on-push, daily)
- Jurisdiction config
- Notification settings (Slack, email)

#### Team (`/team`)
- Invite members
- Role management
- Audit log of all actions

#### Billing (`/billing`)
- Current plan, usage
- Upgrade/downgrade

### 11.3 GitHub App

**Permissions Requested:**
- `Contents: Read` (to scan files)
- `Pull requests: Write` (to post comments)
- `Checks: Write` (for status checks)
- `Metadata: Read` (basic info)

**Behaviors:**
- Auto-scan on push to main branch
- Auto-scan on PR open/sync (for changed files only)
- Post PR comment with compliance diff
- Set status check (configurable: warn / block)
- Auto-create issue for critical findings

**PR Comment Template:**

```markdown
## 🛡️ ShipComply Compliance Check

**Status:** ⚠️ Warning — New data collection detected

### Changes in this PR
- ➕ **Added:** Mixpanel event tracking in `src/lib/analytics.ts`
  - Collects: page views, click events, user_id
  - Data sink: Mixpanel (US-based, requires DPA)

### Compliance Impact
- ⚠️ Privacy Policy needs update (Section 2.2 — Behavioral Data)
- ⚠️ Mixpanel not listed in Section 9 — Third Party Disclosures

### Suggested Actions
- [ ] Update PRIVACY.md (auto-generated diff available)
- [ ] Add Mixpanel DPA to vendor list
- [ ] Verify Mixpanel data residency requirements

**Compliance Score:** 87 → 82 (-5)

[View full report](https://shipcomply.dev/scans/abc123) · [Apply auto-fixes](https://shipcomply.dev/scans/abc123/fixes)
```

### 11.4 VS Code Extension (V2)

**Features (deferred to post-hackathon):**
- Inline squiggly underline on lines introducing new data collection
- Hover tooltip with DPDP implications
- Quick-fix suggestions (right-click → "Add to consent manager")
- Status bar compliance score for current file

---

## 12. UI Design Requirements

### Design System

**Principles:**
1. **Information density** — DPOs and CTOs want data, not whitespace
2. **Trust signals** — Confidence scores, citations, "needs review" flags everywhere
3. **Developer aesthetic** — Dark mode default, monospace for code, terminal vibes
4. **Action-oriented** — Every finding has a clear next action

**Color Palette:**
- Background: `#0a0a0f` (deep blue-black) — dark mode default
- Surface: `#15151c`, `#1f1f28` — cards/panels
- Primary: `#63ffb5` (signature green) — actions, success
- Warning: `#f59e0b` (amber)
- Critical: `#ef4444` (red)
- Info: `#3b82f6` (blue)
- Muted text: `#8a8a92`, `#6a6a72`

**Typography:**
- UI: Inter or IBM Plex Sans
- Code: JetBrains Mono
- Display: System UI (avoid display fonts; clarity > style)

**Component Library:** shadcn/ui (it's free, copy-paste, no dependency hell)

### Key Screen Wireframes (Text Layout)

#### Scan Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│ ShipComply  [Dashboard] [Repos] [Team]    user@email.com ▼  │
├─────────────────────────────────────────────────────────────┤
│ ← Back to Repos                                              │
│                                                              │
│  example/myapp · scan_abc123                                 │
│  Scanned 5 min ago · commit a1b2c3d on main                  │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Compliance Score │  │ Critical Findings: 2             │ │
│  │                  │  │ ⚠️  Logs PII in plaintext         │ │
│  │      72/100      │  │ ⚠️  No consent management        │ │
│  │  ▼ -8 from last  │  └─────────────────────────────────┘ │
│  └──────────────────┘                                       │
│                                                              │
│  Regulations: [DPDP ✓] [GDPR ✓] [CCPA ⚪]                   │
│                                                              │
│  [Overview] [Data Flow] [Findings (12)] [Artifacts] [Code]  │
│  ────────                                                    │
│                                                              │
│  ── Detected Data Collection ──                              │
│  23 data elements found across 47 files                      │
│                                                              │
│  📧 Email addresses          High confidence (95%)           │
│     2 sources · 3 sinks (1 third-party)                      │
│  📱 Phone numbers            High confidence (92%)           │
│     1 source · 2 sinks                                       │
│  🍪 Tracking cookies         Medium confidence (78%)         │
│     Detected: Google Analytics, Mixpanel                     │
│  💳 Payment data             High confidence (98%)           │
│     Razorpay integration                                     │
│                                                              │
│  ── Third Parties (5) ──                                     │
│  • Mixpanel       ⚠️  No DPA detected                        │
│  • Razorpay       ✓  Standard DPA                            │
│  • Google Analytics ⚠️  Requires cookie consent              │
│  • Sentry         ⚠️  May log PII (check config)             │
│  • Stripe         ✓  Standard DPA                            │
│                                                              │
│  [Download Audit PDF]  [View Generated Code]  [Re-scan]      │
└─────────────────────────────────────────────────────────────┘
```

### UI Component Inventory

**Reusable Components:**
- `ComplianceScoreRing` — circular progress with score 0-100
- `DataElementCard` — shows detected data element with sources/sinks
- `FindingCard` — compliance finding with severity badge + fix action
- `CodeReference` — clickable file:line link that opens code viewer
- `JurisdictionBadge` — colored pill (DPDP/GDPR/CCPA)
- `ConfidenceMeter` — visual indicator 0-100%
- `DataFlowGraph` — interactive D3 graph
- `ArtifactDownloadCard` — generated artifact tile with preview
- `ScanProgressStream` — live SSE progress display
- `ThirdPartyTable` — vendor list with DPA status

---

## 13. Hackathon Build Plan (7 Days)

### Pre-Hackathon (May 23-24) — DO THIS NOW

- [ ] Buy domain: `shipcomply.dev` or `shipcomply.in`
- [ ] Create GitHub org: `shipcomply`
- [ ] Set up Neon project (free tier)
- [ ] Set up Vercel project for frontend
- [ ] Set up Railway/Render for backend
- [ ] **Pre-build the RAG corpus:**
  - Download DPDP Act 2023 (egazette.nic.in)
  - Download DPDP Draft Rules 2025
  - Download GDPR full text
  - Recursive chunk by section, generate embeddings via OpenAI text-embedding-3-small
  - Store in ChromaDB locally → upload to backend
- [ ] Get OpenAI API key with sufficient credits
- [ ] Test tree-sitter locally on a sample Next.js repo

### Day 1 (May 25) — Foundation

**Goal:** Scanner Agent v0.1 working on a sample repo

- Scaffold Next.js dashboard (use shadcn/ui starter)
- Scaffold FastAPI backend
- Clerk Auth working (Google + GitHub OAuth)
- Tree-sitter integration for TypeScript
- Detect form inputs (`<input name="...">`)
- Detect API routes (`app/api/**/route.ts`)
- Detect package.json analytics SDKs
- Output structured JSON
- Deploy preview to Vercel
- Submit PR-style commit history (looks good in judging)

**End-of-day demo:** Paste GitHub URL in dashboard → see list of detected data elements (basic).

### Day 2 (May 26) — Knowledge Graph + RAG

**Goal:** Data flow tracking + RAG queries return relevant DPDP sections

- Extend scanner: detect data flows (form → API → DB)
- Build CFG using tree-sitter cursor traversal
- Detect cookie setters, analytics calls
- Detect database operations (Prisma, Mongoose, raw SQL)
- Build vector DB query with hybrid retrieval (BM25 + semantic)
- Add cross-encoder re-ranker (use `cross-encoder/ms-marco-MiniLM-L-6-v2`)
- Test RAG quality with 20+ queries

**End-of-day demo:** Show data flow JSON + query "what does DPDP require for email collection?" returns correct Section 5(b) excerpt.

### Day 3 (May 27) — Legal Writer Agent

**Goal:** Generate DPDP-compliant privacy policy from a real scan

- Build prompt templates for each policy section
- Implement section-by-section generation with function calling
- Citation enforcement (every claim links to a chunk)
- Code references in policy ("collected via SignupForm.tsx:24")
- Markdown output with proper structure
- Test on 3+ real repos, validate output with sample DPDP requirements

**End-of-day demo:** Generated privacy policy that references actual code files.

### Day 4 (May 28) — Code Generator Agent

**Goal:** Generate working consent banner + deletion API for Next.js

- Framework detection logic (Next.js 13 vs 14, Pages vs App router)
- Consent banner component (Tailwind, DPDP-compliant — equal weight accept/reject)
- Consent API endpoint (POST /api/consent)
- Data deletion endpoint (DELETE /api/user)
- Data export endpoint (GET /api/user/export)
- All code must be copy-paste ready, zero new dependencies

**End-of-day demo:** Download generated `ConsentBanner.tsx`, drop into a real Next.js project, it works.

### Day 5 (May 29) — Audit Agent + Dashboard Polish

**Goal:** Full audit report PDF + polished dashboard UI

- Build compliance scoring engine (12 criteria from Section 4)
- Gap analysis logic
- PDF generation (Puppeteer rendering HTML template)
- Polish dashboard: scan detail page, findings list, downloads
- Data flow visualization (Mermaid or simple D3)
- Confidence scores throughout UI

**End-of-day demo:** Beautiful PDF audit report + interactive dashboard.

### Day 6 (May 30) — Integration, CLI, Testing

**Goal:** Everything wired together, CLI working, tested on real repos

- Build CLI tool (`npx shipcomply`) with Commander.js + Ink for streaming UI
- Wire SSE from backend → CLI progress display
- Test full pipeline on 5+ real Indian open-source projects
- Fix scanner false positives/negatives
- Add error handling, retries, graceful failures
- Empty states, loading states, error states in UI

**End-of-day demo:** `npx shipcomply scan <real-repo>` produces complete output in <5 min.

### Day 7 (May 31) — Demo, Deploy, Submit

**Goal:** Win the hackathon

- Final deploy: shipcomply.dev live + functional
- Record 3-minute demo video (screen + voice, no slides)
- Build pitch deck (8-10 slides)
- Practice live demo 5+ times on a recognizable open-source Indian project
- Submit hackathon entry with full documentation, video, live URL

### Scope Cuts If Behind

If running late by Day 4, in this order:

1. Drop Cookie Policy (keep Privacy Policy + ToS only)
2. Drop ToS (keep Privacy Policy only)
3. Drop Data Export endpoint (keep Deletion endpoint only)
4. Drop interactive data flow graph (use static Mermaid)
5. Drop multi-jurisdiction (DPDP only)
6. Drop CLI (Dashboard only)
7. Drop PDF audit (Markdown audit only)

**Never cut:** Scanner, Privacy Policy generation, Compliance Score, Dashboard.

---

## 14. Risks, Limitations & Mitigations

### Risk 1: Scanner False Positives/Negatives

**Risk:** Tree-sitter pattern matching misses edge cases. Reported compliance is misleadingly high.

**Mitigation:**
- Confidence scores on every detection (display in UI)
- "Manual review recommended" flags for low-confidence detections
- Conservative defaults: prefer false positive over false negative
- User feedback loop to improve detection over time (like Privado)

### Risk 2: Legal Inaccuracy of Generated Policies

**Risk:** Generated policy says something legally wrong. Customer relies on it. Lawsuit.

**Mitigation:**
- **Never** claim "legally valid" — always "compliance-ready draft, recommended for attorney review"
- Prominent disclaimers in UI and generated docs
- ToS for ShipComply explicitly disclaims legal advice
- Generated docs include a header: "AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING"
- Cite specific DPDP sections so attorneys can verify

### Risk 3: RAG Hallucinations on Legal Citations

**Risk:** Legal Writer cites a DPDP section that doesn't exist or misquotes a regulation.

**Mitigation:**
- Citation validation step: every section reference verified against the source corpus
- Hard refusal if confidence < threshold
- Cross-encoder re-ranker reduces this significantly (faithfulness 0.621 → 0.797 per research)

### Risk 4: Privado AI Launches a Free Tier

**Risk:** Well-funded competitor adds privacy policy generation, free for individuals.

**Mitigation:**
- Move fast: ship continuous PR monitoring (Sentinel) before they do
- India-first positioning (Privado is US-headquartered, less DPDP depth)
- Open-source the scanner core to build community moat
- Build the GitHub App distribution moat early

### Risk 5: 7-Day Scope is Too Aggressive

**Risk:** Half-built demo at hackathon submission.

**Mitigation:**
- Pre-build RAG corpus BEFORE Day 1
- Strict scope cuts triggered by end-of-day demos
- Daily "demoable" commits — never let work sit half-done overnight
- One person, one focus: don't context-switch between scanner and dashboard

### Risk 6: Codex API Costs Spiral

**Risk:** Hackathon credits exhausted before Day 7.

**Mitigation:**
- Cache LLM responses aggressively (Redis with 24hr TTL)
- Use smaller models for non-critical tasks (embeddings, classification)
- Batch processing where possible
- Set hard daily budget alerts

---

## 15. Open Source vs Commercial Strategy

### What's Open Source (Apache 2.0)

- **Scanner core** (tree-sitter + detection rules) — community contributes new language support, detection patterns
- **CLI tool** — distribution + developer love
- **DPDP detection rules** — public knowledge, no moat
- **Basic policy templates** — table-stakes

### What's Commercial (SaaS)

- **Cloud Dashboard** — multi-repo, team management
- **GitHub App with Sentinel** — continuous monitoring
- **Enterprise features:** SSO, audit log, white-label, custom regulations (HIPAA, PCI-DSS)
- **Advanced RAG** with fine-tuned legal model
- **Vendor risk database** — proprietary research on DPA status of 1000+ vendors
- **Multi-language scanner** — Java, Go, Ruby beyond OSS JS/TS/Python

### Why This Split Works

This is the **Privado playbook in reverse**: Privado open-sourced the scanner to drive enterprise adoption. We open-source the scanner *and* the basic generation, monetize the workflow (continuous monitoring, team features, audit trail). The base scan is a loss leader; continuous compliance is the recurring revenue.

It's also the **GitLab playbook**: open-source the engine, paid for the platform.

---

## Appendix A: Glossary

- **DPDP Act:** Digital Personal Data Protection Act 2023 (India)
- **DPB:** Data Protection Board of India
- **Data Fiduciary:** Entity that determines purpose/means of processing (= "controller" in GDPR)
- **Data Principal:** Individual whose data is processed (= "data subject" in GDPR)
- **BRD:** Business Requirements Document for Consent Management (MeitY, June 2025)
- **RoPA:** Record of Processing Activities (Article 30 / DPDP equivalent)
- **DPIA:** Data Protection Impact Assessment
- **DPA:** Data Processing Agreement (between Fiduciary and Processor)
- **PII:** Personally Identifiable Information
- **AST:** Abstract Syntax Tree (code structure)
- **CFG:** Control Flow Graph (execution paths)
- **PDG:** Program Dependence Graph (data + control flow combined)
- **CMS:** Consent Management System
- **MeitY:** Ministry of Electronics and Information Technology (India)

---

## Appendix B: Reference Documents

1. DPDP Act 2023 full text — https://egazette.nic.in
2. DPDP Draft Rules 2025 — meity.gov.in
3. BRD for Consent Management — MeitY (June 6, 2025)
4. Privado AI Open Source — github.com/Privado-Inc/privado
5. Privado Privacy Code Scanning Help — help.privado.ai
6. RAG for Policy Documents — arxiv.org/pdf/2601.15457
7. Legal RAG Reliability — arxiv.org/html/2510.06999v1
8. Tree-sitter docs — tree-sitter.github.io
9. Cycode static analysis blog — cycode.com/blog/static-code-analysis-data-flow-mapping
10. GitHub Apps documentation — docs.github.com/en/apps

---

**End of Document**
