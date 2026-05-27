# ShipComply — Product Context

## Product Purpose

ShipComply is a codebase-aware compliance engine that turns source code into privacy-law artifacts in under 5 minutes. It scans any TypeScript/JavaScript repo via AST analysis, detects every PII data flow with file:line citations, and generates: a privacy policy, working consent banner + deletion/export endpoints, compliance score, and a downloadable audit PDF.

Target regulations: DPDP Act 2023 (India-first), GDPR (EU/EEA), CCPA/CPRA (California).

## Register

**Split surface.** Use register guidance accordingly:

- **Marketing surfaces** (landing page, footer, public docs): `brand` register — design IS the product. Confident, clear, editorial.
- **App surfaces** (dashboard, scan detail, settings, billing, knowledge graph): `product` register — design SERVES the product. Functional, trustworthy, calm.

## Users

Two equally weighted audiences:

1. **Developers / startup CTOs** — ship fast, don't want legal surprises, prefer technical language, trust code over prose, skeptical of compliance theater. They'll use the MCP server, CLI, and GitHub App as much as the web UI.
2. **Compliance operators / legal ops** — need an audit trail, want downloadable artifacts, may not read code but understand regulatory citations and risk scoring. They'll use the web dashboard, billing, and team management.

Design for both simultaneously. Never dumb it down for one at the expense of the other.

## Personality

**Trustworthy / Clear / Approachable**

- **Trustworthy**: Every claim is backed by a citation. Disclaimers are visible without being alarming. Numbers are precise, not rounded up.
- **Clear**: One idea per sentence. No jargon unless it's the correct technical term. Error messages say what went wrong and what to do next.
- **Approachable**: Compliance is stressful; the product should feel like a knowledgeable colleague, not a government portal. Tone is direct but never cold.

Anti-personality: not authoritative-but-distant, not anxiety-inducing, not corporate-grey.

## Visual Identity

**Dark theme.** Developers working in a dim office or terminal environment. The app is a tool they'll have open alongside VS Code. High-contrast text on near-black backgrounds. One strong accent color (mint/green) for positive signals and CTAs.

**Color strategy: Restrained** (product surfaces) / **Committed** (marketing/hero moments).

Palette in use:
- Backgrounds: bg-0 (#0a0a0f) through bg-11 (#e4e4f0)
- Accent: mint-9 (#63ffb5) for CTAs, active states, success signals, brand identity
- Semantic: success (#22c55e), warning (#f59e0b), danger (#ef4444), info (#3b82f6)

Typography: Inter (sans) + JetBrains Mono / Fira Code (mono for code, scan IDs, scores).

## Anti-References

Designs to actively avoid:

- **SaaS-cream**: white/off-white backgrounds, rounded cards, pastel accents, clean startup aesthetic. This is a technical tool, not a project management app.
- **Compliance-grey**: government portal aesthetics, dense tables, navy + grey, bureaucratic visual language. Compliance should feel enabling, not punishing.
- **Hacker-terminal**: green-on-black, monospace-everything, ASCII art, neon glow overuse. Use terminal aesthetics where they add meaning (code snippets, scan IDs), not as decoration.

## Accessibility

**WCAG 2.1 AA** minimum across all surfaces. Key requirements:
- Color contrast 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard-reachable and labeled
- Error messages tied to fields via aria-describedby
- SVG/canvas elements have accessible names and roles
- No information conveyed by color alone

## Strategic Principles

1. **Citations over claims.** Every compliance statement points to a specific file, line, and regulation section.
2. **Working code, not boilerplate.** Generated artifacts are copy-paste-ready, not templates that need editing.
3. **Privacy by default.** The product that helps others comply must itself be exemplary: no raw source code stored, PII-stripped logs, ephemeral scan workers.
4. **Legal disclaimer always visible.** `AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING` on every generated artifact without exception.
5. **Fail loudly, not silently.** If a scan fails or an LLM is unavailable, say so explicitly. Never return a plausible-looking but fabricated result.
