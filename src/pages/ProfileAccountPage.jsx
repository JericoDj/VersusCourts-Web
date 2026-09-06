import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart2,
  History,
  MapPin,
  RotateCw,
} from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import { sportFromApi, sportGradient, sportLabel } from '../data/sports'
import { SportGlyph } from '../components/SportIcon'
import QueueAnalyticsModal from '../components/QueueAnalyticsModal'
import QueueHistoryDialog from '../components/QueueHistoryDialog'
import '../styles/profile.css'

export function useAccountData(load) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => {
        if (active) setState((old) => ({ ...old, loading: true, error: '' }))
        return load()
      })
      .then((data) => {
        if (active) setState({ data, loading: false, error: '' })
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error: error.message })
      })
    return () => {
      active = false
    }
  }, [load, version])
  return { ...state, reload: () => setVersion((value) => value + 1) }
}

export function AccountFrame({ title, children }) {
  return (
    <section className="pf-account-page">
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/app/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--vc-text-secondary, #64748b)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Profile
        </Link>
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          margin: '0 0 20px',
          color: 'var(--vc-text-primary, #0f172a)',
        }}
      >
        {title}
      </h1>
      {children}
    </section>
  )
}

export function AccountLoading({ state }) {
  if (state.loading) {
    return (
      <div aria-label="Loading" role="status" className="pf-loading">
        {[0, 1, 2].map((key) => (
          <div key={key} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <p role="alert" className="pf-error" style={{ marginBottom: 12 }}>
        {state.error}
      </p>
      <button className="button button--outline" onClick={state.reload}>
        Retry
      </button>
    </div>
  )
}

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

export function QueueHistoryPage() {
  const navigate = useNavigate()
  return <QueueHistoryDialog isOpen={true} onClose={() => navigate('/app/profile')} />
}

export { default as QueueMasterPage } from './QueueMasterPage'
import QueueMasterPage from './QueueMasterPage'

export default function ProfileAccountPage() {
  const { section } = useParams()
  return section === 'queue-master' ? <QueueMasterPage /> : <QueueHistoryPage />
}
