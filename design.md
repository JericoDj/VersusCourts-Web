# Versus Web Player — Design Guide

**Read this before writing or changing ANY UI code in `versus-web-player`.**
This is the standing design contract for the React web app. The cross-platform token
reference lives at the repo root (`../design.md`); the Flutter Player app
(`../VersusCourts-Player/`) is the visual source of truth — the web app must feel like
the same product. The full redesign roadmap is in [design-plan/](design-plan/00-OVERVIEW.md).

Stack facts: React 19 + Vite, `react-router-dom`, `lucide-react` icons, **one**
stylesheet: `src/styles/global.css`. No CSS-in-JS, no Tailwind, no new styling
dependencies. Light theme only — do not introduce dark mode.

---

## 1. The #1 rule: stop making everything blue (or blue-violet)

The app's recurring failure mode is treating brand blue as *atmosphere* — washes,
tickers, banners, tints on every hover — and drifting into indigo/violet for "richness."
The Player app never does this: it sits on calm neutral surfaces and spreads energy
across five **sport colors**, with blue as just one accent.

### Banned outright
- **Any indigo or violet hue.** `#4f46e5`, `#7c3aed`, `#6366f1`, `#8b5cf6` and
  neighbors are NOT brand colors. Known offender to eliminate on sight:
  `.news-ticker` in `global.css` (~line 958) uses
  `linear-gradient(90deg, #1d4ed8, #4f46e5 52%, #7c3aed)` — this bar renders on every
  public page and is why the whole site reads "blue violet."
  Replace with an ink bar: `background: #0f172a;` (near-black) with the accent-colored
  ✦/dot separators, or `--vc-gradient-live` teal if it must feel "live."
- **Blue background washes.** No `#eff6ff`, `#e8eef6`, or blue-tinted section
  gradients. Section backgrounds are only: `--vc-bg` `#f8fafc`, `--vc-surface` `#fff`,
  `--vc-surface-alt` `#f1f5f9`, or ink `#0f172a` for deliberate dark bands.
- **Full-bleed blue hero banners** (`--vc-gradient-hero` as a page-wide banner —
  currently `.directory-hero`). Directory/landing heroes are light with a per-page
  accent (see §4).
- **New hex values anywhere outside `:root`.** Always use `--vc-*` variables; tints via
  `color-mix(in srgb, var(--vc-x) 12%, transparent)` or the documented rgba values.

### Blue's only three jobs
1. Primary CTAs (`.button--primary`) and links/interactive affordances (focus ring,
   active nav item).
2. Booking/courts identity (the "Find Courts" domain color).
3. Club/brand marks where the Player app uses primary.

Everything else picks the color that *means* something:

| Meaning | Color |
| --- | --- |
| Queues, open play, energy, fees, highlights | `--vc-accent` orange `#f97316` |
| Community, clubs, success, "free" | `--vc-brand-green` `#22c55e` |
| Live match surfaces | `--vc-gradient-live` teal (`#0d9488 → #2dd4bf`) — never padel cyan |
| Events/tournaments | tournament = orange stripe, casual event = blue stripe; page accent amber `#eab308` |
| Sport-specific content | the sport's own token: basketball `#f97316`, badminton `#22c55e`, pickleball `#eab308`, tennis `#1976d2`, padel `#06b6d4` |
| Warnings / danger | `--vc-warning` `#f59e0b` / `--vc-danger` `#dc2626` |

**Litmus test before shipping any screen:** squint at it. If the dominant impression is
blue (or anything violet), you've failed. It should read as *white/neutral with colorful
accents* — like the Flutter app.

---

## 2. Tokens (already in `global.css :root` — use them)

- **Surfaces/text:** `--vc-bg`, `--vc-surface`, `--vc-surface-alt`, `--vc-border`
  `#e2e8f0`, `--vc-text-primary` `#0f172a`, `--vc-text-secondary` `#64748b`,
  `--vc-text-tertiary` `#94a3b8`, ink `--vc-ink` `#111827`.
- **Spacing:** `--vc-space-xs 4 / sm 8 / md 12 / lg 16 / xl 20 / xxl 24 / xxxl 32`,
  `--vc-page 20px` horizontal page padding.
- **Radius:** `sm 10` (small chips/icon-chips), `md 14` (buttons, inputs, compact
  cards), `lg 20` (the default card radius), `xl 28` (hero/feature frames),
  `pill 999` (badges, filters, progress).
- **Shadows:** `--vc-shadow-card` (rest), `--vc-shadow-card-hover` (lift). Colored
  shadows only under solid-color-filled elements:
  `0 8px 18px rgba(<that color>, 0.28)`. Never harsh black shadows.
- **Motion:** `--vc-transition: 180ms ease-out` for state changes; slow ambient floats
  6s+; everything animated must be disabled under `prefers-reduced-motion` (there is an
  existing guard block in `global.css` — extend it).
- **Container:** `.container` = `min(1180px, 100% − 48px)`. Breakpoints ~1024px and
  ~640px; every layout must work at 360 / 768 / 1180.

## 3. Typography

Font: **Ubuntu** (already loaded). House voice:

- Display headings: w700, `clamp(46px, 5.2vw, 74px)` on heroes, letter-spacing −0.03 to
  −0.045em, often ALL-CAPS with a single `em` word in the section's accent color.
- `em` color is controlled by the `--em-color` custom property
  (`h1 em, h2 em { color: var(--em-color, var(--vc-primary)) }`) — sections opt into
  orange/green/amber by setting `--em-color`. Don't hardcode.
- Overline/eyebrow (`.eyebrow`): 11px, w700, letter-spacing 0.09–0.14em, UPPERCASE,
  `--vc-text-secondary` by default; accent variant takes the section accent.
- Card titles 14–16px w700; metadata 12px w600 `--vc-text-secondary`; tertiary
  timestamps 11–12px. Multi-line body text gets `line-height: 1.5–1.7`.
- Numbers meant to impress (KPIs, stats): w800, tight tracking.

## 4. Page identity system

Every page has ONE accent color; the page may use others in small doses (sport tags,
status badges) but its hero eyebrow, `em`, filter pills, and empty-state icon all use
the page accent:

| Route | Accent |
| --- | --- |
| `/` landing | neutral + orange energy; blue only on the primary CTA |
| `/venues` Find Courts | blue `--vc-primary` |
| `/queues` Open Play | orange `--vc-accent` |
| `/clubs` | green `--vc-brand-green` |
| `/events` | amber `--vc-sport-pickleball` |
| `/for-business` | ink-dark sections + orange identity |
| `/how-it-works` | neutral + orange |
| `/app/*` (logged-in) | neutral surfaces; content colors itself (sport/status colors) |

Hero recipe (public pages): light `--vc-bg` background, optional radial glow of the page
accent at ≤8% opacity, ink text, accent eyebrow + `em`, 1px bottom border. Never a
colored banner with white text (exception: deliberate ink-dark bands like the business
hero and final CTAs).

## 5. Component vocabulary

Reuse these before inventing anything (some exist today, the rest are specified in
[design-plan/01-design-language.md](design-plan/01-design-language.md) — if one doesn't
exist yet, add it there per that spec, then use it):

- `.button` / `.button--primary` (blue, min 52px, radius md, w700) / `.button--dark` /
  `.button--large`. Orange primary buttons appear ONLY on `/for-business`.
- `.icon-chip` — 40–46px square, radius sm/md, accent at 12% bg + full-accent icon;
  `--invert` variant (white 22% bg, white 35% border) for dark/gradient surfaces.
- `.status-badge` — pill, 6px dot + 11px w700 label; 12% tint bg + colored text;
  `--solid` and `--white` variants.
- `.info-pill` / `.meta-dots` — 14px icon + 12px w600 secondary metadata, joined by 3px
  tertiary dots.
- `.sport-tag` — radius-sm chip, sport color 12% tint + full color text.
- `.filter-pill` — **selected-pill contrast rule**: unselected = surface + border +
  secondary w600; selected = FULL accent fill + white w700 + tinted shadow. Never
  signal selection with a tint-only background.
- `.empty-state` — 64px accent-8% circle + 30px accent icon + 15px w800 title + 13px
  secondary subtitle. Never render a bare "No data" string.
- `.skeleton` / `.skeleton--block` — surface-alt bones mirroring the final layout.
- `.stripe-card` — 4px left accent stripe encoding kind (orange tournament, blue event…).
- `.eyebrow`, `.section-title`, `.section-heading`, `.cards-grid--*`, `.mini-avatars`,
  `.date-tile` — existing; keep their conventions.

**Tint rule:** the canonical soft tint is the accent at 12% alpha (6–14% range). Text on
a tint keeps the full-strength color. Hovers on neutral controls use
`--vc-surface-alt`, not blue tints.

## 6. Interaction & states

- Cards that are links: hover = translateY(−2px) + `--vc-shadow-card-hover`; always an
  explicit affordance (chevron or accent-colored "View X" label).
- Every async surface designs three states: skeleton loading, loaded, empty/error.
  Mock-data (synchronous) surfaces skip skeletons — don't fake latency.
- Inactive/disabled content dims (opacity ~0.72), it doesn't disappear.
- Keep/extend `aria-*` attributes, `:focus-visible` (blue ring — that's fine), Esc +
  overlay-click closing for dialogs, `aria-pressed` on toggles.
- Icons: `lucide-react` only; 14–15px in pills, 17–19px in buttons/nav, ~30px in empty
  states. No emoji icons in chrome (the 👋 in greetings is copy, that's fine).

## 7. Content rules

- Market: Philippines. Currency **₱** with `formatMoney`. E-wallets: GCash / Maya /
  GrabPay / GoTyme. Free = green, fees = orange.
- Voice: short, confident, second person. Display lines may be ALL-CAPS with one `em`
  word. No lorem ipsum; no fabricated testimonials or real-sounding customer names —
  aggregate numbers only.
- Sports order everywhere: Basketball, Badminton, Pickleball, Tennis, Padel.

## 8. Scope discipline & workflow

- Presentation only: never change data contracts (`PlayerContext`, `AuthContext`,
  `discoveryApi.js`, `mockData.js` shapes), auth, or routing unless the task says so.
- Prefer editing `global.css` under its existing numbered section comments; no new
  stylesheets, no inline styles except setting custom properties
  (`style={{'--chip-color': …}}`).
- After any UI change: `npm run build` + `npm run lint` must pass, and verify in the
  browser at 1180 and 360 widths.

## 9. Known debt to fix on sight (as of 2026-07)

When touching a file that contains one of these, fix it in passing:

1. `.news-ticker` blue→indigo→violet gradient (**the** blue-violet source) → ink bar.
2. `.directory-hero` full blue gradient banners → light accent heroes (§4).
3. `#eff6ff` / blue-tinted washes in `.hero-section` and friends → neutral gradients.
4. Ubiquitous `rgba(37, 99, 235, …)` hover/active tints on things that aren't
   links/CTAs (icon buttons, sport selectors, section bands) → neutral
   `--vc-surface-alt` hovers or the correct semantic accent.
5. Legacy aliases (`--blue`, `--orange`, `--muted`, …) → migrate usages to `--vc-*`.
