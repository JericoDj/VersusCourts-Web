import { ArrowRight, CalendarDays, MapPin, Navigation, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EventCard, QueueCard, VenueCard } from '../components/Cards'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function HomePage() {
  const { user } = useAuth()
  const { sport, setSport, filteredVenues, queues, events } = usePlayer()
  return (
    <>
      <div className="app-page-heading"><div><span className="eyebrow">SUNDAY, JULY 19</span><h1>Good morning, {user?.firstName}. <em>Ready to play?</em></h1></div><Link to="/app/discover" className="button button--dark">Book a court <ArrowRight size={17} /></Link></div>
      <section className="location-banner"><div><span><Navigation size={17} /></span><div><small>PLAYING NEAR</small><b>Quezon City, Metro Manila</b></div></div><p>24 courts · 11 open games nearby</p><button>Change area</button></section>
      <section className="dashboard-section"><div className="section-title"><div><span className="eyebrow">EXPLORE BY SPORT</span><h2>What are you playing?</h2></div></div><div className="sport-selector">{sports.map((item) => <button key={item.id} className={sport === item.id ? 'is-active' : ''} onClick={() => setSport(item.id)}><span>{item.icon}</span>{item.label}</button>)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><span className="eyebrow">NEAR YOU</span><h2>Courts worth playing</h2></div><Link to="/app/discover">View all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--venues">{filteredVenues.slice(0, 3).map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div></section>
      <section className="dashboard-section"><div className="section-title"><div><span className="eyebrow eyebrow--live"><i /> OPEN PLAY</span><h2>Games filling up now</h2></div><Link to="/app/queues">View all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--queues">{queues.slice(0, 3).map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div></section>
      <section className="dashboard-banner"><div><Sparkles /><span><small>VERSUS CLUBS</small><h3>Play more. Know more players.</h3><p>Find a local club that matches your sport, level, and schedule.</p></span></div><button className="button button--lime">Explore clubs <ArrowRight size={16} /></button></section>
      <section className="dashboard-section"><div className="section-title"><div><span className="eyebrow">COMING UP</span><h2>Events to put on your calendar</h2></div><Link to="/app/events">View all <ArrowRight size={16} /></Link></div><div className="cards-grid cards-grid--events">{events.map((event) => <EventCard event={event} key={event.id} />)}</div></section>
    </>
  )
}
