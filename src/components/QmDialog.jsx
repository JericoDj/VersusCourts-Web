import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styles/queue-master.css'

export default function QmDialog({ isOpen = true, onClose, children, maxWidth = '720px' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="qm-dialog-overlay"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="qm-dialog-window"
        style={{ maxWidth }}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
