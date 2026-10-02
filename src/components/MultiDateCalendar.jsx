import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')
/// "2026-10-14" — a local day key.
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/// Web port of the app's `MultiDateCalendar`: a month grid where tapping
/// days toggles them (the "Multiple dates" picker). `selected` is a Set of
/// day keys; days outside [min, max] are disabled.
export default function MultiDateCalendar({ selected, onToggle, min = new Date(), maxDays = 180 }) {
  const first = new Date(min.getFullYear(), min.getMonth(), 1)
  const [month, setMonth] = useState(first)
  const today = new Date(min.getFullYear(), min.getMonth(), min.getDate())
  const last = new Date(today.getTime() + maxDays * 86400_000)

  const cells = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const lead = start.getDay()
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  }, [month])

  const canPrev = month > first
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= last

  return (
    <div className="mdc">
      <div className="mdc__head">
        <button type="button" className="tr-icon-btn" disabled={!canPrev} aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
        <b>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="tr-icon-btn" disabled={!canNext} aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="mdc__grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="mdc__dow">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />
          const key = dayKey(d)
          const off = d < today || d > last
          const on = selected.has(key)
          return (
            <button key={key} type="button" disabled={off} aria-pressed={on} className={`mdc__day${on ? ' is-on' : ''}${key === dayKey(today) ? ' is-today' : ''}`} onClick={() => onToggle(key)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
