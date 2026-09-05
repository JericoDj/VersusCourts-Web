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
import { reverseGeocodeLatLng } from '../data/googleMapsLoader'
import { useAuth } from './AuthContext'

/// Holds the live discovery feed — courts, clubs and events straight from the
/// backend — plus the location/radius/sport state that filters it. The web
/// counterpart of VersusCourts-Player's `DiscoveryProvider`; queues stay in
/// `QueueContext`, which already owned that fetch.
const DiscoveryContext = createContext(null)

const EMPTY = { courts: [], clubs: [], myClubs: [], events: [], favoriteCourts: [] }

function readStoredLocation() {
  try {
    const raw = localStorage.getItem('vc_user_location')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.lat && parsed?.lng) return parsed
    }
  } catch {}
  return null
}

export function DiscoveryProvider({ children }) {
  const { user } = useAuth()
  const [location, setLocationState] = useState(() => readStoredLocation() || DEFAULT_LOCATION)
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

  const setLocation = useCallback((next) => {
    setLocationState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try {
        if (resolved?.lat && resolved?.lng) {
          localStorage.setItem('vc_user_location', JSON.stringify(resolved))
        }
      } catch {}
      return resolved
    })
  }, [])

  const clearStoredLocation = useCallback(() => {
    try {
      localStorage.removeItem('vc_user_location')
    } catch {}
    setLocationState(DEFAULT_LOCATION)
  }, [])

  // Clear stored location when user logs out
  const prevUserRef = useRef(user)
  useEffect(() => {
    if (prevUserRef.current && !user) {
      clearStoredLocation()
    }
    prevUserRef.current = user
  }, [clearStoredLocation, user])

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

  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [permissionModalError, setPermissionModalError] = useState('permission_denied')
  const requestingTimeoutRef = useRef(null)

  const requestLocation = useCallback((opts = {}) => {
    const { silent = false } = opts
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported')
      if (!silent) {
        setPermissionModalError('unsupported')
        setPermissionModalOpen(true)
      }
      return
    }

    if (requestingTimeoutRef.current) {
      clearTimeout(requestingTimeoutRef.current)
    }

    setLocationStatus('requesting')

    // Safety watchdog: ensure locationStatus never gets stuck on 'requesting'
    requestingTimeoutRef.current = setTimeout(() => {
      setLocationStatus((current) => (current === 'requesting' ? 'unavailable' : current))
    }, 9000)

    const handleSuccess = async ({ coords }) => {
      if (requestingTimeoutRef.current) {
        clearTimeout(requestingTimeoutRef.current)
        requestingTimeoutRef.current = null
      }
      setLocationStatus('granted')
      setPermissionModalOpen(false)

      let label = 'Current Location'
      try {
        const resolved = await reverseGeocodeLatLng(coords.latitude, coords.longitude)
        if (resolved?.area) {
          label = resolved.area
        } else if (resolved?.formattedAddress) {
          label = resolved.formattedAddress.split(',')[0]
        }
      } catch (err) {
        console.warn('Reverse geocode failed:', err)
      }

      setLocation({ lat: coords.latitude, lng: coords.longitude, label })
    }

    const handleError = (err) => {
      if (requestingTimeoutRef.current) {
        clearTimeout(requestingTimeoutRef.current)
        requestingTimeoutRef.current = null
      }
      console.warn('Geolocation error:', err)
      const isDenied = err?.code === 1 // PERMISSION_DENIED
      setLocationStatus(isDenied ? 'denied' : 'unavailable')

      if (!silent) {
        setPermissionModalError(isDenied ? 'permission_denied' : 'unavailable')
        setPermissionModalOpen(true)
      }
    }

    // Call geolocation.
    // On Mac / desktop PCs without GPS, enableHighAccuracy: false avoids GPS timeout.
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (firstError) => {
        if (firstError?.code === 1) {
          // If explicitly denied, do not retry — show permission prompt modal
          handleError(firstError)
          return
        }
        // If timed out or unavailable, retry with low accuracy (Wi-Fi/IP location)
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError,
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    )
  }, [setLocation])

  useEffect(() => {
    // Only check if no location in local storage
    const stored = readStoredLocation()
    if (stored) return

    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    // If browser permissions API is supported, check if permission is already granted
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation({ silent: true })
        } else if (result.state === 'denied') {
          setLocationStatus('denied')
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            requestLocation({ silent: true })
          } else if (result.state === 'denied') {
            setLocationStatus('denied')
          }
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
    clearStoredLocation,
    locationStatus,
    requestLocation,
    permissionModalOpen,
    permissionModalError,
    setPermissionModalOpen,
    radiusKm,
    setRadiusKm,
    isLoading,
    hasLoadedOnce,
    error,
    refresh,
  }), [
    businesses, clearStoredLocation, courtsInRadius, data, error, favoriteCourtIds, hasLoadedOnce, isLoading,
    location, locationStatus, permissionModalError, permissionModalOpen, radiusKm, refresh, requestLocation, setLocation, setRadiusKm, toggleFavoriteCourt,
  ])

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw new Error('useDiscovery must be used inside DiscoveryProvider')
  return context
}
