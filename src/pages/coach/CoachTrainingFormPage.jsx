import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import ImagePickerField from '../../components/ImagePickerField'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { SPORTS } from '../../data/sports'
import { SKILLS, TRAINING_KINDS, coachApi, commissionFor, formatPeso, isBookableKind, skillLabel } from '../../data/trainings'
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
    kind: existing?.kind || 'SCHEDULED',
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
  // Packages ("10 sessions · ₱4,500"): rows as typed; null while an existing
  // training's are loading (then left untouched on save).
  const [packages, setPackages] = useState(() => (existing?.canHavePackages ? null : []))
  useEffect(() => {
    if (!existing?.canHavePackages) return undefined
    let active = true
    coachApi.packages(existing.id)
      .then((res) => { if (active) setPackages(res.packages.map((p) => ({ id: p.id, sessions: String(p.sessions), price: String(p.price), validityDays: p.validityDays == null ? '' : String(p.validityDays) }))) })
      .catch(() => { if (active) setPackages([]) })
    return () => { active = false }
  }, [existing])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const price = form.paid ? Number.parseInt(form.price, 10) || 0 : 0
  // Private/Group: no date, players book sessions, no training credit.
  const bookable = isBookableKind(form.kind)
  const group = form.kind === 'GROUP'
  const perUnit = form.kind === 'PRIVATE' ? 'session' : 'player'
  // A dated training's price can't change once someone has paid.
  const priceLocked = !bookable && editing && existing.participantCount > 0 && existing.pricePerPlayer > 0
  // Bookable listings, or an existing multiple-dates series.
  const packagesAllowed = bookable || Boolean(existing?.seriesId)
  const maxPackageSessions = bookable ? 100 : existing?.seriesCount || 2
  const setPackage = (i, key) => (e) => setPackages((list) => list.map((p, j) => (j === i ? { ...p, [key]: e.target.value } : p)))
  const pickKind = (kind) => setForm((f) => ({
    ...f,
    kind,
    // A group needs room for at least two.
    capacity: kind === 'GROUP' && (Number.parseInt(f.capacity, 10) || 0) < 2 ? '6' : f.capacity,
  }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const capacity = Number.parseInt(form.capacity, 10)
    const start = new Date(`${form.date}T${form.time}`)
    if (!venue) return setError('Pick where the training happens.')
    if (!form.title.trim()) return setError('Give the training a title.')
    if (form.kind !== 'PRIVATE' && (!capacity || capacity < 1)) return setError('Enter how many players can join.')
    if (group && (capacity < 2 || capacity > 50)) return setError('A group training takes 2 to 50 players per booking.')
    if (!bookable && editing && capacity < existing.participantCount) return setError(`Capacity can't go below the ${existing.participantCount} players already in.`)
    if (form.paid && price < MIN_PRICE) return setError(`Paid trainings start at ₱${MIN_PRICE} — or choose Free.`)
    if (!bookable && Number.isNaN(start.getTime())) return setError('Pick a valid date and time.')
    if (!bookable && !editing && start <= new Date()) return setError('Pick a start time in the future.')
    if (packagesAllowed && packages) {
      for (const p of packages) {
        const n = Number.parseInt(p.sessions, 10)
        if (!n || n < 2 || n > maxPackageSessions) return setError(`Packages take 2 to ${maxPackageSessions} sessions.`)
        if ((Number.parseInt(p.price, 10) || 0) < MIN_PRICE) return setError(`A package costs at least ₱${MIN_PRICE}.`)
        if (p.validityDays && !(Number.parseInt(p.validityDays, 10) >= 1)) return setError('Validity is a number of days — or leave it empty.')
      }
    }

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
      ...(form.kind === 'PRIVATE' ? {} : { capacity }),
      pricePerPlayer: price,
      // Bookable listings have no date; the kind is fixed once created.
      ...(bookable ? {} : { startTime: start.toISOString() }),
      ...(!editing && bookable ? { kind: form.kind } : {}),
      ...(packagesAllowed && packages ? {
        packages: packages.map((p) => ({
          ...(p.id ? { id: p.id } : {}),
          sessions: Number.parseInt(p.sessions, 10),
          price: Number.parseInt(p.price, 10),
          validityDays: p.validityDays ? Number.parseInt(p.validityDays, 10) : null,
        })),
      } : {}),
      durationHours: form.duration,
      images: form.image ? [form.image] : [],
    }

    setBusy(true)
    try {
      const saved = await act(() => (editing ? coachApi.update(trainingId, body) : coachApi.create(body)))
      setNotice(editing
        ? 'Training updated'
        : bookable
          ? `${group ? 'Group' : 'Private'} training listed — players can book a session any time.`
          : 'Training published — share it with your players!')
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
        <h1>{editing ? 'Edit' : 'New'} {bookable ? `${group ? 'group' : 'private'} training` : 'training'}</h1>
      </div>

      {!editing && (
        <section className="coach-card">
          <h2 className="coach-card__label">Type</h2>
          <div className="coach-fee coach-fee--three" role="radiogroup" aria-label="Training type">
            {TRAINING_KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={form.kind === k.id} className={form.kind === k.id ? 'is-active' : ''} onClick={() => pickKind(k.id)}>
                <b>{k.label}</b><small>{k.caption}</small>
              </button>
            ))}
          </div>
          <p className={`coach-kind-note${bookable ? '' : ' is-scheduled'}`}>
            {form.kind === 'SCHEDULED' && 'Players join on the date you set. Uses 1 training credit.'}
            {form.kind === 'PRIVATE' && 'Post once and it stays up. Players pick a time for a one-on-one session and you accept or decline each request. Uses no training credits.'}
            {form.kind === 'GROUP' && 'Post once and it stays up. Players book a time for their group (up to your group size), paying per player. Uses no training credits.'}
          </p>
        </section>
      )}

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
        <h2 className="coach-card__label">{bookable ? 'Sessions' : 'When'}</h2>
        {!bookable && <div className="tr-field-row">
          <label className="tr-field"><span>Date</span><input className="tr-input" type="date" value={form.date} min={editing ? undefined : toDateInput(new Date())} onChange={set('date')} required /></label>
          <label className="tr-field"><span>Start time</span><input className="tr-input" type="time" value={form.time} onChange={set('time')} required /></label>
        </div>}
        <div className="tr-field">
          <span>{bookable ? 'Each session' : 'Duration'}</span>
          <div className="coach-stepper">
            <button type="button" aria-label="Shorter" disabled={form.duration <= 1} onClick={() => setForm((f) => ({ ...f, duration: Math.max(1, f.duration - 1) }))}><Minus size={16} /></button>
            <b>{form.duration} {form.duration === 1 ? 'hour' : 'hours'}</b>
            <button type="button" aria-label="Longer" disabled={form.duration >= 6} onClick={() => setForm((f) => ({ ...f, duration: Math.min(6, f.duration + 1) }))}><Plus size={16} /></button>
          </div>
        </div>
        {form.kind !== 'PRIVATE' && (
          <label className="tr-field">
            <span>{group ? 'Max players per booking' : 'Players (capacity)'}</span>
            <input className="tr-input" type="number" min={group ? 2 : 1} max={group ? 50 : 100} value={form.capacity} onChange={set('capacity')} required />
          </label>
        )}
      </section>

      <section className="coach-card">
        <h2 className="coach-card__label">Pricing</h2>
        <div className="coach-fee">
          <button type="button" className={!form.paid ? 'is-active' : ''} disabled={priceLocked} onClick={() => setForm((f) => ({ ...f, paid: false }))}><b>Free</b><small>No fee to {bookable ? 'book' : 'join'}</small></button>
          <button type="button" className={form.paid ? 'is-active' : ''} disabled={priceLocked} onClick={() => setForm((f) => ({ ...f, paid: true }))}><b>Paid</b><small>From ₱{MIN_PRICE} / {perUnit}</small></button>
        </div>
        {form.paid ? (
          <>
            <label className="tr-field"><span>Price per {perUnit} (₱)</span>
              <input className="tr-input" type="number" min={MIN_PRICE} step="1" value={form.price} onChange={set('price')} disabled={priceLocked} />
            </label>
            {priceLocked && <p className="coach-hint">Price is locked once players have joined.</p>}
            {editing && bookable && <p className="coach-hint">New bookings pay this — existing ones keep their price.</p>}
            {price >= MIN_PRICE && bookable && (
              <p className="coach-hint">
                {group ? `Each player in a group pays ${formatPeso(price)}` : `Players pay ${formatPeso(price)} per session`} (QR or cash). Versus keeps 15% of each session, settled when you mark it complete — QR payments minus the commission go to your Versus Wallet.
              </p>
            )}
            {price >= MIN_PRICE && !bookable && (
              <p className="coach-hint">
                Players pay {formatPeso(price)}. Versus keeps 15% ({formatPeso(commissionFor(price))} per player, QR or cash). When you complete the training, QR payments minus the commission go to your Versus Wallet; if cash seats leave commission uncovered, you settle the rest.
              </p>
            )}
          </>
        ) : <p className="coach-hint">{bookable ? 'Players book sessions for free' : 'Anyone can join for free'} — nothing is charged.</p>}
      </section>

      {packagesAllowed && (
        <section className="coach-card">
          <h2 className="coach-card__label">Packages (optional)</h2>
          <p className="coach-hint">
            Sell several sessions at once, e.g. 10 sessions for ₱4,500. {bookable ? 'Players pick their times now or later.' : 'Players pick which of your dates they come to.'}
            {form.kind === 'PRIVATE' ? '' : ' Priced per player.'}
          </p>
          {packages === null ? <p className="coach-hint">Loading packages…</p> : (
            <>
              {packages.map((p, i) => {
                const n = Number.parseInt(p.sessions, 10) || 0
                const total = Number.parseInt(p.price, 10) || 0
                return (
                  <div key={p.id || i} className="coach-package-row">
                    <label className="tr-field"><span>Sessions</span><input className="tr-input" type="number" min="2" max={maxPackageSessions} value={p.sessions} onChange={setPackage(i, 'sessions')} /></label>
                    <label className="tr-field"><span>Price (₱)</span><input className="tr-input" type="number" min={MIN_PRICE} value={p.price} onChange={setPackage(i, 'price')} /></label>
                    <label className="tr-field"><span>Valid (days)</span><input className="tr-input" type="number" min="1" placeholder="No limit" value={p.validityDays} onChange={setPackage(i, 'validityDays')} /></label>
                    <button type="button" className="tr-icon-btn" aria-label="Remove package" onClick={() => setPackages((list) => list.filter((_, j) => j !== i))}><X size={16} /></button>
                    <small className="coach-hint">{n && total ? `${n * form.duration} hours in all · ${formatPeso(total / n)} per session` : 'Sessions, total price, and how long it stays usable.'}</small>
                  </div>
                )
              })}
              {packages.length < 6 && (
                <button type="button" className="button button--outline coach-btn" onClick={() => {
                  const n = bookable ? 10 : Math.min(10, maxPackageSessions)
                  setPackages((list) => [...list, { id: '', sessions: String(n), price: String((price || 300) * Math.max(1, n - 1)), validityDays: '60' }])
                }}><Plus size={16} /> Add a package</button>
              )}
            </>
          )}
        </section>
      )}

      {error && <p className="tr-error">{error}</p>}

      <button type="submit" className="button button--primary button--full coach-btn" disabled={busy}>
        {busy ? 'Saving…' : editing ? 'Save changes' : bookable ? `List ${group ? 'group' : 'private'} training` : 'Publish training'}
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
