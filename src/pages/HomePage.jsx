import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClubCard, EventCard, QueueCard, VenueCard } from '../components/Cards'
import DiscoveryMap from '../components/DiscoveryMap'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import { sports } from '../data/mockData'

export default function HomePage() {
  const { sport, setSport, filteredVenues, events, clubs } = usePlayer()
  const { queues } = useQueues()
  return (
    <>
      <DiscoveryMap />
      <section className="dashboard-section sport-section"><div className="section-title"><div><h2>What are you playing?</h2><p>Filter everything near you by sport</p></div></div><div className="sport-selector">{sports.map((item) => <button key={item.id} className={sport === item.id ? 'is-active' : ''} onClick={() => setSport(item.id)}><span>{item.icon}</span>{item.label}</button>)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Nearby Courts</h2></div><Link to="/app/discover">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--venues">{filteredVenues.slice(0, 3).map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Queue / Open Play</h2></div><Link to="/app/queues">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--queues">{queues.slice(0, 3).map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Popular Clubs Near You</h2></div><Link to="/app/clubs">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--clubs">{clubs.map((club) => <ClubCard club={club} key={club.id} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Upcoming Events</h2></div><Link to="/app/events">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--events">{events.map((event) => <EventCard event={event} key={event.id} />)}</div></section>
    </>
  )
}
