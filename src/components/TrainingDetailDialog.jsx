import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Banknote,
  CalendarDays,
  GraduationCap,
  MapPin,
  MessageCircle,
  QrCode,
  Share2,
  Smartphone,
  Star,
  Users,
  Wallet,
} from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import TrainingBookingPanel from './TrainingBookingPanel'
import TrainingPackagesPanel from './TrainingPackagesPanel'
import '../styles/profile.css'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { usePlayer } from '../context/PlayerContext'
import { sportColor, sportGradient, sportLabel } from '../data/sports'
import {
  TRAINING_STATUS_LABEL,
  cancelTrainingJoin,
  fetchMyCoachReview,
  fetchRefundQuote,
  fetchTraining,
  formatPeso,
  formatTrainingDate,
  formatTrainingTimeRange,
  joinTraining,
  kindLabel,
  joinTrainingCash,
  leaveTraining,
  rateCoach,
  shareTraining,
  skillLabel,
  trainingAppUrl,
  trainingRole,
} from '../data/trainings'

/// Web port of the player `TrainingDetailScreen`. Free sessions join in one
/// tap; paid ones offer Cash (confirmed by the coach) or QR Ph, which is
/// handed off to the app until the web has a PayMongo checkout.
export default function TrainingDetailDialog({ trainingId, initial, onClose, onChanged }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setNotice } = usePlayer()
  const { startCoachThread } = useChat()
  const me = user?.id

  const [training, setTraining] = useState(initial || null)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(null) // 'pay' | 'leave' | 'rate' | 'paid-leave'
  const [rating, setRating] = useState(0)
  const [ratingText, setRatingText] = useState('')

  useEffect(() => {
    let active = true
    fetchTraining(trainingId)
      .then((t) => { if (active) setTraining(t) })
      .catch((err) => { if (active && !initial) setError(err.status === 404 ? 'This training no longer exists.' : err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // `initial` only seeds the first paint; the fetch is always fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId])

  const apply = (updated, message) => {
    setTraining(updated)
    onChanged?.(updated)
    setStep(null)
    if (message) setNotice(message)
  }

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

  if (loading || !training) {
    return (
      <ProfileDialog title="Training" onClose={onClose}>
        {error ? <p className="tr-error">{error}</p> : <div className="tr-detail-loading"><span className="club-bridge-spinner" /></div>}
      </ProfileDialog>
    )
  }

  const t = training
  const role = trainingRole(t, me)
  const scheduled = t.status === 'SCHEDULED'

  const join = () => run(async () => {
    if (t.price <= 0) apply(await joinTraining(t.id), `You're in! See you at ${t.title}.`)
    else setStep('pay')
  })
  const joinCash = () => run(async () => apply(await joinTrainingCash(t.id), 'Request sent — pay the coach in cash to confirm your spot.'))
  const cancelRequest = () => run(async () => apply(await cancelTrainingJoin(t.id).catch(() => leaveTraining(t.id)), 'Request cancelled.'))
  const askLeave = () => run(async () => {
    const quote = await fetchRefundQuote(t.id).catch(() => null)
    setStep(Number(quote?.refundable) > 0 ? 'paid-leave' : 'leave')
  })
  const leave = () => run(async () => apply(await leaveTraining(t.id), 'You left the training.'))

  const openRate = () => run(async () => {
    const existing = await fetchMyCoachReview(t.coachProfileId)
    setRating(Math.round(Number(existing?.rating) || 0))
    setRatingText(existing?.text || '')
    setStep('rate')
  })
  const submitRating = () => run(async () => {
    await rateCoach(t.coachProfileId, rating, ratingText)
    setStep(null)
    setNotice(`Thanks! You rated ${t.coachName} ${rating}★.`)
  })

  const messageCoach = () => run(async () => {
    const threadId = await startCoachThread({
      coachId: t.coachProfileId,
      coachOwnerId: t.coachUserId,
      coachName: t.coachName,
      coachAvatarUrl: t.coachAvatarUrl,
      myName: user?.name,
      myAvatarUrl: user?.avatarUrl || user?.photoURL,
    })
    if (threadId) navigate(`/app/messages/${encodeURIComponent(threadId)}`)
  })

  const share = async () => {
    try {
      const result = await shareTraining(t)
      if (result === 'copied') setNotice('Training link copied')
    } catch {
      setNotice('Could not share this training')
    }
  }

  const openInApp = () => { window.location.href = trainingAppUrl(t.id) }

  return (
    <ProfileDialog
      title="Training"
      onClose={onClose}
      busy={busy}
      actions={<button type="button" className="pf-icon-button" aria-label="Share training" onClick={share}><Share2 size={18} /></button>}
    >
      <div className="tr-detail">
        <div
          className="tr-detail__cover"
          style={t.imageUrl ? { backgroundImage: `url(${JSON.stringify(t.imageUrl)})` } : { background: sportGradient(t.sport) }}
        >
          <span className="tr-card__sport" style={{ color: sportColor(t.sport) }}>{sportLabel(t.sport)}</span>
          {t.status !== 'SCHEDULED'
            ? <span className="tr-card__badge">{t.isBookable && t.status === 'CANCELLED' ? 'Closed' : TRAINING_STATUS_LABEL[t.status] || t.status}</span>
            : t.isBookable && <span className="tr-card__badge tr-card__badge--kind">{kindLabel(t.kind)}</span>}
        </div>

        <h3 className="tr-detail__title">{t.title || 'Training session'}</h3>
        {t.skill && <span className="tr-pill">{skillLabel(t.skill)}</span>}

        <div className="tr-coach-row">
          {t.coachAvatarUrl ? <img src={t.coachAvatarUrl} alt="" /> : <span className="tr-coach-row__initial">{t.coachName[0]}</span>}
          <div>
            <small><GraduationCap size={12} /> Coach</small>
            <b>{t.coachName}</b>
          </div>
          {t.coachProfileId && role !== 'coach' && (
            <button type="button" className="button button--outline tr-coach-row__msg" onClick={messageCoach} disabled={busy}>
              <MessageCircle size={16} /> Message
            </button>
          )}
        </div>

        <ul className="tr-facts">
          {t.isBookable
            ? <li><CalendarDays size={16} /><span><strong>Book anytime</strong> · you pick the time · {t.durationHours === 1 ? '1 hour' : `${t.durationHours} hours`} per session</span></li>
            : <li><CalendarDays size={16} /><span><strong>{formatTrainingDate(t.startTime)}</strong> · {formatTrainingTimeRange(t.startTime, t.durationHours)}</span></li>}
          {(t.courtName || t.area) && <li><MapPin size={16} /><span>{[t.courtName, t.area].filter(Boolean).join(' · ')}{t.businessName && t.businessName !== t.courtName ? ` · ${t.businessName}` : ''}</span></li>}
          {t.isBookable
            ? <li><Users size={16} /><span>{t.isGroup ? <>Groups of up to <strong>{t.capacity}</strong> players</> : <strong>One-on-one</strong>}</span></li>
            : <li><Users size={16} /><span><strong>{t.participantCount}</strong> / {t.capacity} players · {t.spotsLeft} left</span></li>}
          <li><Wallet size={16} /><span>{t.price > 0 ? `${formatPeso(t.price)} per ${t.isBookable && !t.isGroup ? 'session' : 'player'}` : 'Free'}</span></li>
        </ul>

        {t.description && <p className="tr-detail__desc">{t.description}</p>}

        {!t.isBookable && t.participants.length > 0 && (
          <div className="tr-roster">
            <small>Players</small>
            <div className="tr-roster__faces">
              {t.participants.slice(0, 10).map((p) => (
                <span key={p.userId} title={`${p.name}${p.isTentative ? ' (requested)' : ''}`} className={p.isTentative ? 'is-tentative' : ''}>
                  {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : p.name[0]}
                </span>
              ))}
              {t.participants.length > 10 && <span className="tr-roster__more">+{t.participants.length - 10}</span>}
            </div>
          </div>
        )}

        {error && <p className="tr-error">{error}</p>}

        {t.isBookable && role === 'coach' && (
          <div className="tr-actions">
            <button type="button" className="button button--primary button--full" onClick={() => navigate(`/coach/trainings/${t.id}`)}>
              See bookings in coach mode
            </button>
          </div>
        )}
        {t.isBookable && role !== 'coach' && step !== 'rate' && (
          <TrainingBookingPanel training={t} me={me} busy={busy} run={run} onRate={openRate} />
        )}

        {/* Packages: bundles on sale + the player's own (any training type). */}
        {step !== 'rate' && <TrainingPackagesPanel training={t} me={me} />}

        {/* ── Action area ─────────────────────────────────────────────── */}
        {/* Bookable listings use TrainingBookingPanel; this area only shows their rating step. */}
        <div className="tr-actions" style={t.isBookable && step !== 'rate' ? { display: 'none' } : undefined}>
          {role === 'coach' && !t.isBookable && (
            <button type="button" className="button button--primary button--full" onClick={() => navigate(`/coach/trainings/${t.id}`)}>
              Manage in coach mode
            </button>
          )}

          {role === 'none' && scheduled && !t.isBookable && step !== 'pay' && (
            <button type="button" className="button button--primary button--full" disabled={busy || t.isFull} onClick={join}>
              {t.isFull ? 'Training is full' : t.price > 0 ? `Join · ${formatPeso(t.price)}` : 'Join for free'}
            </button>
          )}

          {step === 'pay' && (
            <div className="tr-pay">
              <p className="tr-pay__title">How would you like to pay {formatPeso(t.price)}?</p>
              <button type="button" className="tr-pay__option" disabled={busy} onClick={joinCash}>
                <Banknote size={22} />
                <span><b>Cash at the session</b><small>Your spot is requested until the coach confirms payment.</small></span>
              </button>
              <button type="button" className="tr-pay__option" disabled={busy} onClick={openInApp}>
                <QrCode size={22} />
                <span><b>QR Ph (GCash, Maya, banks)</b><small>Opens the Versus Courts app to pay securely.</small></span>
              </button>
              <button type="button" className="button button--outline button--full" onClick={() => setStep(null)}>Back</button>
            </div>
          )}

          {role === 'requested' && (
            <>
              <p className="tr-status tr-status--warn">Requested — pay {formatPeso(t.price)} in cash and the coach will confirm your spot.</p>
              {scheduled && <button type="button" className="button button--outline button--full" disabled={busy} onClick={cancelRequest}>Cancel request</button>}
            </>
          )}

          {role === 'joined' && (
            <>
              <p className="tr-status tr-status--ok">
                {t.status === 'ONGOING' ? 'Session in progress — have a great training!' : t.status === 'COMPLETED' ? 'You attended this session.' : "You're in! See you there."}
              </p>
              {scheduled && !step && <button type="button" className="button button--outline button--full" disabled={busy} onClick={askLeave}>Leave training</button>}
              {t.status === 'COMPLETED' && t.coachProfileId && !step && (
                <button type="button" className="button button--primary button--full" disabled={busy} onClick={openRate}><Star size={16} /> Rate {t.coachName}</button>
              )}
            </>
          )}

          {step === 'leave' && (
            <div className="tr-confirm">
              <p>Leave <b>{t.title}</b>? Your spot opens up for someone else.</p>
              <div className="tr-confirm__row">
                <button type="button" className="button button--outline" onClick={() => setStep(null)}>Stay</button>
                <button type="button" className="button pf-button--danger" disabled={busy} onClick={leave}>Leave</button>
              </div>
            </div>
          )}

          {step === 'paid-leave' && (
            <div className="tr-confirm">
              <p>You paid online, so leaving opens a refund to your saved GCash, Maya or bank account. Refunds are handled in the app.</p>
              <div className="tr-confirm__row">
                <button type="button" className="button button--outline" onClick={() => setStep(null)}>Cancel</button>
                <button type="button" className="button button--primary" onClick={openInApp}><Smartphone size={16} /> Open app</button>
              </div>
            </div>
          )}

          {step === 'rate' && (
            <div className="tr-confirm">
              <p>How was your session with <b>{t.coachName}</b>?</p>
              <div className="tr-stars" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
                    <Star size={28} fill={n <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea className="tr-input" rows={3} maxLength={500} placeholder="Add a note (optional)" value={ratingText} onChange={(e) => setRatingText(e.target.value)} />
              <div className="tr-confirm__row">
                <button type="button" className="button button--outline" onClick={() => setStep(null)}>Cancel</button>
                <button type="button" className="button button--primary" disabled={busy || !rating} onClick={submitRating}>Submit</button>
              </div>
            </div>
          )}

          {role === 'none' && !scheduled && !t.isBookable && (
            <p className="tr-status">This session is {String(TRAINING_STATUS_LABEL[t.status] || t.status).toLowerCase()}.</p>
          )}
        </div>
      </div>
    </ProfileDialog>
  )
}
