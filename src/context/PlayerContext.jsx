import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useDiscovery } from './DiscoveryContext'

const players = []

/// Player-facing view state — the selected sport, search text, saved courts
/// and transient notices. The underlying courts/clubs/events come from
/// `DiscoveryContext` (live backend data); this layer only filters and
/// presents them, so every page keeps the same `usePlayer()` surface.
const PlayerContext = createContext(null)

const readSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

/// "all" is the unfiltered default, matching the Flutter provider's null sport.
const matchesSport = (selected, sports = []) => selected === 'all' || sports.includes(selected)

export function PlayerProvider({ children }) {
  const discovery = useDiscovery()
  const [sport, setSport] = useState('all')
  const [search, setSearch] = useState('')
  const [joinedQueues, setJoinedQueues] = useState(() => readSaved('vc-queues', []))
  const [notice, setNotice] = useState('')

  useEffect(() => localStorage.setItem('vc-queues', JSON.stringify(joinedQueues)), [joinedQueues])
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  /// A "venue" in the web UI is one court operator, not one court — the same
  /// grouping the mobile home feed shows. Cards read `name/area/price/...`,
  /// so map the business shape onto those keys once, here.
  const venues = useMemo(() => discovery.businesses.map((business) => ({
    id: business.id,
    name: business.name,
    area: business.area,
    distance: business.distance,
    distanceKm: business.distanceKm,
    rating: business.rating,
    reviews: business.reviews,
    price: business.minPrice,
    open: business.isOpen,
    sports: business.sports,
    image: business.coverUrl,
    logoUrl: business.logoUrl,
    latitude: business.latitude,
    longitude: business.longitude,
    courts: business.courts,
    description: business.courts.find((court) => court.description)?.description || '',
    amenities: [...new Set(business.courts.flatMap((court) => court.amenities))],
    openHours: business.courts[0]?.openHours || '6:00 AM – 11:00 PM',
  })), [discovery.businesses])

  const clubs = useMemo(
    () => discovery.clubs.filter((club) => matchesSport(sport, club.sports)),
    [discovery.clubs, sport],
  )
  const events = useMemo(
    () => discovery.events.filter((event) => sport === 'all' || event.sport === sport),
    [discovery.events, sport],
  )

  const filteredVenues = useMemo(() => {
    const query = search.trim().toLowerCase()
    return venues.filter((venue) => matchesSport(sport, venue.sports)
      && `${venue.name} ${venue.area} ${venue.sports.join(' ')}`.toLowerCase().includes(query))
  }, [search, sport, venues])

  /// Saved courts live on the backend for signed-in players; the local list
  /// is only a mirror so the heart still reads correctly before the fetch
  /// lands and for signed-out browsing.
  const favorites = useMemo(() => [...discovery.favoriteCourtIds], [discovery.favoriteCourtIds])

  const toggleFavorite = async (id) => {
    const saved = discovery.favoriteCourtIds.has(id)
    setNotice(saved ? 'Removed from saved courts' : 'Court saved to your favorites')
    await discovery.toggleFavoriteCourt(id)
  }

  const toggleQueue = (id) => setJoinedQueues((current) => {
    const hasJoined = current.includes(id)
    setNotice(hasJoined ? 'You left the queue' : 'You’re in! We’ll remind you before game time.')
    return hasJoined ? current.filter((item) => item !== id) : [...current, id]
  })

  const value = {
    sport, setSport, search, setSearch,
    favorites, joinedQueues, toggleFavorite, toggleQueue,
    filteredVenues, venues, clubs, events, players,
    // Unfiltered feeds, for pages that own a sport filter of their own and
    // would otherwise filter twice against the global chip.
    allClubs: discovery.clubs,
    allEvents: discovery.events,
    myClubs: discovery.myClubs,
    notice, setNotice,
    isLoading: discovery.isLoading,
    hasLoadedOnce: discovery.hasLoadedOnce,
    error: discovery.error,
    refresh: discovery.refresh,
    radiusKm: discovery.radiusKm,
    setRadiusKm: discovery.setRadiusKm,
    userLocation: discovery.locationStatus === 'granted'
      ? { latitude: discovery.location.lat, longitude: discovery.location.lng }
      : null,
    locationStatus: discovery.locationStatus,
    requestLocation: discovery.requestLocation,
  }
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider')
  return context
}
