import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const QueueContext = createContext(null)
const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const titleCase = (value = '') => String(value)
  .toLowerCase()
  .split('_')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const formatSchedule = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Schedule to be announced'
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const normalizeQueue = (queue) => {
  const sport = String(queue.sport || 'BASKETBALL').toLowerCase()
  const skillValues = queue.skills?.length ? queue.skills : [queue.skill].filter(Boolean)
  const joinedPlayers = queue._count?.participants
    ?? queue.participants?.filter((participant) => !participant.status || participant.status === 'JOINED').length
    ?? 0
  const localPlayers = Array.isArray(queue.localPlayers) ? queue.localPlayers.length : 0
  const hostName = queue.host
    ? queue.host.name || `${queue.host.firstName || ''} ${queue.host.lastName || ''}`.trim()
    : ''
  const venue = queue.court?.name
    || queue.court?.branch?.name
    || queue.customCourtName
    || 'Venue to be announced'

  return {
    ...queue,
    id: queue.id,
    title: queue.title || `${titleCase(sport)} Open Play`,
    venue,
    area: queue.court?.branch?.area || queue.court?.branch?.address || queue.customArea || '',
    sport,
    level: skillValues.length ? skillValues.map(titleCase).join(', ') : 'All levels',
    players: joinedPlayers + localPlayers,
    max: Number(queue.playersNeeded || 1),
    time: formatSchedule(queue.startTime),
    fee: Number(queue.entryFee || 0),
    hostName: hostName || (typeof queue.host === 'string' ? queue.host : '') || 'Versus Courts host',
    featured: Boolean(queue.featured),
    status: String(queue.status || 'OPEN').toUpperCase(),
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    throw new Error(message || `Queue request failed (${response.status})`)
  }
  return payload
}

export function QueueProvider({ children }) {
  const [queues, setQueues] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshQueues = useCallback(async ({ signal } = {}) => {
    await Promise.resolve()
    if (signal?.aborted) return []
    setIsLoading(true)
    setError('')
    try {
      const payload = await fetchJson('/queues', { signal })
      const records = Array.isArray(payload) ? payload : payload.data
      if (!Array.isArray(records)) throw new Error('The queue endpoint did not return a list.')
      const normalized = records.map(normalizeQueue)
      setQueues(normalized)
      return normalized
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || 'Unable to load open games.')
      }
      return []
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => refreshQueues({ signal: controller.signal }), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [refreshQueues])

  const getQueueDetail = useCallback(async (id, { signal } = {}) => {
    const detail = normalizeQueue(await fetchJson(`/queues/${id}`, { signal }))
    setQueues((current) => current.map((queue) => queue.id === id ? { ...queue, ...detail } : queue))
    return detail
  }, [])

  const joinQueue = useCallback(async (id, body = {}) => {
    const token = localStorage.getItem('vc-auth-token')
    if (!token) throw new Error('Please log in to join this queue.')
    const detail = normalizeQueue(await fetchJson(`/queues/${id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }))
    setQueues((current) => current.map((queue) => queue.id === id ? { ...queue, ...detail } : queue))
    return detail
  }, [])

  const value = useMemo(() => ({
    queues,
    isLoading,
    error,
    refreshQueues,
    getQueueDetail,
    joinQueue,
  }), [error, getQueueDetail, isLoading, joinQueue, queues, refreshQueues])

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
}

export function useQueues() {
  const context = useContext(QueueContext)
  if (!context) throw new Error('useQueues must be used inside QueueProvider')
  return context
}
