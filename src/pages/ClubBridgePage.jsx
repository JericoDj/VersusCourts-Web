import { useEffect, useRef, useState, useTransition } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { normalizeClub } from '../controllers/discoveryController'
import { APP_STORE_URL } from '../components/StoreBadges'
import StoreBadges from '../components/StoreBadges'
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

export default function ClubBridgePage() {
  const { clubId } = useParams()
  const navigate = useNavigate()
  const [, startTransition] = useTransition()

  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [device] = useState(detectDevice)
  const [copiedLink, setCopiedLink] = useState(false)
  const attemptedAppLaunchRef = useRef(false)

  // Fetch club details
  useEffect(() => {
    let active = true
    async function loadClub() {
      if (!clubId) {
        setLoadError('Invalid club identifier.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await apiRequest(`/clubs/${clubId}`)
        if (!active) return
        const raw = res?.data || res
        if (raw) {
          setClub(normalizeClub(raw))
        } else {
          setLoadError('Club not found.')
        }
      } catch (err) {
        if (active) setLoadError(err.message || 'Failed to load club details.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadClub()
    return () => {
      active = false
    }
  }, [clubId])

  // Custom scheme deep link
  const appSchemeUrl = `versuscourts://club/${encodeURIComponent(clubId)}`
  const storeUrl = device.isIOS ? APP_STORE_URL : PLAY_STORE_URL

  // Automatic deep-link attempt on mobile devices
  useEffect(() => {
    if (!loading && club && device.isMobile && !attemptedAppLaunchRef.current) {
      attemptedAppLaunchRef.current = true
      // Check if user preferred "always stay on web"
      const preferWeb = sessionStorage.getItem('vc_prefer_web_player') === '1'
      if (!preferWeb) {
        // Attempt to launch the native app via custom scheme
        const launchTimer = setTimeout(() => {
          window.location.href = appSchemeUrl
        }, 300)
        return () => clearTimeout(launchTimer)
      }
    }
  }, [loading, club, device.isMobile, appSchemeUrl])

  // If on desktop, redirect directly to web player club view
  useEffect(() => {
    if (!loading && club && !device.isMobile) {
      startTransition(() => {
        navigate(`/app/clubs/${encodeURIComponent(club.id)}`, { replace: true })
      })
    }
  }, [loading, club, device.isMobile, navigate])

  const handleLaunchApp = () => {
    window.location.href = appSchemeUrl
  }

  const handleGoToStore = () => {
    window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  const handleContinueOnWeb = () => {
    sessionStorage.setItem('vc_prefer_web_player', '1')
    startTransition(() => {
      navigate(`/app/clubs/${encodeURIComponent(club.id)}`)
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
          <p>Connecting to club...</p>
        </div>
      </div>
    )
  }

  if (loadError || !club) {
    return (
      <div className="club-bridge-container">
        <div className="club-bridge-card">
          <div className="club-bridge-error-icon">
            <AlertCircle size={36} color="var(--vc-danger, #ef4444)" />
          </div>
          <h2>Club Not Found</h2>
          <p>{loadError || 'The club you are looking for does not exist or has been removed.'}</p>
          <button
            type="button"
            className="club-bridge-btn club-bridge-btn--primary"
            onClick={() => navigate('/clubs')}
          >
            Explore Clubs
          </button>
        </div>
      </div>
    )
  }

  const bannerImg = club.bannerUrl || club.coverUrl || club.image
  const totalMembers = club.membersCount ?? (club.members?.length || 0)

  return (
    <div className="club-bridge-container">
      <div className="club-bridge-card">
        {/* Visual Header / Cover */}
        <div className="club-bridge-cover">
          {bannerImg ? (
            <img src={bannerImg} alt={club.name} className="club-bridge-cover__img" />
          ) : (
            <div className="club-bridge-cover__placeholder" />
          )}
          <div className="club-bridge-cover__scrim" />

          <div className="club-bridge-brand-tag">
            <span>VERSUS COURTS</span>
          </div>

          <div className="club-bridge-avatar">
            {club.logoUrl ? (
              <img src={club.logoUrl} alt="" />
            ) : (
              <span>{club.initials || club.name?.[0] || 'C'}</span>
            )}
          </div>
        </div>

        {/* Club Info */}
        <div className="club-bridge-body">
          <div className="club-bridge-meta-row">
            <span className={`club-modal-hero__pill club-visibility-pill ${club.private ? 'is-private' : 'is-public'}`}>
              {club.private ? <Lock size={12} /> : <Globe size={12} />}
              {club.private ? 'Private Club' : 'Public Club'}
            </span>
            {club.area && (
              <span className="club-bridge-area">
                <MapPin size={12} /> {club.area}
              </span>
            )}
          </div>

          <h1 className="club-bridge-title">{club.name}</h1>
          {club.description && (
            <p className="club-bridge-desc">{club.description}</p>
          )}

          <div className="club-bridge-stats">
            <div className="club-bridge-stat">
              <Users size={16} />
              <span><strong>{totalMembers}</strong> members</span>
            </div>
            {club.sport && (
              <div className="club-bridge-stat">
                <ShieldCheck size={16} />
                <span>{club.sport.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Prompt Section for Mobile */}
          <div className="club-bridge-prompt">
            <p className="club-bridge-prompt__text">
              For the best experience with live queues, chat, and player rankings, open in the app:
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
              <span>{copiedLink ? 'Link copied to clipboard!' : 'Copy invite link'}</span>
            </button>
            <StoreBadges align="center" compact className="club-bridge-badges" />
          </div>
        </div>
      </div>
    </div>
  )
}
