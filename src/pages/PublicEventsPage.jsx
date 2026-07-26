import { CalendarDays, Trophy, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EventCard } from '../components/Cards'
import DirectoryLayout from '../components/DirectoryLayout'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function PublicEventsPage() {
  const { events } = usePlayer()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('all')
  const [kind, setKind] = useState('all')
  const results = useMemo(() => events.filter((event) =>
    (sport === 'all' || event.sport === sport)
    && (kind === 'all' || (event.kind || 'tournament') === kind)
    && `${event.title} ${event.organizer} ${event.venue}`.toLowerCase().includes(query.toLowerCase())), [events, kind, query, sport])
  const clear = () => { setQuery(''); setSport('all'); setKind('all') }
  const accent = 'var(--vc-sport-pickleball)'
  return (
    <DirectoryLayout
      accent={accent}
      eyebrow="EVENTS & TOURNAMENTS"
      title={<>ONE TROPHY.<br /><em>EVERY WEEKEND.</em></>}
      lede="Competitive brackets, community leagues, and open tournaments across Metro Manila."
      stats={[
        { value: events.length, label: 'upcoming', icon: CalendarDays },
        { value: events.reduce((sum, event) => sum + event.registered, 0), label: 'registered', icon: UsersRound },
        { value: '₱70K', label: 'prize pools', icon: Trophy },
      ]}
      search={query}
      onSearch={setQuery}
      searchLabel="Search events or venues"
      resultLabel={`${results.length} upcoming event${results.length === 1 ? '' : 's'}`}
      cta={{ to: '/app/events', label: 'Open in the player' }}
      filters={<div className="directory-filters">{sports.map((item) => <button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={sport === item.id} onClick={() => setSport(item.id)} key={item.id}>{item.label}</button>)}<i /><button type="button" className="filter-pill" style={{ '--pill-color': 'var(--vc-accent)' }} aria-pressed={kind === 'tournament'} onClick={() => setKind(kind === 'tournament' ? 'all' : 'tournament')}>Tournaments</button><button type="button" className="filter-pill" title="Coming soon" disabled>Casual events</button></div>}
      extra={<section className="directory-extra event-legend"><div><span><i className="is-tournament" /> Tournament</span><span><i className="is-event" /> Casual event</span></div><Link to="/for-business"><Trophy size={18} /> Host your own event <span>→</span></Link></section>}
    >
      {results.length ? <div className="cards-grid cards-grid--events">{results.map((event) => <EventCard event={event} key={event.id} />)}</div> : <div className="empty-state" style={{ '--empty-color': accent }}><span><CalendarDays size={30} /></span><h3>No events match those filters</h3><p>Try another sport or clear the event type.</p><button type="button" onClick={clear}>Clear filters</button></div>}
    </DirectoryLayout>
  )
}
