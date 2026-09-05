import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Map as MapIcon,
  Plus,
  QrCode,
  Search,
  Tally5,
  UsersRound,
} from 'lucide-react'
import { QueueCard } from '../components/Cards'
import ComingSoonDialog from '../components/ComingSoonDialog'
import CreateQueueModal from '../components/CreateQueueModal'
import DiscoveryMap from '../components/DiscoveryMap'
import JoinByCodeModal from '../components/JoinByCodeModal'
import QueueDetailDialog from '../components/QueueDetailDialog'
import SportPickerModal from '../components/SportPickerModal'
import { SportGlyph } from '../components/SportIcon'
import { apiRequest } from '../data/apiClient'
import { normalizeQueue, useQueues } from '../context/QueueContext'
import { sportLabel } from '../data/sports'
import '../styles/play.css'

const PLAY_OPTIONS = [
  {
    id: 'reserve',
    title: 'Reserve a Court',
    subtitle: 'Pick a sport, date & time',
    Icon: CalendarDays,
    variant: 'reserve',
    comingSoon: true,
    action: 'coming-soon',
  },
  {
    id: 'queue',
    title: 'Queue and Openplay',
    subtitle: 'Hop into a public game or host your own',
    Icon: UsersRound,
    variant: 'queue',
    comingSoon: false,
    action: 'browse',
  },
  {
    id: 'training',
    title: 'Join a Training',
    subtitle: 'Level up your game with pro sessions',
    Icon: Dumbbell,
    variant: 'training',
    comingSoon: true,
    action: 'coming-soon',
  },
  {
    id: 'score',
    title: 'Open Scoreboard',
    subtitle: 'Keep score for any match',
    Icon: Tally5,
    variant: 'score',
    comingSoon: false,
    action: 'scoreboard',
  },
]

const BROWSE_TABS = [
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function QueuesPage() {
  const { queueId } = useParams()
  const navigate = useNavigate()
  const { queues: publicQueues, refreshQueues } = useQueues()

  const [view, setView] = useState(queueId ? 'browse' : 'hub')
  const [prevQueueId, setPrevQueueId] = useState(queueId)
  const [browseTab, setBrowseTab] = useState('available')

  // Modals
  const [comingSoon, setComingSoon] = useState(null)
  const [sportPickerOpen, setSportPickerOpen] = useState(false)
  const [createQueueOpen, setCreateQueueOpen] = useState(false)
  const [joinByCodeOpen, setJoinByCodeOpen] = useState(false)
  const [activeDetailQueue, setActiveDetailQueue] = useState(null)
  const [showMap, setShowMap] = useState(false)

  // User's own data from backend
  const [myQueues, setMyQueues] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  if (queueId !== prevQueueId) {
    setPrevQueueId(queueId)
    if (queueId) {
      setView('browse')
    }
  }

  // Load user data on mount
  useEffect(() => {
    let ignore = false

    async function loadUserData() {
      try {
        const [qRes, bRes] = await Promise.allSettled([
          apiRequest('/queues/mine'),
          apiRequest('/bookings/mine'),
        ])
        if (ignore) return

        if (qRes.status === 'fulfilled') {
          const raw = Array.isArray(qRes.value) ? qRes.value : qRes.value?.data || []
          setMyQueues(raw.map(normalizeQueue))
        }

        if (bRes.status === 'fulfilled') {
          const raw = Array.isArray(bRes.value) ? bRes.value : bRes.value?.data || []
          setMyBookings(raw)
        }
      } catch {
        // Handled silently
      }
    }

    loadUserData()
    return () => {
      ignore = true
    }
  }, [])

  // Auto-open queue detail if queueId is in route params
  useEffect(() => {
    if (!queueId) return
    let ignore = false

    Promise.resolve().then(async () => {
      const found =
        myQueues.find((q) => q.id === queueId) ||
        publicQueues.find((q) => q.id === queueId)

      if (found) {
        if (!ignore) setActiveDetailQueue(found)
      } else {
        try {
          const q = await apiRequest(`/queues/${queueId}`)
          if (!ignore) setActiveDetailQueue(normalizeQueue(q))
        } catch {
          // Handled silently
        }
      }
    })

    return () => {
      ignore = true
    }
  }, [queueId, myQueues, publicQueues])

  // Calculate counters
  const reservedCount = useMemo(() => {
    return myQueues.filter((g) => {
      const status = (g.status || '').toUpperCase()
      return status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'STARTED'
    }).length
  }, [myQueues])

  const inProgressCount = useMemo(() => {
    return myQueues.filter((g) => {
      const status = (g.status || '').toUpperCase()
      return status === 'STARTED'
    }).length
  }, [myQueues])

  // Total active bookings count for the Play Hub banner
  const activeBookingsTotal = useMemo(() => {
    const upcomingBookings = myBookings.filter((b) => {
      const status = (b.rawStatus || b.status || '').toUpperCase()
      return status !== 'CANCELLED' && status !== 'COMPLETED'
    }).length
    return upcomingBookings + reservedCount
  }, [myBookings, reservedCount])

  // Active ongoing queue for live banner
  const activeOngoingQueue = useMemo(() => {
    return myQueues.find((g) => (g.status || '').toUpperCase() === 'STARTED')
  }, [myQueues])

  // Filter queues per browse tab
  const tabQueues = useMemo(() => {
    if (browseTab === 'reserved') {
      return myQueues.filter((g) => {
        const s = (g.status || '').toUpperCase()
        return s !== 'CANCELLED' && s !== 'COMPLETED' && s !== 'STARTED'
      })
    }
    if (browseTab === 'inProgress') {
      return myQueues.filter((g) => (g.status || '').toUpperCase() === 'STARTED')
    }
    if (browseTab === 'completed') {
      return myQueues.filter((g) => (g.status || '').toUpperCase() === 'COMPLETED')
    }
    if (browseTab === 'cancelled') {
      return myQueues.filter((g) => (g.status || '').toUpperCase() === 'CANCELLED')
    }

    // Available tab: public queues + search
    const myIds = new Set(myQueues.map((g) => g.id))
    let list = publicQueues.filter((g) => {
      const s = (g.status || '').toUpperCase()
      return s !== 'COMPLETED' && s !== 'CANCELLED' && !g.isTimePassed && !g.isPrivate && !myIds.has(g.id)
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((g) => {
        return (
          g.title?.toLowerCase().includes(q) ||
          g.venue?.toLowerCase().includes(q) ||
          g.area?.toLowerCase().includes(q) ||
          g.sport?.toLowerCase().includes(q)
        )
      })
    }

    return list
  }, [browseTab, myQueues, publicQueues, searchQuery])

  // My upcoming queues shown on Available tab (matching Flutter: !isOngoing && !isFinished)
  const myUpcomingQueues = useMemo(() => {
    return myQueues.filter((g) => {
      const s = (g.status || '').toUpperCase()
      return s !== 'CANCELLED' && s !== 'COMPLETED' && s !== 'STARTED'
    })
  }, [myQueues])

  const handleOption = (option) => {
    if (option.action === 'browse') {
      setView('browse')
    } else if (option.action === 'scoreboard') {
      setSportPickerOpen(true)
    } else {
      setComingSoon(option.title)
    }
  }

  const handleSelectSportForScoreboard = (sportId) => {
    setSportPickerOpen(false)
    navigate(`/app/scoreboard?sport=${sportId}`)
  }

  return (
    <>
      {view === 'hub' ? (
        <div className="play-hub">
          {/* Active Live Ongoing Queue Banner */}
          {activeOngoingQueue && (
            <button
              type="button"
              className="play-live"
              onClick={() => setActiveDetailQueue(activeOngoingQueue)}
            >
              <span className="play-live__emoji">
                <SportGlyph sport={activeOngoingQueue.sport} size={22} />
              </span>
              <span className="play-live__body">
                <span className="play-live__eyebrow">
                  <i aria-hidden="true" /> LIVE
                </span>
                <strong>{activeOngoingQueue.title}</strong>
                <small>
                  {sportLabel(activeOngoingQueue.sport)} · {activeOngoingQueue.venue}
                </small>
              </span>
              <ArrowRight size={18} className="play-live__arrow" />
            </button>
          )}

          {/* My Bookings Banner */}
          <Link className="play-bookings" to="/app/bookings">
            <span className="play-bookings__icon">
              <CalendarDays size={20} />
              {activeBookingsTotal > 0 && (
                <i className="play-bookings__badge">
                  {activeBookingsTotal > 99 ? '99+' : activeBookingsTotal}
                </i>
              )}
            </span>
            <span className="play-bookings__body">
              <strong>My Bookings</strong>
              <small>View your reservations and history</small>
            </span>
            <ChevronRight size={18} className="play-bookings__arrow" />
          </Link>

          {/* 4 Play Option Cards */}
          <div className="play-options">
            {PLAY_OPTIONS.map((option) => {
              const { Icon } = option
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`play-card play-card--${option.variant}`}
                  onClick={() => handleOption(option)}
                >
                  <span className="play-card__icon">
                    <Icon size={26} />
                  </span>
                  <span className="play-card__body">
                    <span className="play-card__heading">
                      <strong>{option.title}</strong>
                      {option.comingSoon && (
                        <em className="play-card__badge">Coming Soon</em>
                      )}
                    </span>
                    <small>{option.subtitle}</small>
                  </span>
                  <ArrowRight size={18} className="play-card__arrow" />
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* ==================================================================
           Queue and Openplay Browse Screen (5 Tabs Layout matching Flutter)
           ================================================================== */
        <div className="queue-browse-container">
          {/* Top Bar with Back button and Titles (matching Flutter play_screen.dart) */}
          <div className="queue-browse-header">
            <button
              type="button"
              className="queue-browse-back-btn"
              onClick={() => {
                setView('hub')
                setShowMap(false)
              }}
              aria-label="Back to Play Hub"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="queue-browse-header-titles">
              <h1 className="queue-browse-title">Queue and Openplay</h1>
              <p className="queue-browse-subtitle">Hop into a public game or host your own</p>
            </div>
          </div>

          {/* 5 Tabs Header */}
          <div className="queue-browse-tabs" role="tablist">
            {BROWSE_TABS.map((tab) => {
              const isActive = browseTab === tab.key
              let badgeCount = 0
              if (tab.key === 'reserved') badgeCount = reservedCount
              if (tab.key === 'inProgress') badgeCount = inProgressCount

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`queue-browse-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setBrowseTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  {badgeCount > 0 && (
                    <span className="queue-browse-tab-badge">{badgeCount}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* TAB 1: AVAILABLE (Public Feed & Actions) */}
          {browseTab === 'available' && (
            <>
              {/* Search Bar */}
              <div className="queue-search-bar">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search games or queues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* 3 Quick Action Buttons: Create, By Code, Map View */}
              <div className="queue-actions-row">
                <button
                  type="button"
                  className="queue-action-btn queue-action-btn--primary"
                  onClick={() => setCreateQueueOpen(true)}
                >
                  <Plus size={18} />
                  <span>Create</span>
                </button>

                <button
                  type="button"
                  className="queue-action-btn queue-action-btn--outline"
                  onClick={() => setJoinByCodeOpen(true)}
                >
                  <QrCode size={17} />
                  <span>By code</span>
                </button>

                <button
                  type="button"
                  className={`queue-action-btn queue-action-btn--secondary ${showMap ? 'is-active' : ''}`}
                  onClick={() => setShowMap((m) => !m)}
                >
                  <MapIcon size={17} />
                  <span>{showMap ? 'Hide Map' : 'Map View'}</span>
                </button>
              </div>

              {/* Optional Interactive Map */}
              {showMap && (
                <div style={{ marginBottom: 16 }}>
                  <DiscoveryMap />
                </div>
              )}

              {/* Section: My Queue / Openplay (if user has active upcoming queues) */}
              {myUpcomingQueues.length > 0 && (
                <div className="queue-section">
                  <h2 className="queue-section-heading">My Queue / Openplay</h2>
                  <div className="queue-cards-list">
                    {myUpcomingQueues.slice(0, 2).map((q) => (
                      <QueueCard
                        key={q.id}
                        queue={q}
                        joined={true}
                        onClick={() => setActiveDetailQueue(q)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Public games */}
              <div className="queue-section">
                <h2 className="queue-section-heading">Public games</h2>

                {tabQueues.length === 0 ? (
                  <div className="queue-empty-text">
                    No open games right now — create one!
                  </div>
                ) : (
                  <div className="queue-cards-list">
                    {tabQueues.map((q) => (
                      <QueueCard
                        key={q.id}
                        queue={q}
                        joined={myQueues.some((mq) => String(mq.id) === String(q.id))}
                        onClick={() => setActiveDetailQueue(q)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TABS 2-5: RESERVED, IN PROGRESS, COMPLETED, CANCELLED */}
          {browseTab !== 'available' && (
            <div className="queue-section">
              {browseTab === 'reserved' && (
                <h2 className="queue-section-heading">My Queues / Openplays</h2>
              )}
              {browseTab === 'inProgress' && (
                <h2 className="queue-section-heading">In Progress</h2>
              )}
              {browseTab === 'completed' && (
                <h2 className="queue-section-heading">Completed</h2>
              )}
              {browseTab === 'cancelled' && (
                <h2 className="queue-section-heading">Cancelled</h2>
              )}

              {tabQueues.length === 0 ? (
                <div className="queue-empty-text">
                  {browseTab === 'reserved' && (
                    <p style={{ margin: 0 }}>You haven&apos;t reserved any queues yet.</p>
                  )}
                  {browseTab === 'inProgress' && (
                    <p style={{ margin: 0 }}>No games in progress right now.</p>
                  )}
                  {browseTab === 'completed' && (
                    <p style={{ margin: 0 }}>No completed queues yet.</p>
                  )}
                  {browseTab === 'cancelled' && (
                    <p style={{ margin: 0 }}>No cancelled queues.</p>
                  )}
                </div>
              ) : (
                <div className="queue-cards-list">
                  {tabQueues.map((q) => (
                    <QueueCard
                      key={q.id}
                      queue={q}
                      joined={true}
                      onClick={() => setActiveDetailQueue(q)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sport Picker Modal for Scoreboard */}
      <SportPickerModal
        open={sportPickerOpen}
        onClose={() => setSportPickerOpen(false)}
        onSelect={handleSelectSportForScoreboard}
      />

      {/* Create Queue Modal */}
      <CreateQueueModal
        open={createQueueOpen}
        onClose={() => setCreateQueueOpen(false)}
        onCreated={() => {
          refreshQueues()
          apiRequest('/queues/mine')
            .then((res) => {
              const raw = Array.isArray(res) ? res : res?.data || []
              setMyQueues(raw.map(normalizeQueue))
            })
            .catch(() => {})
        }}
      />

      {/* Join By Code Modal */}
      <JoinByCodeModal
        open={joinByCodeOpen}
        onClose={() => setJoinByCodeOpen(false)}
        onJoined={(q) => {
          setActiveDetailQueue(q)
          refreshQueues()
        }}
      />

      {/* Queue Detail Dialog */}
      {activeDetailQueue && (
        <QueueDetailDialog
          queue={activeDetailQueue}
          onClose={() => setActiveDetailQueue(null)}
        />
      )}

      {/* Coming Soon Dialog for Reserve / Training */}
      <ComingSoonDialog
        open={Boolean(comingSoon)}
        label={comingSoon}
        onClose={() => setComingSoon(null)}
      />
    </>
  )
}
