import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import ImagePickerField from '../../components/ImagePickerField'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { SPORTS } from '../../data/sports'
import { SKILLS, coachApi, commissionFor, formatPeso, skillLabel } from '../../data/trainings'
import { addVenue, searchVenues } from '../../data/venues'

const MIN_PRICE = 20

/// Training sports: Badminton first (the default), Basketball last.
const TRAINING_SPORTS = [...SPORTS.filter((s) => s.id !== 'basketball'), ...SPORTS.filter((s) => s.id === 'basketball')]

const pad = (n) => String(n).padStart(2, '0')
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const defaultStart = () => {
  const d = new Date(Date.now() + 86400_000)
  d.setHours(9, 0, 0, 0)
  return d
}

const initialForm = (existing) => {
  const start = existing?.startTime || defaultStart()
  return {
    title: existing?.title || '',
    description: existing?.description || '',
    sport: existing?.sport || 'badminton',
    skill: existing?.skill || 'BEGINNER',
    capacity: String(existing?.capacity ?? 8),
    paid: existing ? existing.pricePerPlayer > 0 : true,
    price: existing?.pricePerPlayer > 0 ? String(existing.pricePerPlayer) : '300',
    date: toDateInput(start),
    time: toTimeInput(start),
    duration: existing?.durationHours || 1,
    image: existing?.imageUrl || '',
  }
}

/// Web port of `CreateTrainingScreen` — create (`POST /coach/trainings`) or
/// edit (`PATCH /coach/trainings/:id`, only while SCHEDULED). A venue is a
/// listed court that offers coaching, or a custom spot typed by hand.
export default function CoachTrainingFormPage() {
  const { trainingId } = useParams()
  const navigate = useNavigate()
  const { trainings } = useCoach()
  const existing = trainings.find((t) => t.id === trainingId)

  if (trainingId && !existing) {
    return <div className="coach-page"><p className="tr-status">Loading training…</p></div>
  }
  if (existing && existing.status !== 'SCHEDULED') {
    return (
      <div className="coach-page">
        <p className="tr-status">Only scheduled trainings can be edited.</p>
        <button type="button" className="button button--outline coach-btn" onClick={() => navigate(`/coach/trainings/${trainingId}`)}>Back</button>
      </div>
    )
  }
  // Keyed so the form re-seeds when switching between trainings.
  return <TrainingForm key={trainingId || 'new'} existing={existing} />
}

function TrainingForm({ existing }) {
  const editing = Boolean(existing)
  const trainingId = existing?.id
  const navigate = useNavigate()
  const { act } = useCoach()
  const { setNotice } = usePlayer()

  const [form, setForm] = useState(() => initialForm(existing))
  const [venue, setVenue] = useState(() => (existing
    ? { id: existing.courtId, name: existing.courtName, area: existing.area, custom: existing.isCustomVenue, unchanged: true }
    : null)) // { id?, name, area, custom }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const price = form.paid ? Number.parseInt(form.price, 10) || 0 : 0

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const capacity = Number.parseInt(form.capacity, 10)
    const start = new Date(`${form.date}T${form.time}`)
    if (!venue) return setError('Pick where the training happens.')
    if (!form.title.trim()) return setError('Give the training a title.')
    if (!capacity || capacity < 1) return setError('Enter how many players can join.')
    if (editing && capacity < existing.participantCount) return setError(`Capacity can't go below the ${existing.participantCount} players already in.`)
    if (form.paid && price < MIN_PRICE) return setError(`Paid trainings start at ₱${MIN_PRICE} — or choose Free.`)
    if (Number.isNaN(start.getTime())) return setError('Pick a valid date and time.')
    if (!editing && start <= new Date()) return setError('Pick a start time in the future.')

    const venueBody = venue.unchanged ? {} : venue.custom
      ? {
          customCourtName: venue.name.trim(),
          ...(venue.area?.trim() ? { customArea: venue.area.trim() } : {}),
          ...(venue.lat != null && venue.lng != null ? { customLat: venue.lat, customLng: venue.lng } : {}),
        }
      : { courtId: venue.id }
    const body = {
      ...venueBody,
      title: form.title.trim(),
      ...(form.description.trim() || editing ? { description: form.description.trim() } : {}),
      sport: form.sport.toUpperCase(),
      skill: form.skill,
      capacity,
      pricePerPlayer: price,
      // UTC with the Z suffix so the backend doesn't misread local time.
      startTime: start.toISOString(),
      durationHours: form.duration,
      images: form.image ? [form.image] : [],
    }

    setBusy(true)
    try {
      const saved = await act(() => (editing ? coachApi.update(trainingId, body) : coachApi.create(body)))
      setNotice(editing ? 'Training updated' : 'Training published — share it with your players!')
      navigate(`/coach/trainings/${saved?.id || trainingId}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not save the training.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="coach-page coach-form" onSubmit={submit}>
      <div className="coach-page__head">
        <button type="button" className="tr-icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={18} /></button>
        <h1>{editing ? 'Edit training' : 'New training'}</h1>
      </div>

      <section className="coach-card">
        <h2 className="coach-card__label">Where</h2>
        <VenuePicker value={venue} onChange={setVenue} />
      </section>

      <section className="coach-card">
        <h2 className="coach-card__label">What</h2>
        <label className="tr-field"><span>Title</span><input className="tr-input" value={form.title} onChange={set('title')} placeholder="Beginner footwork clinic" maxLength={80} required /></label>
        <label className="tr-field"><span>Description</span><textarea className="tr-input" rows={3} value={form.description} onChange={set('description')} placeholder="What you'll cover, what to bring" maxLength={1000} /></label>
        <ImagePickerField label="Cover photo" value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url || '' }))} folder="trainings" aspectRatio={16 / 9} deferUpload={false} />
        <div className="tr-field-row">
          <label className="tr-field"><span>Sport</span>
            <select className="tr-input" value={form.sport} onChange={set('sport')}>{TRAINING_SPORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </label>
          <label className="tr-field"><span>Skill level</span>
            <select className="tr-input" value={form.skill} onChange={set('skill')}>{SKILLS.map((s) => <option key={s} value={s}>{skillLabel(s)}</option>)}</select>
          </label>
        </div>
      </section>

      <section className="coach-card">
        <h2 className="coach-card__label">When</h2>
        <div className="tr-field-row">
          <label className="tr-field"><span>Date</span><input className="tr-input" type="date" value={form.date} min={editing ? undefined : toDateInput(new Date())} onChange={set('date')} required /></label>
          <label className="tr-field"><span>Start time</span><input className="tr-input" type="time" value={form.time} onChange={set('time')} required /></label>
        </div>
        <div className="tr-field">
          <span>Duration</span>
          <div className="coach-stepper">
            <button type="button" aria-label="Shorter" disabled={form.duration <= 1} onClick={() => setForm((f) => ({ ...f, duration: Math.max(1, f.duration - 1) }))}><Minus size={16} /></button>
            <b>{form.duration} {form.duration === 1 ? 'hour' : 'hours'}</b>
            <button type="button" aria-label="Longer" disabled={form.duration >= 6} onClick={() => setForm((f) => ({ ...f, duration: Math.min(6, f.duration + 1) }))}><Plus size={16} /></button>
          </div>
        </div>
        <label className="tr-field"><span>Players (capacity)</span><input className="tr-input" type="number" min="1" max="100" value={form.capacity} onChange={set('capacity')} required /></label>
      </section>

      <section className="coach-card">
        <h2 className="coach-card__label">Pricing</h2>
        <div className="coach-fee">
          <button type="button" className={!form.paid ? 'is-active' : ''} onClick={() => setForm((f) => ({ ...f, paid: false }))}><b>Free</b><small>No fee to join</small></button>
          <button type="button" className={form.paid ? 'is-active' : ''} disabled={editing && existing.participantCount > 0 && existing.pricePerPlayer > 0} onClick={() => setForm((f) => ({ ...f, paid: true }))}><b>Paid</b><small>From ₱{MIN_PRICE} / player</small></button>
        </div>
        {form.paid ? (
          <>
            <label className="tr-field"><span>Price per player (₱)</span>
              <input className="tr-input" type="number" min={MIN_PRICE} step="1" value={form.price} onChange={set('price')} disabled={editing && existing.participantCount > 0 && existing.pricePerPlayer > 0} />
            </label>
            {editing && existing.participantCount > 0 && existing.pricePerPlayer > 0 && <p className="coach-hint">Price is locked once players have joined.</p>}
            {price >= MIN_PRICE && (
              <p className="coach-hint">
                Players pay {formatPeso(price)}. Versus keeps 15% ({formatPeso(commissionFor(price))} per player, QR or cash). When you complete the training, QR payments minus the commission go to your Versus Wallet; if cash seats leave commission uncovered, you settle the rest.
              </p>
            )}
          </>
        ) : <p className="coach-hint">Anyone can join for free — nothing is charged.</p>}
      </section>

      {error && <p className="tr-error">{error}</p>}

      <button type="submit" className="button button--primary button--full coach-btn" disabled={busy}>
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish training'}
      </button>
    </form>
  )
}

/// Listed courts that offer coaching, or a custom venue (unlisted spot).
function VenuePicker({ value, onChange }) {
  const [mode, setMode] = useState(value?.custom ? 'custom' : 'search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null while a search is in flight
  const [custom, setCustom] = useState({ name: '', area: '' })
  const [savingCustom, setSavingCustom] = useState(false)

  /// Saves the typed venue so the next coach finds it in search — or reuses
  /// the listed court / saved venue that is already this place.
  const applyCustom = async () => {
    const fallback = { name: custom.name.trim(), area: custom.area.trim(), custom: true }
    setSavingCustom(true)
    try {
      const { option } = await addVenue({ name: fallback.name, area: fallback.area })
      onChange(option.isCustom ? { ...option, custom: true } : { ...option, custom: false })
    } catch {
      onChange(fallback)
    } finally {
      setSavingCustom(false)
    }
  }

  useEffect(() => {
    if (mode !== 'search' || value) return undefined
    let active = true
    const timer = setTimeout(() => {
      // Coaching courts, then venues people saved via "Other venue".
      Promise.all([coachApi.searchCourts(query), searchVenues(query)])
        .then(([courts, venues]) => { if (active) setResults([...courts, ...venues]) })
        .catch(() => { if (active) setResults([]) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [query, mode, value])

  if (value) {
    return (
      <div className="coach-venue">
        <MapPin size={18} />
        <span><b>{value.name}</b><small>{[value.organizationName, value.area].filter(Boolean).join(' · ') || (value.custom ? 'Custom venue' : '')}</small></span>
        <button type="button" className="tr-icon-btn" aria-label="Change venue" onClick={() => onChange(null)}><X size={16} /></button>
      </div>
    )
  }

  return (
    <div className="coach-venue-picker">
      <div className="coach-segment coach-segment--small">
        <button type="button" className={mode === 'search' ? 'is-active' : ''} onClick={() => setMode('search')}>Listed court</button>
        <button type="button" className={mode === 'custom' ? 'is-active' : ''} onClick={() => setMode('custom')}>Other venue</button>
      </div>
      {mode === 'search' ? (
        <>
          <div className="queue-search-bar"><Search size={18} /><input value={query} onChange={(e) => { setQuery(e.target.value); setResults(null) }} placeholder="Search coaching courts or saved venues" /></div>
          <div className="coach-venue-results">
            {results === null ? <p className="coach-hint">Searching…</p> : results.length ? results.map((c) => (
              <button key={c.venueId || c.id} type="button" className="coach-row" onClick={() => onChange({ ...c, custom: Boolean(c.venueId) })}>
                <MapPin size={16} />
                <span className="coach-row__body"><b>{c.name}</b><small>{c.venueId ? ['Added venue', c.area].filter(Boolean).join(' · ') : [c.organizationName, c.area].filter(Boolean).join(' · ')}</small></span>
              </button>
            )) : <p className="coach-hint">No courts or saved venues match. Use “Other venue” to add an unlisted spot.</p>}
          </div>
        </>
      ) : (
        <>
          <label className="tr-field"><span>Venue name</span><input className="tr-input" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Barangay covered court" /></label>
          <label className="tr-field"><span>Area / address</span><input className="tr-input" value={custom.area} onChange={(e) => setCustom((c) => ({ ...c, area: e.target.value }))} placeholder="e.g. Quezon City" /></label>
          <button type="button" className="button button--outline coach-btn" disabled={custom.name.trim().length < 2 || savingCustom} onClick={applyCustom}>{savingCustom ? 'Saving…' : 'Use this venue'}</button>
        </>
      )}
    </div>
  )
}
