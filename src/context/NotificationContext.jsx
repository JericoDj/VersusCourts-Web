import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../data/apiClient'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

function getCacheKey(userId, suffix) {
  return userId ? `vc_${suffix}_${userId}` : `vc_${suffix}_guest`
}

function formatRoleName(role) {
  if (!role) return ''
  const r = String(role).toUpperCase()
  if (r === 'RECEPTIONIST') return 'Admin'
  return r[0] + r.slice(1).toLowerCase()
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id

  // User-isolated notifications — strictly real backend data
  const [notifications, setNotifications] = useState(() => {
    if (!userId) return []
    try {
      const raw = localStorage.getItem(getCacheKey(userId, 'notifs'))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // User-isolated resolved statuses (for instant button transitions)
  const [resolvedStatuses, setResolvedStatuses] = useState(() => {
    if (!userId) return {}
    try {
      const raw = localStorage.getItem(getCacheKey(userId, 'resolved'))
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const [loading, setLoading] = useState(false)
  const isFetchingRef = useRef(false)

  // Adjust state during render when userId changes (React-recommended pattern)
  const [prevUserId, setPrevUserId] = useState(userId)
  if (userId !== prevUserId) {
    setPrevUserId(userId)
    if (!userId) {
      setNotifications([])
      setResolvedStatuses({})
    } else {
      try {
        const rawNotifs = localStorage.getItem(getCacheKey(userId, 'notifs'))
        setNotifications(rawNotifs ? JSON.parse(rawNotifs) : [])
        const rawResolved = localStorage.getItem(getCacheKey(userId, 'resolved'))
        setResolvedStatuses(rawResolved ? JSON.parse(rawResolved) : {})
      } catch {
        setNotifications([])
        setResolvedStatuses({})
      }
    }
  }

  // Fetch real notifications and staff invites from backend
  const fetchNotifications = useCallback(
    async (options = {}) => {
      const { silent = false } = options
      const hasToken = !!localStorage.getItem('vc-auth-token')
      if (!userId && !hasToken) return

      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) setLoading(true)

      try {
        const [notifsRes, staffInvitesRes] = await Promise.allSettled([
          apiRequest('/notifications', { auth: true }),
          apiRequest('/staff-invites/mine', { auth: true }),
        ])

        let combined = []

        if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value)) {
          combined = notifsRes.value
        }

        // Merge staff invites if they haven't been captured as an in-app notification record
        if (staffInvitesRes.status === 'fulfilled' && Array.isArray(staffInvitesRes.value)) {
          const existingInviteIds = new Set(
            combined
              .map((n) => n.data?.inviteId || n.data?.requestId)
              .filter(Boolean)
          )

          for (const invite of staffInvitesRes.value) {
            if (!existingInviteIds.has(invite.id) && invite.status === 'PENDING') {
              combined.unshift({
                id: `staff-invite-${invite.id}`,
                title: 'Team invitation',
                body: `${invite.organization?.name || 'A business'} invited you to join their team as ${formatRoleName(invite.role)}.`,
                type: 'SYSTEM',
                createdAt: invite.createdAt || new Date().toISOString(),
                read: false,
                data: {
                  kind: 'STAFF_INVITE',
                  inviteId: invite.id,
                  orgId: invite.organizationId,
                  orgName: invite.organization?.name,
                  role: invite.role,
                  status: invite.status,
                },
              })
            }
          }
        }

        if (combined.length > 0 || (notifsRes.status === 'fulfilled' && userId)) {
          setNotifications(combined)
          try {
            localStorage.setItem(getCacheKey(userId, 'notifs'), JSON.stringify(combined))
          } catch {
            /* ignore storage errors */
          }
        }
      } catch (err) {
        console.warn('Failed to fetch notifications:', err)
      } finally {
        isFetchingRef.current = false
        if (!silent) setLoading(false)
      }
    },
    [userId]
  )

  // Initial fetch on mount or user login
  useEffect(() => {
    let ignore = false
    const token = localStorage.getItem('vc-auth-token')
    if (userId || token) {
      Promise.resolve().then(() => {
        if (!ignore) {
          fetchNotifications({ silent: true })
        }
      })
    }
    return () => {
      ignore = true
    }
  }, [userId, fetchNotifications])

  // Periodic 30-second silent background polling & focus refetch
  useEffect(() => {
    if (!userId && !localStorage.getItem('vc-auth-token')) return

    const interval = setInterval(() => {
      fetchNotifications({ silent: true })
    }, 30000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications({ silent: true })
      }
    }

    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [userId, fetchNotifications])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      try {
        localStorage.setItem(getCacheKey(userId, 'notifs'), JSON.stringify(updated))
      } catch {
        /* ignore */
      }
      return updated
    })

    // Sync read states to backend
    const unread = notifications.filter((n) => !n.read && !n.id.startsWith('staff-invite-'))
    for (const item of unread) {
      apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH', auth: true }).catch(() => {})
    }
  }, [userId, notifications])

  // Mark single notification as read
  const markAsRead = useCallback(
    async (id) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        try {
          localStorage.setItem(getCacheKey(userId, 'notifs'), JSON.stringify(updated))
        } catch {
          /* ignore */
        }
        return updated
      })

      if (!id.startsWith('staff-invite-')) {
        try {
          await apiRequest(`/notifications/${id}/read`, { method: 'PATCH', auth: true })
        } catch {
          /* ignore */
        }
      }
    },
    [userId]
  )

  // Respond to invitation (Accept / Decline) with exact backend routes
  const respondToInvite = useCallback(
    async (notification, accept) => {
      const inviteId = notification.data?.inviteId || notification.data?.requestId
      const notificationId = notification.id
      const kind = (notification.data?.kind || '').toUpperCase()
      const clubId = notification.data?.clubId || notification.data?.club_id

      const status = accept ? 'ACCEPTED' : 'DECLINED'

      // Instantly record status in memory and localStorage
      setResolvedStatuses((prev) => {
        const next = { ...prev }
        if (inviteId) next[inviteId] = status
        if (notificationId) next[notificationId] = status
        try {
          localStorage.setItem(getCacheKey(userId, 'resolved'), JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })

      // Auto-mark notification as read
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        try {
          localStorage.setItem(getCacheKey(userId, 'notifs'), JSON.stringify(updated))
        } catch {
          /* ignore */
        }
        return updated
      })

      // Dispatch to exact backend endpoint
      if (inviteId) {
        try {
          if (kind === 'QUEUE_INVITE') {
            await apiRequest(`/queue-invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
              method: 'POST',
              auth: true,
            })
          } else if (kind === 'CLUB_INVITE') {
            await apiRequest(`/club-invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
              method: 'POST',
              auth: true,
            })
          } else if (kind === 'CLUB_JOIN_REQUEST') {
            const path = clubId
              ? `/clubs/${clubId}/requests/${inviteId}/${accept ? 'approve' : 'decline'}`
              : `/club-join-requests/${inviteId}/${accept ? 'approve' : 'decline'}`
            await apiRequest(path, { method: 'POST', auth: true })
          } else {
            // STAFF_INVITE or default team invite
            await apiRequest(`/staff-invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
              method: 'POST',
              auth: true,
            })
          }
        } catch (err) {
          console.error('Failed to submit invite response to server:', err)
          throw err
        }
      }

      // Silent refetch to sync latest state
      fetchNotifications({ silent: true })
    },
    [userId, fetchNotifications]
  )

  // Status helper for any notification item
  const getNotificationStatus = useCallback(
    (n) => {
      if (!n) return null
      const inviteId = n.data?.inviteId || n.data?.requestId
      if (resolvedStatuses[n.id]) return resolvedStatuses[n.id]
      if (inviteId && resolvedStatuses[inviteId]) return resolvedStatuses[inviteId]
      const raw = n.data?.status || n.data?.inviteStatus || n.data?.state
      if (raw && String(raw).toUpperCase() !== 'PENDING') {
        return String(raw).toUpperCase()
      }
      return null
    },
    [resolvedStatuses]
  )

  // Segregate into Updates vs Invitations (matching Flutter AppNotification.isInvitation)
  const { updates, invitations, unreadUpdates, unreadInvitations, unreadCount } = useMemo(() => {
    const isInvite = (n) => {
      const kind = (n.data?.kind || '').toUpperCase()
      return kind.includes('INVITE') || kind === 'CLUB_JOIN_REQUEST'
    }

    const inv = notifications.filter(isInvite)
    const upd = notifications.filter((n) => !isInvite(n))

    const unreadInv = inv.filter((n) => !n.read).length
    const unreadUpd = upd.filter((n) => !n.read).length

    return {
      updates: upd,
      invitations: inv,
      unreadUpdates: unreadUpd,
      unreadInvitations: unreadInv,
      unreadCount: unreadInv + unreadUpd,
    }
  }, [notifications])

  const value = useMemo(
    () => ({
      notifications,
      updates,
      invitations,
      unreadCount,
      unreadUpdates,
      unreadInvitations,
      resolvedStatuses,
      loading,
      fetchNotifications,
      markAllAsRead,
      markAsRead,
      respondToInvite,
      getNotificationStatus,
    }),
    [
      notifications,
      updates,
      invitations,
      unreadCount,
      unreadUpdates,
      unreadInvitations,
      resolvedStatuses,
      loading,
      fetchNotifications,
      markAllAsRead,
      markAsRead,
      respondToInvite,
      getNotificationStatus,
    ]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
