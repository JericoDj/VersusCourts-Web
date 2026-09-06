import {
  ArrowLeft,
  CalendarDays,
  EyeOff,
  Info,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Plus,
  Settings,
  Share2,
  Smartphone,
  Star,
  Trophy,
  BarChart3,
  UserPlus,
  Users,
  Clock,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import LoginDialog from './LoginDialog'
import QueueSportIcon from './QueueSportIcon'
import ManageQueue from './ManageQueue'
import QueueHeaderAction from './QueueHeaderAction'
import QueueLeaderboardModal from './QueueLeaderboardModal'
import QueueAnalyticsModal from './QueueAnalyticsModal'
import QueuePlayerListModal from './QueuePlayerListModal'
import QueueShareModal from './QueueShareModal'
import MobileAppBanner from './MobileAppBanner'
import { openInApp, detectDevice } from '../utils/appLauncher'
import { queueFormatLabel } from '../data/queueFormat'
import { QueueChat, QueueMatches } from './QueueActivity'
import { sportColor, sportGradient, sportLabel } from '../data/sports'
import '../styles/modals.css'

const playerName = (player) => {
  if (typeof player === 'string') return player
  const user = player?.user || player
  return user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Player'
}

const getCountdown = (startTime) => {
  if (!startTime) return 'Scheduled time'
  const diff = new Date(startTime) - new Date()
  if (diff <= 0) return 'Starting now'
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (h > 0) return `Starts in ${h}h ${m}m`
  return `Starts in ${m}m`
}

const getFormattedDate = (startTime) => {
  if (!startTime) return ''
  const d = new Date(startTime)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(d)
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

export default function QueueDetailDialog({ queue, onClose }) {
  const location = useLocation()
  const { user } = useAuth()
  const { joinedQueues, toggleQueue, setNotice } = usePlayer()
  const { getQueueDetail, joinQueue: joinRemoteQueue } = useQueues()
  const [detail, setDetail] = useState(queue)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(() => new URLSearchParams(location.search).get('openAnalytics') === '1')
  const [playerListOpen, setPlayerListOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [headerAction, setHeaderAction] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [activeMatches, setActiveMatches] = useState([])
  const [joinState, setJoinState] = useState(joinedQueues.includes(queue.id) ? 'joined' : 'idle')

  useEffect(() => {
    const controller = new AbortController()
    getQueueDetail(queue.id, { signal: controller.signal })
      .then((remoteQueue) => {
        if (remoteQueue) setDetail((current) => ({ ...current, ...remoteQueue }))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setDetail(queue)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [getQueueDetail, queue])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || loginOpen) return
      if (shareModalOpen) setShareModalOpen(false)
      else if (analyticsOpen) setAnalyticsOpen(false)
      else if (leaderboardOpen) setLeaderboardOpen(false)
      else if (playerListOpen) setPlayerListOpen(false)
      else if (headerAction) setHeaderAction(null)
      else if (manageOpen) setManageOpen(false)
      else if (chatOpen) setChatOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [loginOpen, onClose, manageOpen, chatOpen, headerAction, analyticsOpen, leaderboardOpen, playerListOpen, shareModalOpen])

  const sport = String(detail.sport || queue.sport || 'badminton').toLowerCase()

  const rawStatus = String(detail.status || detail.lifecycle || queue.status || 'OPEN').toUpperCase()
  const isFinished = Boolean(
    detail.isFinished ||
    rawStatus === 'COMPLETED' ||
    rawStatus === 'FINISHED' ||
    rawStatus === 'CANCELLED'
  )

  const hostIsPlaying = detail.hostIsPlaying !== false
  const hostId = detail.hostId || detail.host?.id

  // Playing participants (matching mobile logic)
  const playingParticipants = useMemo(() => {
    const direct = (detail.participants || []).filter((p) => {
      const isJoined = !p.status || p.status === 'JOINED'
      if (!isJoined) return false
      const isHost = p.isHost || p.userId === hostId || p.user?.id === hostId
      if (!hostIsPlaying && isHost) return false
      return true
    })
    const local = (detail.localPlayers || []).map((name) => ({
      id: `guest:${name}`,
      name,
      isLocal: true,
    }))
    return [...direct, ...local]
  }, [detail.participants, detail.localPlayers, hostIsPlaying, hostId])

  const tentativeParticipants = useMemo(() => {
    return (detail.participants || []).filter(
      (p) => p.status === 'REQUESTED' || p.status === 'ACCEPTED'
    )
  }, [detail.participants])

  const capacity = Number(detail.playersNeeded || detail.max || queue.max || 10)
  const count = playingParticipants.length
  const progress = Math.min(100, Math.round((count / capacity) * 100))
  const spotsLeft = Math.max(0, capacity - count)

  const venue = detail.court?.name || detail.court?.branch?.name || detail.customCourtName || detail.venue || queue.venue
  const area = detail.court?.branch?.address || detail.customArea || detail.area
  const host = detail.host ? playerName(detail.host) : detail.hostName || queue.host || 'Versus Courts host'

  const dateLabel = getFormattedDate(detail.startTime)
  const timeRangeLabel = getFormattedTimeRange(detail.startTime, detail.endTime)
  const countdownLabel = getCountdown(detail.startTime)

  const fee = detail.entryFee ?? detail.fee ?? queue.fee ?? 0
  const title = detail.title || queue.title

  const canManage = Boolean(
    user?.id &&
    (hostId === user.id ||
      detail.participants?.some((p) => (p.userId || p.user?.id) === user.id && p.isHost))
  )

  const alreadyJoined =
    joinState === 'joined' ||
    Boolean(
      user?.id &&
      (hostId === user.id ||
        (detail.participants || []).some((p) => (p.userId || p.user?.id) === user.id))
    )

  const openChat = () => {
    if (!user) {
      setLoginOpen(true)
      return
    }
    if (!alreadyJoined) {
      setActionMessage('Join this queue to chat with the group.')
      return
    }
    setHeaderAction(null)
    setActionMessage('')
    setManageOpen(false)
    setChatOpen(true)
  }

  const isHiddenFromPublic = Boolean(detail.isHiddenFromPublic ?? queue.isHiddenFromPublic)
  const isTimePassed = Boolean(detail.isTimePassed ?? queue.isTimePassed)
  const mapQuery = [venue, area].filter(Boolean).join(', ')
  const gameFormat = queueFormatLabel({ ...detail, sport })
  const skills = detail.skills || []
  const skillLabel =
    skills.length === 4 ? 'All Levels' : detail.level || detail.skill || queue.level || 'All Levels'

  const joinQueue = async () => {
    if (!user) {
      if (detectDevice().isMobile) {
        openInApp({ type: 'queue', id: queue.id })
        return
      }
      setLoginOpen(true)
      return
    }
    if (joinedQueues.includes(queue.id)) {
      setJoinState('joined')
      return
    }
    setJoinState('joining')
    try {
      const refreshed = await joinRemoteQueue(queue.id)
      setDetail(refreshed)
      if (!joinedQueues.includes(queue.id)) toggleQueue(queue.id)
      setJoinState('joined')
      setNotice('You joined the queue. We’ll remind you before game time.')
    } catch (error) {
      setJoinState('error')
      setNotice(error.message || 'Unable to join this queue right now.')
    }
  }

  // Circular roster grid calculations (max 10 visible slots, matching mobile)
  const maxVisibleSlots = 10
  const combinedRoster = useMemo(
    () => [...playingParticipants, ...tentativeParticipants],
    [playingParticipants, tentativeParticipants]
  )
  const wantedSlots = Math.max(0, capacity - combinedRoster.length)
  const totalWanted = combinedRoster.length + wantedSlots
  const isGridOverflow = totalWanted > maxVisibleSlots
  const budget = isGridOverflow ? maxVisibleSlots - 1 : maxVisibleSlots
  const shownPlayers = combinedRoster.slice(0, budget)
  const emptySlotsCount = Math.min(wantedSlots, Math.max(0, budget - shownPlayers.length))
  const hiddenCount = totalWanted - shownPlayers.length - emptySlotsCount

  return (
    <>
      <div className="dialog-overlay queue-detail-overlay" role="presentation" onClick={onClose}>
        <section
          className="dialog queue-detail-dialog-v2"
          style={{ '--queue-color': sportColor(sport) }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="queue-detail-title"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header Bar */}
          <header className="queue-detail-top-bar">
            <div className="queue-detail-top-bar__left">
              <button
                className="queue-detail-back-btn"
                type="button"
                onClick={() => {
                  if (headerAction) setHeaderAction(null)
                  else if (manageOpen) setManageOpen(false)
                  else if (chatOpen) setChatOpen(false)
                  else onClose()
                }}
                aria-label={
                  headerAction || manageOpen || chatOpen ? 'Back to previous view' : 'Close game details'
                }
              >
                <ArrowLeft size={21} />
              </button>
              <h2 className="queue-detail-top-title" id="queue-detail-title">
                Queue / Openplay
              </h2>
            </div>
            <div className="queue-detail-top-actions">
              <button
                className="queue-detail-icon-btn scoreboard-icon-btn--open-app"
                type="button"
                aria-label="Open in Versus Courts App"
                title="Open in Versus Courts App"
                onClick={() => openInApp({ type: 'queue', id: queue.id })}
              >
                <Smartphone size={18} />
              </button>
              <button
                className="queue-detail-icon-btn"
                type="button"
                aria-label="Invite players"
                onClick={() => {
                  setHeaderAction('invite')
                  setActionMessage('')
                }}
              >
                <UserPlus size={20} />
              </button>
              <button
                className="queue-detail-icon-btn"
                type="button"
                aria-label="Open queue chat"
                onClick={openChat}
              >
                <MessageSquare size={20} />
              </button>
              <button
                className="queue-detail-icon-btn"
                type="button"
                aria-label="Share game"
                onClick={() => setShareModalOpen(true)}
              >
                <Share2 size={20} />
              </button>
              <button
                className="queue-detail-icon-btn"
                type="button"
                aria-label="Report queue"
                title="Report queue"
                onClick={() => {
                  setHeaderAction('report')
                  setActionMessage('')
                }}
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
          </header>

          <div className="queue-detail-scroll-body">
            <MobileAppBanner type="queue" id={queue.id} subtitle="Open this game in the Versus Courts app" />
            {actionMessage && <p role="status">{actionMessage}</p>}

            {headerAction ? (
              <QueueHeaderAction
                key={headerAction}
                action={headerAction}
                queue={detail}
                user={user}
                canInvite={canManage}
                onClose={() => setHeaderAction(null)}
                onLogin={() => setLoginOpen(true)}
              />
            ) : manageOpen ? (
              <ManageQueue
                queue={detail}
                user={user}
                onBack={() => setManageOpen(false)}
                onUpdated={(updated) => setDetail((current) => ({ ...current, ...updated }))}
              />
            ) : chatOpen ? (
              <QueueChat queue={detail} user={user} onBack={() => setChatOpen(false)} />
            ) : (
              <>
                {/* 1. HERO CARD */}
                <section
                  className="queue-detail-hero-card"
                  style={{ background: sportGradient(sport) }}
                >
                  <div className="queue-detail-hero-top">
                    <span className="queue-detail-hero-icon">
                      <QueueSportIcon sport={sport} />
                    </span>
                    <div className="queue-detail-hero-titles">
                      <h3 className="queue-detail-hero-title">{title}</h3>
                      <span className="queue-detail-hero-sport">{sportLabel(sport)}</span>
                    </div>
                    <span className="queue-detail-hero-status-pill">
                      {isFinished ? 'Finished' : String(detail.status || 'Open').toLowerCase()}
                    </span>
                  </div>

                  <div className="queue-detail-hero-tags">
                    <span className="queue-detail-hero-tag">{skillLabel}</span>
                    <span className="queue-detail-hero-tag">{gameFormat}</span>
                  </div>

                  <div className="queue-detail-hero-host">
                    <span className="queue-detail-hero-host-avatar">
                      {detail.host?.avatarUrl ? (
                        <img src={detail.host.avatarUrl} alt="" />
                      ) : (
                        host[0]?.toUpperCase()
                      )}
                    </span>
                    <span>
                      Hosted by {host} · {hostIsPlaying ? 'playing' : 'not playing'} ›
                    </span>
                  </div>

                  {venue && (
                    <div className="queue-detail-hero-location">
                      <MapPin size={16} />
                      {venue}
                      {area ? ` · ${area}` : ''}
                    </div>
                  )}

                  <div className="queue-detail-hero-stats">
                    <div className="queue-detail-hero-stat-col">
                      <span className="queue-detail-hero-stat-top">
                        <CalendarDays size={14} />
                        {dateLabel || 'Scheduled'}
                      </span>
                      {timeRangeLabel && (
                        <span className="queue-detail-hero-stat-val" style={{ fontSize: '11.5px' }}>
                          {timeRangeLabel}
                        </span>
                      )}
                      <span className="queue-detail-hero-stat-sub">{countdownLabel}</span>
                    </div>
                    <div className="queue-detail-hero-stat-col">
                      <span className="queue-detail-hero-stat-val">₱{fee || 0}</span>
                      <span className="queue-detail-hero-stat-sub">Entry fee</span>
                    </div>
                    <div className="queue-detail-hero-stat-col">
                      <span className="queue-detail-hero-stat-val">{area || venue || 'TBA'}</span>
                      <span className="queue-detail-hero-stat-sub">Location</span>
                    </div>
                  </div>
                </section>

                {isHiddenFromPublic && (
                  <div className="queue-time-passed-banner">
                    <EyeOff size={14} />
                    <span>Scheduled time has ended — hidden from public discovery.</span>
                  </div>
                )}

                {/* 2. QUEUE FINISHED / LOOKING FOR PLAYERS */}
                {isFinished ? (
                  <section className="queue-finished-card">
                    <div className="queue-finished-card__header">
                      <Trophy className="queue-finished-card__icon" size={22} />
                      <h3 className="queue-finished-card__title">Queue Finished</h3>
                    </div>
                    <button
                      type="button"
                      className="queue-finished-analytics-btn"
                      onClick={() => setAnalyticsOpen(true)}
                    >
                      <BarChart3 size={18} />
                      <span>View Analytics</span>
                    </button>
                  </section>
                ) : (
                  <section className="queue-detail-white-card">
                    <div className="queue-detail-white-card__top">
                      <h3 className="queue-detail-white-card__title">Looking for players</h3>
                      <span
                        className="queue-detail-white-card__count"
                        style={{ color: 'var(--queue-color)' }}
                      >
                        {count}/{capacity}
                      </span>
                    </div>
                    <div className="queue-detail-progress-bar">
                      <div
                        className="queue-detail-progress-bar__fill"
                        style={{ width: `${progress}%`, background: 'var(--queue-color)' }}
                      />
                    </div>
                    <p className="queue-detail-white-card__sub">
                      {spotsLeft
                        ? `${spotsLeft} more ${spotsLeft === 1 ? 'player' : 'players'} needed`
                        : 'This game is full'}
                    </p>
                  </section>
                )}

                {/* 3. DETAILS CARD */}
                <section className="queue-detail-white-card">
                  <div className="queue-detail-notes-header">
                    <Info size={18} style={{ color: 'var(--vc-primary)' }} />
                    <span>Details</span>
                  </div>
                  <p className="queue-detail-notes-body">
                    {detail.description || detail.notes || 'Queue now'}
                  </p>
                </section>

                {/* 4. MAP CARD */}
                {mapQuery && (
                  <div className="queue-detail-map-card">
                    <div className="queue-detail-map-preview-wrap">
                      <iframe
                        title={`Map of ${venue}`}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                        loading="lazy"
                      />
                      <span
                        className="queue-detail-map-pin-overlay"
                        style={{ color: 'var(--queue-color)' }}
                      >
                        <MapPin size={24} />
                      </span>
                    </div>
                    <a
                      className="queue-detail-map-footer"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation size={18} />
                      <span>Get Directions</span>
                    </a>
                  </div>
                )}

                {/* 5. PLAYERS SECTION */}
                <section className="queue-players-section">
                  <div className="queue-players-section__header">
                    <h3 className="queue-players-section__title">
                      Players ({playingParticipants.length}/{capacity})
                    </h3>
                    <button
                      type="button"
                      className="queue-players-section__see-all"
                      onClick={() => setPlayerListOpen(true)}
                    >
                      See all
                    </button>
                  </div>

                  <div className="queue-players-grid">
                    {/* Rendered Players */}
                    {shownPlayers.map((p, idx) => {
                      const name = playerName(p)
                      const avatar = p.avatarUrl || p.user?.avatarUrl
                      const isHost = p.isHost || p.userId === hostId || p.user?.id === hostId
                      const isGuest = p.isLocal || p.isGuest || p.id?.startsWith?.('guest:')
                      const isTentative = p.status === 'REQUESTED' || p.status === 'ACCEPTED'

                      return (
                        <div
                          key={p.id || idx}
                          className={`queue-player-slot ${isTentative ? 'is-tentative' : ''}`}
                          onClick={() => setPlayerListOpen(true)}
                        >
                          <div className="queue-player-slot__circle">
                            {avatar ? (
                              <img src={avatar} alt="" />
                            ) : (
                              <span>{name[0]?.toUpperCase()}</span>
                            )}
                            {isHost ? (
                              <span className="slot-badge slot-badge--star">
                                <Star size={9} />
                              </span>
                            ) : isGuest ? (
                              <span className="slot-badge slot-badge--guest">
                                <Users size={9} />
                              </span>
                            ) : isTentative ? (
                              <span className="slot-badge slot-badge--hourglass">
                                <Clock size={9} />
                              </span>
                            ) : null}
                          </div>
                          <span className="queue-player-slot__name" title={name}>
                            {name.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}

                    {/* Open Empty Slots */}
                    {Array.from({ length: emptySlotsCount }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="queue-player-slot queue-player-slot--open"
                        onClick={alreadyJoined ? undefined : joinQueue}
                      >
                        <div className="queue-player-slot__circle is-empty">
                          <Plus size={18} />
                        </div>
                        <span className="queue-player-slot__name is-muted">Open</span>
                      </div>
                    ))}

                    {/* Overflow Tile */}
                    {isGridOverflow && (
                      <div
                        className="queue-player-slot queue-player-slot--more"
                        onClick={() => setPlayerListOpen(true)}
                      >
                        <div className="queue-player-slot__circle is-more">
                          +{hiddenCount}
                        </div>
                        <span className="queue-player-slot__name">See all</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* 6. MANAGE QUEUE (HOST ONLY) */}
                {canManage && (
                  <section className="queue-detail-white-card queue-manage-hosting-card">
                    <h3 className="queue-detail-white-card__title">
                      You are hosting this queue
                    </h3>
                    <p className="queue-detail-white-card__sub">
                      Add guests, set matches, and declare results.
                    </p>
                    <button
                      type="button"
                      className="queue-detail-action-btn queue-detail-action-btn--primary"
                      onClick={() => setManageOpen(true)}
                    >
                      <Settings size={18} />
                      <span>Manage Queue</span>
                    </button>
                  </section>
                )}

                {/* 7. MATCHES & LEADERBOARD */}
                <QueueMatches
                  queue={detail}
                  onOpenLeaderboard={() => setLeaderboardOpen(true)}
                  onMatchesChange={setActiveMatches}
                />

                {loading && <p className="queue-detail-dialog__loading">Refreshing game details…</p>}
                {joinState === 'error' && (
                  <p className="queue-detail-dialog__error">
                    This game could not be joined here. Please try in the Player app.
                  </p>
                )}
              </>
            )}
          </div>

          {/* 8. BOTTOM STICKY BAR */}
          {!headerAction && !chatOpen && !manageOpen && (
            <footer className="queue-detail-bottom-bar">
              {isTimePassed && !alreadyJoined && !isFinished ? (
                <button
                  type="button"
                  className="queue-detail-action-btn queue-detail-action-btn--disabled"
                  disabled
                >
                  Game time has passed
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="queue-detail-action-btn scoreboard-icon-btn--open-app"
                    style={{ width: 'auto', padding: '11px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}
                    onClick={() => openInApp({ type: 'queue', id: queue.id })}
                    title="Open in Versus Courts App"
                  >
                    <Smartphone size={16} />
                    <span>Open in App</span>
                  </button>

                  <button
                    type="button"
                    className="queue-detail-action-btn queue-detail-action-btn--primary"
                    style={{ flex: 1 }}
                    onClick={alreadyJoined ? openChat : joinQueue}
                    disabled={joinState === 'joining'}
                  >
                    {alreadyJoined ? (
                      <>
                        <MessageSquare size={18} />
                        Chat Queue Group
                      </>
                    ) : joinState === 'joining' ? (
                      'Joining…'
                    ) : (
                      <>
                        <Users size={18} />
                        Join Queue
                      </>
                    )}
                  </button>
                </div>
              )}
            </footer>
          )}
        </section>
      </div>

      {/* Sub Modals */}
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />

      {leaderboardOpen && (
        <QueueLeaderboardModal
          queue={detail}
          matches={activeMatches}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}

      {analyticsOpen && (
        <QueueAnalyticsModal
          queue={detail}
          matches={activeMatches}
          onClose={() => setAnalyticsOpen(false)}
        />
      )}

      {playerListOpen && (
        <QueuePlayerListModal
          queue={detail}
          playingParticipants={playingParticipants}
          tentativeParticipants={tentativeParticipants}
          capacity={capacity}
          onClose={() => setPlayerListOpen(false)}
        />
      )}

      {shareModalOpen && (
        <QueueShareModal
          queue={detail}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </>
  )
}
