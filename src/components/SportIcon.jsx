import { SPORT_FILTERS, sportColor, sportGradient, sportMeta } from '../data/sports'

/// The sport glyph itself — the same Material Symbol the Flutter app's
/// `SportMeta.icon` resolves to, so a basketball reads identically on both.
export function SportGlyph({ sport, size = 20, className = '' }) {
  return (
    <span
      className={`material-symbols-rounded sport-glyph ${className}`}
      style={{ fontSize: `${size}px` }}
      aria-hidden="true"
    >
      {sportMeta(sport).symbol}
    </span>
  )
}

/// One tile from the sport filter row — a port of Flutter's `CategoryFilter`
/// chip: a rounded square that fills with the sport's own gradient and throws
/// a colour-matched glow when selected, and sits as a tinted outline when not.
export function SportChip({ sport, selected = false, onSelect }) {
  const meta = sportMeta(sport)
  return (
    <button
      type="button"
      className={`sport-chip ${selected ? 'is-active' : ''}`}
      style={{ '--sport-color': sportColor(meta.id), '--sport-gradient': sportGradient(meta.id) }}
      aria-pressed={selected}
      onClick={() => onSelect?.(meta.id)}
    >
      <span className="sport-chip__tile"><SportGlyph sport={meta.id} size={30} /></span>
      <span className="sport-chip__label">{meta.label}</span>
    </button>
  )
}

/// The full row, "All" first — the shape every discovery surface uses.
export function SportSelector({ value = 'all', onChange, sports = SPORT_FILTERS }) {
  return (
    <div className="sport-selector">
      {sports.map((sport) => (
        <SportChip key={sport.id} sport={sport.id} selected={value === sport.id} onSelect={onChange} />
      ))}
    </div>
  )
}

/// The compact text-pill variant used by the directory pages' filter bars.
/// Same icons and per-sport colours as `SportChip`, just laid out inline.
export function SportFilterPills({ value = 'all', onChange }) {
  return (
    <>
      {SPORT_FILTERS.map((sport) => (
        <button
          type="button"
          key={sport.id}
          className={`filter-pill filter-pill--sport ${value === sport.id ? 'is-active' : ''}`}
          style={{ '--pill-color': sportColor(sport.id) }}
          aria-pressed={value === sport.id}
          onClick={() => onChange?.(sport.id)}
        >
          <SportGlyph sport={sport.id} size={15} />
          {sport.label}
        </button>
      ))}
    </>
  )
}

export default SportSelector
