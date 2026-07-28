import { Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'

/// Lightweight heads-up for nav destinations that aren't live yet, so
/// clicking "Book Courts" / "Sports Events" gives feedback instead of nothing.
export default function ComingSoonDialog({ open, onClose, label }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="dialog coming-soon-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${label} — Coming Soon`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="coming-soon-dialog__icon"><Sparkles size={28} /></div>
        <h2>{label} is coming soon</h2>
        <p>We're putting the finishing touches on this. Check back soon — or explore clubs and open play queues in the meantime.</p>
        <button className="button button--primary button--full" onClick={onClose}>Sounds good, take me back</button>
      </div>
    </div>
  )
}
