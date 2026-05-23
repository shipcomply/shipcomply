# Security Policy

## Reporting Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@shipcomply.dev or open a GitHub private security advisory at `/security/advisories/new`.

We aim to acknowledge within 48 hours and patch within 14 days for critical issues.

## Supported Versions

Only the latest release on `main` receives security patches during the hackathon phase.

## Scope

In-scope: scanner PII leaks, LLM prompt injection, multi-tenant data isolation (RLS bypass), auth bypass, insecure stored credentials.

Out-of-scope: rate-limit exhaustion on public free-tier LLM keys, social engineering.

## Self-Privacy Hygiene

ShipComply scans source code but never uploads raw source to any server:
- CLI performs AST analysis locally; only structured JSON (data element names, file paths, line numbers) is sent to the API
- API ephemeral worker clones repo to `/tmp` and wipes on job completion
- Logs have a PII redactor middleware (`services/api/src/shipcomply_api/security/redactor.py`) that strips known PII patterns before write
- OAuth tokens stored via Supabase Vault, never in plain environment variables

## Hook Configuration Note

During hackathon development, `.claude/settings.json` disables `pre:bash:gateguard-fact-force` and `pre:edit-write:gateguard-fact-force` hooks for development velocity.

**Re-enable before any production deployment** by removing the disabled hook entries from `.claude/settings.json`.
