import { useState } from 'react'
import { Calendar, Clock, Heart, Lock, MapPin, Star, Users } from 'lucide-react'
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

export function QueueCard({
  queue,
  onOpen,
  onClick,
  joined = false,
  requested = false,
  onJoin,
}) {
  const handleAction = onOpen || onClick

  const sport = String(queue.sport || 'basketball').toLowerCase()

  // Sport themes matching Flutter AppColors
  const sportTheme = {
    badminton: { bg: '#22c55e', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)', label: 'Badminton' },
    pickleball: { bg: '#0ea5e9', gradient: 'linear-gradient(135deg, #0284c7, #0ea5e9)', label: 'Pickleball' },
    tennis: { bg: '#eab308', gradient: 'linear-gradient(135deg, #ca8a04, #eab308)', label: 'Tennis' },
    padel: { bg: '#8b5cf6', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', label: 'Padel' },
    basketball: { bg: '#f97316', gradient: 'linear-gradient(135deg, #ea580c, #f97316)', label: 'Basketball' },
    volleyball: { bg: '#ec4899', gradient: 'linear-gradient(135deg, #db2777, #ec4899)', label: 'Volleyball' },
  }[sport] || { bg: '#1B3BFF', gradient: 'linear-gradient(135deg, #1B3BFF, #3b82f6)', label: sport.charAt(0).toUpperCase() + sport.slice(1) }

  // Date and time range formatting
  const startDate = queue.startTime ? new Date(queue.startTime) : null
  const formattedDate = startDate && !Number.isNaN(startDate.getTime())
    ? new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }).format(startDate)
    : (queue.time?.split(',')?.slice(0, 2)?.join(',') || 'Date TBA')

  let formattedTimeRange = queue.formattedTimeRange
  if (!formattedTimeRange) {
    const startTimeStr = startDate && !Number.isNaN(startDate.getTime())
      ? new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(startDate)
      : ''
    const effectiveEnd = queue.effectiveEndTime ? new Date(queue.effectiveEndTime) : null
    const endTimeStr = effectiveEnd && !Number.isNaN(effectiveEnd.getTime())
      ? new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(effectiveEnd)
      : ''
    formattedTimeRange = startTimeStr && endTimeStr ? `${startTimeStr} – ${endTimeStr}` : (queue.time || 'Time TBA')
  }

  // Location / venue label
  const venueLabel = queue.venueLabel || (queue.area && queue.venue && !queue.venue.toLowerCase().includes(queue.area.toLowerCase())
    ? `${queue.venue} · ${queue.area}`
    : queue.venue || 'Venue to be announced')

  // Skill level label
  const rawSkills = queue.skillsLabel || queue.level || 'All Levels'
  const skillsLabel = rawSkills.includes(',') ? 'All Levels' : rawSkills

  // Joined / button state
  const isJoined = joined || queue.isJoined || queue.status === 'JOINED'
  const isFull = (queue.players || 0) >= (queue.max || 1)
  const isOngoing = queue.isOngoing || queue.status === 'STARTED'

  const buttonText = isJoined
    ? 'View'
    : requested
    ? 'Requested'
    : isOngoing
    ? 'Request'
    : isFull
    ? 'Full'
    : 'Join'

  const handleButtonClick = (e) => {
    e.stopPropagation()
    if (isJoined) {
      if (handleAction) handleAction(queue)
    } else if (onJoin) {
      onJoin(queue)
    } else if (handleAction) {
      handleAction(queue)
    }
  }

  return (
    <article
      className="public-queue-card"
      onClick={() => handleAction && handleAction(queue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (handleAction) handleAction(queue)
        }
      }}
    >
      {/* Top row: Sport Icon + Title & Sport + Skill Pill */}
      <div className="public-queue-card__header">
        <div
          className="public-queue-card__sport-icon"
          style={{ background: sportTheme.gradient }}
        >
          <SportGlyph sport={sport} size={20} color="#ffffff" />
        </div>

        <div className="public-queue-card__title-box">
          <h4 className="public-queue-card__title">{queue.title}</h4>
          <span className="public-queue-card__sport-name">{sportTheme.label}</span>
        </div>

        <div className="public-queue-card__skill-pill">
          {skillsLabel}
        </div>
      </div>

      {/* Location row */}
      <div className="public-queue-card__location">
        <MapPin size={13} className="public-queue-card__pin-icon" />
        <span>{venueLabel}</span>
      </div>

      <div className="public-queue-card__divider" />

      {/* Bottom row: Timing / Fee / Players + Action Button */}
      <div className="public-queue-card__footer">
        <div className="public-queue-card__meta">
          <div className="public-queue-card__schedule-row">
            <Calendar size={12} className="public-queue-card__meta-icon" />
            <strong className="public-queue-card__date-text">{formattedDate}</strong>
            <Clock size={12} className="public-queue-card__clock-icon" />
            <span className="public-queue-card__time-text">{formattedTimeRange}</span>
          </div>

          <div className="public-queue-card__stats-row">
            <span className={`public-queue-card__fee ${queue.fee > 0 ? 'is-paid' : 'is-free'}`}>
              {queue.fee > 0 ? `₱${queue.fee}` : 'Free'}
            </span>
            <span className="public-queue-card__players">
              <Users size={12} />
              <span>{queue.players}/{queue.max}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`public-queue-card__btn ${isJoined ? 'public-queue-card__btn--view' : isFull ? 'public-queue-card__btn--full' : 'public-queue-card__btn--join'}`}
          onClick={handleButtonClick}
          disabled={!isJoined && isFull}
        >
          {buttonText}
        </button>
      </div>
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
  const [logoFailed, setLogoFailed] = useState(false)
  const logo = !logoFailed ? (club.logoUrl || club.logo || club.avatarUrl) : null
  const coverUrl = club.bannerUrl || club.coverUrl || club.image

  return (
    <article className={`club-card stripe-card ${onOpen ? 'club-card--interactive' : ''}`} style={{ '--stripe-color': 'var(--vc-brand-green)' }} onClick={onOpen} onKeyDown={(event) => { if (onOpen && (event.key === 'Enter' || event.key === ' ')) onOpen() }} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      <div
        className="club-card__cover"
        style={{
          backgroundImage: coverUrl
            ? `linear-gradient(180deg, transparent, rgba(15,23,42,.72)), url(${coverUrl})`
            : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        }}
      >
        <span
          className={`club-card__logo ${logo ? 'club-card__logo--has-img' : 'club-card__logo--fallback'}`}
          style={{ '--sport-color': `var(--vc-sport-${club.sport}, var(--vc-primary))` }}
        >
          {logo ? (
            <img
              src={logo}
              alt={club.name}
              className="club-card__logo-img"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="club-card__logo-fallback">
              <SportGlyph sport={club.sport} size={26} />
            </span>
          )}
        </span>
      </div>
      <div className="club-card__body">
        <div><h3>{club.name} {club.private && <Lock size={14} aria-label="Private club" />}</h3></div>
        <div className="club-card__meta">
          <span><Users size={15} /> {club.members.toLocaleString()} members</span>
          {club.rating > 0 && <span className="club-card__rating"><Star size={15} fill="#eab308" color="#eab308" /> {club.rating.toFixed(1)}</span>}
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
