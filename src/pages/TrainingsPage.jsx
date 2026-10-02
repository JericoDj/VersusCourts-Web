import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, CalendarDays, Dumbbell, MapPin, RefreshCw, Search, Ticket, User, Users } from 'lucide-react'
import TrainingDetailDialog from '../components/TrainingDetailDialog'
import { useAuth } from '../context/AuthContext'
import { SPORT_FILTERS, sportColor, sportGradient, sportLabel } from '../data/sports'
import {
  fetchMyTrainings,
  fetchTrainings,
  formatPeso,
  formatTrainingDate,
  formatTrainingTimeRange,
  kindLabel,
  trainingRole,
} from '../data/trainings'
import '../styles/play.css'
import '../styles/trainings.css'

/// Web port of `TrainingsListScreen` — the "Join a Training" browse page.
/// Upcoming is the public cross-business feed; the other tabs are my own
/// trainings by status. Sessions I coach live in coach mode, not here.
const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'joined', label: 'Joined', status: 'SCHEDULED' },
  { key: 'ongoing', label: 'In Progress', status: 'ONGOING' },
  { key: 'completed', label: 'Completed', status: 'COMPLETED' },
  { key: 'cancelled', label: 'Cancelled', status: 'CANCELLED' },
]

export default function TrainingsPage() {
  const { trainingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const me = user?.id

  const [tab, setTab] = useState('upcoming')
  const [sport, setSport] = useState('all')
  const [query, setQuery] = useState('')
  const [upcoming, setUpcoming] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /// Fetches both feeds and applies them; `isActive` guards unmounts.
  const fetchAndApply = useCallback((isActive = () => true) =>
    Promise.allSettled([fetchTrainings(), fetchMyTrainings()]).then(([pub, own]) => {
      if (!isActive()) return
      if (pub.status === 'fulfilled') setUpcoming(pub.value)
      setError(pub.status === 'fulfilled' ? '' : 'Could not load trainings.')
      // `/trainings/mine` also returns sessions I coach — those belong to coach mode.
      if (own.status === 'fulfilled') setMine(own.value.filter((t) => t.coachUserId !== me))
      setLoading(false)
    }), [me])

  useEffect(() => {
    let active = true
    fetchAndApply(() => active)
    return () => { active = false }
  }, [fetchAndApply])

  const load = () => {
    setLoading(true)
    fetchAndApply()
  }

  const list = useMemo(() => {
    const active = TABS.find((t) => t.key === tab)
    const source = tab === 'upcoming' ? datedFirst(upcoming) : mine.filter((t) => t.status === active.status)
    const q = query.trim().toLowerCase()
    return source.filter((t) =>
      (sport === 'all' || t.sport === sport) &&
      (!q || [t.title, t.coachName, t.courtName, t.businessName].some((v) => v?.toLowerCase().includes(q))))
  }, [tab, upcoming, mine, sport, query])

  const counts = useMemo(() => Object.fromEntries(
    TABS.filter((t) => t.status).map((t) => [t.key, mine.filter((m) => m.status === t.status).length])
  ), [mine])

  const openTraining = (id) => navigate(`/app/trainings/${encodeURIComponent(id)}`)
  const closeTraining = () => navigate('/app/trainings', { replace: true })

  /// Keep both feeds in step after a join/leave inside the dialog.
  const onTrainingChanged = (updated) => {
    setUpcoming((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setMine((prev) => {
      const role = trainingRole(updated, me)
      const without = prev.filter((t) => t.id !== updated.id)
      return role === 'joined' || role === 'requested' ? [updated, ...without] : without
    })
  }

  return (
    <div className="queue-browse-container tr-page">
      <div className="queue-browse-header">
        <button type="button" className="queue-browse-back-btn" onClick={() => navigate('/app/queues')} aria-label="Back to Play Hub">
          <ArrowLeft size={22} />
        </button>
        <div className="queue-browse-header-titles">
          <h1 className="queue-browse-title">Join a Training</h1>
          <p className="queue-browse-subtitle">Level up your game with pro sessions</p>
        </div>
        <button type="button" className="tr-icon-btn" onClick={load} aria-label="Refresh trainings" disabled={loading}>
          <RefreshCw size={18} className={loading ? 'tr-spin' : ''} />
        </button>
      </div>

      <div className="queue-browse-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`queue-browse-tab ${tab === t.key ? 'is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.label}</span>
            {counts[t.key] > 0 && <span className="queue-browse-tab-badge">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="queue-search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search trainings, coaches or venues…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="tr-sport-row" role="group" aria-label="Filter by sport">
        {SPORT_FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`tr-chip${sport === s.id ? ' is-active' : ''}`}
            style={{ '--chip-color': sportColor(s.id) }}
            onClick={() => setSport(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && !upcoming.length && !mine.length ? (
        <div className="tr-grid">{[0, 1, 2].map((i) => <div key={i} className="tr-card tr-card--skeleton" />)}</div>
      ) : error && !list.length ? (
        <div className="empty-state"><span><Dumbbell size={22} /></span><h3>{error}</h3><button type="button" onClick={load}>Try again</button></div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <span><Dumbbell size={22} /></span>
          <h3>{tab === 'upcoming' ? 'No upcoming trainings' : `No ${TABS.find((t) => t.key === tab).label.toLowerCase()} trainings`}</h3>
          <p>{tab === 'upcoming' ? 'New sessions from coaches near you will show up here.' : 'Trainings you join will show up here.'}</p>
          {tab !== 'upcoming' && <button type="button" onClick={() => setTab('upcoming')}>Browse upcoming</button>}
        </div>
      ) : (
        <div className="tr-grid">
          {list.map((t) => <TrainingCard key={t.id} training={t} me={me} onOpen={() => openTraining(t.id)} />)}
        </div>
      )}

      {trainingId && (
        <TrainingDetailDialog
          trainingId={trainingId}
          initial={[...upcoming, ...mine].find((t) => t.id === trainingId)}
          onClose={closeTraining}
          onChanged={onTrainingChanged}
        />
      )}
    </div>
  )
}

/// Dated sessions (soonest first, as the feed sends them), then bookable
/// Private/Group listings.
export const datedFirst = (list) => [...list.filter((t) => !t.isBookable), ...list.filter((t) => t.isBookable)]

export function TrainingCard({ training: t, me, onOpen }) {
  const role = trainingRole(t, me)
  if (t.isBookable) return <BookableCard training={t} onOpen={onOpen} />
  return (
    <button type="button" className="tr-card" onClick={onOpen}>
      <span
        className="tr-card__cover"
        style={t.imageUrl ? { backgroundImage: `url(${JSON.stringify(t.imageUrl)})` } : { background: sportGradient(t.sport) }}
      >
        <span className="tr-card__sport" style={{ color: sportColor(t.sport) }}>{sportLabel(t.sport)}</span>
        {role === 'joined' && <span className="tr-card__badge tr-card__badge--ok">Joined</span>}
        {role === 'requested' && <span className="tr-card__badge tr-card__badge--warn">Requested</span>}
        {role === 'none' && t.isFull && <span className="tr-card__badge">Full</span>}
      </span>
      <span className="tr-card__body">
        <strong className="tr-card__title">{t.title || 'Training session'}</strong>
        <span className="tr-card__coach">
          {t.coachAvatarUrl ? <img src={t.coachAvatarUrl} alt="" /> : <i aria-hidden="true">{t.coachName[0]}</i>}
          {t.coachName}{t.skillsLabel ? ` · ${t.skillsLabel}` : ''}
        </span>
        <span className="tr-card__meta"><CalendarDays size={14} /> {formatTrainingDate(t.startTime)} · {formatTrainingTimeRange(t.startTime, t.durationHours)}</span>
        {(t.courtName || t.businessName) && <span className="tr-card__meta"><MapPin size={14} /> {t.courtName || t.businessName}</span>}
        {t.packages?.length > 0 && <PackagesHint packages={t.packages} />}
        <span className="tr-card__foot">
          <span><Users size={14} /> {t.participantCount}/{t.capacity}</span>
          <b>{t.price > 0 ? formatPeso(t.price) : 'Free'}</b>
        </span>
      </span>
    </button>
  )
}

/// A Private/Group listing: no date — "book anytime", 1-on-1 or group size.
function BookableCard({ training: t, onOpen }) {
  return (
    <button type="button" className="tr-card" onClick={onOpen}>
      <span
        className="tr-card__cover"
        style={t.imageUrl ? { backgroundImage: `url(${JSON.stringify(t.imageUrl)})` } : { background: sportGradient(t.sport) }}
      >
        <span className="tr-card__sport" style={{ color: sportColor(t.sport) }}>{sportLabel(t.sport)}</span>
        <span className="tr-card__badge tr-card__badge--kind">{kindLabel(t.kind)}</span>
      </span>
      <span className="tr-card__body">
        <strong className="tr-card__title">{t.title || 'Training session'}</strong>
        <span className="tr-card__coach">
          {t.coachAvatarUrl ? <img src={t.coachAvatarUrl} alt="" /> : <i aria-hidden="true">{t.coachName[0]}</i>}
          {t.coachName}{t.skillsLabel ? ` · ${t.skillsLabel}` : ''}
        </span>
        <span className="tr-card__meta tr-card__meta--kind"><CalendarCheck size={14} /> Book anytime · {t.durationHours}h sessions</span>
        {(t.courtName || t.businessName) && <span className="tr-card__meta"><MapPin size={14} /> {t.courtName || t.businessName}</span>}
        {t.packages?.length > 0 && <PackagesHint packages={t.packages} />}
        <span className="tr-card__foot">
          <span>{t.isGroup ? <><Users size={14} /> Up to {t.capacity}</> : <><User size={14} /> 1-on-1</>}</span>
          <b>{t.price > 0 ? `${formatPeso(t.price)}${t.isGroup ? '/player' : '/session'}` : 'Free'}</b>
        </span>
      </span>
    </button>
  )
}

/// "Packages from ₱450/session" on a card.
function PackagesHint({ packages }) {
  const best = Math.min(...packages.map((p) => p.perSession))
  return <span className="tr-card__meta tr-card__meta--kind"><Ticket size={14} /> Packages · from {formatPeso(Math.round(best))}/session</span>
}
