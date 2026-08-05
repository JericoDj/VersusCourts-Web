import { useMemo, useState } from 'react'
import { ChevronRight, Lock, MapPin, Plus, QrCode, Search, Star, Users } from 'lucide-react'
import { SportPill } from '../components/Cards'
import { SportGlyph } from '../components/SportIcon'
import { SPORTS } from '../data/sports'
import { usePlayer } from '../context/PlayerContext'

const DISTANCE_OPTIONS = [3, 5, 10, 25]
const SPORT_CHIPS = SPORTS

function ClubLogo({ club, size = 'lg' }) {
  const style = { '--sport-color': `var(--vc-sport-${club.sport}, var(--vc-primary))` }
  if (club.image) style.backgroundImage = `url(${club.image})`
  return (
    <span className={`club-logo club-logo--${size}`} style={style} aria-hidden="true">
      {!club.image && <Users size={size === 'lg' ? 23 : 22} />}
    </span>
  )
}

function SportTags({ sports = [], max = 2, priority }) {
  if (!sports.length) return null
  const ordered = priority && sports.includes(priority)
    ? [priority, ...sports.filter((s) => s !== priority)]
    : sports
  const extra = ordered.length - max
  return (
    <span className="club-tags">
      {ordered.slice(0, max).map((s) => <SportPill sport={s} key={s} />)}
      {extra > 0 && <span className="sport-tag club-tags__more">+{extra}</span>}
    </span>
  )
}

export default function ClubsPage() {
  const { allClubs: clubs, setNotice } = usePlayer()
  const [query, setQuery] = useState('')
  const [sportFilter, setSportFilter] = useState('all')
  const [maxKm, setMaxKm] = useState(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [joinedIds, setJoinedIds] = useState([])

  /// Clubs already arrive fully shaped from the backend (sports, distanceKm,
  /// visibility, invite code) — see controllers/discoveryController.js.
  const allClubs = clubs

  const { myClubs, discoverClubs } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (club) => !q
      || [club.name, club.area, ...(club.sports ?? [])].join(' ').toLowerCase().includes(q)
    const joined = (club) => club.joined || joinedIds.includes(club.id)
    return {
      myClubs: allClubs.filter((c) => joined(c) && matches(c)),
      discoverClubs: allClubs.filter((c) => !joined(c) && matches(c)
        && (sportFilter === 'all' || (c.sports ?? []).includes(sportFilter))
        && (maxKm === null || (c.distanceKm ?? 0) <= maxKm)),
    }
  }, [allClubs, joinedIds, query, sportFilter, maxKm])

  function join(club) {
    if (club.isPrivate) {
      setNotice(`${club.name} is invite-only — ask a member for a code.`)
      return
    }
    setJoinedIds((ids) => (ids.includes(club.id) ? ids.filter((id) => id !== club.id) : [...ids, club.id]))
    setNotice(`You joined ${club.name}.`)
  }

  function submitCode(event) {
    event.preventDefault()
    const entered = code.trim().toLowerCase()
    if (!entered) return
    const found = allClubs.find((c) => (c.code ?? '').toLowerCase() === entered)
    setNotice(found ? `Found ${found.name} — open it from Discover below.` : 'No club found for that code.')
    setCode('')
  }

  return (
    <div className="clubs-page">
      <div className="clubs-search">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs…"
          aria-label="Search clubs"
        />
      </div>

      <div className="clubs-actions">
        <button
          type="button"
          className="clubs-action clubs-action--primary"
          onClick={() => setNotice('Club creation is coming soon to the web player.')}
        >
          <Plus size={20} /> Create Club
        </button>
        <button
          type="button"
          className="clubs-action clubs-action--outline"
          aria-expanded={codeOpen}
          onClick={() => setCodeOpen((open) => !open)}
        >
          <QrCode size={20} /> Find by Code
        </button>
      </div>

      {codeOpen && (
        <form className="clubs-code" onSubmit={submitCode}>
          <label htmlFor="club-code">Enter the 6-character invite code shared with you.</label>
          <div className="clubs-code__row">
            <input
              id="club-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AB12XY"
              maxLength={12}
              autoComplete="off"
            />
            <button type="submit" className="clubs-action clubs-action--primary">Find</button>
          </div>
        </form>
      )}

      {myClubs.length > 0 && (
        <>
          <div className="clubs-section-head"><h2>My clubs</h2></div>
          <div className="clubs-rail">
            {myClubs.map((club) => (
              <article className="my-club-card" key={club.id}>
                <div className="my-club-card__top">
                  <ClubLogo club={club} />
                  <span className="my-club-card__badges">
                    {club.isPrivate && <span className="club-badge club-badge--private">Private</span>}
                    <span className="club-badge club-badge--joined">Joined</span>
                  </span>
                </div>
                <h3>{club.name}</h3>
                <div className="my-club-card__meta">
                  <span><Users size={14} /> {club.members} members</span>
                  <span><Star size={14} /> {club.rating}</span>
                  <span><MapPin size={14} /> {(club.distanceKm ?? 0).toFixed(1)}km</span>
                </div>
                <SportTags sports={club.sports} />
              </article>
            ))}
          </div>
        </>
      )}

      <div className="clubs-section-head clubs-section-head--discover">
        <h2>Discover</h2>
        <label className={`clubs-distance ${maxKm !== null ? 'is-active' : ''}`}>
          <MapPin size={15} />
          <span>{maxKm === null ? 'Distance' : `Within ${maxKm}km`}</span>
          <select
            value={maxKm === null ? '' : String(maxKm)}
            onChange={(e) => setMaxKm(e.target.value === '' ? null : Number(e.target.value))}
            aria-label="Maximum distance"
          >
            <option value="">Any distance</option>
            {DISTANCE_OPTIONS.map((d) => <option value={String(d)} key={d}>Within {d}km</option>)}
          </select>
        </label>
      </div>

      <div className="clubs-filter-row">
        <button
          type="button"
          className={`clubs-chip ${sportFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setSportFilter('all')}
        >
          All sports
        </button>
        {SPORT_CHIPS.map((sport) => (
          <button
            type="button"
            key={sport.id}
            className={`clubs-chip clubs-chip--${sport.id} ${sportFilter === sport.id ? 'is-active' : ''}`}
            onClick={() => setSportFilter(sportFilter === sport.id ? 'all' : sport.id)}
          >
            <SportGlyph sport={sport.id} size={16} /> {sport.label}
          </button>
        ))}
      </div>

      {discoverClubs.length === 0 ? (
        <p className="clubs-empty">No other clubs yet — create the first one!</p>
      ) : (
        <div className="clubs-list">
          {discoverClubs.map((club) => (
            <article className="club-tile" key={club.id}>
              <ClubLogo club={club} size="sm" />
              <div className="club-tile__body">
                <div className="club-tile__name">
                  <h3>{club.name}</h3>
                  {club.isPrivate && <span className="club-tile__lock"><Lock size={11} /></span>}
                </div>
                <div className="club-tile__meta">
                  <span><Users size={13} /> {club.members}</span>
                  <span className="club-tile__dot" />
                  <span><MapPin size={13} /> {(club.distanceKm ?? 0).toFixed(1)}km</span>
                  {(club.sports ?? []).length > 0 && (
                    <>
                      <span className="club-tile__dot club-tile__dot--tags" />
                      <span className="club-tile__tags">
                        <SportTags
                          sports={club.sports}
                          priority={sportFilter === 'all' ? undefined : sportFilter}
                        />
                      </span>
                    </>
                  )}
                </div>
              </div>
              {club.isPrivate ? (
                <button
                  type="button"
                  className="club-tile__chevron"
                  onClick={() => join(club)}
                  aria-label={`Open ${club.name}`}
                >
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button type="button" className="club-tile__join" onClick={() => join(club)}>
                  <Plus size={15} /> Join
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
