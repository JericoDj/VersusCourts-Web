import { Search } from 'lucide-react'
import { EventCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

export default function EventsPage() {
  const { events } = usePlayer()
  return (
    <>
      <div className="app-page-heading"><div><span className="eyebrow">COMPETE & CONNECT</span><h1>Make the next one <em>count.</em></h1><p>Local tournaments, club events, and competitive match days.</p></div></div>
      <div className="event-toolbar"><button className="is-active">Upcoming</button><button>Live now</button><button>Completed</button><div><Search size={17} /><input placeholder="Search events" /></div></div>
      <div className="event-feature" style={{ backgroundImage: `linear-gradient(90deg, rgba(5,12,23,.95), rgba(5,12,23,.3)), url(${events[0].image})` }}><div><span>FEATURED · JULY 24</span><h2>Summer Slam<br />3v3</h2><p>32 teams. One trophy. Metro Manila’s most electric community tournament.</p><button className="button button--lime">View tournament →</button></div></div>
      <div className="dashboard-section"><div className="section-title"><h2>All upcoming events</h2><span>{events.length} events</span></div><div className="cards-grid cards-grid--events">{events.map((event) => <EventCard event={event} key={event.id} />)}</div></div>
    </>
  )
}
