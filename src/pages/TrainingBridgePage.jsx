import { useEffect, useRef, useState, useTransition } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  LogIn,
  MapPin,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StoreBadges, { APP_STORE_URL } from '../components/StoreBadges'
import LoginDialog from '../components/LoginDialog'
import { PLAY_STORE_URL, detectDevice } from '../utils/appLauncher'
import { sportColor, sportGradient, sportLabel } from '../data/sports'
import {
  fetchTraining,
  formatPeso,
  formatTrainingDate,
  formatTrainingTimeRange,
  skillLabel,
  trainingAppUrl,
  trainingShareUrl,
} from '../data/trainings'
import '../styles/modals.css'
import '../styles/trainings.css'

/// Landing page for shared training links (`https://versuscourts.com/t/<id>`),
/// the URL the Player app's share sheet produces.
///
/// - iOS with the app installed never gets here: the AASA `/t/*` entry hands
///   the link to the app as a Universal Link.
/// - Other mobile visitors: we try `versuscourts://training/<id>` (the Flutter
///   router maps it to `/training/:id`), and offer the store or the web.
/// - Desktop: signed-in players go straight to the in-app detail; signed-out
///   visitors see the session and a sign-in that returns them to it.
export default function TrainingBridgePage() {
  const { trainingId } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [, startTransition] = useTransition()

  // Keyed by id so following one training link to another never shows the
  // previous training (or its error) while the new one loads.
  const [result, setResult] = useState({ id: null, training: null, error: '' })
  const loading = Boolean(trainingId) && result.id !== trainingId
  const training = loading ? null : result.training
  const loadError = loading ? '' : result.error
  const [device] = useState(detectDevice)
  const [copied, setCopied] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const attemptedLaunch = useRef(false)

  const webPath = `/app/trainings/${encodeURIComponent(trainingId || '')}`
  const appUrl = trainingAppUrl(trainingId || '')
  const storeUrl = device.isIOS ? APP_STORE_URL : PLAY_STORE_URL

  useEffect(() => {
    if (!trainingId) return undefined
    let active = true
    fetchTraining(trainingId)
      .then((t) => { if (active) setResult({ id: trainingId, training: t, error: '' }) })
      .catch((err) => {
        if (active) setResult({ id: trainingId, training: null, error: err.status === 404 ? 'Training not found.' : err.message || 'Could not load this training.' })
      })
    return () => { active = false }
  }, [trainingId])

  useEffect(() => {
    if (loading || !training) return undefined
    document.title = `${training.title || 'Training'} · Versus Courts`
    return () => { document.title = 'Versus Courts' }
  }, [loading, training])

  // Mobile: try the installed app once, unless they already chose the web.
  useEffect(() => {
    if (loading || !training || !device.isMobile || attemptedLaunch.current) return undefined
    attemptedLaunch.current = true
    if (sessionStorage.getItem('vc_prefer_web_player') === '1') return undefined
    const timer = setTimeout(() => { window.location.href = appUrl }, 300)
    return () => clearTimeout(timer)
  }, [loading, training, device.isMobile, appUrl])

  // Desktop + signed in: the full in-app detail is the better page.
  useEffect(() => {
    if (loading || authLoading || !training || device.isMobile || !user) return
    startTransition(() => navigate(webPath, { replace: true }))
  }, [loading, authLoading, training, device.isMobile, user, navigate, webPath])

  const continueOnWeb = () => {
    sessionStorage.setItem('vc_prefer_web_player', '1')
    if (user) startTransition(() => navigate(webPath))
    else setLoginOpen(true)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trainingShareUrl(trainingId))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked (insecure context) — nothing else to do.
    }
  }

  if (loading) {
    return (
      <div className="club-bridge-container">
        <div className="club-bridge-card club-bridge-card--loading">
          <div className="club-bridge-spinner" />
          <p>Loading training…</p>
        </div>
      </div>
    )
  }

  if (!trainingId || loadError || !training) {
    return (
      <div className="club-bridge-container">
        <div className="club-bridge-card">
          <div className="club-bridge-error-icon"><AlertCircle size={36} color="var(--vc-danger)" /></div>
          <h2>Training Not Found</h2>
          <p>{!trainingId ? 'Invalid training link.' : loadError || 'This training session does not exist or was removed.'}</p>
          <button type="button" className="club-bridge-btn club-bridge-btn--primary" onClick={() => navigate(user ? '/app/trainings' : '/')}>
            {user ? 'Browse trainings' : 'Go to Versus Courts'}
          </button>
        </div>
      </div>
    )
  }

  const sport = training.sport
  const closed = training.status === 'COMPLETED' || training.status === 'CANCELLED'

  return (
    <div className="club-bridge-container">
      <div className="club-bridge-card">
        <div
          className="club-bridge-cover"
          style={training.imageUrl
            ? { backgroundImage: `url(${JSON.stringify(training.imageUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: sportGradient(sport) }}
        >
          <div className="club-bridge-cover__scrim" />
          <div className="club-bridge-brand-tag"><span>VERSUS COURTS · TRAINING</span></div>
          <div className="club-bridge-avatar tr-bridge-avatar">
            {training.coachAvatarUrl
              ? <img src={training.coachAvatarUrl} alt="" />
              : <Dumbbell size={30} color={sportColor(sport)} />}
          </div>
        </div>

        <div className="club-bridge-body">
          <div className="club-bridge-meta-row">
            <span
              className="club-modal-hero__pill"
              style={{ backgroundColor: `color-mix(in srgb, ${sportColor(sport)} 14%, transparent)`, color: sportColor(sport), fontWeight: 700, textTransform: 'uppercase' }}
            >
              {sportLabel(sport)}
            </span>
            {training.skill && <span className="tr-pill">{skillLabel(training.skill)}</span>}
            {closed && <span className="tr-pill tr-pill--muted">{training.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}</span>}
          </div>

          <h1 className="club-bridge-title">{training.title || 'Training session'}</h1>
          <p className="tr-bridge-coach"><GraduationCap size={15} /> with <strong>{training.coachName}</strong></p>

          <ul className="tr-facts">
            {training.isBookable
              ? <li><CalendarDays size={16} /><span><strong>Book anytime</strong> · {training.isGroup ? 'group' : 'private'} sessions, you pick the time</span></li>
              : <li><CalendarDays size={16} /><span><strong>{formatTrainingDate(training.startTime)}</strong> · {formatTrainingTimeRange(training.startTime, training.durationHours)}</span></li>}
            {(training.courtName || training.area) && (
              <li><MapPin size={16} /><span>{[training.courtName, training.area].filter(Boolean).join(' · ')}</span></li>
            )}
            {training.isBookable
              ? <li><Users size={16} /><span>{training.isGroup ? <>Groups of up to <strong>{training.capacity}</strong></> : <strong>One-on-one</strong>}</span></li>
              : <li><Users size={16} /><span><strong>{training.spotsLeft}</strong> of {training.capacity} spots left</span></li>}
            <li><Wallet size={16} /><span>{training.price > 0 ? `${formatPeso(training.price)} per ${training.isBookable && !training.isGroup ? 'session' : 'player'}` : 'Free'}</span></li>
          </ul>

          {training.description && <p className="tr-bridge-desc">{training.description}</p>}

          <div className="club-bridge-prompt">
            {device.isMobile ? (
              <>
                <p className="club-bridge-prompt__text">{training.isBookable ? 'Book a session' : 'Join this training'}, pay, and chat with the coach in the app:</p>
                <div className="club-bridge-actions">
                  <button type="button" className="club-bridge-btn club-bridge-btn--primary" onClick={() => { window.location.href = appUrl }}>
                    <Smartphone size={18} /><span>Open in Versus Courts App</span>
                  </button>
                  <button type="button" className="club-bridge-btn club-bridge-btn--store" onClick={() => window.open(storeUrl, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink size={16} /><span>{device.isIOS ? 'Download on App Store' : 'Get it on Google Play'}</span>
                  </button>
                  <div className="club-bridge-divider"><span>OR</span></div>
                  <button type="button" className="club-bridge-btn club-bridge-btn--secondary" onClick={continueOnWeb}>
                    <span>Continue in Mobile Browser</span><ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="club-bridge-prompt__text">
                  {closed ? 'This session has ended — sign in to find more trainings.' : 'Sign in to reserve your spot, or get the Versus Courts app.'}
                </p>
                <div className="club-bridge-actions">
                  <button type="button" className="club-bridge-btn club-bridge-btn--primary" onClick={() => setLoginOpen(true)}>
                    <LogIn size={18} /><span>{closed ? 'Sign in' : 'Sign in to join'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="club-bridge-footer">
            <button type="button" className="club-bridge-copy-link" onClick={copyLink}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Link copied to clipboard!' : 'Copy training link'}</span>
            </button>
            <StoreBadges align="center" compact className="club-bridge-badges" />
          </div>
        </div>
      </div>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} redirectTo={webPath} />
    </div>
  )
}
