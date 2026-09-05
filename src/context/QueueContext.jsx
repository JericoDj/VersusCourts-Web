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

export const getEffectiveEndTime = (queue) => {
  if (queue.endTime) {
    const d = new Date(queue.endTime)
    if (!Number.isNaN(d.getTime())) return d
  }
  const rules = typeof queue.rules === 'object' && queue.rules ? queue.rules : {}
  const rulesEnd = rules.endTime
  if (rulesEnd) {
    const d = new Date(rulesEnd)
    if (!Number.isNaN(d.getTime())) return d
  }
  const start = queue.startTime ? new Date(queue.startTime) : null
  if (start && !Number.isNaN(start.getTime())) {
    const durationMins = Number(rules.durationMinutes || queue.durationMinutes)
    if (durationMins > 0) {
      return new Date(start.getTime() + durationMins * 60 * 1000)
    }
    // Default 2 hours if no duration
    return new Date(start.getTime() + 2 * 60 * 60 * 1000)
  }
  return null
}

export const isQueueTimePassed = (queue) => {
  const effectiveEnd = getEffectiveEndTime(queue)
  if (!effectiveEnd) return false
  return Date.now() > effectiveEnd.getTime()
}

export const isQueueFinished = (queue) => {
  const status = String(queue.status || '').toUpperCase()
  return status === 'COMPLETED' || status === 'CANCELLED'
}

export const isQueueHiddenFromPublic = (queue) => {
  return isQueueTimePassed(queue) && !isQueueFinished(queue)
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

  const status = String(queue.status || 'OPEN').toUpperCase()
  const effectiveEndTime = getEffectiveEndTime(queue)
  const isTimePassed = effectiveEndTime ? Date.now() > effectiveEndTime.getTime() : false
  const isFinished = status === 'COMPLETED' || status === 'CANCELLED'
  const isHiddenFromPublic = isTimePassed && !isFinished
  const isOngoing = status === 'STARTED'
  const isPrivate = String(queue.visibility || '').toUpperCase() === 'PRIVATE' || queue.rules?.isPrivate === true

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
    effectiveEndTime,
    isTimePassed,
    isFinished,
    isHiddenFromPublic,
    isOngoing,
    isPrivate,
    fee: Number(queue.entryFee || 0),
    hostName: hostName || (typeof queue.host === 'string' ? queue.host : '') || 'Versus Courts host',
    featured: Boolean(queue.featured),
    status,
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
  const [myQueues, setMyQueues] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMyQueuesLoading, setIsMyQueuesLoading] = useState(false)
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

  const refreshMyQueues = useCallback(async ({ signal } = {}) => {
    const token = localStorage.getItem('vc-auth-token')
    if (!token) {
      setMyQueues([])
      return []
    }
    setIsMyQueuesLoading(true)
    try {
      const payload = await fetchJson('/queues/mine', {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      })
      const records = Array.isArray(payload) ? payload : (payload?.data || [])
      const normalized = Array.isArray(records) ? records.map(normalizeQueue) : []
      setMyQueues(normalized)
      return normalized
    } catch {
      setMyQueues([])
      return []
    } finally {
      setIsMyQueuesLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      refreshQueues({ signal: controller.signal })
      refreshMyQueues({ signal: controller.signal })
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [refreshQueues, refreshMyQueues])

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
    refreshMyQueues()
    return detail
  }, [refreshMyQueues])

  const value = useMemo(() => ({
    queues,
    myQueues,
    isLoading,
    isMyQueuesLoading,
    error,
    refreshQueues,
    refreshMyQueues,
    getQueueDetail,
    joinQueue,
  }), [error, getQueueDetail, isLoading, isMyQueuesLoading, joinQueue, myQueues, queues, refreshMyQueues, refreshQueues])

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
}

export function useQueues() {
  const context = useContext(QueueContext)
  if (!context) throw new Error('useQueues must be used inside QueueProvider')
  return context
}

export const useQueue = useQueues
