import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Share2,
  Smartphone,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { normalizeQueue } from '../context/QueueContext'
import { queueFormatLabel } from '../data/queueFormat'
import { sportColor, sportGradient, sportLabel } from '../data/sports'
import { useAuth } from '../context/AuthContext'
import { APP_STORE_URL } from '../components/StoreBadges'
import StoreBadges from '../components/StoreBadges'
import QueueSportIcon from '../components/QueueSportIcon'
import '../styles/modals.css'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.leos.versuscourtsplayer'

function detectDevice() {
  if (typeof navigator === 'undefined') return { isMobile: false, isIOS: false, isAndroid: false }
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/i.test(ua)
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(ua)
  return { isMobile, isIOS, isAndroid }
}

const getCountdown = (startTime) => {
  if (!startTime) return 'Scheduled game'
  const diff = new Date(startTime) - new Date()
  if (diff <= 0) return 'Starting now / In progress'
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (h > 0) return `Starts in ${h}h ${m}m`
  return `Starts in ${m}m`
}

const getFormattedDate = (startTime) => {
  if (!startTime) return ''
  const d = new Date(startTime)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
}

const getFormattedTimeRange = (startTime, endTime) => {
  if (!startTime) return ''
  const start = new Date(startTime)
  if (Number.isNaN(start.getTime())) return ''
  const startStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(start)
  if (!endTime) return startStr
  const end = new Date(endTime)
  if (Number.isNaN(end.getTime())) return startStr
  const endStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(end)
  return `${startStr} – ${endStr}`
}

export default function QueueBridgePage() {
  const { queueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [, startTransition] = useTransition()

  const [queue, setQueue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [device] = useState(detectDevice)
  const [copiedLink, setCopiedLink] = useState(false)
  const attemptedAppLaunchRef = useRef(false)

  // Fetch queue details
  useEffect(() => {
    let active = true
    async function loadQueue() {
      if (!queueId) {
        setLoadError('Invalid game identifier.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await apiRequest(`/queues/${queueId}`)
        if (!active) return
        const raw = res?.data || res
        if (raw) {
          setQueue(normalizeQueue(raw))
        } else {
          setLoadError('Game not found.')
        }
      } catch (err) {
        if (active) setLoadError(err.message || 'Failed to load game details.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadQueue()
    return () => {
      active = false
    }
  }, [queueId])

  // Custom scheme deep link
  const appSchemeUrl = `versuscourts://queue/${encodeURIComponent(queueId)}`
  const storeUrl = device.isIOS ? APP_STORE_URL : PLAY_STORE_URL

  // Automatic deep-link attempt on mobile devices
  useEffect(() => {
    if (!loading && queue && device.isMobile && !attemptedAppLaunchRef.current) {
      attemptedAppLaunchRef.current = true
      const preferWeb = sessionStorage.getItem('vc_prefer_web_player') === '1'
      if (!preferWeb) {
        const launchTimer = setTimeout(() => {
          window.location.href = appSchemeUrl
        }, 300)
        return () => clearTimeout(launchTimer)
      }
    }
  }, [loading, queue, device.isMobile, appSchemeUrl])

  // If on desktop, redirect directly to web player queue view
  useEffect(() => {
    if (!loading && queue && !device.isMobile) {
      startTransition(() => {
        const dest = user ? `/app/queues/${encodeURIComponent(queue.id)}` : `/queues/${encodeURIComponent(queue.id)}`
        navigate(dest, { replace: true })
      })
    }
  }, [loading, queue, device.isMobile, navigate, user])

  const handleLaunchApp = () => {
    window.location.href = appSchemeUrl
  }

  const handleGoToStore = () => {
    window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  const handleContinueOnWeb = () => {
    sessionStorage.setItem('vc_prefer_web_player', '1')
    startTransition(() => {
      const dest = user ? `/app/queues/${encodeURIComponent(queue.id)}` : `/queues/${encodeURIComponent(queue.id)}`
      navigate(dest)
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      // Ignored
    }
  }

  if (loading) {
    return (
      <div className="club-bridge-container">
        <div className="club-bridge-card club-bridge-card--loading">
          <div className="club-bridge-spinner" />
          <p>Connecting to game…</p>
        </div>
      </div>
    )
  }

  if (loadError || !queue) {
    return (
      <div className="club-bridge-container">
        <div className="club-bridge-card">
          <div className="club-bridge-error-icon">
            <AlertCircle size={36} color="var(--vc-danger, #ef4444)" />
          </div>
          <h2>Game Not Found</h2>
          <p>{loadError || 'The queue or game you are looking for does not exist or has already ended.'}</p>
          <button
            type="button"
            className="club-bridge-btn club-bridge-btn--primary"
            onClick={() => navigate('/queues')}
          >
            Explore Open Games
          </button>
        </div>
      </div>
    )
  }

  const sport = String(queue.sport || 'badminton').toLowerCase()
  const formatText = queueFormatLabel({ ...queue, sport })
  const scheduleDate = getFormattedDate(queue.startTime)
  const scheduleTime = getFormattedTimeRange(queue.startTime, queue.endTime)
  const countdown = getCountdown(queue.startTime)
  const playersCount = queue.playersCount ?? queue.players ?? (queue.participants?.length || 0)
  const capacity = queue.max || queue.maxPlayers || 8
  const spotsAvailable = Math.max(0, capacity - playersCount)

  return (
    <div className="club-bridge-container">
      <div className="club-bridge-card">
        {/* Visual Header / Cover */}
        <div
          className="club-bridge-cover"
          style={{
            background: sportGradient(sport),
          }}
        >
          <div className="club-bridge-cover__scrim" />

          <div className="club-bridge-brand-tag">
            <span>VERSUS COURTS</span>
          </div>

          <div
            className="club-bridge-avatar"
            style={{
              background: 'var(--vc-bg-surface, #1e293b)',
              color: sportColor(sport),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <QueueSportIcon sport={sport} size={32} />
          </div>
        </div>

        {/* Queue Info */}
        <div className="club-bridge-body">
          <div className="club-bridge-meta-row">
            <span
              className="club-modal-hero__pill"
              style={{
                backgroundColor: `${sportColor(sport)}22`,
                color: sportColor(sport),
                borderColor: `${sportColor(sport)}44`,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {sportLabel(sport)}
            </span>
            <span className="club-bridge-area" style={{ color: 'var(--vc-brand-green, #10b981)' }}>
              <Zap size={12} /> {countdown}
            </span>
          </div>

          <h1 className="club-bridge-title">{queue.title || `${sportLabel(sport)} Open Play`}</h1>

          {/* Schedule & Venue highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0 16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--vc-text-subtle)' }}>
              <CalendarDays size={16} color="var(--vc-accent, #38bdf8)" />
              <span><strong>{scheduleDate}</strong> &bull; {scheduleTime}</span>
            </div>
            {queue.venue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--vc-text-subtle)' }}>
                <MapPin size={16} color="var(--vc-brand-green, #10b981)" />
                <span>{queue.venue}</span>
              </div>
            )}
            {formatText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--vc-text-subtle)' }}>
                <Trophy size={16} color="var(--vc-warning, #f59e0b)" />
                <span>{formatText} &bull; {queue.level || 'All Levels'}</span>
              </div>
            )}
          </div>

          <div className="club-bridge-stats">
            <div className="club-bridge-stat">
              <Users size={16} />
              <span><strong>{spotsAvailable}</strong> spots open ({playersCount}/{capacity})</span>
            </div>
            <div className="club-bridge-stat">
              <Zap size={16} />
              <span>{queue.costPerPlayer ? `₱${queue.costPerPlayer}/player` : 'Free entry'}</span>
            </div>
          </div>

          {/* Prompt Section for Mobile */}
          <div className="club-bridge-prompt">
            <p className="club-bridge-prompt__text">
              Join this game, track live rotations, and chat with players directly in the app:
            </p>

            <div className="club-bridge-actions">
              <button
                type="button"
                className="club-bridge-btn club-bridge-btn--primary"
                onClick={handleLaunchApp}
              >
                <Smartphone size={18} />
                <span>Open in Versus Courts App</span>
              </button>

              <button
                type="button"
                className="club-bridge-btn club-bridge-btn--store"
                onClick={handleGoToStore}
              >
                <ExternalLink size={16} />
                <span>{device.isIOS ? 'Download on App Store' : 'Get it on Google Play'}</span>
              </button>

              <div className="club-bridge-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="club-bridge-btn club-bridge-btn--secondary"
                onClick={handleContinueOnWeb}
              >
                <span>Continue in Mobile Browser</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Quick Copy Link Footer */}
          <div className="club-bridge-footer">
            <button
              type="button"
              className="club-bridge-copy-link"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link copied to clipboard!' : 'Copy game link'}</span>
            </button>
            <StoreBadges align="center" compact className="club-bridge-badges" />
          </div>
        </div>
      </div>
    </div>
  )
}
