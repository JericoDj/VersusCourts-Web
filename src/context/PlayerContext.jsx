import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clubs, events, queues, venues } from '../data/mockData'

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

  useEffect(() => localStorage.setItem('vc-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('vc-queues', JSON.stringify(joinedQueues)), [joinedQueues])
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

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

  const value = { sport, setSport, search, setSearch, favorites, joinedQueues, toggleFavorite, toggleQueue, filteredVenues, venues, queues, events, clubs, notice, setNotice }
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider')
  return context
}
