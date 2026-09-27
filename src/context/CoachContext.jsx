import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../data/apiClient'
import { coachApi } from '../data/trainings'
import { sportFromApi } from '../data/sports'

/// Web port of the Flutter `CoachProvider`, scoped to coach mode (`/coach`).
/// Coach trainings belong to the coach, not a business, so nothing here is
/// scoped to an org — same as the app.
const CoachContext = createContext(null)

export const normalizeIdentity = (j) => j && ({
  id: String(j.id ?? ''),
  userId: String(j.userId ?? ''),
  name: j.name || '',
  sport: sportFromApi(j.sport),
  avatarUrl: j.avatarUrl || '',
  bio: j.bio || '',
  experience: j.experience || '',
  pricePerSession: Number(j.pricePerSession) || 0,
  ratingAvg: Number(j.ratingAvg) || 0,
  ratingCount: Number(j.ratingCount) || 0,
})

export function CoachProvider({ children }) {
  const { user } = useAuth()
  const [identity, setIdentity] = useState(null)
  const [identityLoaded, setIdentityLoaded] = useState(false)
  const [overview, setOverview] = useState({ upcomingTrainings: 0, totalTrainings: 0, totalStudents: 0 })
  const [trainings, setTrainings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ov, list, profile] = await Promise.all([coachApi.overview(), coachApi.trainings(), coachApi.profile()])
      setOverview({
        upcomingTrainings: Number(ov?.upcomingTrainings) || 0,
        totalTrainings: Number(ov?.totalTrainings) || 0,
        totalStudents: Number(ov?.totalStudents) || 0,
      })
      setTrainings(list)
      setIdentity(normalizeIdentity(profile))
    } catch (err) {
      setError(err.message || 'Could not load your coach dashboard.')
    } finally {
      setLoading(false)
      setIdentityLoaded(true)
    }
  }, [])

  // Identity first — it gates the whole mode behind the setup form.
  useEffect(() => {
    if (!user?.id) return
    let active = true
    coachApi.profile()
      .then((p) => {
        if (!active) return
        setIdentity(normalizeIdentity(p))
        if (p) refresh()
      })
      .catch(() => {})
      .finally(() => { if (active) setIdentityLoaded(true) })
    return () => { active = false }
  }, [user?.id, refresh])

  const saveIdentity = useCallback(async (form) => {
    const saved = await coachApi.saveProfile({
      name: form.name.trim(),
      sport: form.sport.toUpperCase(),
      pricePerSession: Number(form.pricePerSession) || 0,
      ...(form.experience?.trim() ? { experience: form.experience.trim() } : {}),
      ...(form.bio?.trim() ? { bio: form.bio.trim() } : {}),
      ...(form.avatarUrl?.trim() ? { avatarUrl: form.avatarUrl.trim() } : {}),
    })
    setIdentity(normalizeIdentity(saved))
    refresh()
    return saved
  }, [refresh])

  // Coach mode's own feed — coach-audience notifications only (trainings,
  // hosted queues, earnings, coach chats), polled like the app does.
  const [notifications, setNotifications] = useState([])
  const fetchNotifications = useCallback(async () => {
    try {
      const list = await apiRequest('/notifications', { query: { audience: 'COACH' } })
      // Older servers ignore `?audience=` — keep only COACH either way.
      if (Array.isArray(list)) setNotifications(list.filter((n) => n.audience === 'COACH'))
    } catch {
      // Keep the last feed; the next poll retries.
    }
  }, [])
  useEffect(() => {
    if (!user?.id) return undefined
    const first = setTimeout(fetchNotifications, 0)
    const timer = setInterval(fetchNotifications, 30_000)
    return () => { clearTimeout(first); clearInterval(timer) }
  }, [user?.id, fetchNotifications])
  const unreadNotifications = notifications.filter((n) => !n.read).length
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {})
  }, [])
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    apiRequest('/notifications/read-all', { method: 'PATCH', query: { audience: 'COACH' } }).catch(() => {})
  }, [])

  /// Runs a mutating coach call, then reloads the dashboard.
  const act = useCallback(async (fn) => {
    const result = await fn()
    await refresh()
    return result
  }, [refresh])

  const value = useMemo(() => ({
    identity, identityLoaded, overview, trainings, loading, error, refresh, saveIdentity, act,
    notifications, unreadNotifications, fetchNotifications, markNotificationRead, markAllNotificationsRead,
  }), [identity, identityLoaded, overview, trainings, loading, error, refresh, saveIdentity, act,
    notifications, unreadNotifications, fetchNotifications, markNotificationRead, markAllNotificationsRead])

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

export function useCoach() {
  const ctx = useContext(CoachContext)
  if (!ctx) throw new Error('useCoach must be used inside <CoachProvider>')
  return ctx
}
