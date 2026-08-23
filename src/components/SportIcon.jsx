import { LayoutGrid } from 'lucide-react'
import { SPORT_FILTERS, sportColor, sportGradient, sportMeta } from '../data/sports'

function BasketballSvg({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M19.07 4.93l-4.24 4.24m-5.66 5.66l-4.24 4.24" />
      <path d="M12 2v20M2 12h20" />
    </svg>
  )
}

function TennisSvg({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M17.93 6.07a10 10 0 0 0-11.86 0M6.07 17.93a10 10 0 0 0 11.86 0" />
    </svg>
  )
}

function BadmintonSvg({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="19" r="2.5" fill="currentColor" />
      <path d="M7 6l4 10M17 6l-4 10M12 5v11M7 6h10M8.5 9.5h7M9.5 13h5" />
    </svg>
  )
}

function PickleballSvg({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 10a6 6 0 0 1 12 0c0 3.3-2.7 6-6 6a6 6 0 0 1-6-6z" />
      <path d="M10 16v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" />
      <circle cx="10" cy="9" r="1" fill="currentColor" />
      <circle cx="14" cy="9" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function PadelSvg({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="M10 15v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6" />
      <circle cx="10" cy="8" r="0.75" fill="currentColor" />
      <circle cx="14" cy="8" r="0.75" fill="currentColor" />
      <circle cx="12" cy="10" r="0.75" fill="currentColor" />
      <circle cx="10" cy="11" r="0.75" fill="currentColor" />
      <circle cx="14" cy="11" r="0.75" fill="currentColor" />
    </svg>
  )
}

/// The sport glyph itself — renders clean SVG vector icons.
export function SportGlyph({ sport, size = 20, className = '' }) {
  const id = String(sport || '').toLowerCase()
  if (id === 'basketball') return <BasketballSvg size={size} className={`sport-glyph ${className}`} />
  if (id === 'badminton') return <BadmintonSvg size={size} className={`sport-glyph ${className}`} />
  if (id === 'pickleball') return <PickleballSvg size={size} className={`sport-glyph ${className}`} />
  if (id === 'tennis') return <TennisSvg size={size} className={`sport-glyph ${className}`} />
  if (id === 'padel') return <PadelSvg size={size} className={`sport-glyph ${className}`} />
  return <LayoutGrid size={size} className={`sport-glyph ${className}`} />
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
