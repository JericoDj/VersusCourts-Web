import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_LOCATION,
  fetchClubs,
  fetchCourts,
  fetchEvents,
  fetchFavoriteCourts,
  fetchMyClubs,
  groupBusinesses,
  setCourtFavorite,
} from '../controllers/discoveryController'
import { authToken } from '../data/apiClient'
import { useAuth } from './AuthContext'

/// Holds the live discovery feed — courts, clubs and events straight from the
/// backend — plus the location/radius/sport state that filters it. The web
/// counterpart of VersusCourts-Player's `DiscoveryProvider`; queues stay in
/// `QueueContext`, which already owned that fetch.
const DiscoveryContext = createContext(null)

const EMPTY = { courts: [], clubs: [], myClubs: [], events: [], favoriteCourts: [] }

export function DiscoveryProvider({ children }) {
  const { user } = useAuth()
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [radiusKm, setRadiusKmState] = useState(100)
  const [data, setData] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState(
    () => (typeof navigator?.geolocation === 'undefined' ? 'unsupported' : 'idle'),
  )
  /// Widest radius actually fetched. Narrowing filters the cache client-side
  /// instead of refetching, matching the Flutter provider's `_loadedRadiusKm`.
  const loadedRadiusKm = useRef(100)

  const refresh = useCallback(async ({ signal, radius } = {}) => {
    const requested = radius ?? loadedRadiusKm.current
    setIsLoading(true)
    setError('')
    const signedIn = Boolean(authToken())
    /// Every section loads independently — one failing endpoint must not
    /// blank the whole feed, same as the Flutter provider's per-fetch catch.
    const results = await Promise.allSettled([
      fetchCourts({ lat: location.lat, lng: location.lng, radiusKm: requested, signal }),
      fetchClubs({ lat: location.lat, lng: location.lng, signal }),
      fetchEvents({ signal }),
      signedIn ? fetchMyClubs({ lat: location.lat, lng: location.lng, signal }) : Promise.resolve([]),
      signedIn ? fetchFavoriteCourts({ signal }) : Promise.resolve([]),
    ])
    if (signal?.aborted) return
    const [courts, clubs, events, myClubs, favoriteCourts] = results.map(
      (result) => (result.status === 'fulfilled' ? result.value : []),
    )
    loadedRadiusKm.current = requested
    setData({ courts, clubs, events, myClubs, favoriteCourts })
    if (results.slice(0, 3).every((result) => result.status === 'rejected')) {
      setError('Discovery is unavailable right now. Pull to refresh in a moment.')
    }
    setIsLoading(false)
    setHasLoadedOnce(true)
  }, [location.lat, location.lng])

  /// Deferred a tick so the first `setIsLoading` lands outside the effect
  /// body, the same way QueueContext kicks off its initial fetch.
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => refresh({ signal: controller.signal }), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [refresh, user?.id])

  /// Only widening the radius costs a request; narrowing filters `courts`.
  const setRadiusKm = useCallback((next) => {
    setRadiusKmState(next)
    if (next > loadedRadiusKm.current) refresh({ radius: next })
  }, [refresh])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationStatus('granted')
        setLocation({ lat: coords.latitude, lng: coords.longitude, label: 'Your location' })
      },
      (positionError) => {
        setLocationStatus(positionError.code === positionError.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    )
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation()
        }
      }).catch(() => {})
    }
  }, [requestLocation])

  const favoriteCourtIds = useMemo(
    () => new Set(data.favoriteCourts.map((court) => court.id)),
    [data.favoriteCourts],
  )

  /// Optimistic so the heart responds instantly; a failed write rolls back.
  const toggleFavoriteCourt = useCallback(async (courtId) => {
    if (!authToken()) return false
    const wasFavorite = favoriteCourtIds.has(courtId)
    const court = data.courts.find((item) => item.id === courtId)
    setData((current) => ({
      ...current,
      favoriteCourts: wasFavorite
        ? current.favoriteCourts.filter((item) => item.id !== courtId)
        : [...current.favoriteCourts, court || { id: courtId }],
    }))
    try {
      await setCourtFavorite(courtId, !wasFavorite)
      return !wasFavorite
    } catch {
      setData((current) => ({
        ...current,
        favoriteCourts: wasFavorite
          ? [...current.favoriteCourts, court || { id: courtId }]
          : current.favoriteCourts.filter((item) => item.id !== courtId),
      }))
      return wasFavorite
    }
  }, [data.courts, favoriteCourtIds])

  /// Radius 100 is the "no limit" sentinel — courts with an unknown distance
  /// stay visible there, but a narrowed radius drops them.
  const courtsInRadius = useMemo(
    () => (radiusKm >= 100
      ? data.courts
      : data.courts.filter((court) => court.distanceKm !== null && court.distanceKm <= radiusKm)),
    [data.courts, radiusKm],
  )

  /// Businesses with a favorited court float to the top, each group keeping
  /// its distance order — the partition trick from `DiscoveryProvider`.
  const businesses = useMemo(() => {
    const grouped = groupBusinesses(courtsInRadius)
    const favored = grouped.filter((business) => business.courts.some((court) => favoriteCourtIds.has(court.id)))
    const rest = grouped.filter((business) => !business.courts.some((court) => favoriteCourtIds.has(court.id)))
    return [...favored, ...rest]
  }, [courtsInRadius, favoriteCourtIds])

  const value = useMemo(() => ({
    ...data,
    courts: courtsInRadius,
    businesses,
    favoriteCourtIds,
    isFavoriteCourt: (id) => favoriteCourtIds.has(id),
    toggleFavoriteCourt,
    location,
    setLocation,
    locationStatus,
    requestLocation,
    radiusKm,
    setRadiusKm,
    isLoading,
    hasLoadedOnce,
    error,
    refresh,
  }), [
    businesses, courtsInRadius, data, error, favoriteCourtIds, hasLoadedOnce, isLoading,
    location, locationStatus, radiusKm, refresh, requestLocation, setRadiusKm, toggleFavoriteCourt,
  ])

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw new Error('useDiscovery must be used inside DiscoveryProvider')
  return context
}
