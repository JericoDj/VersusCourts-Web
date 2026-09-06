import { ArrowLeft, CalendarDays, Dumbbell, Gamepad2, MapPin, Search, UserRound, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { isQueueActive, useQueues } from '../context/QueueContext'
import { browsePlayers, searchPlayers } from '../data/userService'
import UserProfileDialog from './UserProfileDialog'
import '../styles/search-browse.css'

const iconFor = { court: MapPin, club: UsersRound, player: UsersRound, event: CalendarDays, queue: Gamepad2 }

function PlayerAvatar({ src }) {
  const [failed, setFailed] = useState(false)
  return <span className="search-player-avatar">{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : <UserRound size={26} />}</span>
}

/// Mirrors the Player app, where the pill's search button pushes a full
/// SearchScreen rather than expanding the pill in place.
export default function AppSearchOverlay({ onClose }) {
  const { venues, clubs, events } = usePlayer()
  const { queues } = useQueues()
  const [query, setQuery] = useState('')
  const [playerResults, setPlayerResults] = useState([])
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const inputRef = useRef(null)
  const [browsingPlayers, setBrowsingPlayers] = useState(false)
  const [directoryPlayers, setDirectoryPlayers] = useState([])
  const [playerPage, setPlayerPage] = useState(0)
  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersError, setPlayersError] = useState('')
  const [hasMorePlayers, setHasMorePlayers] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!browsingPlayers) return
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setPlayersLoading(true)
      setPlayersError('')
      try {
        const players = await browsePlayers(playerPage * 50, { signal: controller.signal })
        if (controller.signal.aborted) return
        setDirectoryPlayers((current) => playerPage === 0 ? players : [...current, ...players])
        setHasMorePlayers(players.length === 50)
      } catch {
        if (!controller.signal.aborted) setPlayersError('Unable to load players. Please try again.')
      } finally {
        if (!controller.signal.aborted) setPlayersLoading(false)
      }
    })
    return () => controller.abort()
  }, [browsingPlayers, playerPage, retry])

  const resetBrowse = () => { setBrowsingPlayers(false); setQuery('') }

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

  useEffect(() => {
    const term = query.trim()
    const controller = new AbortController()
    const timer = setTimeout(() => {
      if (!term) {
        setPlayerResults([])
        return
      }
      searchPlayers(term, { signal: controller.signal }).then((res) => {
        setPlayerResults(res || [])
      })
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    const has = (value) => value.toLowerCase().includes(term)
    return [
      ...venues.filter((venue) => has(`${venue.name} ${venue.area} ${venue.sports.join(' ')}`))
        .map((venue) => ({ id: `court-${venue.id}`, kind: 'court', label: venue.name, meta: venue.area, image: venue.image, to: `/app/courts/${venue.id}` })),
      ...clubs.filter((club) => has(`${club.name} ${club.area} ${club.sport}`))
        .map((club) => ({ id: `club-${club.id}`, kind: 'club', label: club.name, meta: club.area, image: club.image, to: `/app/clubs/${club.id}` })),
      ...queues.filter((queue) => isQueueActive(queue) && !queue.isPrivate && has(`${queue.title} ${queue.venue} ${queue.sport} ${queue.level}`))
        .map((queue) => ({ id: `queue-${queue.id}`, kind: 'queue', label: queue.title, meta: queue.venue, to: `/app/queues/${queue.id}` })),
      ...playerResults.map((player) => ({ id: `player-${player.id}`, kind: 'player', label: player.name, meta: player.username ? `@${player.username}` : player.area, image: player.image, playerData: player, to: '#' })),
      ...events.filter((event) => has(`${event.title} ${event.organizer} ${event.venue} ${event.sport}`))
        .map((event) => ({ id: `event-${event.id}`, kind: 'event', label: event.title, meta: event.venue, image: event.image, to: '/app/events' })),
    ].slice(0, 24)
  }, [clubs, events, playerResults, queues, query, venues])

  return (
    <div className="app-search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="app-search-overlay__bar">
        <button type="button" className="app-search-overlay__back" onClick={browsingPlayers ? resetBrowse : onClose} aria-label={browsingPlayers ? 'Back to browse' : 'Close search'}><ArrowLeft size={22} /></button>
        <div className="app-search-overlay__field">
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setBrowsingPlayers(false); setQuery(event.target.value) }}
            placeholder={browsingPlayers ? 'All players' : 'Search courts, clubs, players...'}
            aria-label="Search courts, clubs, queues, or events"
          />
          {(query || browsingPlayers) && <button type="button" onClick={resetBrowse} aria-label="Clear search"><X size={18} /></button>}
        </div>
      </div>

      <div className="app-search-overlay__body">
        {browsingPlayers ? (
          <>
            <h2 className="app-search-overlay__heading">All Players {(!playersLoading || directoryPlayers.length > 0) && <span>{directoryPlayers.length}</span>}</h2>
            {directoryPlayers.map((player) => (
              <button type="button" className="app-search-result search-player-row" key={player.id} onClick={() => setViewingPlayer(player)}>
                <PlayerAvatar key={player.image} src={player.image} />
                <span className="app-search-result__text"><b>{player.name}</b><small>@{player.username}</small></span>
                <span className="search-player-level">Lv {player.level}</span>
              </button>
            ))}
            {playersLoading && (
              <div role="status" aria-label="Loading players" aria-busy="true">
                {Array.from({ length: directoryPlayers.length ? 3 : 6 }, (_, index) => (
                  <div className="app-search-result search-player-skeleton" aria-hidden="true" key={index}>
                    <span className="search-player-skeleton__avatar" />
                    <span className="search-player-skeleton__text"><span /><span /></span>
                    <span className="search-player-skeleton__level" />
                  </div>
                ))}
              </div>
            )}
            {playersError ? <p role="alert">{playersError} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p> : !playersLoading && !directoryPlayers.length ? <p>No players available yet.</p> : null}
            {hasMorePlayers && !playersError && <button type="button" className="search-load-more" disabled={playersLoading} onClick={() => { setPlayersLoading(true); setPlayerPage((page) => page + 1) }}>Load more players</button>}
          </>
        ) : query.trim() ? (
          results.length ? results.map((result) => {
            const Icon = iconFor[result.kind]
            const isPlayer = result.kind === 'player'
            return (
              <Link
                key={result.id}
                to={result.to}
                className="app-search-result"
                onClick={(e) => {
                  if (isPlayer) {
                    e.preventDefault()
                    setViewingPlayer(result.playerData)
                    return
                  }
                  onClose()
                }}
              >
                {isPlayer ? <PlayerAvatar key={result.image} src={result.image} /> : <span className="app-search-result__icon">{result.image ? <img src={result.image} alt="" /> : <Icon size={18} />}</span>}
                <span className="app-search-result__text"><b>{result.label}</b><small>{result.meta}</small></span>
              </Link>
            )
          }) : <p className="app-search-overlay__empty">No matches for “{query}”</p>
        ) : (
          <>
            <h2 className="app-search-overlay__heading">Browse</h2>
            <div className="search-browse-grid">
              <Link className="search-browse-tile" style={{ '--tile-color': '#22c55e' }} to="/app/clubs" onClick={onClose}><UsersRound /><span>Clubs</span></Link>
              <button type="button" className="search-browse-tile" style={{ '--tile-color': '#0c4dd1' }} onClick={() => { setDirectoryPlayers([]); setPlayerPage(0); setPlayersLoading(true); setPlayersError(''); setHasMorePlayers(false); setBrowsingPlayers(true); inputRef.current?.blur() }}><UserRound /><span>Players</span></button>
              <Link className="search-browse-tile" style={{ '--tile-color': '#06b6d4' }} to="/app/queues?view=browse" onClick={onClose}><Gamepad2 /><span>Queue / Open Play</span></Link>
              {[
                { label: 'Courts', Icon: MapPin, color: '#f97316' },
                { label: 'Trainings', Icon: Dumbbell, color: '#ca8a04' },
                { label: 'Events', Icon: CalendarDays, color: '#dc2626' },
              ].map(({ label, Icon, color }) => <button type="button" className="search-browse-tile" style={{ '--tile-color': color }} key={label} disabled><span className="search-browse-badge">Coming soon</span><Icon /><span>{label}</span></button>)}
            </div>
          </>
        )}
      </div>

      <UserProfileDialog
        user={viewingPlayer}
        open={Boolean(viewingPlayer)}
        onClose={() => setViewingPlayer(null)}
      />
    </div>
  )
}
