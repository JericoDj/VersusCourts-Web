# Versus Web Player — Design Overhaul Plan (Overview)

This folder is the master brief for redesigning `versus-web-player` (React 19 + Vite +
`lucide-react`, single stylesheet at `src/styles/global.css`). Each numbered file is a
self-contained work package that an implementing model can execute independently, in order.

## Why we're doing this

1. **The landing hero reads "all blue"** — light-blue gradient background, blue kicker,
   blue caret, blue `em` highlights, blue-tinted map chrome — which does NOT match the
   Versus Courts Player app. The Flutter app leads with white/`#F8FAFC` surfaces, soft
   12%-tinted chips, and **sport accent colors** (basketball orange, badminton green,
   pickleball yellow, tennis blue, padel cyan); brand blue `#2563EB` is one accent among
   many, not a wash.
2. **The Google discovery map lives in the public hero.** Product decision: the map is a
   logged-in tool, not a marketing visual. It moves to the player dashboard (`/app` HomePage)
   and the hero gets a new brand-true visual.
3. **The business ("For Court Owners") page needs a stronger hero**, and the public
   directory pages (Find Courts, Queues, Clubs, Events) plus How It Works are thin
   placeholders that need full designs.

## Work packages (execute in this order)

| File | Package | Touches |
|---|---|---|
| [01-design-language.md](01-design-language.md) | Shared design language & CSS foundations — do this first | `global.css` |
| [02-landing-hero.md](02-landing-hero.md) | Landing hero overhaul: de-blue, remove map, new hero visual | `LandingPage.jsx`, `global.css` |
| [03-dashboard-map.md](03-dashboard-map.md) | Move discovery map into the logged-in dashboard | `HomePage.jsx`, new `DiscoveryMap` component, `LandingPage.jsx` (removal), `global.css` |
| [04-business-page.md](04-business-page.md) | "For Court Owners" page: hero + full page upgrade | `BusinessPage.jsx`, `global.css` |
| [05-public-directories.md](05-public-directories.md) | Find Courts, Queues, Clubs, Events public pages | `VenuesPage.jsx`, `PublicQueuesPage.jsx`, `PublicClubsPage.jsx`, `PublicEventsPage.jsx`, `Cards.jsx`, `global.css` |
| [06-how-it-works.md](06-how-it-works.md) | Dedicated How It Works page | new `HowItWorksPage.jsx`, `AppRoutes.jsx`, `PublicHeader.jsx`, `global.css` |

## Source of truth for the brand

The Flutter Player app at `VersusCourts-Player/` is the visual reference. Its tokens are
already mirrored as CSS variables in `src/styles/global.css` `:root` (`--vc-*`). **Never
hardcode hex values — always use the `--vc-*` variables.** Key facts:

- Brand: `--vc-primary #2563eb`, `--vc-brand-green #22c55e`, `--vc-accent #f97316` (orange)
- Sport accents: `--vc-sport-basketball #f97316`, `--vc-sport-badminton #22c55e`,
  `--vc-sport-pickleball #eab308`, `--vc-sport-tennis #1976d2`, `--vc-sport-padel #06b6d4`
- Surfaces: `--vc-bg #f8fafc`, `--vc-surface #fff`, `--vc-surface-alt #f1f5f9`,
  `--vc-border #e2e8f0`
- Radii: `--vc-radius-sm 10 / md 14 / lg 20 / xl 28 / pill 999`. Cards use `lg`,
  buttons/inputs `md`, chips/badges `pill`.
- Type: Ubuntu. Headings heavy (w700–800) with negative tracking (-0.03 to -0.045em).
  Overline labels ("eyebrow"): 11px, w700–800, letter-spacing 0.09–0.14em, UPPERCASE.
- Motion: `--vc-transition: 180ms ease-out` for state changes; respect
  `prefers-reduced-motion` on anything animated.
- Shadows are soft ink, never harsh: `--vc-shadow-card`, `--vc-shadow-card-hover`;
  colored shadows only under solid-colored elements (`--vc-shadow-primary` pattern:
  `0 8px 18px rgba(<color>, 0.28)`).
- Market: Philippines. Currency is ₱. Free = green, fees = orange.

## House patterns (reference these by name in the package files)

These come from the Player app and must be reproduced on web:

- **Icon-chip**: square 34–46px, radius `sm`/`md`, background = accent color at 12% alpha,
  centered icon in the full accent color. On dark/gradient surfaces invert: white 22% bg,
  white 35% border, white icon.
- **Selected-pill contrast rule**: unselected chip = surface bg + 1px border +
  secondary text w600; selected = FULL accent fill + white w700 text + tinted shadow
  (`0 3px 8px rgba(color, .30)`). Never signal selection with a tint-only background.
- **Tint rule**: the canonical soft tint is the accent color at 12% alpha (range 6–14%).
  Text sitting on a tint keeps the full-strength color.
- **StatusBadge**: pill, 6px dot + 11px w700 label; default = 12% tint bg + colored text.
- **InfoPill / dot-separated metadata line**: 14px icon + 12px w600 secondary text; items
  joined by 3px tertiary dots.
- **Empty state**: centered 64px circle at primary 8% with a 30px primary icon, short w800
  title (15px), 13px secondary subtitle. Never a bare "No data" string.
- **Skeleton loading**: skeletons mirror the final layout (blocks + pill "bones" in
  `--vc-surface-alt`) so nothing jumps when data lands.
- **Kind accent stripe**: 4px full-height colored strip on a card's left edge to encode
  category (orange = tournament, blue = event, etc.).

## Global rules for every package

1. **Scope discipline**: presentation only. Do not change data contracts
   (`PlayerContext`, `AuthContext`, `discoveryApi.js`, `mockData.js` shapes), routing
   behavior (except where a package explicitly adds a route), or auth logic.
2. Every async surface designs three states: loading (skeleton), loaded, empty/error.
3. Light theme only — the web app has no dark mode today; do not add one.
4. Responsive: every layout must work at 360px, 768px, 1180px. Existing breakpoints in
   `global.css` are ~1024px and ~640px; follow them.
5. Accessibility: keep existing `aria-*` attributes, `:focus-visible` styling, and
   `prefers-reduced-motion` guards; add them to anything new.
6. Icons: `lucide-react` only, sized 14–19px inline, up to 30px in empty states.
7. Keep `global.css` organized under its existing numbered section comments; add new
   sections at the end of the relevant block, and prefer reusing existing classes
   (`.button`, `.eyebrow`, `.cards-grid`, `.section-title`) over inventing parallel ones.
8. After each package: `npm run build` and `npm run lint` must pass, and the affected
   pages should be visually verified in the browser at desktop + mobile widths.
