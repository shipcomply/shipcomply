# Detection Rules — Format and Fixture Specification

## Rule Format

Rules live in `packages/detection-rules/rules/v1/<rule-id>.json`:

```json
{
  "$schema": "https://shipcomply.dev/schemas/detection-rule.json",
  "version": "1",
  "id": "email",
  "name": "Email address collection",
  "description": "...",
  "jurisdiction": ["DPDP", "GDPR"],
  "compliance_flags": ["DPDP_S4", "GDPR_A5_1_A"],
  "patterns": [
    { "type": "jsx_attribute", "attribute": "name", "value": "email", "element": "input" },
    { "type": "identifier", "name_pattern": "email|emailAddress" }
  ]
}
```

## Fixture Requirement

Every rule MUST have:

1. **Positive fixture** at `fixtures/positive/<rule-id>.tsx` — code that SHOULD trigger the rule
2. **Negative fixture** at `fixtures/negative/<rule-id>.test.tsx` — test file that MUST NOT trigger

This is enforced by CI. A rule without fixtures will fail the build.

## Pattern Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `jsx_attribute` | JSX `<input name="email">` | `attribute`, `value`, `element` |
| `identifier` | Variable/prop named `email` | `name_pattern` (regex) |
| `api_call` | `analytics.identify({email})` | `object`, `method` |
| `db_write` | `prisma.user.create({email})` | `model`, `field` |

## Exclude Paths

The scanner automatically excludes:
- `node_modules/`, `dist/`, `.next/`, `build/`
- `*.test.ts`, `*.test.tsx`, `*.spec.*`
- `__mocks__/`, `__tests__/`
