import { useState } from 'react'
import ImagePickerField from '../../components/ImagePickerField'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { SPORTS } from '../../data/sports'

/// Web port of `CoachIdentityScreen`: the coach/host identity players see on
/// trainings and message ("Coach Jerico") — its own name, photo and ratings,
/// separate from the player account. `PATCH /coach/profile`.
export default function CoachIdentityForm({ setup = false, onDone }) {
  const { identity, saveIdentity } = useCoach()
  const { setNotice } = usePlayer()
  const [form, setForm] = useState(() => ({
    name: identity?.name || '',
    sport: identity?.sport || 'badminton',
    experience: identity?.experience || '',
    pricePerSession: identity?.pricePerSession ? String(identity.pricePerSession) : '',
    bio: identity?.bio || '',
    avatarUrl: identity?.avatarUrl || '',
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) {
      setError('Enter the name players will see, e.g. "Coach Jerico".')
      return
    }
    setBusy(true)
    setError('')
    try {
      await saveIdentity(form)
      setNotice(setup ? 'Coach profile ready — welcome to coach mode!' : 'Coach profile saved')
      onDone?.()
    } catch (err) {
      setError(err.message || 'Could not save your coach profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="coach-card coach-form" onSubmit={submit}>
      {setup && (
        <div className="coach-form__intro">
          <h1>Set up your coach profile</h1>
          <p>This is who players see on your trainings and queues, and who they message. Your player account stays separate.</p>
        </div>
      )}

      <ImagePickerField label="Coach photo" value={form.avatarUrl} onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url || '' }))} folder="coach-profiles" isCircular deferUpload={false} />

      <label className="tr-field">
        <span>Coach name</span>
        <input className="tr-input" value={form.name} onChange={set('name')} placeholder="Coach Jerico" maxLength={60} required />
      </label>

      <label className="tr-field">
        <span>Main sport</span>
        <select className="tr-input" value={form.sport} onChange={set('sport')}>
          {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>

      <div className="tr-field-row">
        <label className="tr-field">
          <span>Experience</span>
          <input className="tr-input" value={form.experience} onChange={set('experience')} placeholder="e.g. 5 years, varsity" maxLength={80} />
        </label>
        <label className="tr-field">
          <span>Usual price / session (₱)</span>
          <input className="tr-input" type="number" min="0" step="1" value={form.pricePerSession} onChange={set('pricePerSession')} placeholder="0" />
        </label>
      </div>

      <label className="tr-field">
        <span>Bio</span>
        <textarea className="tr-input" rows={4} value={form.bio} onChange={set('bio')} placeholder="What you teach and who it's for" maxLength={500} />
      </label>

      {error && <p className="tr-error">{error}</p>}

      <button type="submit" className="button button--primary button--full coach-btn" disabled={busy}>
        {busy ? 'Saving…' : setup ? 'Start coaching' : 'Save changes'}
      </button>
    </form>
  )
}
