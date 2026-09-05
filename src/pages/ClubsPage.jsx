import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Lock, MapPin, Plus, QrCode, Search, Star, Users } from 'lucide-react'
import { SportPill } from '../components/Cards'
import { SportGlyph } from '../components/SportIcon'
import { SPORTS } from '../data/sports'
import { useAuth } from '../context/AuthContext'
import { useDiscovery } from '../context/DiscoveryContext'
import { usePlayer } from '../context/PlayerContext'
import { apiRequest } from '../data/apiClient'
import { normalizeClub } from '../controllers/discoveryController'
import CreateClubModal from '../components/CreateClubModal'
import FindClubByCodeModal from '../components/FindClubByCodeModal'
import ClubDetailDialog from '../components/ClubDetailDialog'
import LoginDialog from '../components/LoginDialog'
import '../styles/clubs.css'

const DISTANCE_OPTIONS = [3, 5, 10, 25]
const SPORT_CHIPS = SPORTS

function ClubLogo({ club, size = 'lg' }) {
  const logo = club.logoUrl || club.logo || club.avatarUrl || club.image
  const style = { '--sport-color': `var(--vc-sport-${club.sport}, var(--vc-primary))` }
  if (logo) style.backgroundImage = `url(${logo})`
  return (
    <span className={`club-logo club-logo--${size}${!logo ? ' is-fallback' : ''}`} style={style} aria-hidden="true">
      {!logo && <SportGlyph sport={club.sport} size={size === 'lg' ? 24 : 22} />}
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
  const { clubId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allClubs: clubs, myClubs: contextMyClubs, setNotice } = usePlayer()
  const discovery = useDiscovery()

  const [query, setQuery] = useState('')
  const [sportFilter, setSportFilter] = useState('all')
  const [maxKm, setMaxKm] = useState(null)

  // Modals
  const [createClubOpen, setCreateClubOpen] = useState(false)
  const [findByCodeOpen, setFindByCodeOpen] = useState(false)
  const [activeDetailClub, setActiveDetailClub] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)

  // Sync clubId from URL route parameter
  useEffect(() => {
    let ignore = false

    Promise.resolve().then(async () => {
      if (!clubId) {
        if (!ignore) setActiveDetailClub(null)
        return
      }

      const all = [...(contextMyClubs || []), ...(clubs || [])]
      const match = all.find((c) => String(c.id) === String(clubId))
      if (match) {
        if (!ignore) setActiveDetailClub(match)
      } else {
        try {
          const res = await apiRequest(`/clubs/${clubId}`)
          if (!ignore && res) {
            const raw = res?.data || res
            setActiveDetailClub(normalizeClub(raw))
          }
        } catch {
          // Handled silently
        }
      }
    })

    return () => {
      ignore = true
    }
  }, [clubId, clubs, contextMyClubs])

  const { myClubs, discoverClubs } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (club) =>
      !q ||
      [club.name, club.area, ...(club.sports ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q)

    const myIds = new Set((contextMyClubs || []).map((c) => String(c.id)))

    const myFiltered = (contextMyClubs || []).filter((c) => matches(c))

    const discoverFiltered = (clubs || []).filter(
      (c) =>
        !myIds.has(String(c.id)) &&
        !c.joined &&
        matches(c) &&
        (sportFilter === 'all' || (c.sports ?? []).includes(sportFilter)) &&
        (maxKm === null || (c.distanceKm ?? 0) <= maxKm)
    )

    return {
      myClubs: myFiltered,
      discoverClubs: discoverFiltered,
    }
  }, [clubs, contextMyClubs, query, sportFilter, maxKm])

  const openClub = (club) => {
    setActiveDetailClub(club)
    navigate(`/app/clubs/${club.id}`)
  }

  const closeClub = () => {
    setActiveDetailClub(null)
    navigate('/app/clubs')
  }

  const handleJoinClub = async (e, club) => {
    e.stopPropagation()
    if (!user) {
      setLoginOpen(true)
      return
    }

    const isPrivate = club.isPrivate || club.visibility === 'PRIVATE'
    try {
      await apiRequest(`/clubs/${club.id}${isPrivate ? '/request' : '/join'}`, {
        method: 'POST',
      })
      discovery.refresh()
      setNotice(
        isPrivate
          ? `Join request sent to ${club.name}.`
          : `You joined ${club.name}! Welcome aboard.`
      )
    } catch (err) {
      setNotice(err?.message || `Unable to join ${club.name} right now.`)
    }
  }

  return (
    <div className="clubs-page">
      {/* Search Input */}
      <div className="clubs-search">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs…"
          aria-label="Search clubs"
        />
      </div>

      {/* Action Buttons: Create Club & Find by Code */}
      <div className="clubs-actions">
        <button
          type="button"
          className="clubs-action clubs-action--primary"
          onClick={() => {
            if (!user) {
              setLoginOpen(true)
              return
            }
            setCreateClubOpen(true)
          }}
        >
          <Plus size={20} /> Create Club
        </button>
        <button
          type="button"
          className="clubs-action clubs-action--outline"
          onClick={() => setFindByCodeOpen(true)}
        >
          <QrCode size={20} /> Find by Code
        </button>
      </div>

      {/* My Clubs Section */}
      {myClubs.length > 0 && (
        <>
          <div className="clubs-section-head">
            <h2>My clubs</h2>
          </div>
          <div className="clubs-rail">
            {myClubs.map((club) => (
              <article
                className="my-club-card"
                key={club.id}
                onClick={() => openClub(club)}
                style={{ cursor: 'pointer' }}
              >
                <div className="my-club-card__top">
                  <ClubLogo club={club} />
                  <span className="my-club-card__badges">
                    {club.isPrivate && (
                      <span className="club-badge club-badge--private">Private</span>
                    )}
                    <span className="club-badge club-badge--joined">
                      {club.myRole === 'CAPTAIN' ? 'Captain' : 'Joined'}
                    </span>
                  </span>
                </div>
                <h3>{club.name}</h3>
                <div className="my-club-card__meta">
                  <span>
                    <Users size={14} /> {club.members} members
                  </span>
                  <span>
                    <Star
                      size={14}
                      fill={club.rating > 0 ? '#eab308' : 'none'}
                      color="#eab308"
                    />{' '}
                    {club.rating > 0 ? Number(club.rating).toFixed(1) : 'New'}
                  </span>
                  {club.distanceKm !== null && (
                    <span>
                      <MapPin size={14} /> {Number(club.distanceKm).toFixed(1)}km
                    </span>
                  )}
                </div>
                <SportTags sports={club.sports} />
              </article>
            ))}
          </div>
        </>
      )}

      {/* Discover Section */}
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
            {DISTANCE_OPTIONS.map((d) => (
              <option value={String(d)} key={d}>
                Within {d}km
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sport Filter Pills */}
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
            className={`clubs-chip clubs-chip--${sport.id} ${
              sportFilter === sport.id ? 'is-active' : ''
            }`}
            onClick={() => setSportFilter(sportFilter === sport.id ? 'all' : sport.id)}
          >
            <SportGlyph sport={sport.id} size={16} /> {sport.label}
          </button>
        ))}
      </div>

      {/* Discover Clubs List */}
      {discoverClubs.length === 0 ? (
        <p className="clubs-empty">No other clubs yet — create the first one!</p>
      ) : (
        <div className="clubs-list">
          {discoverClubs.map((club) => (
            <article
              className="club-tile"
              key={club.id}
              onClick={() => openClub(club)}
              style={{ cursor: 'pointer' }}
            >
              <ClubLogo club={club} size="sm" />
              <div className="club-tile__body">
                <div className="club-tile__name">
                  <h3>{club.name}</h3>
                  {club.isPrivate && (
                    <span className="club-tile__lock">
                      <Lock size={11} />
                    </span>
                  )}
                </div>
                <div className="club-tile__meta">
                  <span>
                    <Users size={13} /> {club.members}
                  </span>
                  {club.distanceKm !== null && (
                    <>
                      <span className="club-tile__dot" />
                      <span>
                        <MapPin size={13} /> {Number(club.distanceKm).toFixed(1)}km
                      </span>
                    </>
                  )}
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

              {club.isPrivate || myIds.has(String(club.id)) || club.joined || club.myRole ? (
                <button
                  type="button"
                  className="club-tile__chevron"
                  onClick={(e) => {
                    e.stopPropagation()
                    openClub(club)
                  }}
                  aria-label={`Open ${club.name}`}
                >
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className="club-tile__join"
                  onClick={(e) => handleJoinClub(e, club)}
                >
                  <Plus size={15} /> Join
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <CreateClubModal
        open={createClubOpen}
        onClose={() => setCreateClubOpen(false)}
        onCreated={(newClub) => {
          discovery.refresh()
          setNotice('Club created — you are its captain!')
          if (newClub) openClub(newClub)
        }}
      />

      {/* Find by Code Modal */}
      <FindClubByCodeModal
        open={findByCodeOpen}
        onClose={() => setFindByCodeOpen(false)}
        onViewClub={(club) => openClub(club)}
        onJoined={() => {
          discovery.refresh()
        }}
      />

      {/* Club Detail Modal / Dialog */}
      {activeDetailClub && (
        <ClubDetailDialog
          club={activeDetailClub}
          onClose={closeClub}
          onClubUpdated={() => {
            discovery.refresh()
          }}
        />
      )}

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
