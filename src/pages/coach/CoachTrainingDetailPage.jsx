import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, CalendarDays, Check, CheckCircle2, MapPin, Pencil, Play, Share2, Users, Wallet, X, XCircle } from 'lucide-react'
import ProfileDialog from '../../components/ProfileDialog'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { sportColor, sportGradient, sportLabel } from '../../data/sports'
import {
  TRAINING_STATUS_LABEL,
  coachApi,
  formatPeso,
  formatTrainingDate,
  formatTrainingTimeRange,
  shareTraining,
  skillLabel,
} from '../../data/trainings'
import '../../styles/profile.css'
import CoachBookingsView from './CoachBookingsView'
import CoachPackagesPanel from './CoachPackagesPanel'

/// Web port of the coach `TrainingDetailScreen`: roster with cash
/// confirmations, Start, Complete (with the settlement preview), Cancel
/// (with an optional reason sent to players), Edit and Share.
export default function CoachTrainingDetailPage() {
  const { trainingId } = useParams()
  const navigate = useNavigate()
  const { trainings, loading, act } = useCoach()
  const { setNotice } = usePlayer()
  const t = trainings.find((x) => x.id === trainingId)

  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null) // 'complete' | 'cancel'
  const [settlement, setSettlement] = useState(null)
  const [reason, setReason] = useState('')

  if (!t) {
    return (
      <div className="coach-page">
        <p className="tr-status">{loading ? 'Loading training…' : 'Training not found.'}</p>
        {!loading && <Link to="/coach/trainings" className="button button--outline coach-btn">Back to trainings</Link>}
      </div>
    )
  }
  // Private/Group listings are managed through their booked sessions.
  if (t.isBookable) return <CoachBookingsView training={t} />

  const run = async (key, fn, message) => {
    setBusy(key)
    setError('')
    try {
      const result = await act(fn)
      if (message) setNotice(typeof message === 'function' ? message(result) : message)
      return result
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      return null
    } finally {
      setBusy('')
    }
  }

  const openComplete = async () => {
    setBusy('preview')
    setError('')
    try {
      setSettlement(await coachApi.settlementPreview(t.id))
      setDialog('complete')
    } catch (err) {
      setError(err.message || 'Could not load the settlement preview.')
    } finally {
      setBusy('')
    }
  }

  const complete = async () => {
    const res = await run('complete', () => coachApi.complete(t.id), (r) => {
      const payout = Number(r?.payout?.payout) || 0
      const owed = Number(r?.payout?.owed) || 0
      if (owed > 0) return `Training completed. You owe ${formatPeso(owed)} in commission.`
      return payout > 0 ? `Training completed — ${formatPeso(payout)} sent to your wallet.` : 'Training completed.'
    })
    if (res !== null) setDialog(null)
  }

  const cancel = async () => {
    const res = await run('cancel', () => coachApi.cancel(t.id, reason), 'Training cancelled. Players were notified.')
    if (res !== null) { setDialog(null); setReason('') }
  }

  const share = async () => {
    try {
      if ((await shareTraining(t)) === 'copied') setNotice('Training link copied')
    } catch {
      setNotice('Could not share this training')
    }
  }

  const pendingCash = t.students.filter((s) => s.isPendingCash)
  const confirmed = t.students.filter((s) => !s.isPendingCash)
  const active = t.status === 'SCHEDULED' || t.status === 'ONGOING'

  return (
    <div className="coach-page">
      <div className="coach-page__head">
        <button type="button" className="tr-icon-btn" onClick={() => navigate('/coach/trainings')} aria-label="Back"><ArrowLeft size={18} /></button>
        <h1>Training</h1>
        <button type="button" className="tr-icon-btn" onClick={share} aria-label="Share training"><Share2 size={18} /></button>
        {t.status === 'SCHEDULED' && <Link to={`/coach/trainings/${t.id}/edit`} className="tr-icon-btn" aria-label="Edit training"><Pencil size={18} /></Link>}
      </div>

      <div className="tr-detail__cover" style={t.imageUrl ? { backgroundImage: `url(${JSON.stringify(t.imageUrl)})` } : { background: sportGradient(t.sport) }}>
        <span className="tr-card__sport" style={{ color: sportColor(t.sport) }}>{sportLabel(t.sport)}</span>
        <span className={`tr-card__badge${t.status === 'ONGOING' ? ' tr-card__badge--ok' : ''}`}>{TRAINING_STATUS_LABEL[t.status] || t.status}</span>
      </div>

      <h2 className="tr-detail__title">{t.title || 'Training'}</h2>
      <span className="tr-pill">{skillLabel(t.skill)}</span>

      <ul className="tr-facts">
        <li><CalendarDays size={16} /><span><strong>{formatTrainingDate(t.startTime)}</strong> · {formatTrainingTimeRange(t.startTime, t.durationHours)}</span></li>
        <li><MapPin size={16} /><span>{[t.courtName, t.area].filter(Boolean).join(' · ')}</span></li>
        <li><Users size={16} /><span><strong>{t.participantCount}</strong> / {t.capacity} players · {t.spotsLeft} left</span></li>
        <li><Wallet size={16} /><span>{t.pricePerPlayer > 0 ? `${formatPeso(t.pricePerPlayer)} per player · est. earnings ${formatPeso(t.estimatedEarnings)}` : 'Free'}</span></li>
      </ul>
      {t.description && <p className="tr-detail__desc">{t.description}</p>}

      {error && <p className="tr-error">{error}</p>}

      {active && (
        <div className="coach-actions">
          {t.status === 'SCHEDULED' && (
            <button type="button" className="button button--primary coach-btn" disabled={!!busy} onClick={() => run('start', () => coachApi.start(t.id), 'Training started')}>
              <Play size={16} /> Start
            </button>
          )}
          {t.canComplete && (
            <button type="button" className="button button--primary coach-btn coach-btn--green" disabled={!!busy} onClick={openComplete}>
              <CheckCircle2 size={16} /> Complete
            </button>
          )}
          <button type="button" className="button button--outline coach-btn coach-btn--danger" disabled={!!busy} onClick={() => setDialog('cancel')}>
            <XCircle size={16} /> Cancel training
          </button>
        </div>
      )}

      {pendingCash.length > 0 && (
        <section className="coach-card">
          <h2 className="coach-card__label"><Banknote size={15} /> Cash to confirm · {pendingCash.length}</h2>
          {pendingCash.map((s) => (
            <div key={s.userId} className="coach-student">
              <Face s={s} />
              <span className="coach-student__name">{s.name}<small>Pays {formatPeso(t.pricePerPlayer)} cash</small></span>
              <button type="button" className="coach-mini coach-mini--ok" aria-label={`Confirm ${s.name}'s cash payment`} disabled={!!busy} onClick={() => run(`c-${s.userId}`, () => coachApi.confirmCash(t.id, s.userId), `${s.name} confirmed`)}><Check size={16} /></button>
              <button type="button" className="coach-mini coach-mini--no" aria-label={`Decline ${s.name}`} disabled={!!busy} onClick={() => run(`d-${s.userId}`, () => coachApi.declineCash(t.id, s.userId), `${s.name} removed`)}><X size={16} /></button>
            </div>
          ))}
        </section>
      )}

      <section className="coach-card">
        <h2 className="coach-card__label"><Users size={15} /> Students · {confirmed.length}</h2>
        {confirmed.length ? confirmed.map((s) => (
          <div key={s.userId} className="coach-student">
            <Face s={s} />
            <span className="coach-student__name">{s.name}<small>{s.paysCash ? 'Cash' : t.pricePerPlayer > 0 ? 'Paid online' : 'Free'}</small></span>
          </div>
        )) : <p className="coach-hint">No one has joined yet. Share the link to fill your session.</p>}
      </section>

      {/* A "Multiple dates" training sells packages of its dates (shared by the series). */}
      {t.seriesId && (
        <section className="coach-card">
          <h2 className="coach-card__label">
            Packages{t.pendingPackages > 0 && <span className="tr-pill tr-pill--warn">{t.pendingPackages} to accept</span>}
          </h2>
          <CoachPackagesPanel training={t} />
        </section>
      )}

      <Link to={`/t/${t.id}`} className="coach-hint coach-preview-link">See what players see →</Link>

      {dialog === 'complete' && (
        <ProfileDialog title="Complete training" onClose={() => setDialog(null)} busy={busy === 'complete'}>
          <p>Mark <b>{t.title}</b> as done and settle the 15% commission.</p>
          {settlement && (
            <dl className="coach-settle">
              <div><dt>Online seats</dt><dd>{settlement.onlineSeats} · {formatPeso(settlement.totalOnlinePaid || 0)}</dd></div>
              <div><dt>Cash seats</dt><dd>{settlement.cashSeats} · {formatPeso(settlement.totalCashPaid || 0)}</dd></div>
              <div><dt>Commission (15%)</dt><dd>{formatPeso(settlement.totalPlatformFee || 0)}</dd></div>
              <div className="is-strong"><dt>To your wallet</dt><dd>{formatPeso(settlement.payout || 0)}</dd></div>
              {Number(settlement.amountOwedByHost) > 0 && <div className="is-owed"><dt>You'll owe</dt><dd>{formatPeso(settlement.amountOwedByHost)}</dd></div>}
            </dl>
          )}
          <div className="tr-confirm__row">
            <button type="button" className="button button--outline" onClick={() => setDialog(null)}>Not yet</button>
            <button type="button" className="button button--primary" disabled={busy === 'complete'} onClick={complete}>Complete</button>
          </div>
        </ProfileDialog>
      )}

      {dialog === 'cancel' && (
        <ProfileDialog title="Cancel training" onClose={() => setDialog(null)} busy={busy === 'cancel'}>
          <p>Cancel <b>{t.title}</b>? Everyone who joined is notified{t.pricePerPlayer > 0 ? ' and online payments are refunded' : ''}.</p>
          <textarea className="tr-input" rows={3} maxLength={300} placeholder="Reason (optional) — included in the notice to players" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="tr-confirm__row">
            <button type="button" className="button button--outline" onClick={() => setDialog(null)}>Keep it</button>
            <button type="button" className="button pf-button--danger" disabled={busy === 'cancel'} onClick={cancel}>Cancel training</button>
          </div>
        </ProfileDialog>
      )}
    </div>
  )
}

function Face({ s }) {
  return <span className="coach-face">{s.avatarUrl ? <img src={s.avatarUrl} alt="" /> : s.name[0]}</span>
}
