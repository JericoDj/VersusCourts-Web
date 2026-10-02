import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, CalendarClock, CheckCircle2, ChevronRight, Inbox, MapPin, Pencil, Share2, StickyNote, Users, Wallet, XCircle } from 'lucide-react'
import ProfileDialog from '../../components/ProfileDialog'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { sportColor, sportGradient, sportLabel } from '../../data/sports'
import { BOOKING_STATUS, coachApi, formatPeso, formatSessionTime, kindLabel, shareTraining, skillLabel } from '../../data/trainings'
import '../../styles/profile.css'
import CoachPackagesPanel from './CoachPackagesPanel'

const TABS = [
  { key: 'requests', label: 'Requests', icon: Inbox, empty: 'No requests waiting — new bookings land here and you get a notification.' },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarCheck, empty: 'No confirmed sessions. Accept a request and it shows here.' },
  { key: 'history', label: 'History', icon: CalendarClock, empty: 'Completed, declined and cancelled bookings show here.' },
  { key: 'packages', label: 'Packages', icon: CalendarClock, empty: '' },
]
const tabFor = (b) => (b.status === 'PENDING' || b.status === 'PROCESSING' ? 'requests' : b.status === 'CONFIRMED' ? 'upcoming' : 'history')

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/// Web port of the app's `PrivateTrainingScreen`: a Private/Group listing
/// and its booked sessions. `?booking=<id>` (from a notification) opens
/// that booking straight away.
export default function CoachBookingsView({ training: t }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { act } = useCoach()
  const { setNotice } = usePlayer()
  const [bookings, setBookings] = useState(null)
  const [loadError, setLoadError] = useState('')
  // `?tab=packages` (from a package notification) opens the Packages tab.
  const [tab, setTab] = useState(() => (params.get('tab') === 'packages' ? 'packages' : 'requests'))
  const [openId, setOpenId] = useState(null)
  const [mode, setMode] = useState(null) // null | 'time' | 'decline' | 'complete' | 'close'
  const [when, setWhen] = useState('')
  const [reason, setReason] = useState('')
  const [settlement, setSettlement] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => coachApi.bookings(t.id).then(
    (list) => { setBookings(list); setLoadError(''); return list },
    (err) => { setLoadError(err.message || 'Could not load bookings.'); return null },
  ), [t.id])

  // From a notification: open that booking on the right tab, once.
  const linked = params.get('booking')
  useEffect(() => {
    let active = true
    coachApi.bookings(t.id).then((list) => {
      if (!active) return
      setBookings(list)
      setLoadError('')
      if (!linked) return
      const b = list.find((x) => x.id === linked)
      if (b) { setTab(tabFor(b)); setOpenId(b.id) }
      setParams((p) => { p.delete('booking'); return p }, { replace: true })
    }, (err) => { if (active) setLoadError(err.message || 'Could not load bookings.') })
    return () => { active = false }
    // Only on mount / when the link changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id, linked])

  const inTab = useMemo(() => {
    const groups = { requests: [], upcoming: [], history: [], packages: [] }
    for (const b of bookings || []) groups[tabFor(b)].push(b)
    groups.requests.sort((a, b) => a.sessionStart - b.sessionStart)
    groups.upcoming.sort((a, b) => a.sessionStart - b.sessionStart)
    groups.history.sort((a, b) => b.sessionStart - a.sessionStart)
    return groups
  }, [bookings])

  const open = bookings?.find((b) => b.id === openId) || null
  const listed = t.status === 'SCHEDULED'

  const closeDialog = () => { setOpenId(null); setMode(null); setError(''); setReason(''); setSettlement(null) }

  /// Runs a coach action, reloads bookings + the dashboard.
  const run = async (fn, message) => {
    setBusy(true)
    setError('')
    try {
      const result = await act(fn)
      await load()
      if (message) setNotice(typeof message === 'function' ? message(result) : message)
      return true
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const accept = async (b, time) => {
    const ok = await run(() => coachApi.acceptBooking(t.id, b.id, { scheduledStart: time }),
      `${b.status === 'CONFIRMED' ? 'Moved' : 'Confirmed'} for ${formatSessionTime(time || b.sessionStart)} — ${b.playerName} was told.`)
    if (ok) closeDialog()
  }
  const acceptAt = (b) => {
    const time = new Date(when)
    if (Number.isNaN(time.getTime()) || time <= new Date()) return setError('Pick a time in the future.')
    accept(b, time)
  }
  const decline = async (b) => {
    if (await run(() => coachApi.declineBooking(t.id, b.id, reason), `Booking declined — ${b.playerName} was told.`)) closeDialog()
  }
  const openComplete = async (b) => {
    setError('')
    setSettlement(await coachApi.bookingSettlementPreview(t.id, b.id).catch(() => null))
    setMode('complete')
  }
  const complete = async (b) => {
    const ok = await run(() => coachApi.completeBooking(t.id, b.id), (r) => {
      const payout = Number(r?.payout?.payout) || 0
      const owed = Number(r?.payout?.owed) || 0
      if (owed > 0) return `Session complete — settle ${formatPeso(owed)} commission within 7 days.`
      return payout > 0 ? `Session complete — ${formatPeso(payout)} added to your wallet.` : 'Session complete.'
    })
    if (ok) closeDialog()
  }
  const closeListing = async () => {
    const ok = await run(() => coachApi.cancel(t.id, reason), `${kindLabel(t.kind)} training closed.`)
    if (ok) { setMode(null); setReason('') }
  }
  const share = async () => {
    try {
      if ((await shareTraining(t)) === 'copied') setNotice('Training link copied')
    } catch {
      setNotice('Could not share this training')
    }
  }

  const openCount = (bookings || []).filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').length
  const list = inTab[tab]
  const activeTab = TABS.find((x) => x.key === tab)

  return (
    <div className="coach-page">
      <div className="coach-page__head">
        <button type="button" className="tr-icon-btn" onClick={() => navigate('/coach/trainings')} aria-label="Back"><ArrowLeft size={18} /></button>
        <h1>{kindLabel(t.kind)} training</h1>
        <button type="button" className="tr-icon-btn" onClick={share} aria-label="Share training"><Share2 size={18} /></button>
        {listed && <Link to={`/coach/trainings/${t.id}/edit`} className="tr-icon-btn" aria-label="Edit training"><Pencil size={18} /></Link>}
      </div>

      <div className="tr-detail__cover" style={t.imageUrl ? { backgroundImage: `url(${JSON.stringify(t.imageUrl)})` } : { background: sportGradient(t.sport) }}>
        <span className="tr-card__sport" style={{ color: sportColor(t.sport) }}>{sportLabel(t.sport)}</span>
        <span className={`tr-card__badge${listed ? ' tr-card__badge--kind' : ''}`}>{listed ? `${kindLabel(t.kind)} · open for booking` : 'Closed'}</span>
      </div>

      <h2 className="tr-detail__title">{t.title || 'Training'}</h2>
      <span className="tr-pill">{skillLabel(t.skill)}</span>

      <ul className="tr-facts">
        <li><CalendarCheck size={16} /><span><strong>Book anytime</strong> · {t.durationHours === 1 ? '1 hour' : `${t.durationHours} hours`} per session</span></li>
        <li><MapPin size={16} /><span>{[t.courtName, t.area].filter(Boolean).join(' · ')}</span></li>
        <li><Users size={16} /><span>{t.isGroup ? <>Groups of up to <strong>{t.capacity}</strong> per booking</> : <strong>One-on-one</strong>}</span></li>
        <li><Wallet size={16} /><span>{t.pricePerPlayer > 0 ? `${formatPeso(t.pricePerPlayer)} per ${t.isGroup ? 'player' : 'session'}` : 'Free'}</span></li>
      </ul>

      {listed && (
        <div className="coach-actions">
          <button type="button" className="button button--outline coach-btn coach-btn--danger" disabled={busy} onClick={() => setMode('close')}>
            <XCircle size={16} /> Close training
          </button>
        </div>
      )}
      {!openId && error && <p className="tr-error">{error}</p>}

      <div className="coach-segment coach-bookings-tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={tab === x.key ? 'is-active' : ''} onClick={() => setTab(x.key)}>
            {((x.key === 'requests' && inTab.requests.length > 0) || (x.key === 'packages' && t.pendingPackages > 0)) && <span className="coach-dot" aria-hidden="true" />}
            {x.label}{x.key === 'packages' ? (t.pendingPackages ? ` · ${t.pendingPackages}` : '') : inTab[x.key].length ? ` · ${inTab[x.key].length}` : ''}
          </button>
        ))}
      </div>

      {tab === 'packages' ? (
        <CoachPackagesPanel training={t} onChanged={load} />
      ) : bookings === null ? (
        loadError ? <p className="tr-error">{loadError} <button type="button" className="coach-link-btn" onClick={load}>Retry</button></p> : <p className="coach-hint">Loading bookings…</p>
      ) : list.length ? list.map((b) => (
        <button key={b.id} type="button" className={`coach-row${b.isOpen ? '' : ' is-cancelled'}`} onClick={() => setOpenId(b.id)}>
          <span className="coach-face">{b.playerAvatarUrl ? <img src={b.playerAvatarUrl} alt="" /> : b.playerName[0]}</span>
          <span className="coach-row__body">
            <b>{b.playerName}</b>
            <small>{formatSessionTime(b.sessionStart)}{b.players > 1 ? ` · Group of ${b.players}` : ''} · {b.isFree ? 'Free' : `${formatPeso(b.amountPaid)} · ${b.paymentLabel}`}</small>
          </span>
          {b.note && <StickyNote size={15} aria-label="Has a note" />}
          <span className={`tr-pill tr-pill--${BOOKING_STATUS[b.status].tone}`}>{BOOKING_STATUS[b.status].label}</span>
          <ChevronRight size={18} />
        </button>
      )) : (
        <div className="coach-empty"><activeTab.icon size={22} /><p>{listed || tab !== 'requests' ? activeTab.empty : 'This training is closed to new bookings.'}</p></div>
      )}

      {open && (
        <ProfileDialog title={open.playerName} onClose={closeDialog} busy={busy}>
          <div className="coach-booking-detail">
            <p><span className={`tr-pill tr-pill--${BOOKING_STATUS[open.status].tone}`}>{BOOKING_STATUS[open.status].label}</span></p>
            <dl>
              <dt>Requested time</dt><dd>{formatSessionTime(open.preferredStart)}</dd>
              {open.wasRescheduled && <><dt>Confirmed time</dt><dd>{formatSessionTime(open.scheduledStart)}</dd></>}
              <dt>Length</dt><dd>{open.durationHours === 1 ? '1 hour' : `${open.durationHours} hours`}</dd>
              {open.players > 1 && <><dt>Players</dt><dd>{open.players}</dd></>}
              <dt>Payment</dt><dd>{open.isFree ? 'Free' : `${formatPeso(open.amountPaid)} · ${open.paymentLabel}${open.couponCode ? ` (coupon ${open.couponCode})` : ''}`}</dd>
              <dt>Booked</dt><dd>{formatSessionTime(open.createdAt)}</dd>
            </dl>
            {open.note && <div className="coach-booking-note"><small>NOTE FROM {open.playerName.split(' ')[0].toUpperCase()}</small>{open.note}</div>}
            {open.coachNote && <div className="coach-booking-note"><small>YOUR NOTE</small>{open.coachNote}</div>}
            {open.paysCash && !open.isFree && open.status === 'CONFIRMED' && <p className="coach-hint">Collect the cash at the session — completing it records the payment.</p>}
            {error && <p className="tr-error">{error}</p>}

            {mode === 'time' && (
              <>
                <label className="tr-field"><span>Session time</span><input className="tr-input" type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} /></label>
                <div className="tr-confirm__row">
                  <button type="button" className="button button--outline" onClick={() => setMode(null)}>Back</button>
                  <button type="button" className="button button--primary" disabled={busy} onClick={() => acceptAt(open)}>{open.status === 'CONFIRMED' ? 'Move session' : 'Confirm this time'}</button>
                </div>
              </>
            )}
            {mode === 'decline' && (
              <>
                <p>{open.refundable > 0 ? `${open.playerName} paid ${formatPeso(open.refundable)} by QR — it will be refunded.` : `${open.playerName} will be told.`}</p>
                <textarea className="tr-input" rows={2} maxLength={300} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="tr-confirm__row">
                  <button type="button" className="button button--outline" onClick={() => setMode(null)}>Back</button>
                  <button type="button" className="button pf-button--danger" disabled={busy} onClick={() => decline(open)}>{open.status === 'CONFIRMED' ? 'Cancel session' : 'Decline'}</button>
                </div>
              </>
            )}
            {mode === 'complete' && (
              <>
                <p>Mark this session as done{settlement ? ' and settle the commission' : ''}.</p>
                {settlement && (Number(settlement.totalOnlinePaid) > 0 || Number(settlement.totalCashPaid) > 0) && (
                  <dl className="coach-settle">
                    <div><dt>{open.paysCash ? 'Cash collected' : 'Paid by QR'}</dt><dd>{formatPeso(open.paysCash ? settlement.totalCashPaid : settlement.totalOnlinePaid)}</dd></div>
                    <div><dt>Versus commission</dt><dd>{formatPeso(settlement.totalPlatformFee || 0)}</dd></div>
                    <div className="is-strong"><dt>To your wallet</dt><dd>{formatPeso(settlement.payout || 0)}</dd></div>
                    {Number(settlement.amountOwedByHost) > 0 && <div className="is-owed"><dt>You'll owe</dt><dd>{formatPeso(settlement.amountOwedByHost)}</dd></div>}
                  </dl>
                )}
                <div className="tr-confirm__row">
                  <button type="button" className="button button--outline" onClick={() => setMode(null)}>Not yet</button>
                  <button type="button" className="button button--primary" disabled={busy} onClick={() => complete(open)}>Complete</button>
                </div>
              </>
            )}

            {!mode && open.status === 'PENDING' && (
              <div className="coach-actions">
                <button type="button" className="button button--primary coach-btn" disabled={busy} onClick={() => accept(open)}>
                  <CheckCircle2 size={16} /> Accept · {formatSessionTime(open.preferredStart)}
                </button>
                <button type="button" className="button button--outline coach-btn" disabled={busy} onClick={() => { setWhen(toLocalInput(open.sessionStart)); setMode('time') }}>
                  <CalendarClock size={16} /> Other time
                </button>
                <button type="button" className="button button--outline coach-btn coach-btn--danger" disabled={busy} onClick={() => setMode('decline')}>Decline</button>
              </div>
            )}
            {!mode && open.status === 'CONFIRMED' && (
              <div className="coach-actions">
                {open.canComplete && (
                  <button type="button" className="button button--primary coach-btn coach-btn--green" disabled={busy} onClick={() => openComplete(open)}>
                    <CheckCircle2 size={16} /> Complete session
                  </button>
                )}
                <button type="button" className="button button--outline coach-btn" disabled={busy} onClick={() => { setWhen(toLocalInput(open.sessionStart)); setMode('time') }}>
                  <CalendarClock size={16} /> Move
                </button>
                <button type="button" className="button button--outline coach-btn coach-btn--danger" disabled={busy} onClick={() => setMode('decline')}>Cancel session</button>
                {!open.canComplete && <p className="coach-hint">You can complete it once the session starts.</p>}
              </div>
            )}
          </div>
        </ProfileDialog>
      )}

      {mode === 'close' && !openId && (
        <ProfileDialog title="Close training" onClose={() => setMode(null)} busy={busy}>
          <p>
            Players can no longer book <b>{t.title}</b>.
            {openCount > 0 ? ` Your ${openCount} open ${openCount === 1 ? 'booking is' : 'bookings are'} declined and QR payments refunded.` : ''}
          </p>
          <textarea className="tr-input" rows={3} maxLength={300} placeholder="Reason (optional) — sent to players with open bookings" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="tr-confirm__row">
            <button type="button" className="button button--outline" onClick={() => setMode(null)}>Keep it open</button>
            <button type="button" className="button pf-button--danger" disabled={busy} onClick={closeListing}>Close training</button>
          </div>
        </ProfileDialog>
      )}
    </div>
  )
}
