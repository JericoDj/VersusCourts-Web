import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Minus, Plus, Smartphone, Ticket, X } from 'lucide-react'
import CheckoutDialog from './CheckoutDialog'
import { usePlayer } from '../context/PlayerContext'
import {
  PACKAGE_STATUS,
  buyPackage,
  cancelPackage,
  confirmPackagePayment,
  fetchMyPackages,
  fetchSeriesDates,
  formatSessionTime,
  packageSizeLabel,
  schedulePackageSession,
  trainingAppUrl,
} from '../data/trainings'

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))}`
const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const tomorrow9 = () => { const d = new Date(Date.now() + 86400_000); d.setHours(9, 0, 0, 0); return d }

/// Web port of the app's package flow on a training page: the bundles on
/// sale (Buy → pick sessions now or later → QR/Cash checkout), and the
/// player's own packages with their balance, sessions, "Schedule a session"
/// and cancel. Private/Group sessions are times the player picks; Scheduled
/// ones are dates from the coach's series.
export default function TrainingPackagesPanel({ training: t, me }) {
  const { setNotice } = usePlayer()
  const [mine, setMine] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(null) // offer being bought
  const [order, setOrder] = useState(null) // { players, starts, trainingIds, note } → checkout
  const [dates, setDates] = useState(null) // series dates for picking
  const [scheduling, setScheduling] = useState(null) // purchase
  const [cancelling, setCancelling] = useState(null) // purchase

  const isCoach = t.coachUserId === me
  const hours = t.durationHours || 1

  useEffect(() => {
    if (!me) return undefined
    let active = true
    fetchMyPackages(t.id).then((list) => { if (active) setMine(list) }).catch(() => {})
    return () => { active = false }
  }, [t.id, me])

  const put = (p) => setMine((prev) => [p, ...prev.filter((x) => x.id !== p.id)])
  const reload = () => fetchMyPackages(t.id).then(setMine).catch(() => {})

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const loadDates = async () => {
    if (t.isBookable) return null
    const list = await fetchSeriesDates(t.id).catch(() => [])
    setDates(list)
    return list
  }

  const startBuy = (offer) => run(async () => {
    await loadDates()
    setBuying(offer)
  })

  const openSchedule = (p) => run(async () => {
    await loadDates()
    setScheduling(p)
  })

  if (!t.packages?.length && !mine.length) return null

  return (
    <div className="tr-book">
      {mine.length > 0 && (
        <>
          <p className="tr-pay__title">Your packages</p>
          {mine.map((p) => (
            <div key={p.id} className={`tr-booking${p.isOpen ? '' : ' is-closed'}`}>
              <div className="tr-booking__head">
                <b>{p.title}</b>
                <span className={`tr-pill tr-pill--${PACKAGE_STATUS[p.status].tone}`}>{PACKAGE_STATUS[p.status].label}</span>
              </div>
              <div className="tr-package__bar"><span style={{ width: `${p.sessionsTotal ? Math.round((p.sessionsScheduled / p.sessionsTotal) * 100) : 0}%` }} /></div>
              <small>
                {p.sessionsLeft} of {p.sessionsTotal} left
                {p.expiresAt ? ` · use by ${p.expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                {p.players > 1 ? ` · group of ${p.players}` : ''}
                {` · ${p.amountPaid ? `${peso(p.amountPaid)} ${p.paysCash ? 'cash' : 'QR Ph'}` : 'Free'}`}
              </small>
              {p.sessions.map((x) => (
                <small key={x.id}>{x.isDone ? '✓' : x.isPending ? '⏳' : '•'} {formatSessionTime(x.start)} {x.isDone ? '· done' : x.isPending ? '· waiting for coach' : '· confirmed'}</small>
              ))}
              {p.coachNote && <span className="tr-booking__note">Coach: “{p.coachNote}”</span>}
              {p.status === 'PENDING' && <small>The coach confirms your package and the sessions you picked.</small>}
              <div className="tr-confirm__row">
                {p.canSchedule && (
                  <button type="button" className="button button--primary" disabled={busy} onClick={() => openSchedule(p)}><CalendarPlus size={16} /> Schedule a session</button>
                )}
                {(p.status === 'PENDING' || p.status === 'ACTIVE') && (
                  <button type="button" className="coach-link-btn" disabled={busy} onClick={() => setCancelling(p)}>Cancel package</button>
                )}
              </div>
              {cancelling?.id === p.id && (
                <div className="tr-confirm">
                  {p.refundOnCancel > 0 ? (
                    <>
                      <p>About {peso(p.refundOnCancel)} would come back for what's unused — cancel in the app to choose where the refund goes.</p>
                      <div className="tr-confirm__row">
                        <button type="button" className="button button--outline" onClick={() => setCancelling(null)}>Keep it</button>
                        <button type="button" className="button button--primary" onClick={() => { window.location.href = trainingAppUrl(t.id) }}><Smartphone size={16} /> Open app</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Cancel {p.title}? Upcoming sessions from it are removed{p.paysCash ? ' — settle anything unused with your coach' : ''}.</p>
                      <div className="tr-confirm__row">
                        <button type="button" className="button button--outline" onClick={() => setCancelling(null)}>Keep it</button>
                        <button type="button" className="button pf-button--danger" disabled={busy} onClick={() => run(async () => { put(await cancelPackage(p.id)); setCancelling(null); setNotice('Package cancelled.') })}>Cancel package</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {scheduling?.id === p.id && (
                <ScheduleForm
                  training={t}
                  dates={dates}
                  busy={busy}
                  onCancel={() => setScheduling(null)}
                  onSubmit={(pick) => run(async () => {
                    put(await schedulePackageSession(p.id, pick))
                    setScheduling(null)
                    setNotice(t.isBookable ? 'Session requested — the coach will confirm it.' : "You're on that date!")
                  })}
                />
              )}
            </div>
          ))}
        </>
      )}

      {!isCoach && t.status === 'SCHEDULED' && t.packages?.length > 0 && (
        <>
          <p className="tr-pay__title">Packages</p>
          <small className="coach-hint">Buy several sessions at once and schedule them now or later.</small>
          {t.packages.map((o) => (
            <div key={o.id} className="tr-package">
              <span className="tr-package__count">{o.sessions}×</span>
              <span className="tr-package__body">
                <b>{packageSizeLabel(o, hours)}</b>
                <small>
                  {peso(o.perSession)}/session
                  {t.price > o.perSession ? ` · save ${peso((t.price - o.perSession) * o.sessions)}` : ''} · {o.validityLabel}
                </small>
              </span>
              <span className="tr-package__price">
                <b>{peso(o.price)}</b>
                {(t.isGroup || !t.isBookable) && <small>per player</small>}
                <button type="button" className="button button--primary" disabled={busy || !me} onClick={() => startBuy(o)}><Ticket size={15} /> Buy</button>
              </span>
            </div>
          ))}
        </>
      )}

      {error && <p className="tr-error">{error}</p>}

      {buying && !order && (
        <BuyForm
          training={t}
          offer={buying}
          dates={dates}
          onCancel={() => setBuying(null)}
          onContinue={(o) => setOrder(o)}
        />
      )}

      {buying && order && (
        <PackageCheckout
          training={t}
          offer={buying}
          order={order}
          onClose={() => { setOrder(null); setBuying(null); reload() }}
          onDone={() => {
            setOrder(null)
            setBuying(null)
            reload()
            setNotice(t.isBookable ? 'Package requested — the coach will confirm it.' : 'Package bought! Pick your remaining dates any time.')
          }}
        />
      )}
    </div>
  )
}

/// Pay for a package with the shared checkout (QR Ph / Cash / coupon).
function PackageCheckout({ training: t, offer, order, onClose, onDone }) {
  // A ref, not state: the QR callbacks run from closures made before the
  // purchase exists.
  const purchaseId = useRef(null)
  const picked = order.starts.length + order.trainingIds.length
  const buy = (extra) => buyPackage(t.id, offer.id, { ...order, ...extra }).then((p) => { purchaseId.current = p.id; return p })
  return (
    <CheckoutDialog
      title="Buy package"
      itemTitle={`${t.title} · ${offer.sessions}-session package`}
      venueLabel={t.courtName || t.businessName}
      timeLabel={picked ? `${picked} of ${offer.sessions} sessions picked` : 'Schedule sessions later'}
      amount={offer.price * order.players}
      priceLabel={order.players > 1 ? `Package · ${order.players} × ${peso(offer.price)}` : 'Package'}
      purposeLabel={`Training package · ${t.title}`}
      cashNote="Pay the coach in person — they confirm the package."
      successMessage="Payment received — your package is in!"
      onSubmitQr={(paymentIntentId, clientKey, couponCode) => buy({ paymentMethod: 'QRPH', paymentIntentId, clientKey, couponCode })}
      onConfirmQr={() => purchaseId.current && confirmPackagePayment(purchaseId.current)}
      onCancelQr={() => purchaseId.current && cancelPackage(purchaseId.current)}
      onSubmitCash={(couponCode) => buy({ paymentMethod: 'CASH', couponCode })}
      onSubmitFree={(couponCode) => buy({ couponCode })}
      onDone={onDone}
      onClose={onClose}
    />
  )
}

/// Group size + sessions picked now (times, or series dates).
function BuyForm({ training: t, offer, dates, onCancel, onContinue }) {
  const [players, setPlayers] = useState(1)
  const [starts, setStarts] = useState([])
  const [when, setWhen] = useState(toLocalInput(tomorrow9()))
  const [ids, setIds] = useState([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const series = !t.isBookable
  const picked = series ? ids.length : starts.length

  const addTime = () => {
    const d = new Date(when)
    if (Number.isNaN(d.getTime()) || d <= new Date()) return setError('Pick a time in the future.')
    if (starts.some((x) => x.getTime() === d.getTime())) return setError('You already picked that time.')
    setError('')
    setStarts((prev) => [...prev, d].sort((a, b) => a - b))
  }

  return (
    <div className="tr-book tr-book--panel">
      <p className="tr-pay__title">{packageSizeLabel(offer, t.durationHours)}</p>
      <small className="coach-hint">{offer.validityLabel}. Pick sessions now or later — {series ? 'from the coach’s dates' : 'any time that suits you'}.</small>
      {t.isGroup && (
        <div className="tr-field">
          <span>Players (up to {t.capacity})</span>
          <div className="coach-stepper">
            <button type="button" aria-label="Fewer players" disabled={players <= 1} onClick={() => setPlayers((p) => p - 1)}><Minus size={16} /></button>
            <b>{players === 1 ? 'Just me' : `${players} players`}</b>
            <button type="button" aria-label="More players" disabled={players >= t.capacity} onClick={() => setPlayers((p) => p + 1)}><Plus size={16} /></button>
          </div>
        </div>
      )}
      <small><b>Sessions now: {picked} of {offer.sessions}</b> (optional)</small>
      {series ? (
        dates?.length ? dates.map((d) => (
          <label key={d.id} className={`tr-check${d.available ? '' : ' is-off'}`}>
            <input
              type="checkbox"
              checked={ids.includes(d.id)}
              disabled={!d.available || (!ids.includes(d.id) && picked >= offer.sessions)}
              onChange={(e) => setIds((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)))}
            />
            <span>{formatSessionTime(d.start)}<small>{d.mine ? " · you're on it" : d.spotsLeft ? ` · ${d.spotsLeft} spots left` : ' · full'}</small></span>
          </label>
        )) : <small className="coach-hint">No upcoming dates right now.</small>
      ) : (
        <>
          {starts.map((d) => (
            <div key={d.getTime()} className="tr-check">
              <span>{formatSessionTime(d)}</span>
              <button type="button" className="tr-icon-btn" aria-label="Remove time" onClick={() => setStarts((prev) => prev.filter((x) => x !== d))}><X size={14} /></button>
            </div>
          ))}
          {starts.length < offer.sessions && (
            <div className="tr-field-row">
              <label className="tr-field"><span>Session time</span><input className="tr-input" type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} /></label>
              <button type="button" className="button button--outline" onClick={addTime}><Plus size={15} /> Add</button>
            </div>
          )}
          <label className="tr-field"><span>Note for the coach (optional)</span>
            <textarea className="tr-input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </>
      )}
      {error && <p className="tr-error">{error}</p>}
      <div className="tr-book__total"><span>{picked ? `${picked} now · ${offer.sessions - picked} later` : `All ${offer.sessions} later`}</span><b>{peso(offer.price * players)}</b></div>
      <div className="tr-confirm__row">
        <button type="button" className="button button--outline" onClick={onCancel}>Back</button>
        <button type="button" className="button button--primary" onClick={() => onContinue({ players, starts, trainingIds: ids, note })}>Continue to payment</button>
      </div>
    </div>
  )
}

/// One more session from the balance: a time (Private/Group) or a date.
function ScheduleForm({ training: t, dates, busy, onCancel, onSubmit }) {
  const [when, setWhen] = useState(toLocalInput(tomorrow9()))
  const [dateId, setDateId] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    if (t.isBookable) {
      const d = new Date(when)
      if (Number.isNaN(d.getTime()) || d <= new Date()) return setError('Pick a time in the future.')
      onSubmit({ start: d })
    } else {
      if (!dateId) return setError('Pick a date.')
      onSubmit({ trainingId: dateId })
    }
  }
  const open = (dates || []).filter((d) => d.available)
  return (
    <div className="tr-confirm">
      {t.isBookable ? (
        <label className="tr-field"><span>When</span><input className="tr-input" type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} /></label>
      ) : open.length ? (
        <label className="tr-field"><span>Date</span>
          <select className="tr-input" value={dateId} onChange={(e) => setDateId(e.target.value)}>
            <option value="">Choose a date…</option>
            {open.map((d) => <option key={d.id} value={d.id}>{formatSessionTime(d.start)} · {d.spotsLeft} spots left</option>)}
          </select>
        </label>
      ) : <p>No open dates right now — check back when the coach adds more.</p>}
      {error && <p className="tr-error">{error}</p>}
      <div className="tr-confirm__row">
        <button type="button" className="button button--outline" onClick={onCancel}>Back</button>
        <button type="button" className="button button--primary" disabled={busy || (!t.isBookable && !open.length)} onClick={submit}>{t.isBookable ? 'Request this time' : 'Join this date'}</button>
      </div>
    </div>
  )
}
