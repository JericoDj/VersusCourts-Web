import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Clock,
  History,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import { sportFromApi, sportGradient, sportLabel } from '../data/sports'
import { SportGlyph } from './SportIcon'
import QueueAnalyticsModal from './QueueAnalyticsModal'
import { useAccountData } from '../pages/ProfileAccountPage'
import QmDialog from './QmDialog'
import '../styles/queue-master.css'

const loadHistory = () => apiList('/queues/mine')

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

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start)

  const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
  const startStr = timeFormat.format(start)
  const endStr = timeFormat.format(end)

  return `${dateStr} · ${startStr} – ${endStr}`
}

export default function QueueHistoryDialog({ isOpen = true, onClose }) {
  const navigate = useNavigate()
  const state = useAccountData(loadHistory)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingAnalyticsId, setLoadingAnalyticsId] = useState(null)

  const handleOpenAnalytics = async (e, queue) => {
    e.stopPropagation()
    setLoadingAnalyticsId(queue.id)
    try {
      const detail = await apiRequest(`/queues/${queue.id}`)
      setAnalyticsData({
        queue: detail.queue || detail,
        matches: detail.matches || [],
      })
    } catch {
      navigate(`/app/queues/${queue.id}?openAnalytics=1`)
      onClose?.()
    } finally {
      setLoadingAnalyticsId(null)
    }
  }

  const queues = state.data || []

  return (
    <QmDialog isOpen={isOpen} onClose={onClose} maxWidth="680px">
      <div className="qm-container">
        {/* Header */}
        <div className="qm-header">
          <button type="button" className="qm-back-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="qm-header-titles">
            <span className="qm-header-step">MATCH LOGS</span>
            <h1 className="qm-header-title">Queue History</h1>
            <p className="qm-header-subtitle">Past queues, match scores, and performance analytics</p>
          </div>
        </div>

        {/* Hero */}
        <div className="qm-hero">
          <div className="qm-hero-ring qm-hero-ring--blue">
            <History size={38} />
          </div>
          <h2 className="qm-hero-title">
            {queues.length ? `${queues.length} Queues Logged` : 'Match Archives'}
          </h2>
          <p className="qm-hero-desc">
            Review past games, match scorecards, and player performance stats.
          </p>
        </div>

        {/* Refresh Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            type="button"
            className="button button--outline button--sm"
            onClick={state.reload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Content */}
        {state.loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--vc-text-secondary)' }}>
            Loading queue history...
          </div>
        ) : state.error ? (
          <div className="qm-error-box">
            <span>{state.error}</span>
          </div>
        ) : !queues.length ? (
          <div className="qm-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <History size={44} style={{ color: 'var(--vc-text-tertiary, #94a3b8)', opacity: 0.4, marginBottom: 12 }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--vc-text-primary)' }}>
              No Queue History
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--vc-text-secondary)', margin: 0 }}>
              You haven’t joined or hosted any queues yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queues.map((game) => {
              const sportKey = sportFromApi(game.sport)
              const sport = sportLabel(sportKey)
              const gradient = sportGradient(sportKey)
              const courtName = game.court?.name || game.customCourtName || 'Court'
              const venueLabel = game.court?.branch?.name || game.court?.branch?.area || game.customArea || courtName
              const time = formatQueueTimeRange(game.startTime, game.rules)
              const myAmountPaid = Number(game.myAmountPaid || game.amountPaid || 0)
              const entryFee = Number(game.entryFee || 0)

              let statusColor = 'var(--vc-primary, #2563eb)'
              let statusBg = 'rgba(37, 99, 235, 0.12)'
              let statusLabel = 'Joined'

              if (game.status === 'CANCELLED') {
                statusColor = 'var(--vc-danger, #dc2626)'
                statusBg = 'rgba(239, 68, 68, 0.12)'
                statusLabel = 'Cancelled'
              } else if (game.status === 'COMPLETED' || game.isFinished) {
                statusColor = 'var(--vc-brand-green, #16a34a)'
                statusBg = 'rgba(34, 197, 94, 0.12)'
                statusLabel = 'Completed'
              }

              return (
                <div
                  key={game.id}
                  className="qm-card"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onClick={() => {
                    navigate(`/app/queues/${game.id}`)
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
                            {sport}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: '2px 8px', borderRadius: 9999 }}>
                            {statusLabel}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--vc-text-primary)' }}>
                          {courtName}
                        </h4>
                        {venueLabel && venueLabel !== courtName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--vc-text-secondary)', marginTop: 3 }}>
                            <MapPin size={13} /> {venueLabel}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--vc-text-secondary)', marginTop: 3 }}>
                          <Clock size={13} /> {time}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--vc-text-primary)' }}>
                        {myAmountPaid > 0 ? `₱${myAmountPaid.toFixed(2)}` : entryFee > 0 ? `₱${entryFee.toFixed(2)}` : 'Free'}
                      </span>
                      <button
                        type="button"
                        className="qm-btn qm-btn--sm qm-btn--outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11.5 }}
                        disabled={loadingAnalyticsId === game.id}
                        onClick={(e) => handleOpenAnalytics(e, game)}
                      >
                        <BarChart2 size={13} />
                        {loadingAnalyticsId === game.id ? 'Loading…' : 'Analytics'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Analytics Modal */}
        {analyticsData && (
          <QueueAnalyticsModal
            queue={analyticsData.queue}
            matches={analyticsData.matches}
            onClose={() => setAnalyticsData(null)}
          />
        )}
      </div>
    </QmDialog>
  )
}
