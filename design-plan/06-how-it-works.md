# Package 06 — Dedicated "How It Works" page

**Goal:** promote How It Works from an anchor section on the landing page
(`/#how-it-works`) to a real page at `/how-it-works` that walks both audiences —
players and court owners — through the product, and becomes the natural "second click"
from every hero.

**Files:** new `src/pages/HowItWorksPage.jsx`, `src/routes/AppRoutes.jsx`,
`src/components/PublicHeader.jsx`, `src/styles/global.css`.
**Depends on:** Packages 01 and 04 (`PublicFooter`, atoms). The landing page keeps its
short how-section as a teaser; its "See how it works" links may point to this page.

## Routing & nav

- Add `<Route path="/how-it-works" element={<HowItWorksPage />} />`.
- `PublicHeader`: change the last highlight from `<a href="/#how-it-works">` to a
  `NavLink to="/how-it-works"` so it gets active styling like the others.
- Keep the landing anchor working (the teaser section keeps `id="how-it-works"`).

## Page structure

### 1. Hero (compact)
Light `--vc-bg` hero, centered, ~380px: eyebrow "HOW IT WORKS" (orange), H1
"FROM SEARCH TO <em>GAME ON.</em>" with `--em-color: --vc-accent`, one-line lede.
Below: a **two-tab audience switch** using the selected-pill contrast rule —
`I'm a player` (blue when active) / `I own courts` (orange when active). Local state;
switching swaps the journey section content. Default: player.

### 2. Journey timeline (the core)
A vertical alternating timeline (mobile: single column, line on the left).

**Player journey — 5 steps** (each step: number in a solid accent circle, w800 title,
2-line body, and a small illustrative UI vignette card reusing hero-collage pieces from
Package 02):
1. **Create your player profile** — pick your sports and skill level. *(vignette:
   profile chip + sport tags)*
2. **Discover courts near you** — map + filters, verified venues, real prices in ₱.
   *(vignette: mini map-card mock — static, no Google Maps)*
3. **Book a court or join a queue** — reserve a slot, or claim a spot in open play.
   *(vignette: queue card with spots-left pill)*
4. **Show up and check in** — QR check-in at the venue, rotations run themselves.
   *(vignette: QR chip + "You're in — Court 3" toast)*
5. **Track games & grow your community** — scores, events, clubs, tournaments.
   *(vignette: live-score teal chip + avatars)*

**Owner journey — 4 steps** (orange accents): List your venue → Configure courts,
rates & schedules → Take bookings and run queues → See revenue & occupancy insights.
Final step links to `/for-business`.

### 3. Feature cross-links
Three `.stripe-card` link cards (blue Find Courts `/venues`, orange Join Queues
`/queues`, green Explore Clubs `/clubs`) — icon-chip, one-liner, chevron.

### 4. FAQ (player-side)
4–6 native `<details>` items styled like Package 04's FAQ: Is it free for players?
What sports are supported? How do queues rotate? Payment methods (GCash/Maya/GrabPay/
GoTyme)? Can I cancel a booking?

### 5. Final CTA + footer
Reuse the landing `final-cta` styles ("READY TO STEP ON COURT?") with the audience-aware
button: player tab → `/app`, owner tab → `/for-business`. Then `PublicFooter`.

## Design notes

- Identity: this page is neutral ground — ink text on light surfaces, orange as the
  page accent, blue/green/etc. appearing only via the journey vignettes and cross-link
  cards. No gradient banners.
- Tab switch animates content with a 180ms fade/translate; none under reduced motion.
- Timeline connector line: 2px `--vc-border`, with each step's node in the step accent.
- All vignettes are static CSS mockups — no data fetching on this page at all.

## Acceptance checklist

- [ ] `/how-it-works` routed, header link active-styles correctly, landing anchor still
      works.
- [ ] Player/owner tabs swap the timeline; both journeys complete with vignettes.
- [ ] FAQ, cross-links, audience-aware final CTA, `PublicFooter` present.
- [ ] Fully responsive (timeline collapses to left-line layout ≤768px); reduced-motion
      respected; no network requests beyond static assets.
- [ ] Build + lint pass.
