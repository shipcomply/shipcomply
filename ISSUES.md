# ShipComply — Known Issues

Tracked defects found during Plan 3.1 source audit (2026-05-28). Check boxes as fixed.

---

## Critical: Broken Links

- [ ] `apps/web/app/page.tsx:49` — Hero CTA `href="/sign-up"` 404s. Fix: `/signup`
- [ ] `apps/web/app/page.tsx:110` — Bottom CTA `href="/sign-up"` 404s. Fix: `/signup`
- [ ] `apps/web/app/page.tsx:50` — "Try demo scan" links `/dashboard` from unauth context. Fix: `/signup?redirect_url=/dashboard`
- [ ] `apps/web/components/marketing/footer.tsx:5` — Footer links `/knowledge?j=*` require auth. Fix: drop deep links
- [ ] `apps/web/app/(app)/repos/page.tsx` — Buttons have no `href`/`onClick`. Fix: link to `GITHUB_APP_URL`
- [ ] `apps/web/app/(app)/team/page.tsx:12,23` — Buttons have no action. Fix: `toast.info` coming-soon

---

## High: Static Stubs

- [ ] `apps/web/app/(app)/scans/page.tsx` — Never calls `api.scan.list()`. Fix: wire to API, drop dangling header
- [ ] `apps/web/app/(app)/repos/page.tsx` — No API call. Fix: proper empty state with working CTA
- [ ] `apps/web/app/(app)/team/page.tsx` — No API. Fix: polished coming-soon empty state

---

## Medium: Visual / Typography

- [ ] `apps/web/app/page.tsx:13-20` — FEATURES `icon` strings never rendered. Fix: map to lucide icons
- [ ] `apps/web/app/page.tsx:52-58` — Stats grid overflow on `"DPDP + GDPR + CCPA"`. Fix: `max-w-2xl`, smaller font for long values
- [ ] `apps/web/app/page.tsx:70` — Step numbers `text-bg-5` on `bg-bg-2`, contrast ~1.4:1. Fix: `text-mint-9/30`
- [ ] `apps/web/app/page.tsx:83-89` — 6 identical cards, identical-card-grid anti-pattern. Fix: vary col spans, add icons
- [ ] `apps/web/app/page.tsx:111` — Misplaced disclaimer in CTA section (already in footer). Fix: remove
- [ ] `apps/web/app/(app)/repos/page.tsx` — Unicode glyph `⊞` as icon. Fix: lucide `<GitBranch>`
- [ ] `apps/web/app/(app)/team/page.tsx:21` — Unicode glyph `◉` as icon. Fix: lucide `<Users>`
- [ ] `apps/web/app/(app)/billing/page.tsx:62-97` — Plan cards use raw `<div>`. Fix: `<Card variant="bordered">`
- [ ] `apps/web/app/(app)/billing/page.tsx:84` — Unicode `✓` at 12px fuzzy. Fix: lucide `<Check size={14}>`

---

## Medium: Accessibility (WCAG 2.1 AA)

- [ ] `apps/web/components/ui/input.tsx` — `error` prop does not set `aria-invalid` or `aria-describedby`. Fix: add ARIA wiring
- [ ] `apps/web/app/(app)/scans/new/page.tsx:127-129` — Duplicate error `<p>` outside Input. Fix: remove (Input renders its own)
- [ ] `apps/web/app/(app)/billing/page.tsx:51-53` — Progress bar visual-only, no `role="progressbar"`. Fix: add ARIA progressbar
- [ ] `apps/web/app/(app)/knowledge/page.tsx:67` — Interactive SVG has no accessible name or keyboard support. Fix: `role="application"`, `<title>`, node `role="button"` + keyboard handler

---

## Verified Non-Issues

- `shadow-glow-md` at `app/page.tsx:110` — defined in `tailwind.config.js:53`
- Bitbucket claim at `app/page.tsx:99` — backend regex accepts Bitbucket URLs
