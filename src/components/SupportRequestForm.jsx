import { CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const copy = {
  PROPOSAL: {
    subject: 'Proposal title',
    subjectPlaceholder: 'Community partnership, venue listing, sponsorship…',
    message: 'Tell us about your proposal',
    messagePlaceholder: 'Share the idea, who it helps, your suggested timeline, and what you need from Versus Courts.',
    submit: 'Submit proposal',
  },
  INQUIRY: {
    subject: 'What can we help with?',
    subjectPlaceholder: 'General question or topic',
    message: 'Your inquiry',
    messagePlaceholder: 'Tell us what you would like to know.',
    submit: 'Send inquiry',
  },
  ACCOUNT_DELETION: {
    subject: 'Reason for deletion',
    subjectPlaceholder: 'Optional reason',
    message: 'Additional information',
    messagePlaceholder: 'Please share anything that will help us verify and process this request.',
    submit: 'Request account deletion',
  },
}

export default function SupportRequestForm({ type, compact = false }) {
  const { user } = useAuth()
  const { setNotice } = usePlayer()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization: '',
    subject: '',
    accountIdentifier: user?.handle || user?.email || '',
    message: '',
  })
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const labels = copy[type]
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setState('submitting')
    setError('')
    try {
      const response = await fetch(`${apiBase}/support-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type,
          name: form.name,
          email: form.email,
          organization: type === 'PROPOSAL' ? form.organization : undefined,
          subject: form.subject,
          accountIdentifier: type === 'ACCOUNT_DELETION' ? form.accountIdentifier : undefined,
          message: form.message,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
        throw new Error(message || 'Your request could not be submitted.')
      }
      setReference(payload.id || '')
      setState('submitted')
      setNotice(type === 'PROPOSAL' ? 'Proposal submitted successfully.' : type === 'ACCOUNT_DELETION' ? 'Account deletion request submitted.' : 'Inquiry submitted successfully.')
    } catch (submitError) {
      setError(submitError.message || 'Your request could not be submitted.')
      setState('error')
    }
  }

  if (state === 'submitted') {
    return <div className="support-form__success"><span><CheckCircle2 size={28} /></span><h3>Request received</h3><p>Our team will review it and follow up at <b>{form.email}</b>.</p>{reference && <small>Reference: {reference}</small>}</div>
  }

  return (
    <form className={`support-form ${compact ? 'support-form--compact' : ''}`} onSubmit={submit}>
      <div className="support-form__row">
        <label>Full name<input name="name" value={form.name} onChange={update} autoComplete="name" required minLength={2} /></label>
        <label>Email address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label>
      </div>
      {type === 'PROPOSAL' && <label>Organization or group<input name="organization" value={form.organization} onChange={update} placeholder="Optional" /></label>}
      {type === 'ACCOUNT_DELETION' && <label>Account email or username<input name="accountIdentifier" value={form.accountIdentifier} onChange={update} required placeholder="Email or @username used for the account" /></label>}
      <label>{labels.subject}<input name="subject" value={form.subject} onChange={update} placeholder={labels.subjectPlaceholder} /></label>
      <label>{labels.message}<textarea name="message" value={form.message} onChange={update} placeholder={labels.messagePlaceholder} required minLength={10} rows={compact ? 4 : 6} /></label>
      {type === 'ACCOUNT_DELETION' && <p className="support-form__notice">Submitting this request does not immediately delete your account. We will verify ownership before processing it.</p>}
      {error && <p className="support-form__error">{error}</p>}
      <button type="submit" className="button button--primary" disabled={state === 'submitting'}>{state === 'submitting' ? 'Submitting…' : <><Send size={17} /> {labels.submit}</>}</button>
    </form>
  )
}
