import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X } from 'lucide-react'
import { SportGlyph } from './SportIcon'
import { SPORTS, sportGradient } from '../data/sports'
import '../styles/modals.css'

export default function SportPickerModal({ open, onClose, onSelect }) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="sport-picker-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Scoreboard — pick a sport"
    >
      <div className="sport-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sport-picker-handle" />

        <div className="sport-picker-header">
          <h2 className="sport-picker-title">Scoreboard — pick a sport</h2>
          <button
            type="button"
            className="sport-picker-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sport-picker-list">
          {SPORTS.map((sport) => (
            <button
              type="button"
              key={sport.id}
              className="sport-picker-item"
              onClick={() => onSelect(sport.id)}
            >
              <div
                className="sport-picker-icon"
                style={{ background: sportGradient(sport.id) }}
              >
                <SportGlyph sport={sport.id} size={20} />
              </div>
              <span className="sport-picker-label">{sport.label}</span>
              <ChevronRight size={18} className="sport-picker-arrow" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
