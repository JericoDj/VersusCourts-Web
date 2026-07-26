# Package 01 — Shared design language & CSS foundations

**Goal:** fix the "everything is blue" problem at the root, and add the small set of
reusable web components the later packages need. Do this before any page work.

**Files:** `src/styles/global.css` (primarily), `src/components/Cards.jsx` (light touch).

## 1. The de-blue principle

Today blue is used as *atmosphere*: background washes (`#eff6ff`), kickers, carets, `em`
highlights, link hovers, focus rings, and CTAs are all `--vc-primary`. In the Player app
blue is *one accent among five sport colors* on top of calm neutral surfaces.

Rules going forward (apply across all packages):

- **Backgrounds are neutral.** Section backgrounds are `--vc-bg`, `--vc-surface`, or
  `--vc-surface-alt`. Never a blue-tinted wash (`#eff6ff`-style gradients are banned).
  Deep-color sections (footers, CTA bands) use `--vc-ink`-family near-black
  (`#0f172a`/`#111827`), not navy blue.
- **Blue keeps three jobs only:** primary buttons/CTAs, links/interactive affordances,
  and club-related identity. Everything else picks the color that *means* something:
  sport colors for sports content, orange `--vc-accent` for energy/queues/fees/highlights,
  green `--vc-brand-green` for success/free/community.
- **`em` highlights in headings** stop being uniformly blue. Add modifier support so each
  section chooses: `em` default stays `--vc-primary`, but sections may set
  `--em-color: var(--vc-accent)` etc. Implement as
  `h1 em, h2 em { color: var(--em-color, var(--vc-primary)); }` and let section classes
  override `--em-color`. Landing/business packages will use this.
- **Eyebrows/kickers** default to `--vc-text-secondary` (as the app does); the accent
  variant (`.eyebrow--accent`) may be orange or blue per section, again via `--em-color`
  or an explicit modifier — not blue everywhere.

## 2. New shared CSS components to add

Add these to `global.css` (Atoms section), matching the Player-app patterns named in
[00-OVERVIEW.md](00-OVERVIEW.md):

### `.icon-chip`
```css
.icon-chip {
  width: 40px; height: 40px; border-radius: var(--vc-radius-sm);
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--chip-color, var(--vc-primary)) 12%, transparent);
  color: var(--chip-color, var(--vc-primary));
}
.icon-chip--lg { width: 46px; height: 46px; border-radius: var(--vc-radius-md); }
.icon-chip--invert { /* for dark/gradient surfaces */
  background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.35); color: #fff;
}
```
Usage: `<span className="icon-chip" style={{'--chip-color':'var(--vc-accent)'}}><Zap size={20}/></span>`

### `.status-badge`
Pill with 6px dot: `display:inline-flex; gap:6px; align-items:center; padding:4px 10px;
border-radius:pill; font-size:11px; font-weight:700;` background = `--badge-color` at 12%,
text = full `--badge-color`, dot = 6px circle in `--badge-color`. Add `.status-badge--solid`
(full fill, white text) and `.status-badge--white` (white bg + colored text, for use on
gradient/photo headers).

### `.info-pill`
`display:inline-flex; gap:5px; align-items:center; font-size:12px; font-weight:600;
color: var(--vc-text-secondary);` icons 14px. Plus `.meta-dots` for the dot-separated
metadata row (3px `--vc-text-tertiary` dot separators via `::before` on `li + li` or
between spans).

### `.sport-tag`
Small chip, radius `sm`, sport color at 12% tint + full sport color text, 11px w700.
Map sport → color with modifier classes (`.sport-tag--basketball` etc.) reading the
`--vc-sport-*` variables.

### `.filter-pill` (selected-pill contrast rule)
```css
.filter-pill { min-height:38px; padding:0 14px; border-radius:var(--vc-radius-pill);
  background:var(--vc-surface); border:1px solid var(--vc-border);
  color:var(--vc-text-secondary); font-weight:600; font-size:13px;
  display:inline-flex; align-items:center; gap:7px; transition:var(--vc-transition); }
.filter-pill[aria-pressed="true"], .filter-pill.is-active {
  background: var(--pill-color, var(--vc-primary)); border-color: var(--pill-color, var(--vc-primary));
  color:#fff; font-weight:700;
  box-shadow: 0 3px 8px color-mix(in srgb, var(--pill-color, var(--vc-primary)) 30%, transparent); }
```

### `.empty-state`
Centered column: 64px circle (`--vc-primary` at 8%) with 30px primary icon, 15px w800
title, 13px secondary subtitle with `line-height:1.4`, generous padding (48px 24px).

### `.skeleton`
`background: var(--vc-surface-alt); border-radius: var(--vc-radius-pill);` with a subtle
shimmer keyframe (opacity pulse 1.2s, disabled under `prefers-reduced-motion`). Provide
`.skeleton--block` (radius `md`) for image/banner bones.

### `.stripe-card` helper
A modifier for cards that carry the 4px left **kind accent stripe**: inner
`::before { position:absolute; left:0; top:0; bottom:0; width:4px;
background: var(--stripe-color); }` with the card set to `overflow:hidden`.

## 3. Section rhythm utilities

- `.landing-section` paddings should be consistent: 96px vertical desktop, 64px tablet,
  48px mobile. Audit existing sections and normalize.
- `.section-heading` keeps the split-heading pattern (eyebrow + big heading left,
  supporting paragraph right) — verify it collapses cleanly at ≤1024px.

## 4. Small cleanups while in here

- Remove the legacy aliases block (`--blue`, `--green`, `--orange`, `--ink`, `--muted`,
  `--line`, `--bg`, `--surface-alt`) **only if** a grep shows no remaining usage;
  otherwise leave and note usage sites in the PR description.
- Focus ring: keep blue (`rgba(37,99,235,.4)`) — interaction affordance is one of blue's
  jobs.
- Verify all hover transforms are guarded by the existing reduced-motion block.

## Acceptance checklist

- [ ] `.icon-chip`, `.status-badge`, `.info-pill`, `.meta-dots`, `.sport-tag`,
      `.filter-pill`, `.empty-state`, `.skeleton`, `.stripe-card` exist in `global.css`
      and are demonstrated on at least one existing page (Cards.jsx may adopt
      `.status-badge`/`.sport-tag`/`.info-pill` where it currently hand-rolls them).
- [ ] `--em-color` mechanism in place; no visual change yet on pages (defaults preserve
      current look until later packages opt in).
- [ ] No new hardcoded hex values except inside `:root`.
- [ ] `npm run build` + `npm run lint` pass; landing, /app, and public pages look unchanged
      or trivially improved.
