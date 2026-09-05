import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Dumbbell,
  Landmark,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { sportFromApi, sportGradient, sportLabel } from '../data/sports'
import { SportGlyph } from '../components/SportIcon'
import { normalizeQueue } from '../context/QueueContext'
import '../styles/bookings.css'
import '../styles/play.css'

const PERIODS = [
  { key: 'reservedJoined', label: 'Reserved/Joined' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

function parseClockMins(t) {
  if (!t) return null
  const m = String(t).match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2] || '0', 10)
  const pm = m[3].toUpperCase() === 'PM'
  if (pm && h !== 12) h += 12
  if (!pm && h === 12) h = 0
  return h * 60 + min
}

function getBookingPeriod(b) {
  const status = (b.rawStatus || b.status || '').toUpperCase()
  if (status === 'CANCELLED') return 'cancelled'
  const startMins = parseClockMins(b.timeSlot || b.startTime)
  if (startMins === null) {
    return status === 'COMPLETED' || status === 'NO_SHOW' ? 'completed' : 'reservedJoined'
  }
  const now = new Date()
  const d = new Date(b.date)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, startMins, 0)
  const end = new Date(start.getTime() + (Number(b.durationHours) || 1) * 3600000)
  if (now < start) return 'reservedJoined'
  if (now < end) return 'inProgress'
  return 'completed'
}

function getQueuePeriod(g) {
  const status = (g.status || '').toUpperCase()
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'COMPLETED' || g.isFinished) return 'completed'
  if (status === 'STARTED' || g.isOngoing) return 'inProgress'
  return 'reservedJoined'
}

function bookingSortKey(b) {
  if (b.completedAt) return new Date(b.completedAt).getTime()
  const startMins = parseClockMins(b.timeSlot || b.startTime) || 0
  const d = new Date(b.date)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, startMins, 0)
  return start.getTime() + (Number(b.durationHours) || 1) * 3600000
}

function queueSortKey(g) {
  if (g.completedAt) return new Date(g.completedAt).getTime()
  return new Date(g.startTime).getTime()
}

function formatDate(dateVal) {
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

function formatQueueTimeRange(startTimeVal, rules = {}) {
  const start = new Date(startTimeVal)
  if (Number.isNaN(start.getTime())) return ''
  let end = null
  if (rules?.endTime) {
    const parsed = new Date(rules.endTime)
    if (!Number.isNaN(parsed.getTime())) end = parsed
  }
  if (!end) {
    const durationMins = Number(rules?.durationMinutes) || 120
    end = new Date(start.getTime() + durationMins * 60000)
  }

  const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
  const startStr = timeFormat.format(start)
  const endStr = timeFormat.format(end)

  const isOvernight = end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth()
  return isOvernight ? `${startStr} – ${endStr} (+1 day)` : `${startStr} – ${endStr}`
}

function getSkillLabelAndColor(game) {
  const skill = String(game.skill || 'INTERMEDIATE').toUpperCase()
  const skills = Array.isArray(game.skills) ? game.skills : []

  let label = 'Intermediate'
  let color = '#0891b2' // Intermediate Cyan

  if (skills.length >= 4) {
    label = 'All Levels'
    color = 'var(--vc-primary, #2563eb)'
  } else if (skills.length > 1) {
    label = skills.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' · ')
    color = 'var(--vc-primary, #2563eb)'
  } else {
    if (skill === 'BEGINNER') {
      label = 'Beginner'
      color = '#16a34a'
    } else if (skill === 'ADVANCED') {
      label = 'Advanced'
      color = '#ea580c'
    } else if (skill === 'PROFESSIONAL') {
      label = 'Professional'
      color = '#dc2626'
    } else {
      label = 'Intermediate'
      color = '#0891b2'
    }
  }
  return { label, color }
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('reservedJoined')
  const [bookings, setBookings] = useState([])
  const [queues, setQueues] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // View-all toggle for LimitedList behaviour
  const [expandReservations, setExpandReservations] = useState(false)
  const [expandQueues, setExpandQueues] = useState(false)

  useEffect(() => {
    let ignore = false

    async function fetchInitialData() {
      try {
        const [bookingsRes, queuesRes] = await Promise.allSettled([
          apiRequest('/bookings/mine'),
          apiRequest('/queues/mine'),
        ])
        if (ignore) return

        if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
          setBookings(bookingsRes.value)
        } else if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value?.data)) {
          setBookings(bookingsRes.value.data)
        }

        if (queuesRes.status === 'fulfilled') {
          const raw = Array.isArray(queuesRes.value) ? queuesRes.value : queuesRes.value?.data || []
          setQueues(raw.map(normalizeQueue))
        }

        if (bookingsRes.status === 'rejected' && queuesRes.status === 'rejected') {
          setError('Unable to load your schedule. Please try refreshing.')
        }
      } catch {
        if (!ignore) {
          setError('Unable to load your schedule. Please try refreshing.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchInitialData()
    return () => {
      ignore = true
    }
  }, [])

  const handleRefresh = useCallback(async (silent = true) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    setError('')

    try {
      const [bookingsRes, queuesRes] = await Promise.allSettled([
        apiRequest('/bookings/mine'),
        apiRequest('/queues/mine'),
      ])

      if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
        setBookings(bookingsRes.value)
      } else if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value?.data)) {
        setBookings(bookingsRes.value.data)
      }

      if (queuesRes.status === 'fulfilled') {
        const raw = Array.isArray(queuesRes.value) ? queuesRes.value : queuesRes.value?.data || []
        setQueues(raw.map(normalizeQueue))
      }

      if (bookingsRes.status === 'rejected' && queuesRes.status === 'rejected') {
        setError('Unable to load your schedule. Please try refreshing.')
      }
    } catch {
      setError('Unable to load your schedule. Please try refreshing.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Count active reserved / joined items for the badge on the first tab
  const reservedJoinedCount = useMemo(() => {
    const bookingCount = bookings.filter((b) => getBookingPeriod(b) === 'reservedJoined').length
    const queueCount = queues.filter((g) => getQueuePeriod(g) === 'reservedJoined').length
    return bookingCount + queueCount
  }, [bookings, queues])

  // Filtered lists for the active tab
  const tabBookings = useMemo(() => {
    const filtered = bookings.filter((b) => getBookingPeriod(b) === activeTab)
    if (activeTab === 'completed') {
      filtered.sort((a, b) => bookingSortKey(b) - bookingSortKey(a))
    }
    return filtered
  }, [bookings, activeTab])

  const tabQueues = useMemo(() => {
    const filtered = queues.filter((g) => getQueuePeriod(g) === activeTab)
    if (activeTab === 'completed') {
      filtered.sort((a, b) => queueSortKey(b) - queueSortKey(a))
    }
    return filtered
  }, [queues, activeTab])

  // Empty note messages matching Flutter Switch expression
  const emptyReservationsNote = useMemo(() => {
    switch (activeTab) {
      case 'reservedJoined': return 'No upcoming reservations.'
      case 'inProgress': return 'No reservation happening right now.'
      case 'completed': return 'No completed reservations yet.'
      case 'cancelled': return 'No cancelled reservations.'
      default: return 'No reservations found.'
    }
  }, [activeTab])

  const emptyQueuesNote = useMemo(() => {
    switch (activeTab) {
      case 'reservedJoined': return "You haven't joined any queue / openplay games yet."
      case 'inProgress': return 'No queue / openplay games in progress.'
      case 'completed': return 'No completed queue / openplay games yet.'
      case 'cancelled': return 'No cancelled queue / openplay games.'
      default: return 'No games found.'
    }
  }, [activeTab])

  // Limited list slices
  const displayedBookings = expandReservations ? tabBookings : tabBookings.slice(0, 3)
  const displayedQueues = expandQueues ? tabQueues : tabQueues.slice(0, 3)

  return (
    <div className="bookings-page">
      {/* Top Bar with Back Link & Refresh Action */}
      <div className="bookings-top-bar">
        <button
          type="button"
          className="bookings-back-button"
          onClick={() => navigate('/app/queues')}
        >
          <ArrowLeft size={16} /> Back to Play
        </button>

        <button
          type="button"
          className={`bookings-refresh-button ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={() => handleRefresh(true)}
          title="Refresh schedule"
          aria-label="Refresh schedule"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs Row */}
      <div className="bookings-tabs-container">
        <div className="bookings-tabs" role="tablist">
          {PERIODS.map((period) => {
            const isActive = activeTab === period.key
            return (
              <button
                key={period.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bookings-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab(period.key)
                  setExpandReservations(false)
                  setExpandQueues(false)
                }}
              >
                <span>{period.label}</span>
                {period.key === 'reservedJoined' && reservedJoinedCount > 0 && (
                  <span className="bookings-tab-badge">{reservedJoinedCount}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bookings-card-list">
          <div className="bookings-skeleton-card" />
          <div className="bookings-skeleton-card" />
          <div className="bookings-skeleton-card" />
        </div>
      ) : error ? (
        <div className="bookings-error-box">
          <p>{error}</p>
          <button type="button" onClick={() => handleRefresh(false)}>
            Try Again
          </button>
        </div>
      ) : (
        <div className="bookings-content">
          {/* SECTION 1: RESERVATIONS */}
          <section className="bookings-section">
            <div className="bookings-section-header">
              <h2 className="bookings-section-title">
                <Landmark size={18} />
                <span>Reservations</span>
              </h2>
              {tabBookings.length > 3 && (
                <button
                  type="button"
                  className="bookings-toggle-all"
                  onClick={() => setExpandReservations((prev) => !prev)}
                >
                  {expandReservations ? 'Show less' : `View all (${tabBookings.length})`}
                </button>
              )}
            </div>

            {tabBookings.length === 0 ? (
              <div className="bookings-empty-note">{emptyReservationsNote}</div>
            ) : (
              <div className="bookings-card-list">
                {displayedBookings.map((b) => {
                  const sportKey = sportFromApi(b.sport)
                  const courtId = b.courtId || b.court?.id
                  const courtName = b.court?.name || b.courtName || 'Court'
                  const dateFormatted = formatDate(b.date)
                  const timeSlot = b.timeSlot || b.startTime || '7:00 PM'
                  const durationHours = b.durationHours || 1

                  const statusStr = (b.rawStatus || b.status || 'UPCOMING').toUpperCase()
                  let statusLabel = 'Upcoming'
                  let statusClass = 'booking-status-badge--upcoming'
                  if (statusStr === 'COMPLETED' || statusStr === 'NO_SHOW') {
                    statusLabel = 'Completed'
                    statusClass = 'booking-status-badge--completed'
                  } else if (statusStr === 'CANCELLED') {
                    statusLabel = 'Cancelled'
                    statusClass = 'booking-status-badge--cancelled'
                  }

                  let pendingLabel = null
                  if (statusStr === 'PENDING') {
                    pendingLabel = 'Awaiting confirmation'
                  } else if (statusStr === 'AWAITING_PAYMENT') {
                    pendingLabel = 'Awaiting payment'
                  }

                  return (
                    <article
                      key={b.id}
                      className="booking-card"
                      onClick={() => courtId && navigate(`/app/courts/${courtId}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          courtId && navigate(`/app/courts/${courtId}`)
                        }
                      }}
                    >
                      {/* Left Sport Icon */}
                      <div
                        className="booking-card__sport-icon"
                        style={{ background: sportGradient(sportKey) }}
                      >
                        <SportGlyph sport={sportKey} size={22} />
                      </div>

                      {/* Middle Details */}
                      <div className="booking-card__body">
                        <h3 className="booking-card__title">{courtName}</h3>
                        <p className="booking-card__subtitle">
                          {dateFormatted} · {timeSlot} · {durationHours}h
                        </p>
                      </div>

                      {/* Right Badges */}
                      <div className="booking-card__badges">
                        <span className={`booking-status-badge ${statusClass}`}>
                          <span className="booking-status-badge__dot" />
                          {statusLabel}
                        </span>
                        {pendingLabel && (
                          <span className="booking-status-badge booking-status-badge--warning">
                            <span className="booking-status-badge__dot" />
                            {pendingLabel}
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: QUEUE / OPENPLAY */}
          <section className="bookings-section">
            <div className="bookings-section-header">
              <h2 className="bookings-section-title">
                <Users size={18} />
                <span>Queue / Openplay</span>
              </h2>
              {tabQueues.length > 3 && (
                <button
                  type="button"
                  className="bookings-toggle-all"
                  onClick={() => setExpandQueues((prev) => !prev)}
                >
                  {expandQueues ? 'Show less' : `View all (${tabQueues.length})`}
                </button>
              )}
            </div>

            {tabQueues.length === 0 ? (
              <div className="bookings-empty-note">{emptyQueuesNote}</div>
            ) : (
              <div className="bookings-card-list">
                {displayedQueues.map((game) => {
                  const sportKey = sportFromApi(game.sport)
                  const sportName = sportLabel(sportKey)

                  const courtName = game.court?.name || game.courtName || ''
                  const branchName = game.court?.branch?.name || game.businessName || ''
                  const area = game.court?.branch?.area || game.area || ''
                  let venueLabel = courtName
                  if (branchName && branchName !== courtName) {
                    venueLabel = `${courtName} · ${branchName}`
                  } else if (area && area !== courtName) {
                    venueLabel = `${courtName} · ${area}`
                  }
                  if (!venueLabel) venueLabel = game.customCourtName || 'Venue to be announced'

                  const displayTitle = game.title?.trim() || venueLabel || `${sportName} Queue`

                  const dateFormatted = formatDate(game.startTime)
                  const timeRangeFormatted = formatQueueTimeRange(game.startTime, game.rules)

                  const participantsJoined =
                    game._count?.participants ??
                    (Array.isArray(game.participants)
                      ? game.participants.filter((p) => !p.status || p.status === 'JOINED').length
                      : (game.playersJoined || 0))
                  const localPlayersCount = Array.isArray(game.localPlayers)
                    ? game.localPlayers.length
                    : 0
                  const totalPlayers = participantsJoined + localPlayersCount
                  const needed = Number(game.playersNeeded) || 1
                  const courtCount = Number(game.rules?.courtCount) || 1
                  const fee = Number(game.entryFee) || 0

                  const { label: skillText, color: skillColor } = getSkillLabelAndColor(game)

                  return (
                    <article
                      key={game.id}
                      className="booking-card"
                      onClick={() => navigate(`/app/queues/${game.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/app/queues/${game.id}`)
                        }
                      }}
                    >
                      {/* Left Sport Icon */}
                      <div
                        className="booking-card__sport-icon"
                        style={{ background: sportGradient(sportKey) }}
                      >
                        <SportGlyph sport={sportKey} size={22} />
                      </div>

                      {/* Middle Details */}
                      <div className="booking-card__body">
                        <h3 className="booking-card__title">{displayTitle}</h3>
                        <p className="booking-card__subtitle">{sportName}</p>

                        <div className="booking-card__row">
                          <MapPin size={12} />
                          <span>{venueLabel}</span>
                        </div>

                        <div className="booking-card__row booking-card__row--time">
                          <Calendar size={11} />
                          <span>
                            {dateFormatted} · {timeRangeFormatted}
                          </span>
                        </div>

                        <div className="booking-card__row">
                          <Users size={11} />
                          <span>
                            {totalPlayers}/{needed} players
                            {courtCount > 1 ? ` · ${courtCount} Courts` : ''}
                            {fee > 0 ? ` · ₱${fee}` : ' · Free'}
                          </span>
                        </div>
                      </div>

                      {/* Right Tag + Chevron */}
                      <div className="booking-card__queue-end">
                        {game.isHiddenFromPublic ? (
                          <span className="queue-tag--time-passed">
                            Time Passed · Hidden
                          </span>
                        ) : (
                          <span
                            className="booking-skill-tag"
                            style={{
                              background: `color-mix(in srgb, ${skillColor} 12%, transparent)`,
                              color: skillColor,
                            }}
                          >
                            {skillText}
                          </span>
                        )}
                        <ChevronRight size={18} className="booking-chevron" />
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* SECTION 3: TRAININGS */}
          <section className="bookings-section">
            <div className="bookings-section-header">
              <h2 className="bookings-section-title">
                <Dumbbell size={18} />
                <span>Trainings</span>
              </h2>
            </div>
            <div className="bookings-empty-note">
              Training bookings are coming soon.
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
