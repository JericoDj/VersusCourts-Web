# Package 03 — Discovery map moves to the player dashboard

**Goal:** the Google discovery map (courts / clubs / queues near you) becomes a
first-class dashboard feature at `/app` (HomePage), where a logged-in player actually
uses it — replacing its old life as a landing-page hero visual.

**Files:** new `src/components/DiscoveryMap.jsx`, `src/pages/HomePage.jsx`,
`src/pages/LandingPage.jsx` (delete leftovers), `src/styles/global.css`.
**Depends on:** Package 02 (which vacated the hero).

## Step 1 — Extract a reusable `DiscoveryMap` component

Move from `LandingPage.jsx` into `src/components/DiscoveryMap.jsx`, unchanged in logic:

- `loadGoogleMaps`, `googleMapsPromise`, `distanceInMeters`, `groupPlacesByProximity`,
  `mapMarkerStyle`
- `useDiscoveryPlaces` (keeps calling `fetchDiscoveryPlaces` from `data/discoveryApi.js`)
- `GoogleMapCanvas`, `MapFilters`, `MapPlaceCard`, `PlaceImage`, `FullMapDialog`

Export one component:

```jsx
export default function DiscoveryMap({ variant = 'dashboard' }) { ... }
```

It owns all state the landing page used to own (`activeMapPlace`, `fullMapOpen`,
`mapFilters`, `visibleMapPlaces`, discovery fetch). Also move the map CSS blocks
(`.hero-map*` → rename to `.discovery-map*`, plus `.full-map-dialog*`, `.map-place-card*`,
`.map-cluster-sheet`, `.hero-google-marker*` → `.discovery-marker*`) and update class
names in the JSX. No behavior changes: clustering, filters, full-map dialog, Esc/overlay
close, missing-key/error/loading states all survive as-is.

## Step 2 — Dashboard placement (HomePage)

`HomePage` currently opens with `app-page-heading` → `location-banner` → sport selector →
card sections. New order:

1. **`app-page-heading`** — unchanged ("Hi, {firstName} 👋 / Ready to play today?").
2. **Map section replaces `location-banner`.** The banner's content folds into the map
   card header, so the dashboard doesn't have both:

   ```
   ┌─ .discovery-section (AppCard-style: surface, 1px border, radius lg, card shadow) ─┐
   │ header row: icon-chip (Navigation icon, blue) + "NEARBY" overline               │
   │             + "Quezon City, Metro Manila" (w700)                                 │
   │             right: "24 courts · 11 open games" .info-pill + Expand button        │
   │ ┌── map canvas ── height 320px desktop / 260px mobile ──────────────────────┐   │
   │ │  GoogleMapCanvas + MapFilters overlay (existing floating pill filters)     │   │
   │ │  + "Open full map" button (existing) → FullMapDialog                       │   │
   │ └────────────────────────────────────────────────────────────────────────────┘   │
   │ selected place → compact MapPlaceCard below/overlaying the canvas (existing)     │
   └──────────────────────────────────────────────────────────────────────────────────┘
   ```

   The counts in the header come from `useDiscoveryPlaces().counts` (real), not the
   hardcoded "24 courts and 11 open games" string — reuse the string format but with
   live numbers; show a `.skeleton` pill while loading.
3. **Sport selector** ("What are you playing?") — unchanged, directly under the map.
   *(Optional stretch, only if trivial: toggling a sport also filters map markers via a
   prop; if `discoveryApi` places lack sport data, skip — do not extend the API.)*
4. Nearby Courts / Queues / Clubs / Events card sections — unchanged.

### States (design all three)
- **Loading:** map card renders at full height with the existing grid-paper
  loading backdrop + "Finding nearby places…"; header counts show skeleton pills.
- **Error / missing key:** existing `hero-map__state` messages, restyled to sit in the
  card; the rest of the dashboard is unaffected.
- **Ready-empty (no places):** `.empty-state` inside the canvas area — MapPin icon,
  "Nothing nearby yet", "Try widening your search area."

### Mobile (≤640px)
- Map card is full-bleed within `app-content` padding, 260px tall, `gestureHandling:
  'cooperative'` (already the non-expanded default) so page scroll isn't hijacked.
- Full-map dialog already handles mobile; verify the selection card doesn't cover the
  close button.

## Step 3 — Clean up the landing page

Delete every map remnant from `LandingPage.jsx` (imports, dead helpers) and remove the
old `.hero-map*` etc. class names from `global.css` once renamed. `/` must not load the
Maps JS API; `/app` does (only when the map section mounts).

## Acceptance checklist

- [ ] `/app` shows the map card with live counts, filters, clustering, place selection,
      and the full-map dialog — behavior identical to the old hero map.
- [ ] `/` no longer references Maps or discovery fetching; no dead code or CSS remains.
- [ ] Loading / error / empty / missing-key states all render correctly inside the card.
- [ ] `location-banner` is gone from HomePage without leaving layout gaps.
- [ ] Build + lint pass; dashboard verified at 1180 and 360 widths.
