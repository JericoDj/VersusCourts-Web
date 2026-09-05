import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Gamepad2, HelpCircle, LayoutDashboard, LogOut, MapPin, Search, TrendingUp, User, UsersRound, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Brand from './Brand'
import ComingSoonDialog from './ComingSoonDialog'
import LoginDialog from './LoginDialog'
import NewsTicker from './NewsTicker'
import { SportPill } from './Cards'
import UserProfileDialog from './UserProfileDialog'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import { searchPlayers } from '../data/userService'

/// Primary destinations, surfaced directly in the bar rather than hidden
/// behind a menu.
const highlights = [
  { to: '/clubs', label: 'Explore Sports Clubs', icon: UsersRound },
  { to: '/queues', label: 'Join Queues / Open Play', icon: Gamepad2 },
  { to: '/venues', label: 'Book Courts', icon: MapPin, badge: 'Coming Soon' },
  { to: '/events', label: 'Sports Events', icon: CalendarDays, badge: 'Coming Soon' },
]

const searchTerms = ['courts', 'clubs', 'queues', 'open play']
const trendingSearches = ['Elite Sports Center', 'Summer Slam 3v3', 'Metro Ballers', 'Smash Arena Badminton', 'Open Badminton Cup']
const searchCategories = [
  { id: 'all', label: 'All' },
  { id: 'court', label: 'Courts' },
  { id: 'club', label: 'Clubs' },
  { id: 'queue', label: 'Queues' },
  { id: 'player', label: 'Players' },
  { id: 'event', label: 'Events' },
]

function SearchResultItem({ result, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false)
  const hasValidImg = Boolean(result.image && !imgFailed)
  const ResultIcon =
    result.kind === 'court'
      ? MapPin
      : result.kind === 'club'
        ? UsersRound
        : result.kind === 'player'
          ? User
          : result.kind === 'event'
            ? CalendarDays
            : Gamepad2

  const formattedDate = useMemo(() => {
    if (result.kind !== 'event' || !result.date) return null
    try {
      const d = new Date(result.date)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch {}
    return String(result.date)
  }, [result.kind, result.date])

  const handleClick = (e) => {
    if (result.kind === 'player') {
      e.preventDefault()
    }
    onSelect?.(result)
  }

  return (
    <Link to={result.to} className="header-search__result-row" onClick={handleClick}>
      <div className={`header-search__result-thumb header-search__result-thumb--${result.kind}`}>
        {hasValidImg ? (
          <img
            src={result.image}
            alt=""
            onError={() => setImgFailed(true)}
            className="header-search__result-img"
          />
        ) : result.kind === 'event' && formattedDate ? (
          <div className="header-search__date-chip">
            <span className="header-search__date-month">{formattedDate.split(' ')[0]}</span>
            <span className="header-search__date-day">{formattedDate.split(' ')[1] || ''}</span>
          </div>
        ) : (
          <div className="header-search__fallback-icon">
            <ResultIcon size={18} />
          </div>
        )}
      </div>

      <div className="header-search__result-info">
        <div className="header-search__result-title-row">
          <span className="header-search__result-title">{result.label}</span>
        </div>
        <div className="header-search__result-subtitle">
          {result.kind === 'club' && result.members > 0 && (
            <span className="header-search__sub-stat">
              <UsersRound size={11} /> {result.members} {result.members === 1 ? 'member' : 'members'} ·
            </span>
          )}
          {result.meta && <span>{result.meta}</span>}
        </div>
      </div>

      <div className="header-search__result-aside">
        {result.distance && (
          <span className="header-search__dist-badge">
            <MapPin size={11} /> {result.distance}
          </span>
        )}
        {result.kind === 'event' && (
          <span className="header-search__event-chip">
            {formattedDate || 'Upcoming'}
          </span>
        )}
        {result.level && <span className="header-search__level-badge">{result.level}</span>}
        {result.sport && <SportPill sport={result.sport} />}
        <ChevronRight size={15} className="header-search__chevron" />
      </div>
    </Link>
  )
}

function SearchResultList({ groups, hasResults, query, category, onSelect }) {
  if (!hasResults) {
    const categoryLabel = searchCategories.find((item) => item.id === category)?.label.toLowerCase()
    return (
      <div className="header-search__empty">
        <Search size={28} className="header-search__empty-icon" />
        <p className="header-search__empty-title">
          No {category === 'all' ? 'results' : `${categoryLabel} matches`} for “{query}”
        </p>
        <p className="header-search__empty-sub">
          Try searching for a court name, sports club, area, or sport (e.g. Badminton, Quezon City).
        </p>
      </div>
    )
  }

  return (
    <div className="header-search__groups-list">
      {groups.map((group) => {
        const GroupIcon =
          group.id === 'court'
            ? MapPin
            : group.id === 'club'
              ? UsersRound
              : group.id === 'queue'
                ? Gamepad2
                : group.id === 'player'
                  ? User
                  : CalendarDays
        return (
          <section className="search-result-group" key={group.id}>
            <div className="search-result-group__heading">
              <div className="search-result-group__heading-left">
                <GroupIcon size={13} />
                <span>{group.label}</span>
              </div>
              <span className="search-result-group__count">{group.results.length}</span>
            </div>
            <div className="search-result-group__items">
              {group.results.map((result) => (
                <SearchResultItem key={result.id} result={result} onSelect={onSelect} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default function PublicHeader() {
  const { venues, clubs, events, allClubs, allEvents } = usePlayer()
  const { queues } = useQueues()
  const { user, signOut } = useAuth()
  const [playerResults, setPlayerResults] = useState([])
  const [loginOpen, setLoginOpen] = useState(false)
  const [comingSoonLabel, setComingSoonLabel] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchCategory, setSearchCategory] = useState('all')
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [searchTermIndex, setSearchTermIndex] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const [deletingSearchTerm, setDeletingSearchTerm] = useState(false)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null)
  const searchInputRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const accountRef = useRef(null)
  const searchWrapRef = useRef(null)

  const handleSelectSearchResult = (result) => {
    if (result?.kind === 'player') {
      setViewingPlayer(
        result.playerData || {
          id: result.rawId,
          name: result.label,
          username: result.meta?.replace(/^@/, ''),
          avatarUrl: result.image,
        }
      )
      setSearchFocused(false)
      return
    }
    setSearchQuery('')
    setSearchFocused(false)
  }

  const avatarUrl = user?.photoURL || user?.avatarUrl
  const userPhoto = avatarUrl && failedAvatarUrl !== avatarUrl ? avatarUrl : null

  useEffect(() => {
    if (!accountOpen) return undefined
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [accountOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openSearch = () => {
    setSearchFocused(true)
    window.requestAnimationFrame(() => {
      const isMobile = window.matchMedia('(max-width: 850px)').matches
      ;(isMobile ? mobileSearchInputRef : searchInputRef).current?.focus()
    })
  }

  const closeSearch = () => {
    setSearchFocused(false)
    setSearchQuery('')
  }

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 12)
          ticking = false
        })
        ticking = true
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchFocused) return undefined
    const term = searchTerms[searchTermIndex]
    const isComplete = typedLength === term.length
    const isEmpty = typedLength === 0
    const delay = deletingSearchTerm ? 75 : isComplete ? 1800 : 130
    const timer = window.setTimeout(() => {
      if (!deletingSearchTerm && !isComplete) {
        setTypedLength((length) => length + 1)
      } else if (!deletingSearchTerm) {
        setDeletingSearchTerm(true)
      } else if (!isEmpty) {
        setTypedLength((length) => length - 1)
      } else {
        setDeletingSearchTerm(false)
        setSearchTermIndex((index) => (index + 1) % searchTerms.length)
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [deletingSearchTerm, searchFocused, searchTermIndex, typedLength])

  useEffect(() => {
    const term = searchQuery.trim()
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
  }, [searchQuery])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    const tokens = query.split(/\s+/).filter(Boolean)
    const matchesTokens = (text) => {
      const lower = String(text || '').toLowerCase()
      return tokens.every((token) => lower.includes(token))
    }

    const clubSource = allClubs?.length ? allClubs : clubs
    const eventSource = allEvents?.length ? allEvents : events

    return [
      ...venues
        .filter((venue) =>
          matchesTokens(`${venue.name} ${venue.area} ${(venue.sports || []).join(' ')}`)
        )
        .map((venue) => ({
          id: `court-${venue.id}`,
          rawId: venue.id,
          kind: 'court',
          label: venue.name,
          meta: venue.area,
          distance: venue.distance || (venue.distanceKm ? `${Number(venue.distanceKm).toFixed(1)} km` : null),
          sports: venue.sports,
          sport: venue.sports?.[0] || 'badminton',
          image: venue.image || venue.logoUrl,
          to: `/app/courts/${venue.id}`,
        })),
      ...clubSource
        .filter((club) =>
          matchesTokens(
            `${club.name} ${club.area} ${(club.sports || []).join(' ')} ${club.sport || ''}`
          )
        )
        .map((club) => ({
          id: `club-${club.id}`,
          rawId: club.id,
          kind: 'club',
          label: club.name,
          meta: club.area,
          members:
            club.membersCount ??
            (Array.isArray(club.members) ? club.members.length : club.members ?? 0),
          sports: club.sports || [club.sport],
          sport: club.sports?.[0] || club.sport || 'badminton',
          image: club.logoUrl || club.image || club.coverUrl,
          to: `/clubs/${club.id}`,
        })),
      ...queues
        .filter((queue) =>
          matchesTokens(`${queue.title} ${queue.venue} ${queue.sport} ${queue.level}`)
        )
        .map((queue) => ({
          id: `queue-${queue.id}`,
          rawId: queue.id,
          kind: 'queue',
          label: queue.title,
          meta: [queue.venue, queue.level].filter(Boolean).join(' · '),
          sports: [queue.sport],
          sport: queue.sport || 'badminton',
          to: '/queues',
        })),
      ...playerResults.map((player) => ({
        id: `player-${player.id}`,
        rawId: player.id,
        kind: 'player',
        label: player.name,
        meta: player.username ? `@${player.username}` : player.area,
        level: player.level ? `Lv ${player.level}` : null,
        sports: player.level ? [`Lv ${player.level}`] : [],
        image: player.avatarUrl || player.photoURL || player.image,
        to: '/app/profile',
      })),
      ...eventSource
        .filter((event) =>
          matchesTokens(`${event.title} ${event.organizer} ${event.venue} ${event.sport}`)
        )
        .map((event) => ({
          id: `event-${event.id}`,
          rawId: event.id,
          kind: 'event',
          label: event.title,
          meta: [event.venue, event.organizer].filter(Boolean).join(' · '),
          date: event.date || event.startsAt,
          sports: [event.sport],
          sport: event.sport || 'badminton',
          image: event.coverUrl || event.bannerUrl || event.image,
          to: '/events',
        })),
    ]
  }, [allClubs, allEvents, clubs, events, playerResults, queues, searchQuery, venues])

  const visibleSearchResults = useMemo(
    () => (searchCategory === 'all' ? searchResults : searchResults.filter((result) => result.kind === searchCategory)).slice(0, 20),
    [searchCategory, searchResults],
  )

  const searchResultGroups = useMemo(() => {
    const categories = searchCategory === 'all' ? searchCategories.slice(1) : searchCategories.filter((category) => category.id === searchCategory)
    return categories.map((category) => ({
      ...category,
      results: searchResults.filter((result) => result.kind === category.id).slice(0, 20),
    })).filter((category) => category.results.length)
  }, [searchCategory, searchResults])

  return (
    <>
      <header className={`public-header ${scrolled ? 'is-scrolled' : ''}`}>
        <NewsTicker />

        <div className="header-main">
          <div className="container header-inner">
            {/* Signed out, this is the entry point to auth rather than a dead
                link into /app, which the route guard would bounce straight back. */}
            {user ? (
              <Link to="/app" className="button button--primary header-cta">
                <Zap size={16} /> Start playing
              </Link>
            ) : (
              <button type="button" className="button button--primary header-cta" onClick={() => setLoginOpen(true)}>
                <Zap size={16} /> Start playing
              </button>
            )}

            <Brand playerLogo />

            <div className="header-actions">
              <div className="header-search-wrap" ref={searchWrapRef}>
                <div className={`header-search is-open ${searchFocused ? 'is-active' : ''}`} role="search">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(event) => { setSearchQuery(event.target.value); setSearchCategory('all') }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setSearchFocused(false)
                        event.currentTarget.blur()
                      }
                    }}
                    placeholder=""
                    aria-label="Search courts, clubs, queues, or open play"
                  />
                  {!searchQuery && <span className="header-search__prompt" aria-hidden="true">Search <b>{searchTerms[searchTermIndex].slice(0, typedLength)}</b>{typedLength === searchTerms[searchTermIndex].length && '...'}<i /></span>}
                  {searchQuery && <button
                    type="button"
                    className="header-search__clear"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                  ><X size={15} /></button>}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Focus search"
                    onClick={openSearch}
                  >
                    <Search size={18} />
                  </button>
                </div>
                {searchFocused && searchQuery.trim() && (
                  <div className="header-search__results" role="listbox" aria-label="Search results">
                    <div className="header-search__filters">
                      {searchCategories.map((category) => {
                        const count =
                          category.id === 'all'
                            ? searchResults.length
                            : searchResults.filter((r) => r.kind === category.id).length
                        return (
                          <button
                            type="button"
                            key={category.id}
                            className={searchCategory === category.id ? 'is-selected' : ''}
                            onClick={() => setSearchCategory(category.id)}
                          >
                            <span>{category.label}</span>
                            {count > 0 && <span className="header-search__filter-count">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="search-result-content">
                      <SearchResultList
                        groups={searchResultGroups}
                        hasResults={visibleSearchResults.length > 0}
                        query={searchQuery}
                        category={searchCategory}
                        onSelect={handleSelectSearchResult}
                      />
                    </div>
                    {visibleSearchResults.length > 0 && (
                      <div className="header-search__footer">
                        <span>
                          {visibleSearchResults.length} {visibleSearchResults.length === 1 ? 'match' : 'matches'} found
                        </span>
                        <span className="header-search__footer-hint">Press Esc to close</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {user ? (
                <div
                  className="header-account"
                  ref={accountRef}
                  onMouseEnter={() => setAccountOpen(true)}
                  onMouseLeave={() => setAccountOpen(false)}
                >
                  <button
                    type="button"
                    className="header-account__trigger"
                    onClick={() => setAccountOpen((value) => !value)}
                    aria-expanded={accountOpen}
                  >
                    <span className="header-account__avatar">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt=""
                          className="header-account__avatar-img"
                          onError={() => setFailedAvatarUrl(userPhoto)}
                        />
                      ) : (
                        <span>{user.initials || user.firstName?.[0] || 'A'}</span>
                      )}
                    </span>
                    <span className="header-account__label">Account</span>
                    {accountOpen ? <ChevronUp size={15} className="header-account__chevron" /> : <ChevronDown size={15} className="header-account__chevron" />}
                  </button>

                  {accountOpen && (
                    <div className="header-account__menu">
                      <div className="header-account__user-header">
                        <div className="header-account__user-avatar">
                          {userPhoto ? (
                            <img
                              src={userPhoto}
                              alt={user.name}
                              onError={() => setFailedAvatarUrl(userPhoto)}
                            />
                          ) : (
                            <span>{user.initials || user.firstName?.[0] || 'A'}</span>
                          )}
                        </div>
                        <div className="header-account__user-info">
                          <strong className="header-account__user-name">{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player Account'}</strong>
                          <span className="header-account__user-email">{user.email || 'player@versuscourts.com'}</span>
                        </div>
                      </div>

                      <div className="header-account__menu-list">
                        <Link to="/app" className="header-account__menu-item header-account__menu-item--primary" onClick={() => setAccountOpen(false)}>
                          <LayoutDashboard size={17} />
                          <span>Go To Dashboard</span>
                        </Link>
                        <Link to="/app/profile" className="header-account__menu-item" onClick={() => setAccountOpen(false)}>
                          <User size={17} />
                          <span>Profile &amp; Settings</span>
                        </Link>
                        <a href="#help" className="header-account__menu-item" onClick={(e) => { e.preventDefault(); setAccountOpen(false); }}>
                          <HelpCircle size={17} />
                          <span>Help Support</span>
                        </a>
                        <div className="header-account__divider" />
                        <button type="button" className="header-account__menu-item header-account__menu-item--logout" onClick={() => { signOut(); setAccountOpen(false); }}>
                          <LogOut size={17} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : <button className="button header-enquiry" onClick={() => setLoginOpen(true)}>
                <span className="header-enquiry__long">Log in / Register</span>
                <span className="header-enquiry__short">Log in</span>
              </button>}
            </div>
          </div>
        </div>

        {searchFocused && (
          <section className="mobile-search-panel" aria-label="Search">
            <div className="mobile-search-dialog__bar">
              <button type="button" className="mobile-search-dialog__back" onClick={closeSearch} aria-label="Close search"><ArrowLeft size={21} /></button>
              <div className="mobile-search-dialog__input">
                <Search size={18} />
                <input
                  ref={mobileSearchInputRef}
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setSearchCategory('all') }}
                  placeholder="Search courts, clubs, players..."
                  aria-label="Search courts, clubs, queues, or open play"
                />
                {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={16} /></button>}
              </div>
            </div>
            {searchQuery.trim() ? (
              <div className="mobile-search-results" role="listbox" aria-label="Search results">
                <div className="header-search__filters">
                  {searchCategories.map((category) => {
                    const count =
                      category.id === 'all'
                        ? searchResults.length
                        : searchResults.filter((r) => r.kind === category.id).length
                    return (
                      <button
                        type="button"
                        key={category.id}
                        className={searchCategory === category.id ? 'is-selected' : ''}
                        onClick={() => setSearchCategory(category.id)}
                      >
                        <span>{category.label}</span>
                        {count > 0 && <span className="header-search__filter-count">{count}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="search-result-content">
                  <SearchResultList
                    groups={searchResultGroups}
                    hasResults={visibleSearchResults.length > 0}
                    query={searchQuery}
                    category={searchCategory}
                    onSelect={handleSelectSearchResult}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mobile-search-panel__section">
                  <h2>Trending Searches</h2>
                  <div className="mobile-search-panel__trends">
                    {trendingSearches.map((term) => (
                      <button type="button" key={term} onClick={() => setSearchQuery(term)}>
                        <TrendingUp size={16} /><span>{term}</span><i>↗</i>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mobile-search-panel__section">
                  <h2>Browse</h2>
                  <div className="mobile-search-panel__browse">
                    <Link to="/venues" className="is-courts"><MapPin size={24} /><span>Courts</span></Link>
                    <Link to="/clubs" className="is-clubs"><UsersRound size={24} /><span>Clubs</span></Link>
                    <Link to="/queues" className="is-players"><UsersRound size={24} /><span>Players</span></Link>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <nav className="header-highlights" aria-label="Versus Courts primary navigation">
          <div className="container header-highlights__inner">
            {highlights.map(({ to, label, icon: Icon, badge }) => (
              badge ? (
                <button
                  type="button"
                  className="header-highlight-item"
                  key={to}
                  onClick={() => setComingSoonLabel(label)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  <span className="header-highlight-badge">{badge}</span>
                </button>
              ) : (
                <NavLink to={to} key={to}>
                  <Icon size={15} />
                  <span>{label}</span>
                </NavLink>
              )
            ))}
            {/* <NavLink to="/how-it-works"><HelpCircle size={15} />How It Works</NavLink> */}
          </div>
        </nav>
      </header>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ComingSoonDialog open={!!comingSoonLabel} label={comingSoonLabel} onClose={() => setComingSoonLabel(null)} />
      <UserProfileDialog
        user={viewingPlayer}
        open={Boolean(viewingPlayer)}
        onClose={() => setViewingPlayer(null)}
      />
    </>
  )
}
