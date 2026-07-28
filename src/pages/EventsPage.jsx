import { BellRing, CheckCircle2, Search, Sparkles, Trophy, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EventCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

/// Mirrors Flutter's `AppConfig.enableEvents` (defaults to false), which makes
/// /events render ComingSoonScreen instead of the events list. Flip to true
/// to restore the full events feed below.
const ENABLE_EVENTS = false

const EVENTS_HIGHLIGHTS = [
  'Official community tournaments & leagues',
  'Live match scoring, brackets & standings',
  'Prize pools, trophies & leaderboard ranking',
]

function EventsListView() {
  const { events } = usePlayer()
  return (
    <>
      <div className="event-toolbar"><button className="is-active">Upcoming</button><button>Live now</button><button>Completed</button><div><Search size={17} /><input placeholder="Search events" /></div></div>
      <div className="event-feature" style={{ backgroundImage: `linear-gradient(90deg, rgba(5,12,23,.95), rgba(5,12,23,.3)), url(${events[0].image})` }}><div><span>FEATURED · JULY 24</span><h2>Summer Slam<br />3v3</h2><p>32 teams. One trophy. Metro Manila’s most electric community tournament.</p><button className="button button--primary">View tournament →</button></div></div>
      <div className="dashboard-section"><div className="section-title"><h2>All upcoming events</h2><span>{events.length} events</span></div><div className="cards-grid cards-grid--events">{events.map((event) => <EventCard event={event} key={event.id} />)}</div></div>
    </>
  )
}

function EventsComingSoon() {
  const { setNotice } = usePlayer()
  return (
    <section className="coming-soon">
      <div className="coming-soon__hero"><Trophy size={48} strokeWidth={2.2} /></div>
      <span className="coming-soon__badge"><Sparkles size={14} /> COMING SOON</span>
      <h2 className="coming-soon__title">Events &amp; Tournaments</h2>
      <p className="coming-soon__body">Competitive tournaments and official sports events are coming soon! Register your squad, track live brackets, win prizes, and climb the rankings.</p>
      <div className="coming-soon__card">
        <h3>What to expect:</h3>
        <ul>
          {EVENTS_HIGHLIGHTS.map((item) => (
            <li key={item}><CheckCircle2 size={18} /><span>{item}</span></li>
          ))}
        </ul>
      </div>
      <div className="coming-soon__actions">
        <button
          type="button"
          className="button coming-soon__cta"
          onClick={() => setNotice('You will be notified when Events & Tournaments launches!')}
        >
          <BellRing size={20} /> Notify Me When Ready
        </button>
        <Link className="button coming-soon__secondary" to="/app/queues">
          <Users size={18} /> Explore Open Play Queues
        </Link>
      </div>
    </section>
  )
}

export default function EventsPage() {
  return ENABLE_EVENTS ? <EventsListView /> : <EventsComingSoon />
}
