# Package 04 — "For Court Owners" (Business) page

**Goal:** a hero that sells, and a page that reads like a real B2B product site — while
staying inside the Versus design language (neutral surfaces, ink-dark sections, orange
energy accents; blue reserved for CTAs and product-UI chrome).

**Files:** `src/pages/BusinessPage.jsx`, `src/styles/global.css`.
**Depends on:** Package 01.

## Current state

One long JSX line: hero (kicker / H1 "YOUR VENUE. FULLER COURTS." / paragraph / mailto
CTA / 3 proof stats) beside a `dashboard-mock` (KPIs + bar chart), then a 5-card feature
grid, a bottom CTA, and a minimal footer. Solid skeleton, thin execution: the mock is
flat, there's no secondary CTA, no audience segmentation, no pricing/FAQ, no social
proof beyond three numbers.

## Target design

### Hero (the priority)

Layout: keep the two-column grid (copy left, product visual right), but make it a
**dark "operator" hero** to separate the B2B page from the player site:

- Section background: near-black ink (`#0f172a`) with a very subtle radial orange glow
  (`--vc-accent` at 7%) upper-right. Text: white headings,
  `rgba(241,245,249,.75)` body. Set section `--em-color: var(--vc-accent)` so
  "FULLER COURTS." glows orange, not blue.
- Kicker: "VERSUS FOR BUSINESS" in orange with the dash motif.
- H1 stays "YOUR VENUE. / FULLER COURTS." (copy is good). Add one supporting line and
  **two CTAs**: primary orange button "Book a demo" (`mailto:` as today) + ghost/white
  outline secondary "See how it works" scrolling to the features section. This is the
  one place a button is orange instead of blue — the page's identity color.
- Proof stats row: keep 98% / +28% / 24/7 but restyle as `.status-badge`-like white-on
  10%-white pills with the numbers w800 white and labels in muted white.
- **Upgraded dashboard mock** (right column) — make it feel like a live product:
  - Frame it as a browser/app window: top bar with three dots, venue name, date chip.
  - KPI row: three cards on `--vc-surface` (the mock is a *light* UI floating on the
    dark hero — strong contrast): TODAY'S REVENUE ₱42,680 ↑18.4% (green delta),
    OCCUPANCY 84%, LIVE QUEUES 06 with a pulsing teal live dot.
  - Bar chart: 7 bars, tallest highlighted in orange, others `--vc-primary` at 30%;
    subtle grid lines; y-labels omitted.
  - Add a fourth strip: a mini booking-row list (2 rows: court name, time chip, status
    badge "Paid" green / "Pending" amber) to show the ops surface.
  - Float one small card off the frame's edge (e.g. a "QR check-in ✓ Juan D." toast)
    with the slow-float animation; static under reduced motion.
- Mobile: mock stacks under the copy, scaled to full width; floating toast hidden.

### Below the hero

1. **Logo/trust strip** (new, light `--vc-bg`): one quiet row — "Trusted by venues
   across Metro Manila" + 4–5 grayscale placeholder venue names/marks
   (text-only is fine; no fake real-brand logos).
2. **Features grid** (existing 5 cards): keep copy; restyle each card with an
   `.icon-chip` (rotate accent colors: blue, green, orange, blue, green), title w700,
   the "Included in every plan" line as a green `.status-badge`. Add a 6th card —
   "Events & tournaments: host brackets, sell slots, publish results" — so the grid is
   an even 3×2.
3. **How it works for owners** (new, mirrors the player how-section): three numbered
   steps — 01 "List your venue" → 02 "Set courts, rates & hours" → 03 "Watch bookings
   and queues fill" — orange numbers, ink text, on `--vc-surface`.
4. **Split feature spotlight** (new): alternating two-column rows (image/mock left,
   copy right, then flipped) for the two hero capabilities: *Queues that fill dead
   hours* (orange accent) and *Know your numbers* (blue accent, small stat cards).
   Reuse the mock-building CSS from the hero at smaller scale.
5. **FAQ** (new, 4–5 items, native `<details>`): pricing model, hardware needed,
   payment methods (GCash/Maya/GrabPay/GoTyme + cards), onboarding time, multi-branch
   support. Styled as bordered cards, radius `md`, `+`/`−` indicator.
6. **Bottom CTA** (existing "LET'S PUT MORE PLAYERS ON COURT."): restyle to the dark
   ink band matching the hero, orange `em`, orange primary CTA. Delete-or-keep the
   `business-proof` duplication — keep it only once on the page.
7. **Footer**: replace the `simple-footer` with the full `public-footer` used by the
   landing page for consistency (it already exists in CSS; render the same markup or
   extract a `PublicFooter` component — extraction preferred, then reuse it on the
   landing page too).

### Copy notes
Keep the existing voice (short, ALL-CAPS display lines with one `em` word). Currency ₱.
No invented customer testimonials with real-sounding names; use aggregate numbers only.

## Acceptance checklist

- [ ] Hero is ink-dark with orange identity; zero blue washes; mock reads as a credible
      product UI at a glance.
- [ ] Two CTAs in hero; demo CTA repeated at bottom; both mailto links preserved.
- [ ] New sections (trust strip, owner how-it-works, spotlights, FAQ) present and
      responsive at 1180/768/360.
- [ ] `PublicFooter` extracted and used on both `/for-business` and `/`.
- [ ] Reduced-motion: float/pulse animations disabled.
- [ ] Build + lint pass.
