import { FileText, MessageCircle, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SupportRequestForm from './SupportRequestForm'

export default function ContactDialog({ open, onClose, initialType = 'INQUIRY' }) {
  const [type, setType] = useState(initialType)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="dialog-overlay contact-dialog-overlay" role="presentation" onClick={onClose}>
      <section className="dialog contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="dialog__close" onClick={onClose} aria-label="Close contact form"><X size={19} /></button>
        <span className="eyebrow">VERSUS SUPPORT</span>
        <h2 id="contact-dialog-title">Contact Versus Courts</h2>
        <p className="contact-dialog__lede">Choose what you need and send it directly to our team.</p>
        <nav className="contact-dialog__choices" aria-label="Contact request type">
          <button type="button" className={type === 'INQUIRY' ? 'is-active' : ''} onClick={() => setType('INQUIRY')}><MessageCircle size={17} /> Inquiry</button>
          <button type="button" className={type === 'ACCOUNT_DELETION' ? 'is-active' : ''} onClick={() => setType('ACCOUNT_DELETION')}><Trash2 size={17} /> Account deletion</button>
          <Link to="/proposal" onClick={onClose}><FileText size={17} /> Submit proposal</Link>
        </nav>
        <SupportRequestForm type={type} compact key={type} />
      </section>
    </div>
  )
}
