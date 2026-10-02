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

  const { active, bookable, past, live, requests } = useMemo(() => {
    const a = trainings
      .filter((t) => !t.isBookable && (t.status === 'SCHEDULED' || t.status === 'ONGOING'))
      .sort((x, y) => x.startTime - y.startTime)
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
      live: a.filter((t) => t.status === 'ONGOING').length,
      requests: b.reduce((sum, t) => sum + t.pendingBookings, 0),
    }
  }, [trainings])

  const list = segment === 'active' ? active : segment === 'bookable' ? bookable : past

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
        <Stat icon={Dumbbell} value={overview.totalTrainings} label="Trainings" tone="primary" onClick={() => setSegment('past')} />
        <Stat icon={GraduationCap} value={overview.totalStudents} label="Students" />
      </div>

      <div className="coach-segment" role="tablist">
        <button type="button" role="tab" aria-selected={segment === 'active'} className={segment === 'active' ? 'is-active' : ''} onClick={() => setSegment('active')}>Upcoming & live · {active.length}</button>
        <button type="button" role="tab" aria-selected={segment === 'bookable'} className={segment === 'bookable' ? 'is-active' : ''} onClick={() => setSegment('bookable')}>
          {requests > 0 && <span className="coach-dot" aria-hidden="true" />}Bookable · {bookable.length}
        </button>
        <button type="button" role="tab" aria-selected={segment === 'past'} className={segment === 'past' ? 'is-active' : ''} onClick={() => setSegment('past')}>Past · {past.length}</button>
        <button type="button" className="coach-segment__icon" onClick={refresh} disabled={loading} aria-label="Refresh trainings"><RefreshCw size={16} className={loading ? 'tr-spin' : ''} /></button>
      </div>

      {list.length ? list.map((t) => (
        <div key={t.id} className={t.status === 'CANCELLED' ? 'coach-row-wrap is-cancelled' : 'coach-row-wrap'}>
          <SessionRow t={t} live={t.status === 'ONGOING'} />
        </div>
      )) : (
        <div className="coach-empty">
          {segment === 'bookable' ? <CalendarCheck size={22} /> : <Dumbbell size={22} />}
          <p>{segment === 'active'
            ? 'No upcoming trainings. Tap + to create one and share the link with your players.'
            : segment === 'bookable'
              ? 'Post a Private or Group training once — players book a time that suits them. No credits needed.'
              : 'Completed and cancelled trainings will show up here.'}</p>
        </div>
      )}
    </div>
  )
}
