# ShipComply — E2E Testing Guide

## Smoke Checks (run first)

```bash
# API alive
curl https://shipcomply-api.onrender.com/healthz
# Expected: {"status":"ok",...}

# Corpus loaded
curl https://shipcomply-api.onrender.com/api/v1/corpus/status
# Expected: {"count":32,"jurisdictions":["CCPA","DPDP","GDPR"],"loaded":true}

# Clerk webhook configured
curl https://shipcomply-api.onrender.com/api/webhooks/clerk/health
# Expected: {"secret_configured":true}
```

---

## Path A — Web UI

1. Open `https://<vercel-url>/` — landing renders < 2s
2. Click **Get Started** → `/signup` → Clerk form → redirects to `/dashboard`
3. Cold-start: yellow banner "Waking up the scanner…" auto-dismisses when API ready
4. No corpus warning banner (count > 0)
5. Click **New scan** or preset chip (next.js / supabase / cal.com)
6. `/scans/new` — verify:
   - Preset chips fill the URL field
   - Invalid URL shows inline error
   - Jurisdiction radio group shows descriptions
7. Submit → toast "Scan queued" → redirect `/scans/<id>`
8. `/scans/<id>` — verify:
   - Sticky header shows StatusBadge transitioning `queued → running → completed`
   - Findings tab: SeverityPill (icon + color) on each finding
   - Policy tab: markdown renders; legal disclaimer banner present
   - Audit PDF download button works
9. Back to dashboard → scan appears in list with correct status

### Edge cases

| Scenario | Expected |
|----------|----------|
| Sign up + immediately POST /scans | Frontend retries 3× on 409 PROVISIONING → succeeds |
| Vercel preview URL (not prod domain) | No CORS errors in browser console |
| API down mid-scan | `/scans/[id]` shows failed state with Retry button |
| Empty corpus | Amber warning banner on dashboard + scan detail page |

---

## Path B — GitHub App

1. Open **Settings → Developers** in the web app
2. Click **Install GitHub App →** (links to `https://github.com/apps/shipcomply/installations/new`)
3. Install on a fork; open a pull request
4. Within ~30s (API warmup included):
   - GitHub Check Run **"ShipComply Compliance Scan"** appears on the PR
   - PR comment posted with scan ID, findings table, compliance score bar
5. Comment links to `https://shipcomply.dev/scans/<id>` — verify page loads

### Timing note

Render free tier cold-start = ~50s. The GitHub App pre-warms `/healthz` before the scan POST, so the first PR after idle may take up to 60s total. Subsequent PRs are fast.

---

## Path C — MCP (Claude Desktop / Cursor)

1. From **Settings → Developers**, copy the MCP JSON block
2. Paste into `~/.config/claude/mcp.json` (Claude Desktop) or editor MCP settings
3. Replace `<your-api-key-from-above>` with a real key (or omit for unauthenticated)
4. Restart Claude Desktop / Cursor
5. Ask: **"use shipcomply to scan github.com/vercel/next.js"**
6. Verify: tool call fires, scan ID returned, no errors

---

## Troubleshooting Matrix

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/healthz` takes 50s | Render free-tier cold start | Wait; banner auto-dismisses |
| `/corpus/status` → `{"loaded":false}` | Corpus not built | Run `pnpm corpus:build` |
| POST /scans → 409 PROVISIONING | Clerk webhook not fired yet | Frontend auto-retries 3×; if persists, check Clerk webhook delivery |
| POST /scans → 401 | No/invalid auth token | Verify Clerk session is valid; re-login |
| CORS error on Vercel preview | `allow_origin_regex` not deployed | Redeploy API; confirm `main.py` has `allow_origin_regex` |
| GitHub Check never updates | API cold-start > Probot timeout | Re-open/re-sync PR after API warms up |
| MCP → "connection refused" | `SHIPCOMPLY_API_URL` still localhost | Uninstall old MCP, run `npx -y shipcomply-mcp-server@1.0.1` |
| Clerk webhook health → false | `CLERK_WEBHOOK_SECRET` not set | Set env var on Render; redeploy |
| Scan stuck "running" forever | Worker crashed silently | Check Render logs; scan should auto-fail after timeout |
| Empty policy output | Corpus empty or LLM providers down | Check `/corpus/status`; check Groq/Gemini API keys |

---

## Local Dev Smoke

```bash
# Boot full stack
pnpm dev

# Trigger a scan against the sample app
pnpm scan:sample

# Expected output
# ✓ Scan complete — score: XX/100
# ✓ Elements found: N
# ✓ Policy written to /tmp/shipcomply-...
```
