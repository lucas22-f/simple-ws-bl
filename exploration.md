## Exploration: Contacto — Google Maps iframe + E2E tests

### Current State

The contact page (`contact-view.tsx`, 216 lines) renders inside `src/app/(store)/contacto/page.tsx` as a simple server component that wraps `<ContactView />`. The page has three sections inside a `<section>` with `aria-labelledby="contact-title"`:

1. **Hero** — `rounded-4xl` banner with breadcrumb, heading ("Canales de contacto y dónde encontrarnos"), and subtitle. Uses `animate-in-up` entrance animation.
2. **Contact cards grid** — 4 clickable cards (WhatsApp, Email, Instagram, Location) in a `grid-cols-1 sm:grid-cols-2` layout. Each card has an icon in a `bg-primary/10` circle, title, and description. Cards use `hover:-translate-y-0.5` lift effect and `rounded-xl sm:rounded-3xl`. External links open in `_blank`.
3. **Business hours** — `rounded-4xl` card with Clock icon, heading, subtitle, and a `divide-y` list of day/hour rows.

**Design patterns** (consistent across all store views):
- Container: `mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8`
- Cards: `border border-border bg-card shadow-sm`
- Animations: `animate-in-up` class (CSS animation)
- Spacing: `space-y-8 lg:space-y-10` between sections
- Everything uses Tailwind classes (no CSS modules, no styled-components)

### Affected Areas

| File | Why affected |
|------|-------------|
| `src/components/store/contact-view.tsx` | Add map iframe section |
| `tests/e2e/contacto.spec.ts` | NEW — E2E tests for contact page |
| (no routing changes needed) | Page already exists at `/contacto` |

### Approaches

#### Change A: Google Maps iframe

**Position**: After the Business Hours `</section>` (line 212), before the closing `</section>` (line 213). The Location card is card #4, and the iframe reinforces "dónde encontrarnos" mentioned in the hero subtitle.

**Iframe details**:
- Google Maps embed URL: `https://www.google.com/maps/embed?pb=...` for Ezeiza, Buenos Aires
- Responsive: `w-full aspect-video` or `w-full h-[300px] sm:h-[400px]`
- Wrap in same container style: `rounded-4xl border border-border bg-card shadow-sm overflow-hidden animate-in-up`
- No API key needed for embed iframes (using `maps/embed`)

**Design approach** — 1 option, no tradeoffs really:

- **Map section**: Matching the Business Hours card style. A simple section with a heading like "Dónde estamos" + iframe. Use the same `rounded-4xl border border-border bg-card shadow-sm animate-in-up p-0` so the iframe fills the card edge-to-edge (or with padding if preferred).

#### Change B: E2E tests

1. **Direct test (existing pattern)** — Follow the exact same style as existing E2E tests:
   - `import { expect, test } from "@playwright/test"`
   - No POMs, no custom fixtures — direct `page.goto`, `page.getByRole`, `page.getByLabel`
   - `test.describe("contacto", () => { ... })` wrapper

   Test scenarios:
   - Page loads with correct title/metadata
   - All 4 contact cards are visible with correct labels
   - Business hours section is visible
   - External links have correct `target="_blank"` and `rel`
   - Map iframe is visible and has correct `src`
   - Map section heading is visible
   - Navigation link back to home works

### Recommendation

**Change A (map iframe)**: Straightforward. Add a new `<section>` after hours matching the same card pattern. No routing, no data, no API key needed.

**Change B (E2E tests)**: Follow the existing direct-test pattern — no POMs. Create `tests/e2e/contacto.spec.ts` with `test.describe("contacto", ...)`. The project convention is clear: no abstractions, plain Playwright API, `getByRole` and `getByLabel` locators.

### Risks

- Google Maps embed URL might change format — use the standard `maps/embed/v1/place?q=Ezeiza+Buenos+Aires` pattern
- The iframe requires no API key for basic embed, but confirm the free tier embed URL format
- No existing E2E test uses iframe content testing — can test presence and `src` attribute, but not rendered map content
- `aspect-video` might crop the map too aggressively — `h-[300px] sm:h-[400px] w-full` is safer

### Ready for Proposal

Yes. The scope is well-defined and low-risk:
- **Map**: 1 new section in `contact-view.tsx`, ~20 lines
- **Tests**: 1 new file `tests/e2e/contacto.spec.ts`, ~60-80 lines
- No routing, no config, no dependency changes

### Key Findings for Implementation

- Map section goes AFTER `</section>` (line 212 business hours) and BEFORE `</section>` (line 213 closing)
- Consistent card style: `rounded-4xl border border-border bg-card overflow-hidden animate-in-up`
- Iframe responsive sizing: `w-full` + fixed height better than `aspect-video` for maps
- Test file: `tests/e2e/contacto.spec.ts` — matches existing `storefront-checkout.spec.ts` pattern
- No POMs, no custom fixtures — direct Playwright API
- Locator strategy: `getByRole`, `getByLabel`, `page.locator('iframe')` for map checking
- Run with: `npm run test:e2e` (starts Next on `127.0.0.1:3100`)
