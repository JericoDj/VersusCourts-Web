import { useMemo, useState } from 'react'
import { CalendarCheck, CalendarDays, Dumbbell, GraduationCap, Plus, RefreshCw } from 'lucide-react'
import { useCoach } from '../../context/CoachContext'
import CoachHeader, { CoachHeaderAction } from './CoachHeader'
import { SessionRow, Stat } from './CoachSessionsPage'

/// Coach mode › Trainings (`TrainingsTab`): totals from `/coach/overview`
/// and my sessions split into Upcoming & live / Bookable (Private & Group
/// listings, open for booking) / Past.
export default function CoachTrainingsPage() {
  const { trainings, overview, loading, error, refresh } = useCoach()
  const [segment, setSegment] = useState('active')

  const { active, bookable, live, requests, liveList, completed, cancelled } = useMemo(() => {
    const now = new Date()
    // Like the app's Upcoming / Live split: a scheduled date whose start
    // has passed is waiting on the coach, so it counts as live.
    const isLive = (t) => !t.isBookable && (t.status === 'ONGOING' || (t.status === 'SCHEDULED' && t.startTime <= now))
    const a = trainings
      .filter((t) => !t.isBookable && t.status === 'SCHEDULED' && !isLive(t))
      .sort((x, y) => x.startTime - y.startTime)
    const l = trainings.filter(isLive).sort((x, y) => x.startTime - y.startTime)
    // Open listings, the ones with requests waiting first.
    const b = trainings
      .filter((t) => t.isBookable && t.status === 'SCHEDULED')
      .sort((x, y) => y.pendingBookings - x.pendingBookings)
    const p = trainings
      .filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED')
      .sort((x, y) => y.startTime - x.startTime)
    return {
      active: a,
      bookable: b,
      past: p,
      liveList: l,
      completed: p.filter((t) => t.status === 'COMPLETED'),
      cancelled: p.filter((t) => t.status === 'CANCELLED'),
      live: l.length,
      requests: b.reduce((sum, t) => sum + t.pendingBookings, 0),
    }
  }, [trainings])

  const list = { active, live: liveList, bookable, completed, cancelled }[segment] || active

  return (
    <div className="coach-page">
      <CoachHeader
        title="Trainings"
        subtitle={`${active.length} upcoming${live ? ` · ${live} live` : ''}${requests ? ` · ${requests} booking ${requests === 1 ? 'request' : 'requests'}` : ` · ${bookable.length} bookable`}`}
        actions={<CoachHeaderAction icon={Plus} label="New training" to="/coach/trainings/new" />}
      />

      {error && (
        <p className="tr-error">{error} <button type="button" className="coach-link-btn" onClick={refresh} disabled={loading}>Retry</button></p>
      )}

      <div className="coach-stats">
        <Stat icon={CalendarDays} value={overview.upcomingTrainings} label="Upcoming" onClick={() => setSegment('active')} />
        <Stat icon={Dumbbell} value={overview.totalTrainings} label="Trainings" tone="primary" onClick={() => setSegment('completed')} />
        <Stat icon={GraduationCap} value={overview.totalStudents} label="Students" />
      </div>

      <div className="coach-segment coach-segment--scroll" role="tablist">
        {[
          ['active', `Upcoming · ${active.length}`],
          ['live', `Live · ${liveList.length}`, liveList.length > 0],
          ['bookable', `Bookable · ${bookable.length}`, requests > 0],
          ['completed', `Completed · ${completed.length}`],
          ['cancelled', `Cancelled · ${cancelled.length}`],
        ].map(([key, label, dot]) => (
          <button key={key} type="button" role="tab" aria-selected={segment === key} className={segment === key ? 'is-active' : ''} onClick={() => setSegment(key)}>
            {dot && <span className="coach-dot" aria-hidden="true" />}{label}
          </button>
        ))}
        <button type="button" className="coach-segment__icon" onClick={refresh} disabled={loading} aria-label="Refresh trainings"><RefreshCw size={16} className={loading ? 'tr-spin' : ''} /></button>
      </div>

      {list.length ? list.map((t) => (
        <div key={t.id} className={t.status === 'CANCELLED' ? 'coach-row-wrap is-cancelled' : 'coach-row-wrap'}>
          <SessionRow t={t} live={segment === 'live'} />
        </div>
      )) : (
        <div className="coach-empty">
          {segment === 'bookable' ? <CalendarCheck size={22} /> : <Dumbbell size={22} />}
          <p>{{
            active: 'No upcoming trainings. Tap + to create one and share the link with your players.',
            live: 'Nothing live right now — sessions show here once they start.',
            bookable: 'Post a Private or Group training once — players book a time that suits them. No credits needed.',
            completed: 'No completed trainings yet — complete a session to get paid for it.',
            cancelled: 'No cancelled trainings — good, every session went ahead.',
          }[segment]}</p>
        </div>
      )}
    </div>
  )
}
