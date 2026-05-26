# Corpus Sources

Paste the full legal text for each regulation into the corresponding file.
Once files exist, run `pnpm corpus:build` from repo root to chunk, embed, and upload to pgvector.

## Required files

### `dpdp_act_2023.md`
Digital Personal Data Protection Act 2023 (India).
Source: https://egazette.nic.in/WriteReadData/2023/247654.pdf
Convert PDF to Markdown, paste here. Use `## Section X` headers.

### `gdpr.md`
GDPR Articles 1–99 (EU) 2016/679.
Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
Paste Articles 5–22 minimum. Use `## Article X — Title` headers.

### `ccpa.md`
California Consumer Privacy Act 2018 (as amended by CPRA).
Source: https://oag.ca.gov/privacy/ccpa
Use `## Section 1798.XXX` headers.

## Format

Each file must use Markdown `##` headers to delimit sections — the chunker splits on them.

```markdown
## Section 4 — Grounds for processing personal data

Processing of personal data shall be lawful only for the following purposes...
```

## After adding files

```bash
# From repo root, with DATABASE_URL set:
pnpm corpus:build
```
