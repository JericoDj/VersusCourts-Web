import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ChevronRight, History, Radio, UsersRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiList } from '../../data/apiClient'
import { normalizeQueue } from '../../context/QueueContext'
import { sportColor, sportLabel } from '../../data/sports'
import { formatTrainingDate, formatTrainingTimeRange } from '../../data/trainings'
import CoachHeader from './CoachHeader'
import { CoachIncentivesStrip } from '../../components/CoachIncentives'

const ACTIVE_QUEUE = new Set(['OPEN', 'FULL', 'STARTED'])

/// Coach mode › Sessions — the queues I host (`_SessionsTab` in
/// coach_mode_screen.dart). Trainings live on their own tab.
export default function CoachSessionsPage() {
  const { user } = useAuth()
  const { queuesVersion = 0 } = useOutletContext() || {}
  const [queues, setQueues] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    apiList('/queues/mine')
      .then((list) => {
        if (!active) return
        setQueues(list.map(normalizeQueue).filter((q) => String(q.hostId || q.host?.id || q.createdBy) === String(user?.id)))
        setError('')
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load your queues.') })
      .finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [user?.id, queuesVersion, reloadKey])

  // Same split as the app: OPEN/FULL/STARTED are active, the rest are past.
  const { activeQueues, pastQueues, liveCount } = useMemo(() => {
    const act = queues.filter((q) => ACTIVE_QUEUE.has(q.status)).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    const past = queues.filter((q) => !ACTIVE_QUEUE.has(q.status)).sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    return { activeQueues: act, pastQueues: past, liveCount: act.filter((q) => q.status === 'STARTED').length }
  }, [queues])
  const list = showPast ? pastQueues : activeQueues

  return (
    <div className="coach-page">
      <CoachHeader title="Sessions" subtitle={`${activeQueues.length} active · ${pastQueues.length} past queues`} />

      <CoachIncentivesStrip />

      {error && (
        <p className="tr-error">{error} <button type="button" className="coach-link-btn" onClick={() => setReloadKey((k) => k + 1)}>Retry</button></p>
      )}

      <div className="coach-stats">
        <Stat icon={UsersRound} value={activeQueues.length} label="Active" onClick={() => setShowPast(false)} />
        <Stat icon={Radio} value={liveCount} label="Live now" tone="danger" onClick={() => setShowPast(false)} />
        <Stat icon={History} value={queues.length} label="All-time" tone="primary" onClick={() => setShowPast(true)} />
      </div>

      <div className="coach-segment" role="tablist">
        <button type="button" role="tab" aria-selected={!showPast} className={!showPast ? 'is-active' : ''} onClick={() => setShowPast(false)}>Upcoming & live · {activeQueues.length}</button>
        <button type="button" role="tab" aria-selected={showPast} className={showPast ? 'is-active' : ''} onClick={() => setShowPast(true)}>Past · {pastQueues.length}</button>
      </div>

      {!loaded ? <p className="coach-hint">Loading your queues…</p> : list.length ? list.map((q) => (
        <Link key={q.id} to={`/app/queues/${encodeURIComponent(q.id)}`} className="coach-row">
          <span className="coach-row__dot" style={{ background: sportColor(q.sport) }} />
          <span className="coach-row__body">
            <b>{q.title}</b>
            <small>{q.time ? `${q.time} · ` : ''}{sportLabel(q.sport)} · {q.venue} · {q.players}/{q.max} players</small>
          </span>
          {q.isOngoing && <span className="tr-pill tr-pill--live">Live</span>}
          <ChevronRight size={18} />
        </Link>
      )) : (
        <div className="coach-empty">
          <UsersRound size={22} />
          <p>{showPast ? 'Queues you hosted will show up here.' : "You're not hosting any open queues. Tap + to create one."}</p>
        </div>
      )}
    </div>
  )
}

export function Stat({ icon: Icon, value, label, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`coach-stat${tone ? ` coach-stat--${tone}` : ''}`} onClick={onClick}>
      <Icon size={18} />
      <b>{value}</b>
      <small>{label}</small>
    </Tag>
  )
}

export function SessionRow({ t, live = false }) {
  return (
    <Link to={`/coach/trainings/${t.id}`} className="coach-row">
      <span className="coach-row__dot" style={{ background: sportColor(t.sport) }} />
      <span className="coach-row__body">
        <b>{t.title || 'Training'}</b>
        <small>{formatTrainingDate(t.startTime)} · {formatTrainingTimeRange(t.startTime, t.durationHours)} · {t.courtName}</small>
      </span>
      <span className="coach-row__count">{t.participantCount}/{t.capacity}</span>
      {live && <span className="tr-pill tr-pill--live">Live</span>}
      {t.students.some((s) => s.isPendingCash) && <span className="tr-pill tr-pill--warn">Cash to confirm</span>}
      <ChevronRight size={18} />
    </Link>
  )
}
