import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp, Gamepad2, HelpCircle, LayoutDashboard, LogOut, MapPin, Search, Star, TrendingUp, User, UsersRound, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Brand from './Brand'
import LoginDialog from './LoginDialog'
import NewsTicker from './NewsTicker'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

/// Primary destinations, surfaced directly in the bar rather than hidden
/// behind a menu.
const highlights = [
  { to: '/venues', label: 'Find Courts', icon: MapPin },
  { to: '/queues', label: 'Join Queues / Open Play', icon: Gamepad2 },
  { to: '/clubs', label: 'Explore Sports Clubs', icon: UsersRound },
  { to: '/events', label: 'Sports Events', icon: CalendarDays },
]

const searchTerms = ['courts', 'clubs', 'queues', 'open play']
const trendingSearches = ['Elite Sports Center', 'Summer Slam 3v3', 'Metro Ballers', 'Smash Arena Badminton', 'Open Badminton Cup']
const searchCategories = [
  { id: 'all', label: 'All' }, { id: 'court', label: 'Courts' }, { id: 'club', label: 'Clubs' },
  { id: 'player', label: 'Players' }, { id: 'event', label: 'Events' },
]

function SearchResultList({ mobile = false, groups, hasResults, query, category, onSelect }) {
  if (!hasResults) {
    const categoryLabel = searchCategories.find((item) => item.id === category)?.label.toLowerCase()
    return <p className="header-search__empty">No {category === 'all' ? 'matches' : `${categoryLabel} matches`} for “{query}”</p>
  }
  return groups.map((group) => (
    <section className="search-result-group" key={group.id}>
      <div className="search-result-group__heading"><b>{group.label}</b><span>{group.results.length}</span></div>
      {group.results.map((result) => {
        const ResultIcon = result.kind === 'court' ? MapPin : result.kind === 'club' || result.kind === 'player' ? UsersRound : result.kind === 'event' ? CalendarDays : Gamepad2
        const dateParts = result.date?.split(' ') ?? []
        if (result.kind === 'event') {
          return (
            <Link key={result.id} to={result.to} className="header-search__event-card" onClick={onSelect}>
              <div className="header-search__event-banner"><img src={result.image} alt="" /><span>Upcoming</span></div>
              <div className="header-search__event-body"><b className="header-search__event-title">{result.label}</b><p className="header-search__event-meta">{result.meta}</p></div>
              {dateParts.length >= 2 && <div className="header-search__event-date"><span className="month">{dateParts[0]}</span><span className="day">{dateParts[1]}</span></div>}
            </Link>
          )
        }
        return (
          <Link key={result.id} to={result.to} className={`header-search__result-item ${mobile ? 'is-mobile' : ''}`} onClick={onSelect}>
            <div className="header-search__result-icon">{result.image ? <img src={result.image} alt="" /> : <ResultIcon size={16} />}</div>
            <div className="header-search__result-details"><b className="header-search__result-title">{result.label}</b><p className="header-search__result-meta">{result.meta}</p></div>
            {result.distance && <span className="header-search__result-badge">{result.distance}</span>}
          </Link>
        )
      })}
    </section>
  ))
}

export default function PublicHeader() {
  const { venues, clubs, events, players, queues } = usePlayer()
  const { user, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchCategory, setSearchCategory] = useState('all')
  const [searchTermIndex, setSearchTermIndex] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const [deletingSearchTerm, setDeletingSearchTerm] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const searchInputRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const accountRef = useRef(null)

  const userPhoto = (!avatarError && (user?.photoURL || user?.avatarUrl)) ? (user.photoURL || user.avatarUrl) : null

  useEffect(() => {
    setAvatarError(false)
  }, [user?.photoURL, user?.avatarUrl])

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
    const onScroll = () => setScrolled(window.scrollY > 12)
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

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    const includesQuery = (value) => value.toLowerCase().includes(query)
    return [
      ...venues
        .filter((venue) => includesQuery(`${venue.name} ${venue.area} ${venue.sports.join(' ')}`))
        .map((venue) => ({ id: `court-${venue.id}`, kind: 'court', label: venue.name, meta: venue.area, distance: venue.distance, sports: venue.sports, image: venue.image, to: `/app/courts/${venue.id}` })),
      ...clubs
        .filter((club) => includesQuery(`${club.name} ${club.area} ${club.sport}`))
        .map((club) => ({ id: `club-${club.id}`, kind: 'club', label: club.name, meta: club.area, members: club.members, sports: [club.sport], image: club.image, to: '/clubs' })),
      ...queues
        .filter((queue) => includesQuery(`${queue.title} ${queue.venue} ${queue.sport} ${queue.level}`))
        .map((queue) => ({ id: `queue-${queue.id}`, kind: 'queue', label: queue.title, meta: queue.venue, sports: [queue.sport], to: '/queues' })),
      ...players
        .filter((player) => includesQuery(`${player.name} ${player.username} ${player.area}`))
        .map((player) => ({ id: `player-${player.id}`, kind: 'player', label: player.name, meta: `@${player.username}`, sports: [`Lv ${player.level}`], image: player.image, to: '/app/profile' })),
      ...events
        .filter((event) => includesQuery(`${event.title} ${event.organizer} ${event.venue} ${event.sport}`))
        .map((event) => ({ id: `event-${event.id}`, kind: 'event', label: event.title, meta: event.venue, date: event.date, sports: [event.sport], image: event.image, to: '/events' })),
    ]
  }, [clubs, events, players, queues, searchQuery, venues])

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
            <Link to="/app" className="button button--primary header-cta">
              <Zap size={16} /> Start playing
            </Link>

            <Brand playerLogo />

            <div className="header-actions">
              <div className="header-search-wrap">
                <div className={`header-search is-open ${searchFocused ? 'is-active' : ''}`} role="search">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => {
                      if (!window.matchMedia('(max-width: 850px)').matches) setSearchFocused(false)
                    }}
                    onChange={(event) => { setSearchQuery(event.target.value); setSearchCategory('all') }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') event.currentTarget.blur()
                    }}
                    placeholder=""
                    aria-label="Search courts, clubs, queues, or open play"
                  />
                  {!searchQuery && <span className="header-search__prompt" aria-hidden="true">Search <b>{searchTerms[searchTermIndex].slice(0, typedLength)}</b>{typedLength === searchTerms[searchTermIndex].length && '...'}<i /></span>}
                  {searchQuery && <button
                    type="button"
                    className="header-search__clear"
                    aria-label="Clear search"
                    onMouseDown={(event) => event.preventDefault()}
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
                {searchQuery.trim() && (
                  <div className="header-search__results" role="listbox" aria-label="Matching courts">
                    <div className="header-search__filters">{searchCategories.map((category) => <button type="button" key={category.id} className={searchCategory === category.id ? 'is-selected' : ''} onClick={() => setSearchCategory(category.id)}>{category.label}</button>)}</div>
                    <div className={`search-result-groups ${searchResultGroups.length === 1 ? 'is-single' : ''}`}>
                      {visibleSearchResults.length ? <>
                        <div className="search-result-column"><SearchResultList groups={searchResultGroups.filter((_, index) => index % 2 === 0)} hasResults query={searchQuery} category={searchCategory} onSelect={() => setSearchQuery('')} /></div>
                        <div className="search-result-column"><SearchResultList groups={searchResultGroups.filter((_, index) => index % 2 === 1)} hasResults query={searchQuery} category={searchCategory} onSelect={() => setSearchQuery('')} /></div>
                      </> : <SearchResultList groups={[]} hasResults={false} query={searchQuery} category={searchCategory} onSelect={() => setSearchQuery('')} />}
                    </div>
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
                          onError={() => setAvatarError(true)}
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
                              onError={() => setAvatarError(true)}
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
              <div className="mobile-search-results" role="listbox" aria-label="Matching courts">
                <div className="header-search__filters">{searchCategories.map((category) => <button type="button" key={category.id} className={searchCategory === category.id ? 'is-selected' : ''} onClick={() => setSearchCategory(category.id)}>{category.label}</button>)}</div>
                <div className="search-result-groups"><SearchResultList mobile groups={searchResultGroups} hasResults={visibleSearchResults.length > 0} query={searchQuery} category={searchCategory} onSelect={closeSearch} /></div>
              </div>
            ) : <>
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
            </>}
          </section>
        )}

        <nav className="header-highlights" aria-label="Versus Courts primary navigation">
          <div className="container header-highlights__inner">
            {highlights.map(({ to, label, icon: Icon }) => (
              <NavLink to={to} key={to}><Icon size={15} />{label}</NavLink>
            ))}
            <NavLink to="/how-it-works"><HelpCircle size={15} />How It Works</NavLink>
          </div>
        </nav>
      </header>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
