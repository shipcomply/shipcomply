# ShipComply — Known Issues

Tracked defects found during Plan 3.1 source audit (2026-05-28). Check boxes as fixed.

> **STATUS 2026-05-29: ALL RESOLVED.** Re-verified every item below against current
> source during the full-stack audit (see `AUDIT-2026-05-29.md`). All Plan 3.1/4.0
> fixes are present; the `team` page was deleted, so its items are moot. Web
> `check:design` passes clean.

---

## Critical: Broken Links

- [x] `apps/web/app/page.tsx:49` — Hero CTA `href="/sign-up"` 404s. Fix: `/signup` → **now `/signup`**
- [x] `apps/web/app/page.tsx:110` — Bottom CTA `href="/sign-up"` 404s. Fix: `/signup` → **now `/signup`**
- [x] `apps/web/app/page.tsx:50` — "Try demo scan" links `/dashboard` from unauth context. → **now `/signup?redirect_url=/dashboard`**
- [x] `apps/web/components/marketing/footer.tsx:5` — Footer links `/knowledge?j=*` require auth. → **deep links dropped; footer links only `/signup` + `/login`**
- [x] `apps/web/app/(app)/repos/page.tsx` — Buttons have no `href`/`onClick`. → **link to `GITHUB_APP_URL`**
- [x] ~~`apps/web/app/(app)/team/page.tsx:12,23`~~ — **MOOT: team page deleted**

---

## High: Static Stubs

- [x] `apps/web/app/(app)/scans/page.tsx` — Never calls `api.scan.list()`. → **wired (skeleton/empty/error states); dangling header dropped**
- [x] `apps/web/app/(app)/repos/page.tsx` — No API call. → **polished empty state with working GitHub App CTA**
- [x] ~~`apps/web/app/(app)/team/page.tsx`~~ — **MOOT: team page deleted**

---

## Medium: Visual / Typography

- [x] `apps/web/app/page.tsx:13-20` — FEATURES `icon` strings never rendered. → **`ICON_MAP` → lucide icons rendered**
- [x] `apps/web/app/page.tsx:52-58` — Stats grid overflow on `"DPDP + GDPR + CCPA"`. → **`max-w-2xl` + length-based font shrink**
- [x] `apps/web/app/page.tsx:70` — Step numbers low contrast. → **`text-mint-9/25`**
- [x] `apps/web/app/page.tsx:83-89` — 6 identical cards anti-pattern. → **varied `md:col-span-2` + icons**
- [x] `apps/web/app/page.tsx:111` — Misplaced disclaimer in CTA. → **removed (only in footer)**
- [x] `apps/web/app/(app)/repos/page.tsx` — Unicode glyph `⊞`. → **lucide `<GitBranch>`**
- [x] ~~`apps/web/app/(app)/team/page.tsx:21`~~ — **MOOT: team page deleted**
- [x] `apps/web/app/(app)/billing/page.tsx:62-97` — Plan cards raw `<div>`. → **`<Card variant="bordered">`**
- [x] `apps/web/app/(app)/billing/page.tsx:84` — Unicode `✓`. → **lucide `<Check size={14}>`**

---

## Medium: Accessibility (WCAG 2.1 AA)

- [x] `apps/web/components/ui/input.tsx` — no `aria-invalid`/`aria-describedby`. → **both wired via `useId` + error id**
- [x] `apps/web/app/(app)/scans/new/page.tsx:127-129` — Duplicate error `<p>`. → **removed; `<Input error>` renders its own**
- [x] `apps/web/app/(app)/billing/page.tsx:51-53` — Progress bar no role. → **`role="progressbar"` + `aria-valuenow/min/max` + `aria-label`**
- [x] `apps/web/app/(app)/knowledge/page.tsx:67` — Interactive SVG no accessible name/keyboard. → **`role="application"` + `<title>`; nodes `role="button"` + `tabIndex` + `aria-pressed` + Enter/Space `onKeyDown`**

---

## Verified Non-Issues

- `shadow-glow-md` at `app/page.tsx` — defined in `tailwind.config.js`
- Bitbucket claim at `app/page.tsx` — backend regex accepts Bitbucket URLs
