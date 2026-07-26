# Package 02 — Landing hero overhaul

**Goal:** the hero should feel like the Player app — calm neutral surfaces, sport-colored
energy, blue only on the CTA — and the Google map leaves the hero entirely (it moves to
the dashboard in [03-dashboard-map.md](03-dashboard-map.md)).

**Files:** `src/pages/LandingPage.jsx`, `src/styles/global.css`.
**Depends on:** Package 01 (icon-chip, status-badge, sport-tag, filter-pill, `--em-color`).

## Current state (what's wrong)

- `.hero-section` background is `linear-gradient(135deg,#fff,#f8fafc,#eff6ff)` — a blue wash.
- Kicker, typewriter caret, `em`, play-link icon, map chrome: all `--vc-primary` blue.
- Right column (52%) is `HeroMap` + `FullMapDialog` + `MapFilters` + `MapPlaceCard` —
  a live Google Map that is a logged-in tool, not marketing.
- The typewriter heading (`useTypewriter`, `heroMessages`) is good — **keep it**.

## Target design

### Layout
Keep the two-column `hero-grid` (copy left ~48%, visual right ~52%), min-height ~620px,
followed by the existing `sports-ticker`. Keep `PublicHeader` untouched.

### Background
- `.hero-section` background: plain `--vc-bg` → white gradient at most
  (`linear-gradient(180deg, #fff, var(--vc-bg))`). **No blue tint.**
- Replace the single green blob `::before` with two *very* quiet radial glows:
  orange `--vc-accent` at 6% top-right, green `--vc-brand-green` at 5% bottom-left.
  They should be barely perceptible warmth, not decoration you notice.

### Copy column (left)
- Kicker "DISCOVER • PLAY • CONNECT": text `--vc-text-secondary`, the two small dashes
  `--vc-accent` orange. (Blue removed.)
- Typewriter heading: text stays `--vc-text-primary`; caret becomes `--vc-accent`.
  Optional upgrade: give each of the four `heroMessages` an accent
  (`Join Queue/Open Play` → orange, `Book Courts` → blue, `Explore Clubs` → green,
  `Discover Tournaments` → pickleball yellow `--vc-sport-pickleball`) and tint the caret
  + one highlighted word per message with it. Implement via a `color` field on
  `heroMessages` and an inline `--em-color`.
- Body copy unchanged (`--vc-text-secondary`).
- Actions row: primary CTA "Find a game" stays the blue `.button--primary` (blue's one
  hero job). "See how it works" play-link circle: border `--vc-border`, icon
  `--vc-text-primary` (not blue), hover fills `--vc-accent` with white icon.
- Add a small trust row under the actions: three `.info-pill`s —
  `★ 4.8 player rating` · `120+ verified courts` · `5 sports` (static copy, tertiary
  color) to fill the space the taller map used to balance.

### Visual column (right) — the "app collage"
Replace `HeroMap` with a **static, hand-built collage of app UI cards** that mirrors what
the real product (and Flutter app) looks like. No live data, no Google Maps — pure
HTML/CSS with mock content. Composition (desktop):

1. **Backdrop card** — a large `--vc-surface` card, radius `--vc-radius-xl`, 1px border,
   the soft `0 18px 46px rgba(15,23,42,.09)` shadow (reuse `.hero-map`'s float-in
   animation, renamed). Inside it, a simplified "Nearby Courts" list: 2 rows in the
   compact-directory-tile style (44px thumbnail block in `--vc-surface-alt`, name
   w700, `.meta-dots` line "1.2 km · ₱250/hr · Open now" with "Open" in green).
2. **Floating queue card** (top-right, overlapping the backdrop): gradient header strip
   in orange (`linear-gradient(135deg,#f97316,#fb923c)`), `.icon-chip--invert` +
   "FRIDAY NIGHT RUNS" overline, white `.status-badge--white` "8/10 IN", body with
   avatar stack (reuse `.mini-avatars` look) and a small solid-orange "Join queue" pill.
   Give it a slow 6s float animation (translateY ±6px, disabled under reduced motion).
3. **Floating live-score chip** (bottom-left, overlapping): small pill-card with the
   teal live gradient (`--vc-gradient-live`), pulsing 6px white dot, "LIVE · Court 3 —
   21 : 18". This brings the app's "live" teal in.
4. **Sport chips strip** floating above/near the backdrop: 3–4 `.sport-tag`s
   (Basketball, Badminton, Pickleball, Tennis) to spray the sport palette into the hero.

Mobile (≤640px): collage simplifies to the backdrop card + queue card stacked (hide the
live chip and sport strip via CSS), placed *below* the copy.

### What gets deleted from LandingPage.jsx
- `HeroMap`, `FullMapDialog`, `MapFilters`, `GoogleMapCanvas`, `MapPlaceCard`,
  `PlaceImage`, `useDiscoveryPlaces`, `loadGoogleMaps`, `groupPlacesByProximity`,
  `distanceInMeters`, `mapMarkerStyle`, and all map state in `LandingPage`
  (`activeMapPlace`, `fullMapOpen`, `mapFilters`, `visibleMapPlaces`).
  **Do not delete them from the repo** — Package 03 relocates them into a shared
  `src/components/DiscoveryMap.jsx`. If Package 03 runs immediately after, do the move
  there; otherwise leave the code exported-but-unused and note it.
- Associated CSS (`.hero-map*`, `.full-map-dialog*`, `.map-place-card*`,
  `.map-cluster-sheet`, `.hero-google-marker*`) also relocates in Package 03 —
  don't orphan-delete it here if 03 is queued.

## Rest of the landing page (same pass, lighter touch)

- **Feature grid** ("MORE THAN A BOOKING APP"): recolor cards so blue isn't dominant —
  card 01 Discover uses blue (booking = blue is correct), card 02 Open Games uses orange
  (icon-chip + number + link color), card 03 Community stays green. Use `.icon-chip`
  for the feature icons. Heading `em` → set section `--em-color` to `--vc-accent`.
- **How-section**: keep, but step numbers become orange; `em` already orange via
  eyebrow--accent — align with `--em-color`.
- **Business callout / trust strip / final CTA / footer**: untouched except swapping any
  hand-rolled tint chips to Package-01 atoms if trivial.

## Acceptance checklist

- [ ] No Google Maps request fires on `/` (check the network tab).
- [ ] Hero contains no blue background tint; the only blue elements are the primary CTA
      and (optionally) the "Book Courts" typewriter accent.
- [ ] Typewriter behavior and reduced-motion fallback unchanged.
- [ ] Collage renders correctly at 1180 / 768 / 360 widths; floating cards never overlap
      text or overflow the viewport.
- [ ] All animation (float, pulse, caret) disabled under `prefers-reduced-motion`.
- [ ] `npm run build` + lint pass.
