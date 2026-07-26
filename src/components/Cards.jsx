import { Clock3, Heart, Lock, MapPin, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'

export function SportPill({ sport }) {
  return <span className={`sport-tag sport-tag--${sport}`}>{sport}</span>
}

export function VenueCard({ venue, compact = false }) {
  const { favorites, toggleFavorite } = usePlayer()
  const saved = favorites.includes(venue.id)
  return (
    <article className={`venue-card ${compact ? 'venue-card--compact' : ''}`}>
      <div className="venue-card__image" style={{ backgroundImage: `url(${venue.image})` }}>
        <span className="status-badge status-badge--white" style={{ '--badge-color': venue.open ? 'var(--vc-success)' : 'var(--vc-text-secondary)' }}>{venue.open ? 'OPEN NOW' : 'CLOSED'}</span>
        <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={() => toggleFavorite(venue.id)} aria-label="Save court"><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="venue-card__body">
        <div><h3>{venue.name}</h3><span className="rating"><Star size={14} fill="currentColor" /> {venue.rating} <small>({venue.reviews})</small></span></div>
        <ul className="meta-dots"><li><MapPin size={14} /> {venue.area}</li><li>{venue.distance}</li><li>from ₱{venue.price}/hr</li></ul>
        <div className="card-pills">{venue.sports.map((sport) => <SportPill sport={sport} key={sport} />)}</div>
        <div className="venue-card__footer"><span>From <b>₱{venue.price}</b> / hour</span><Link to={`/app/courts/${venue.id}`}>View court <span>↗</span></Link></div>
      </div>
    </article>
  )
}

export function QueueCard({ queue }) {
  const { joinedQueues, toggleQueue } = usePlayer()
  const joined = joinedQueues.includes(queue.id)
  const fill = Math.round((queue.players / queue.max) * 100)
  return (
    <article className="queue-card stripe-card" style={{ '--stripe-color': 'var(--vc-accent)' }}>
      <div className="queue-card__top">
        <SportPill sport={queue.sport} />
        {queue.featured && <span className="featured-badge">FEATURED</span>}
      </div>
      <h3>{queue.title}</h3>
      <p><MapPin size={15} /> {queue.venue}</p>
      <div className="queue-meta"><span className="info-pill"><Clock3 size={15} /> {queue.time}</span><span className="info-pill"><Users size={15} /> {queue.level}</span></div>
      <div className="queue-fill"><div><span>Players</span><b className="queue-spots">{queue.players}/{queue.max}</b></div><div className="progress"><i style={{ width: `${fill}%` }} /></div></div>
      <div className="queue-card__footer"><span><small>ENTRY</small><b>{queue.fee ? `₱${queue.fee}` : 'FREE'}</b></span><button className={joined ? 'button button--joined' : 'button button--dark'} onClick={() => toggleQueue(queue.id)}>{joined ? 'Joined ✓' : 'Join game'}</button></div>
    </article>
  )
}

export function EventCard({ event }) {
  const kind = event.kind || 'tournament'
  return (
    <article className="event-card stripe-card" style={{ '--stripe-color': kind === 'event' ? 'var(--vc-primary)' : 'var(--vc-accent)' }}>
      <div className="event-card__image" style={{ backgroundImage: `linear-gradient(180deg, transparent 25%, rgba(5,12,23,.9)), url(${event.image})` }}>
        <span className="date-tile">{event.date.split(' ')[0]}<b>{event.date.split(' ')[1]}</b></span>
        <SportPill sport={event.sport} />
        <div><small>{event.organizer}</small><h3>{event.title}</h3></div>
      </div>
      <div className="event-card__body">
        <p><MapPin size={15} /> {event.venue}</p>
        <div><span><Users size={15} /> {event.registered}/{event.capacity} registered</span><b>{event.prize} prize</b></div>
      </div>
    </article>
  )
}

export function ClubCard({ club }) {
  return (
    <article className="club-card stripe-card" style={{ '--stripe-color': 'var(--vc-brand-green)' }}>
      <div className="club-card__cover" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(15,23,42,.72)), url(${club.image})` }}>
        <SportPill sport={club.sport} />
        <span className="club-card__logo">{club.initials}</span>
      </div>
      <div className="club-card__body">
        <div><h3>{club.name} {club.private && <Lock size={14} aria-label="Private club" />}</h3><span className="rating"><Star size={14} fill="currentColor" /> {club.rating}</span></div>
        <p><MapPin size={15} /> {club.area}</p>
        <div className="club-card__footer"><span className="info-pill"><Users size={15} /> {club.members.toLocaleString()} members</span><button>View club <span>›</span></button></div>
      </div>
    </article>
  )
}
