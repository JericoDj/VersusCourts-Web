import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ProfileDialog({ title, children, onClose, busy = false, actions }) {
  const panel = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current.focus()
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return createPortal(<div className="pf-dialog-overlay" onClick={() => !busy && onClose()} onKeyDown={(event) => {
    if (event.key === 'Escape' && !busy) onClose()
    if (event.key === 'Tab') {
      const items = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href]')]
      if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === panel.current)) { event.preventDefault(); items.at(-1)?.focus() }
      if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus() }
    }
  }}><section className="pf-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
    <header>
      <h2>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <button type="button" className="pf-icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button>
      </div>
    </header>
    {children}
  </section></div>, document.body)
}
