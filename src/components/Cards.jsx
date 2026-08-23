import { Clock3, Heart, Lock, MapPin, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { SportGlyph } from './SportIcon'
import { sportLabel } from '../data/sports'

/// Sport tag — carries the Material Symbol alongside the label so it reads the
/// same as the mobile app's sport chips.
export function SportPill({ sport, icon = true }) {
  return (
    <span className={`sport-tag sport-tag--${sport}`}>
      {icon && <SportGlyph sport={sport} size={13} />}
      {sportLabel(sport)}
    </span>
  )
}

export function VenueCard({ venue, compact = false, onSelect }) {
  const { favorites, toggleFavorite } = usePlayer()
  const saved = favorites.includes(venue.id)
  return (
    <article className={`venue-card ${compact ? 'venue-card--compact' : ''}`}>
      <div className="venue-card__image" style={{ backgroundImage: `url(${venue.image})` }}>
        <span className="status-badge status-badge--white" style={{ '--badge-color': venue.open ? 'var(--vc-success)' : 'var(--vc-text-secondary)' }}>{venue.open ? 'OPEN NOW' : 'CLOSED'}</span>
        <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(venue.id) }} aria-label="Save court"><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="venue-card__body">
        <div><h3>{venue.name}</h3><span className="rating"><Star size={14} fill="currentColor" /> {venue.rating} <small>({venue.reviews})</small></span></div>
        <ul className="meta-dots"><li><MapPin size={14} /> {venue.area}</li><li>{venue.distance}</li><li>from ₱{venue.price}/hr</li></ul>
        <div className="card-pills">{venue.sports.map((sport) => <SportPill sport={sport} key={sport} />)}</div>
        <div className="venue-card__footer">
          <span>From <b>₱{venue.price}</b> / hour</span>
          {onSelect ? (
            <button
              type="button"
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              onClick={() => onSelect(venue)}
            >
              Book court <span>↗</span>
            </button>
          ) : (
            <Link to={`/app/courts/${venue.id}`}>View court <span>↗</span></Link>
          )}
        </div>
      </div>
    </article>
  )
}

export function QueueCard({ queue, onOpen }) {
  const fill = queue.max > 0 ? Math.round((queue.players / queue.max) * 100) : 0
  return (
    <article
      className={`queue-card stripe-card ${onOpen ? 'queue-card--interactive' : ''}`}
      style={{ '--stripe-color': 'var(--vc-accent)' }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onOpen()
        }
      }}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <SportGlyph sport={queue.sport} size={24} className={`queue-card__mobile-icon queue-card__mobile-icon--${queue.sport}`} />
      <div className="queue-card__top">
        <SportPill sport={queue.sport} />
        {queue.featured && <span className="featured-badge">FEATURED</span>}
      </div>
      <h3>{queue.title}</h3>
      <p><MapPin size={15} /> {queue.venue}</p>
      <div className="queue-meta"><span className="info-pill"><Clock3 size={15} /> {queue.time}</span><span className="info-pill queue-meta__level"><Users size={15} /> {queue.level}</span><span className="info-pill queue-meta__players"><Users size={15} /> {queue.players}/{queue.max}</span></div>
      <div className="queue-fill"><div><span>Players</span><b className="queue-spots">{queue.players}/{queue.max}</b></div><div className="progress"><i style={{ width: `${fill}%` }} /></div></div>
      <div className="queue-card__footer"><span><small>ENTRY</small><b>{queue.fee ? `₱${queue.fee}` : 'FREE'}</b></span><span className="button button--dark"><span className="queue-card__view-long">View game</span><span className="queue-card__view-short">View</span></span></div>
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

export function ClubCard({ club, onOpen }) {
  const { userLocation, locationStatus, requestLocation } = usePlayer()
  const clubSports = club.sports?.length ? club.sports : [club.sport].filter(Boolean)
  const hasCoordinates = Number.isFinite(club.latitude) && Number.isFinite(club.longitude)
  const distance = userLocation && hasCoordinates ? distanceFrom(userLocation, club) : null
  return (
    <article className={`club-card stripe-card ${onOpen ? 'club-card--interactive' : ''}`} style={{ '--stripe-color': 'var(--vc-brand-green)' }} onClick={onOpen} onKeyDown={(event) => { if (onOpen && (event.key === 'Enter' || event.key === ' ')) onOpen() }} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      <div className="club-card__cover" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(15,23,42,.72)), url(${club.image})` }}>
        <span className="club-card__logo">{club.initials}</span>
      </div>
      <div className="club-card__body">
        <div><h3>{club.name} {club.private && <Lock size={14} aria-label="Private club" />}</h3></div>
        <div className="club-card__meta">
          <span><Users size={15} /> {club.members.toLocaleString()} members</span>
          {club.rating > 0 && <span className="club-card__rating"><Star size={15} fill="currentColor" /> {club.rating.toFixed(1)}</span>}
          {distance ? <span><MapPin size={15} /> {distance}</span> : hasCoordinates ? (
            <button type="button" className="club-card__distance-button" onClick={(event) => { event.stopPropagation(); requestLocation() }} disabled={locationStatus === 'requesting'}>
              <MapPin size={15} /> {locationStatus === 'requesting' ? 'Finding location…' : 'See distance'}
            </button>
          ) : <span><MapPin size={15} /> {club.area}</span>}
        </div>
        <div className="card-pills club-card__sports">{clubSports.map((sport) => <SportPill sport={sport} key={sport} />)}</div>
      </div>
    </article>
  )
}

function distanceFrom(from, to) {
  const toRadians = (value) => value * (Math.PI / 180)
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  const kilometers = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return kilometers < 1 ? `${Math.max(50, Math.round(kilometers * 1000 / 50) * 50)} m` : `${kilometers.toFixed(1)} km`
}
