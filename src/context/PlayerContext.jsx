import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clubs, events, players, queues, venues } from '../data/mockData'

const PlayerContext = createContext(null)

const readSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export function PlayerProvider({ children }) {
  const [sport, setSport] = useState('all')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(() => readSaved('vc-favorites', ['grand-slam']))
  const [joinedQueues, setJoinedQueues] = useState(() => readSaved('vc-queues', ['q1']))
  const [notice, setNotice] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState(() => (typeof navigator?.geolocation === 'undefined' ? 'unsupported' : 'idle'))

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      setNotice('Location is not supported by this browser.')
      return
    }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationStatus('granted')
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED
        setLocationStatus(denied ? 'denied' : 'unavailable')
        setNotice(denied ? 'Allow location access in your browser to see distances.' : 'We could not get your location. Try again to see distances.')
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    )
  }, [])

  useEffect(() => localStorage.setItem('vc-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('vc-queues', JSON.stringify(joinedQueues)), [joinedQueues])
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const timer = window.setTimeout(requestLocation, 0)
    return () => window.clearTimeout(timer)
  }, [requestLocation])

  const filteredVenues = useMemo(() => venues.filter((venue) => {
    const sportMatch = sport === 'all' || venue.sports.includes(sport)
    const query = search.toLowerCase()
    return sportMatch && `${venue.name} ${venue.area} ${venue.sports.join(' ')}`.toLowerCase().includes(query)
  }), [sport, search])

  const toggleFavorite = (id) => setFavorites((current) => {
    const isSaved = current.includes(id)
    setNotice(isSaved ? 'Removed from saved courts' : 'Court saved to your favorites')
    return isSaved ? current.filter((item) => item !== id) : [...current, id]
  })

  const toggleQueue = (id) => setJoinedQueues((current) => {
    const hasJoined = current.includes(id)
    setNotice(hasJoined ? 'You left the queue' : 'You’re in! We’ll remind you before game time.')
    return hasJoined ? current.filter((item) => item !== id) : [...current, id]
  })

  const value = { sport, setSport, search, setSearch, favorites, joinedQueues, toggleFavorite, toggleQueue, filteredVenues, venues, queues, events, clubs, players, notice, setNotice, userLocation, locationStatus, requestLocation }
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider')
  return context
}
