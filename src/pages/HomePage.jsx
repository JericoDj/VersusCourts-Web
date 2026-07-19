import { ArrowRight, MapPin, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClubCard, EventCard, QueueCard, VenueCard } from '../components/Cards'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function HomePage() {
  const { user } = useAuth()
  const { sport, setSport, filteredVenues, queues, events, clubs } = usePlayer()
  return (
    <>
      <div className="app-page-heading app-page-heading--home"><div><h1>Hi, {user?.firstName} 👋</h1><p>Ready to play today?</p></div><Link to="/app/discover" className="button button--primary">Book a court <ArrowRight size={17} /></Link></div>
      <section className="location-banner"><div><span><Navigation size={17} /></span><div><small>CURRENT LOCATION</small><b>Quezon City, Metro Manila</b></div></div><p><MapPin size={15} /> 24 courts and 11 open games nearby</p><button>Open map <span>↗</span></button></section>
      <section className="dashboard-section sport-section"><div className="section-title"><div><h2>What are you playing?</h2><p>Filter everything near you by sport</p></div></div><div className="sport-selector">{sports.map((item) => <button key={item.id} className={sport === item.id ? 'is-active' : ''} onClick={() => setSport(item.id)}><span>{item.icon}</span>{item.label}</button>)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Nearby Courts</h2></div><Link to="/app/discover">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--venues">{filteredVenues.slice(0, 3).map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Queue / Open Play</h2></div><Link to="/app/queues">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--queues">{queues.slice(0, 3).map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Popular Clubs Near You</h2></div><Link to="/app/clubs">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--clubs">{clubs.map((club) => <ClubCard club={club} key={club.id} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><h2>Upcoming Events</h2></div><Link to="/app/events">See all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--events">{events.map((event) => <EventCard event={event} key={event.id} />)}</div></section>
    </>
  )
}
