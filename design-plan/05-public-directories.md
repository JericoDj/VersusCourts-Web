# Package 05 — Public directory pages: Find Courts, Queues, Clubs, Events

**Goal:** turn the four thin public directories (`/venues`, `/queues`, `/clubs`,
`/events`) into real, filterable, SEO-worthy landing pages that share one template but
each carry their own identity color — courts **blue**, queues **orange**, clubs **green**,
events **pickleball-yellow/amber**.

**Files:** `src/pages/VenuesPage.jsx`, `src/pages/PublicQueuesPage.jsx`,
`src/pages/PublicClubsPage.jsx`, `src/pages/PublicEventsPage.jsx`,
`src/components/Cards.jsx`, optionally a new shared
`src/components/DirectoryLayout.jsx`, `src/styles/global.css`.
**Depends on:** Package 01. Data stays `usePlayer()` / `mockData.js` — no new APIs.

## Current state

Each page = `PublicHeader` + `.directory-hero` (the full-blue `--vc-gradient-hero`
banner) + one `.cards-grid` of every item + a "Open full player →" link. No filtering,
no counts, no empty states, all four heroes identically blue.

## Shared template — `DirectoryLayout`

Extract one layout component all four pages render through:

```jsx
<DirectoryLayout
  accent="var(--vc-accent)"        // page identity color
  eyebrow="LIVE OPEN PLAY"
  title={<>THERE'S ALWAYS<br />A <em>GAME ON.</em></>}
  lede="Join a public game, bring your energy, and meet your next teammates."
  stats={[{ value: queues.length, label: 'open games' }, ...]}
  filters={<... />}
  cta={{ to: '/app/queues', label: 'Open in the player' }}
>{cards}</DirectoryLayout>
```

### Directory hero (replaces the blue gradient banner)
- Background: **light** — `--vc-bg` with a soft radial glow of the page accent at 8%
  and a 1px bottom border. Ink text, not white-on-blue. This kills the fourth-wall
  "everything blue" problem and lets each page's accent read.
- Eyebrow in the page accent; H1 keeps the current display style with
  `--em-color: <page accent>`.
- Right side of the hero (desktop): 2–3 compact stat tiles (`.icon-chip` + big w800
  number + 11px overline label) fed from the already-loaded arrays
  (e.g. venues count, "open now" count). Hidden on mobile.
- Below the lede: **search input** (surface-alt filled, borderless, radius `md`,
  Search icon) wired to `usePlayer()` search where it already filters, else local state.

### Filter row (sticky under the hero, `top` offset below PublicHeader)
- Horizontal row of `.filter-pill`s with the page accent as `--pill-color`.
- All pages get the **sport filter** (All · Basketball · Badminton · Pickleball ·
  Tennis · Padel) — venues already filter via `sport`/`setSport` in PlayerContext;
  for the other pages filter client-side on the item's sport field if present,
  otherwise show the row disabled-dimmed (opacity .5) with a title tooltip
  "Coming soon" — do not fake results.
- Page-specific second filter, purely client-side on existing fields:
  - Venues: Open now · Price (asc/desc toggle)
  - Queues: Today · This week · Has spots
  - Clubs: Public only · Sort by members
  - Events: Tournaments · Casual events (kind stripe colors)
- Result count line: "12 courts near Quezon City" (12px secondary), updates with filters.

### Body
- The existing `.cards-grid--*` grids, now fed the filtered arrays.
- **Empty state** (`.empty-state`, page-accent icon circle) when filters match nothing,
  with a "Clear filters" text button.
- **Card upgrades in `Cards.jsx`** (visual only, same props):
  - `VenueCard`: `.status-badge` Open/Closed (green/gray), `.sport-tag`s, `.meta-dots`
    line (distance · price from ₱ · rating ★), hover lift with
    `--vc-shadow-card-hover`.
  - `QueueCard`: orange **kind accent stripe** on the left edge, spots-left as a
    progress pill (filled fraction in orange), date chip using the overline style.
  - `ClubCard`: green stripe, members + rating `.info-pill`s, lock icon for private.
  - `EventCard`: stripe color by kind (orange = tournament, blue = event),
    date-tile block (MMM / big day number) on the left.
- **Skeletons:** grids render 6 skeleton cards while `usePlayer()` data initializes
  (if data is synchronous mock data, skip skeletons — don't fake latency).

### Bottom conversion band (all four pages)
Full-width band on `--vc-surface` with border-top: "Want the full experience?" +
sub-line + blue `.button--primary` "Launch the web player" → `/app/<section>`, and the
shared `PublicFooter` (from Package 04) underneath.

## Per-page notes

| Page | Accent | Hero copy (keep current headlines) | Extra section |
|---|---|---|---|
| `/venues` Find Courts | `--vc-primary` blue | "YOUR NEXT COURT IS RIGHT HERE." | "Popular areas" chip row (Quezon City, Makati, BGC, Pasig — filters by `venue.area` if the field exists, else links to search) |
| `/queues` Queues / Open Play | `--vc-accent` orange | "THERE'S ALWAYS A GAME ON." | "How queues work" 3-step mini strip (join → check in → rotate) reusing how-section styles |
| `/clubs` Clubs | `--vc-brand-green` | keep/spirit of current | "Why join a club" 3 icon-chip bullets |
| `/events` Events | `--vc-sport-pickleball` amber | keep/spirit of current | Legend chips explaining stripe colors (Tournament / Casual) + "Host your own → /for-business" link card |

## Acceptance checklist

- [ ] All four pages render through one `DirectoryLayout`; heroes are light with
      per-page accents (no `--vc-gradient-hero` blue banners remain).
- [ ] Sport + secondary filters actually filter (or are honestly disabled); counts and
      empty states respond correctly.
- [ ] Card upgrades applied in `Cards.jsx` without prop/data changes; cards still look
      right inside `/app` pages that reuse them.
- [ ] Sticky filter row doesn't collide with `PublicHeader` at any width; grids are
      1/2/3 columns at 360/768/1180.
- [ ] Shared bottom band + `PublicFooter` on all four pages.
- [ ] Build + lint pass.
