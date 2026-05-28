# Pipeline E2E Test Log — 2026-05-28

## Status: PENDING DEPLOY

All Plan 4.0 changes are committed locally (3 commits ahead of remote).
Visual audit run against current deployed build at https://shipcomply.vercel.app/.
Results below reflect **pre-deploy state** — rerun after `git push origin main`.

---

## Visual Audit — Pre-Deploy (current live build)

| Page | Observation | Expected after deploy |
|---|---|---|
| `/` hero | Loads. Dark bg (#0a0a0f range). Mint CTA. | Softer bg (#13131c). New sections below. |
| `/` new sections | MISSING: "What ShipComply does", "Works from your editor", "Built into every PR" | Present after deploy. |
| `/login` | Redirected (existing session). Old Clerk white theme on fresh incognito. | Dark + mint Clerk theme. |
| `/dashboard` | Red "API unreachable" banner fires immediately. | 3-state: loading then warming then error only after 8s. |
| `/billing` | USD pricing only. | INR default for en-IN locales, toggle. |
| `/knowledge` | No intro card. Heading "Knowledge". | Intro card present. Heading "Legal Map". |
| `/settings` | No scope badges. | Per-section scope badges (Personal/Team-wide/Public). |
| `/team` | Page existed. | REMOVED — 404 after deploy. |
| sidebar | Shows "Knowledge" + "Team" items. | Shows "Legal Map", no Team. |

---

## Part M — 18-Step Smoke Test (to run after deploy)

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | `GET /healthz` -> 200 | PENDING | |
| 2 | `GET /api/v1/corpus/status` -> loaded | PENDING | |
| 3 | Landing loads, theme softer | PENDING | Need fresh deploy |
| 4 | Sign up -> dark+mint Clerk theme | PENDING | Need fresh deploy |
| 5 | Signup -> lands on /dashboard | PENDING | Need fresh deploy |
| 6 | Dashboard: no red banner in first 8s | PENDING | Need fresh deploy |
| 7 | Click "New scan" -> /scans/new | PENDING | |
| 8 | Paste demo repo, click Start -> scan starts | PENDING | CORS fix needed |
| 9 | Scan detail: status transitions to completed | PENDING | |
| 10 | Findings render with file:line + severity | PENDING | |
| 11 | Audit report downloads | PENDING | |
| 12 | Policy downloads | PENDING | |
| 13 | Dashboard shows completed scan | PENDING | |
| 14 | /billing INR default for en-IN | PENDING | Need fresh deploy |
| 15 | /knowledge has intro card, nodes clickable | PENDING | Need fresh deploy |
| 16 | Sidebar: "Legal Map", no Team | PENDING | Need fresh deploy |
| 17 | /settings has scope badges | PENDING | Need fresh deploy |
| 18 | Visual re-audit confirms all changes | PENDING | Need fresh deploy |

---

## Commits Pending Push

```
92ff472  feat: Phase 4 - Playwright specs, design-bans CI, axe-core a11y
[prior]  feat: Phase 1-3 - theme, Clerk, landing, billing, knowledge, settings, etc.
```

**To deploy:** `git push origin main`

---

## Automated Test Suite Status

| Suite | Status | Notes |
|---|---|---|
| `tests-e2e/landing.spec.ts` | Existing | Passes on current build |
| `tests-e2e/scan-flow.spec.ts` | Existing | Placeholder tests |
| `tests-e2e/landing-sections.spec.ts` | NEW | Will pass after deploy |
| `tests-e2e/pricing.spec.ts` | NEW | Will pass after deploy (INR toggle) |
| `tests-e2e/a11y.spec.ts` | NEW | Requires @axe-core/playwright (installed) |
| `tests-e2e/scan-pipeline.spec.ts` | NEW | Gated on E2E_LIVE_BACKEND=1 |

---

## Vercel Env Vars Required (manual — set on Vercel dashboard)

```
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

Set these, then trigger redeploy.

---

## Backend Env Vars Required (Render dashboard)

Verify present:
- `NEON_DATABASE_URL` — Postgres connection
- `CLERK_SECRET_KEY` — JWT verification
- `CLOUDFLARE_R2_*` — artifact storage
- `MAX_REPO_SIZE_MB=500` — new cloner cap

---

## Open Architectural Debt (to file as GitHub issues)

- `ARCH-KG-001` — KG uses static map, not pgvector
- `ARCH-LLM-001` — Prompt prefix caching missing
- `ARCH-AUDIT-001` — Score formula hardcoded, not config table
