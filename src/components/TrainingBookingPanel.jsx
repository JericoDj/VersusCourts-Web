import { useEffect, useMemo, useState } from 'react'
import { Banknote, CalendarCheck, Minus, Plus, QrCode, Smartphone, Star } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import {
  BOOKING_STATUS,
  bookTraining,
  cancelBooking,
  fetchMyBookings,
  formatPeso,
  formatSessionTime,
  trainingAppUrl,
} from '../data/trainings'

const DAYS = 30
const pad = (n) => String(n).padStart(2, '0')
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/// Web port of the app's private/group booking flow (BookSessionSheet +
/// the training page's "Your sessions"): pick a day, time, group size and
/// a note, then book — free straight away, cash as a request the coach
/// confirms, QR Ph handed off to the app (like joining a training).
/// Cancelling a QR-paid booking also goes through the app, where the
/// player picks the refund account.
export default function TrainingBookingPanel({ training: t, me, busy, run, onRate }) {
  const { setNotice } = usePlayer()
  const [bookings, setBookings] = useState(null)
  const [step, setStep] = useState(null) // 'form' | 'pay' | `cancel:<id>`
  const today = useMemo(() => startOfDay(new Date()), [])
  const [day, setDay] = useState(() => new Date(today.getTime() + 86400_000))
  const [time, setTime] = useState('09:00')
  const [players, setPlayers] = useState(1)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!me) return undefined
    let active = true
    fetchMyBookings(t.id)
      .then((list) => { if (active) setBookings(list) })
      .catch(() => { if (active) setBookings([]) })
    return () => { active = false }
  }, [t.id, me])

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => new Date(today.getTime() + i * 86400_000)), [today])
  const start = useMemo(() => {
    const [h, m] = time.split(':').map(Number)
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, m || 0)
  }, [day, time])
  const total = t.price * players
  const open = bookings?.find((b) => b.isOpen)
  const isCoach = t.coachUserId === me
  const listed = t.status === 'SCHEDULED'

  const put = (b) => setBookings((prev) => [b, ...(prev || []).filter((x) => x.id !== b.id)])

  const next = () => {
    setFormError('')
    if (start <= new Date()) return setFormError('That time has passed — pick a later one.')
    if (total > 0) setStep('pay')
    else submit()
  }

  const submit = (paymentMethod) => run(async () => {
    put(await bookTraining(t.id, { preferredStart: start, players, note, paymentMethod }))
    setStep(null)
    setNote('')
    setNotice(paymentMethod === 'CASH'
      ? 'Request sent — pay the coach in cash at the session.'
      : 'Request sent! The coach will confirm your session.')
  })

  const cancel = (b) => run(async () => {
    put(await cancelBooking(b.id))
    setStep(null)
    setNotice('Booking cancelled.')
  })

  const openInApp = () => { window.location.href = trainingAppUrl(t.id) }

  return (
    <>
      {bookings?.length > 0 && (
        <div className="tr-book">
          <p className="tr-pay__title">Your sessions</p>
          {bookings.slice(0, 6).map((b) => (
            <div key={b.id} className={`tr-booking${b.isOpen ? '' : ' is-closed'}`}>
              <div className="tr-booking__head">
                <b>{formatSessionTime(b.sessionStart)}</b>
                <span className={`tr-pill tr-pill--${BOOKING_STATUS[b.status].tone}`}>{BOOKING_STATUS[b.status].label}</span>
              </div>
              <small>
                {b.isFree ? 'Free' : `${formatPeso(b.amountPaid)} · ${b.paymentLabel}`}
                {b.players > 1 ? ` · Group of ${b.players}` : ''}
              </small>
              {b.wasRescheduled && b.status === 'CONFIRMED' && <small>You asked for {formatSessionTime(b.preferredStart)} — the coach moved it.</small>}
              {b.coachNote && <span className="tr-booking__note">Coach: “{b.coachNote}”</span>}
              {(b.status === 'PENDING' || b.status === 'CONFIRMED') && b.sessionStart > new Date() && step !== `cancel:${b.id}` && (
                <button type="button" className="coach-link-btn" disabled={busy} onClick={() => setStep(`cancel:${b.id}`)}>
                  {b.status === 'CONFIRMED' ? 'Cancel session' : 'Cancel request'}
                </button>
              )}
              {step === `cancel:${b.id}` && (
                <div className="tr-confirm">
                  {b.refundable > 0 ? (
                    <>
                      <p>You paid {formatPeso(b.refundable)} online — cancel in the app to choose where your refund goes.</p>
                      <div className="tr-confirm__row">
                        <button type="button" className="button button--outline" onClick={() => setStep(null)}>Keep it</button>
                        <button type="button" className="button button--primary" onClick={openInApp}><Smartphone size={16} /> Open app</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Cancel this booking? The coach will be told.</p>
                      <div className="tr-confirm__row">
                        <button type="button" className="button button--outline" onClick={() => setStep(null)}>Keep it</button>
                        <button type="button" className="button pf-button--danger" disabled={busy} onClick={() => cancel(b)}>Cancel booking</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="tr-actions">
        {!isCoach && listed && !open && !step && (
          <button type="button" className="button button--primary button--full" disabled={busy || !me} onClick={() => setStep('form')}>
            <CalendarCheck size={16} /> Book a session · {t.price > 0 ? `${formatPeso(t.price)}${t.isGroup ? '/player' : ''}` : 'Free'}
          </button>
        )}
        {!isCoach && listed && open && !step && (
          <p className={`tr-status tr-status--${open.status === 'CONFIRMED' ? 'ok' : 'warn'}`}>
            {open.status === 'CONFIRMED'
              ? `Session confirmed for ${formatSessionTime(open.sessionStart)}.`
              : open.status === 'PROCESSING'
                ? 'Finish your QR payment in the app to send the request.'
                : `Request sent for ${formatSessionTime(open.preferredStart)} — waiting for the coach.`}
          </p>
        )}
        {!listed && <p className="tr-status">This training is no longer taking bookings.</p>}
        {onRate && t.coachProfileId && !step && bookings?.some((b) => b.status === 'COMPLETED') && (
          <button type="button" className="button button--outline button--full" disabled={busy} onClick={onRate}><Star size={16} /> Rate {t.coachName}</button>
        )}

        {step === 'form' && (
          <div className="tr-book">
            <p className="tr-pay__title">Book a {t.isGroup ? 'group' : 'private'} session</p>
            <small className="coach-hint">Pick a time that suits you — sessions run {t.durationHours === 1 ? '1 hour' : `${t.durationHours} hours`}. The coach confirms or suggests another time.</small>
            <div className="tr-book__days" role="listbox" aria-label="Day">
              {days.map((d, i) => {
                const active = d.getTime() === startOfDay(day).getTime()
                return (
                  <button key={d.toISOString()} type="button" role="option" aria-selected={active} className={`tr-book__day${active ? ' is-active' : ''}${i === 0 ? ' is-today' : ''}`} onClick={() => setDay(d)}>
                    <small>{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</small>
                    <b>{d.getDate()}</b>
                    <span>{i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </button>
                )
              })}
            </div>
            <div className="tr-field-row">
              <label className="tr-field"><span>Other date</span>
                <input className="tr-input" type="date" min={`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`}
                  value={`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`}
                  onChange={(e) => { const [y, m, dd] = e.target.value.split('-').map(Number); if (y) setDay(new Date(y, m - 1, dd)) }} />
              </label>
              <label className="tr-field"><span>Start time</span><input className="tr-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            </div>
            {t.isGroup && (
              <div className="tr-field">
                <span>Players (up to {t.capacity})</span>
                <div className="coach-stepper">
                  <button type="button" aria-label="Fewer players" disabled={players <= 1} onClick={() => setPlayers((p) => Math.max(1, p - 1))}><Minus size={16} /></button>
                  <b>{players === 1 ? 'Just me' : `${players} players`}</b>
                  <button type="button" aria-label="More players" disabled={players >= t.capacity} onClick={() => setPlayers((p) => Math.min(t.capacity, p + 1))}><Plus size={16} /></button>
                </div>
              </div>
            )}
            <label className="tr-field"><span>Note for the coach (optional)</span>
              <textarea className="tr-input" rows={2} maxLength={500} placeholder="e.g. Beginner, want to work on footwork" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="tr-book__total"><span>{formatSessionTime(start)}</span><b>{total > 0 ? formatPeso(total) : 'Free'}</b></div>
            {formError && <p className="tr-error">{formError}</p>}
            <div className="tr-confirm__row">
              <button type="button" className="button button--outline" onClick={() => setStep(null)}>Back</button>
              <button type="button" className="button button--primary" disabled={busy} onClick={next}>{total > 0 ? 'Continue to payment' : 'Send request'}</button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="tr-pay">
            <p className="tr-pay__title">How would you like to pay {formatPeso(total)}?</p>
            <button type="button" className="tr-pay__option" disabled={busy} onClick={() => submit('CASH')}>
              <Banknote size={22} />
              <span><b>Cash at the session</b><small>Your request goes to the coach now; pay them on the day.</small></span>
            </button>
            <button type="button" className="tr-pay__option" disabled={busy} onClick={openInApp}>
              <QrCode size={22} />
              <span><b>QR Ph (GCash, Maya, banks)</b><small>Opens the Versus Courts app to book and pay securely.</small></span>
            </button>
            <button type="button" className="button button--outline button--full" onClick={() => setStep('form')}>Back</button>
          </div>
        )}
      </div>
    </>
  )
}
