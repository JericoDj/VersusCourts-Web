import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  Users,
  X,
} from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { sportFromApi, sportGradient, sportLabel } from '../data/sports'
import { SportGlyph } from './SportIcon'
import { normalizeQueue } from '../context/QueueContext'
import { queuePlayerCount } from '../data/queuePlayerCount'
import QmDialog from './QmDialog'
import '../styles/queue-master.css'

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

export default function BookingsDialog({ isOpen = true, onClose }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('reservedJoined')
  const [bookings, setBookings] = useState([])
  const [queues, setQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [bookingsRes, queuesRes] = await Promise.all([
        apiRequest('/bookings/my-bookings').catch(() => []),
        apiRequest('/queues/mine').catch(() => []),
      ])

      setBookings(Array.isArray(bookingsRes) ? bookingsRes : bookingsRes?.data || [])
      const rawQueues = Array.isArray(queuesRes) ? queuesRes : queuesRes?.data || []
      setQueues(rawQueues.map(normalizeQueue))
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const counts = useMemo(() => {
    const c = { reservedJoined: 0, inProgress: 0, completed: 0, cancelled: 0 }
    bookings.forEach((b) => {
      const p = getBookingPeriod(b)
      if (c[p] !== undefined) c[p]++
    })
    queues.forEach((q) => {
      const p = getQueuePeriod(q)
      if (c[p] !== undefined) c[p]++
    })
    return c
  }, [bookings, queues])

  const activeItems = useMemo(() => {
    const periodBookings = bookings
      .filter((b) => getBookingPeriod(b) === activeTab)
      .map((b) => ({ ...b, _kind: 'booking' }))

    const periodQueues = queues
      .filter((q) => getQueuePeriod(q) === activeTab)
      .map((q) => ({ ...q, _kind: 'queue' }))

    return [...periodBookings, ...periodQueues]
  }, [bookings, queues, activeTab])

  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="680px">
      <div className="qm-container">
        {/* Header */}
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">SCHEDULE & RESERVATIONS</span>
            <h1 className="qm-header-title">My Bookings</h1>
            <p className="qm-header-subtitle">Court reservations, training sessions, and joined queues</p>
          </div>
        </div>

        {/* Hero */}
        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--blue">
            <Calendar size={38} />
          </div>
          <h2 className="qm-hero-title">Court Schedule</h2>
          <p className="qm-hero-desc">
            Stay on top of your upcoming sessions, live games, and past matches.
          </p>
        </div>

        {/* Refresh Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            type="button"
            className="button button--outline button--sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="qm-tabs-bar">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`qm-tab-pill ${activeTab === key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span>{label}</span>
              <span className="qm-tab-badge">{counts[key]}</span>
            </button>
          ))}
        </div>

        {/* List of Bookings & Queues */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--vc-text-secondary)' }}>
            Loading bookings...
          </div>
        ) : !activeItems.length ? (
          <div className="qm-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Calendar size={44} style={{ color: 'var(--vc-text-tertiary, #94a3b8)', opacity: 0.4, marginBottom: 12 }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--vc-text-primary)' }}>
              No {PERIODS.find((p) => p.key === activeTab)?.label} Bookings
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--vc-text-secondary)', margin: 0 }}>
              You don’t have any items in this status right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeItems.map((item) => {
              const isQueue = item._kind === 'queue'
              const sportKey = sportFromApi(item.sport)
              const sportName = sportLabel(sportKey)
              const gradient = sportGradient(sportKey)

              const title = isQueue
                ? item.courtName || item.customCourtName || item.title || 'Queue Match'
                : item.court?.name || item.courtName || 'Court Booking'

              const venue = isQueue
                ? item.venueName || item.branch?.name || item.customArea || ''
                : item.court?.branch?.name || item.venueName || ''

              const timeStr = isQueue
                ? `${formatDate(item.startTime)} · ${formatQueueTimeRange(item.startTime, item.rules)}`
                : `${formatDate(item.date)} · ${item.timeSlot || ''}`

              const status = (isQueue ? item.status : item.status || '').toUpperCase()

              return (
                <div
                  key={item.id}
                  className="qm-card"
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onClick={() => {
                    if (isQueue) navigate(`/app/queues/${item.id}`)
                    else if (item.courtId) navigate(`/app/courts/${item.courtId}`)
                    onClose?.()
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: gradient,
                          color: '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                        }}
                      >
                        <SportGlyph sport={sportKey} size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--vc-primary, #0c4dd1)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            {isQueue ? 'Queue' : 'Court Reservation'} · {sportName}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--vc-text-primary)' }}>
                          {title}
                        </h4>
                        {venue && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--vc-text-secondary)', marginTop: 3 }}>
                            <MapPin size={13} /> {venue}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--vc-text-secondary)', marginTop: 3 }}>
                          <Clock size={13} /> {timeStr}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span
                        className={`qm-badge ${
                          status === 'CANCELLED'
                            ? 'qm-badge--red'
                            : status === 'COMPLETED'
                            ? 'qm-badge--green'
                            : status === 'STARTED' || status === 'IN_PROGRESS'
                            ? 'qm-badge--amber'
                            : 'qm-badge--blue'
                        }`}
                      >
                        {status || 'CONFIRMED'}
                      </span>
                      {isQueue && (
                        <span style={{ fontSize: 12, color: 'var(--vc-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} /> {queuePlayerCount(item)} players
                        </span>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--vc-text-secondary)', marginTop: 4 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </QmDialog>
  )
}
