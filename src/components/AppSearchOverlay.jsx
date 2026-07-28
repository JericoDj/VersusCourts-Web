import { ArrowLeft, CalendarDays, Gamepad2, MapPin, Search, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'

const trending = ['Elite Sports Center', 'Summer Slam 3v3', 'Metro Ballers', 'Smash Arena Badminton']

const iconFor = { court: MapPin, club: UsersRound, player: UsersRound, event: CalendarDays, queue: Gamepad2 }

/// Mirrors the Player app, where the pill's search button pushes a full
/// SearchScreen rather than expanding the pill in place.
export default function AppSearchOverlay({ onClose }) {
  const { venues, clubs, events, players } = usePlayer()
  const { queues } = useQueues()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    const has = (value) => value.toLowerCase().includes(term)
    return [
      ...venues.filter((venue) => has(`${venue.name} ${venue.area} ${venue.sports.join(' ')}`))
        .map((venue) => ({ id: `court-${venue.id}`, kind: 'court', label: venue.name, meta: venue.area, image: venue.image, to: `/app/courts/${venue.id}` })),
      ...clubs.filter((club) => has(`${club.name} ${club.area} ${club.sport}`))
        .map((club) => ({ id: `club-${club.id}`, kind: 'club', label: club.name, meta: club.area, image: club.image, to: '/app/clubs' })),
      ...queues.filter((queue) => has(`${queue.title} ${queue.venue} ${queue.sport} ${queue.level}`))
        .map((queue) => ({ id: `queue-${queue.id}`, kind: 'queue', label: queue.title, meta: queue.venue, to: '/app/queues' })),
      ...players.filter((player) => has(`${player.name} ${player.username} ${player.area}`))
        .map((player) => ({ id: `player-${player.id}`, kind: 'player', label: player.name, meta: `@${player.username}`, image: player.image, to: '/app/profile' })),
      ...events.filter((event) => has(`${event.title} ${event.organizer} ${event.venue} ${event.sport}`))
        .map((event) => ({ id: `event-${event.id}`, kind: 'event', label: event.title, meta: event.venue, image: event.image, to: '/app/events' })),
    ].slice(0, 24)
  }, [clubs, events, players, queues, query, venues])

  return (
    <div className="app-search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="app-search-overlay__bar">
        <button type="button" className="app-search-overlay__back" onClick={onClose} aria-label="Close search"><ArrowLeft size={22} /></button>
        <div className="app-search-overlay__field">
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courts, clubs, players..."
            aria-label="Search courts, clubs, queues, or events"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={18} /></button>}
        </div>
      </div>

      <div className="app-search-overlay__body">
        {query.trim() ? (
          results.length ? results.map((result) => {
            const Icon = iconFor[result.kind]
            return (
              <Link key={result.id} to={result.to} className="app-search-result" onClick={onClose}>
                <span className="app-search-result__icon">{result.image ? <img src={result.image} alt="" /> : <Icon size={18} />}</span>
                <span className="app-search-result__text"><b>{result.label}</b><small>{result.meta}</small></span>
              </Link>
            )
          }) : <p className="app-search-overlay__empty">No matches for “{query}”</p>
        ) : (
          <>
            <h2 className="app-search-overlay__heading">Trending searches</h2>
            <div className="app-search-overlay__trends">
              {trending.map((term) => (
                <button type="button" key={term} onClick={() => setQuery(term)}>{term}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
