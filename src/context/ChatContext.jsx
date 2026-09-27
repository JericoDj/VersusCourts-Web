import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiRequest } from '../data/apiClient'
import { toIsoSafely } from '../utils/dateUtils'
import { useAuth } from './AuthContext'
import { usePlayer } from './PlayerContext'
import { useQueue } from './QueueContext'

const ChatContext = createContext(null)

const LOCAL_MESSAGES_KEY_PREFIX = 'vc_chat_msgs_'
const LOCAL_THREADS_KEY = 'vc_chat_threads_v1'

const readStoredThreads = () => {
  try {
    const raw = localStorage.getItem(LOCAL_THREADS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Filter out any mock threads
    const cleaned = parsed.filter(
      (t) =>
        t &&
        !String(t.id).includes('coach_marcus') &&
        !String(t.id).includes('alex_rivera') &&
        t.title !== 'Coach Marcus' &&
        t.title !== 'Alex Rivera'
    )
    localStorage.setItem(LOCAL_THREADS_KEY, JSON.stringify(cleaned))
    return cleaned
  } catch {
    return []
  }
}

function getStoredMessages(threadId) {
  if (threadId.includes('coach_marcus') || threadId.includes('alex_rivera')) {
    try {
      localStorage.removeItem(`${LOCAL_MESSAGES_KEY_PREFIX}${threadId}`)
    } catch {
      /* ignore */
    }
    return []
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY_PREFIX}${threadId}`)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function storeMessages(threadId, msgs) {
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_KEY_PREFIX}${threadId}`, JSON.stringify(msgs))
  } catch {
    /* ignore */
  }
}

/// Club chat is the backend's club posts (`GET/POST /clubs/:id[/posts]`) —
/// the same messages the Player app shows — not a Firestore thread.
const CLUB_PREFIX = 'club_'
const isClubThread = (threadId) => String(threadId || '').startsWith(CLUB_PREFIX)
const clubIdOf = (threadId) => String(threadId).slice(CLUB_PREFIX.length)
const CLUB_POLL_MS = 8000

/// A club post in the shape the chat UI uses. A coach-mode post's sender is
/// `<userId>:coach`, like the app's ClubUser.key, so it isn't "mine" as a player.
const clubPostToMessage = (p) => {
  const author = p.author || {}
  const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim()
  return {
    id: p.id,
    senderId: p.asCoach ? `${p.authorId}:coach` : p.authorId,
    senderName: name || 'Player',
    senderAvatarUrl: author.avatarUrl || '',
    text: p.type === 'QUEUE' && !p.removedForEveryone ? p.text || 'Shared a queue' : p.text || '',
    type: p.imageUrl ? 'image' : 'text',
    attachmentUrl: p.imageUrl || null,
    timestamp: p.createdAt,
    reactions: {},
    removedFor: Array.isArray(p.removedFor) ? p.removedFor : [],
    removedForEveryone: p.removedForEveryone === true,
  }
}

/// Queue chat is the backend's queue messages (`GET /queues/:id`,
/// `POST /queues/:id/messages`) — the same chat the Player app shows.
const QUEUE_PREFIX = 'queue_'
const isQueueThread = (threadId) => String(threadId || '').startsWith(QUEUE_PREFIX)
const queueIdOf = (threadId) => String(threadId).slice(QUEUE_PREFIX.length)

const queueMessageToMessage = (m, names) => ({
  id: m.id,
  senderId: m.isSystem ? 'system' : m.userId,
  senderName: m.isSystem ? 'System' : names[m.userId] || 'Player',
  text: m.text || '',
  type: 'text',
  timestamp: m.createdAt,
  reactions: {},
  removedFor: Array.isArray(m.removedFor) ? m.removedFor : [],
  removedForEveryone: m.removedForEveryone === true,
})

/// Loads a backend-backed thread (club or queue) as chat messages.
async function loadBackendThread(threadId) {
  if (isClubThread(threadId)) {
    const club = await apiRequest(`/clubs/${clubIdOf(threadId)}`)
    return (Array.isArray(club?.posts) ? club.posts : []).map(clubPostToMessage)
  }
  const queue = await apiRequest(`/queues/${queueIdOf(threadId)}`)
  const names = {}
  for (const p of queue?.participants || []) {
    const u = p.user || {}
    if (u.id) names[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || 'Player'
  }
  return (Array.isArray(queue?.messages) ? queue.messages : []).map((m) => queueMessageToMessage(m, names))
}

const isBackendThread = (threadId) => isClubThread(threadId) || isQueueThread(threadId)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const { myClubs = [] } = usePlayer() || {}
  const { myQueues = [] } = useQueue() || {}

  const currentUserId = user?.id || user?._id || 'user_me'

  const [firestoreThreads, setFirestoreThreads] = useState([])
  const [localThreads, setLocalThreads] = useState(readStoredThreads)

  const [messagesMap, setMessagesMap] = useState({})
  const [activeThreadId, setActiveThreadId] = useState(null)

  // Listen to Firestore threads if db is available
  useEffect(() => {
    if (!db || !user?.id) return

    try {
      const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.id))
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const loaded = snapshot.docs.map((d) => {
            const data = d.data() || {}
            let lastMsg = data.lastMessage || null
            if (lastMsg) {
              lastMsg = {
                ...lastMsg,
                timestamp: toIsoSafely(lastMsg.timestamp),
              }
            }

            let title = data.title || ''
            let avatarUrl = data.avatarUrl || ''
            const type = data.type || 'direct'

            // Coach threads carry a `persona` (the coach identity). The player
            // sees the coach's name; the coach sees the player who wrote in.
            if (data.persona?.ownerId) {
              if (data.persona.ownerId === user.id) {
                title = data.playerName || title
                avatarUrl = data.playerAvatarUrl || avatarUrl
              } else {
                title = data.persona.name || title
                avatarUrl = data.persona.avatarUrl || avatarUrl
              }
            } else if (type === 'direct' && Array.isArray(data.participantIds)) {
              const otherId = data.participantIds.find((pid) => pid !== user.id)
              if (otherId && data.participantProfiles?.[otherId]) {
                const p = data.participantProfiles[otherId]
                title = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.username || title
                avatarUrl = p.avatarUrl || avatarUrl
              } else if (otherId && data.participantNames?.[otherId]) {
                title = data.participantNames[otherId]
              } else if (otherId && !title) {
                title = otherId
              }
            }

            return {
              id: d.id,
              ...data,
              title: title || 'Chat',
              avatarUrl,
              type,
              lastMessage: lastMsg,
              unreadCount: data.unreadCounts?.[user.id] || 0,
            }
          })
          setFirestoreThreads(loaded)
        },
        (error) => {
          console.warn('[ChatProvider] Firestore chats listener error:', error)
        }
      )
      return unsub
    } catch (e) {
      console.warn('[ChatProvider] Firestore subscribe failed:', e)
    }
  }, [user?.id])

  // Club and queue threads: load from the API and poll while open.
  useEffect(() => {
    if (!activeThreadId || !isBackendThread(activeThreadId) || !user?.id) return undefined
    let active = true
    const load = () => loadBackendThread(activeThreadId)
      .then((list) => {
        if (!active) return
        const msgs = [...list].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        setMessagesMap((prev) => ({ ...prev, [activeThreadId]: msgs }))
      })
      .catch((err) => console.warn('[ChatProvider] chat load failed:', err))
    load()
    const timer = setInterval(load, CLUB_POLL_MS)
    return () => { active = false; clearInterval(timer) }
  }, [activeThreadId, user?.id])

  // Listen to messages of the active thread in Firestore
  useEffect(() => {
    if (!db || !activeThreadId || !user?.id || isBackendThread(activeThreadId)) return

    try {
      const q = query(collection(db, 'chats', activeThreadId, 'messages'), orderBy('timestamp', 'asc'))
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map((d) => {
            const data = d.data() || {}
            // Doc id last: web-sent messages also store their own `id` field,
            // which must not shadow the real document id (removal targets it).
            return {
              ...data,
              id: d.id,
              timestamp: toIsoSafely(data.timestamp),
            }
          })
          setMessagesMap((prev) => ({ ...prev, [activeThreadId]: msgs }))
        },
        (err) => {
          console.warn('[ChatProvider] Active thread messages listener error:', err)
        }
      )
      return unsub
    } catch (e) {
      console.warn('[ChatProvider] Messages subscribe failed:', e)
    }
  }, [activeThreadId, user?.id])

  // Combine Firestore threads with Joined Clubs & Active Queues and Local DMs
  const mergedThreads = useMemo(() => {
    const map = new Map()

    // 1. Club Threads (myClubs only - real clubs the player belongs to)
    ;(myClubs || []).forEach((club) => {
      const threadId = `club_${club.id}`
      const stored = getStoredMessages(threadId)
      const lastMsg = stored[stored.length - 1]
      map.set(threadId, {
        id: threadId,
        type: 'club',
        clubId: club.id,
        title: club.name,
        avatarUrl: club.logoUrl || club.imageUrl || '',
        subtitle: `${club.members || club.membersCount || 1} members · Club chat`,
        participantIds: [],
        unreadCount: 0,
        lastMessage: lastMsg || null,
      })
    })

    // 2. Queue Threads (myQueues only - real queues the player created or joined)
    ;(myQueues || []).forEach((q) => {
      const threadId = `queue_${q.id}`
      const stored = getStoredMessages(threadId)
      const lastMsg = stored[stored.length - 1]

      const venueName =
        q.court?.name ||
        q.venue ||
        q.court?.branch?.name ||
        q.customCourtName ||
        q.courtName ||
        ''
      const sportLabel = q.sport
        ? q.sport.charAt(0).toUpperCase() + q.sport.slice(1).toLowerCase()
        : ''

      let title = q.title
      if (!title || title.toLowerCase().includes('open play')) {
        title = venueName ? `${venueName} Squad` : `${sportLabel || 'Court'} Squad`
      } else if (venueName && !title.toLowerCase().includes(venueName.toLowerCase())) {
        title = `${venueName} · ${title}`
      }

      const avatarUrl =
        q.courtImageUrl ||
        q.court?.images?.[0] ||
        q.court?.coverImage ||
        q.court?.imageUrl ||
        q.imageUrl ||
        ''

      const joinedCount = q.players ?? q.playersJoined ?? q.participants?.length ?? 1
      const neededCount = q.max ?? q.playersNeeded ?? 4
      const timeStr = q.time ? ` · ${q.time}` : ''

      map.set(threadId, {
        id: threadId,
        type: 'queue',
        queueId: q.id,
        title: title || 'Queue Squad',
        sport: q.sport,
        venue: venueName,
        avatarUrl,
        subtitle: `${joinedCount}/${neededCount} players${timeStr}`,
        participantIds: [],
        unreadCount: 0,
        lastMessage: lastMsg || null,
      })
    })

    // 3. Local / Direct Threads (exclude any mock items)
    localThreads.forEach((t) => {
      if (
        t.id.includes('coach_marcus') ||
        t.id.includes('alex_rivera') ||
        t.title === 'Coach Marcus' ||
        t.title === 'Alex Rivera'
      ) {
        return
      }
      const stored = getStoredMessages(t.id)
      const lastMsg = stored[stored.length - 1] || t.lastMessage
      map.set(t.id, {
        ...t,
        lastMessage: lastMsg,
      })
    })

    // 4. Firestore Threads (overwrite/supplement with real remote data)
    firestoreThreads.forEach((t) => {
      if (
        t.id.includes('coach_marcus') ||
        t.id.includes('alex_rivera') ||
        t.title === 'Coach Marcus' ||
        t.title === 'Alex Rivera'
      ) {
        return
      }
      map.set(t.id, {
        ...map.get(t.id),
        ...t,
      })
    })

    return Array.from(map.values())
  }, [myClubs, myQueues, localThreads, firestoreThreads])

  /// Chats players open with *my* coach identity belong to the coach inbox,
  /// never the personal Messages list or its badge (chat_provider.dart
  /// `_personalThreads` / `coachThreads`).
  const isMyCoachThread = useCallback((t) => Boolean(t.persona?.ownerId) && t.persona.ownerId === currentUserId, [currentUserId])
  const personalThreads = useMemo(() => mergedThreads.filter((t) => !isMyCoachThread(t)), [mergedThreads, isMyCoachThread])
  const coachThreads = useMemo(() => mergedThreads.filter(isMyCoachThread), [mergedThreads, isMyCoachThread])
  const coachUnreadCount = useMemo(() => coachThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0), [coachThreads])

  const totalUnreadCount = useMemo(() => {
    return personalThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0)
  }, [personalThreads])

  const threadsOf = useCallback(
    (type) => {
      return personalThreads.filter((t) => t.type === type)
    },
    [personalThreads]
  )

  const getThread = useCallback(
    (threadId) => {
      return mergedThreads.find((t) => t.id === threadId) || null
    },
    [mergedThreads]
  )

  /// A thread's messages minus the ones I removed for myself ("Remove for
  /// me" adds my id to message.removedFor — same field the app uses).
  const getMessages = useCallback(
    (threadId) => {
      const list = messagesMap[threadId] || getStoredMessages(threadId)
      return list.filter((m) => !(Array.isArray(m.removedFor) && m.removedFor.includes(currentUserId)))
    },
    [messagesMap, currentUserId]
  )

  /// Applies a patch to one message in local state (and the local cache for
  /// non-Firestore threads), so the UI updates before the snapshot lands.
  const patchLocalMessage = useCallback((threadId, messageId, patch) => {
    setMessagesMap((prev) => {
      const list = prev[threadId] || getStoredMessages(threadId)
      const updated = list.map((m) => (m.id === messageId ? { ...m, ...patch(m) } : m))
      storeMessages(threadId, updated)
      return { ...prev, [threadId]: updated }
    })
  }, [])

  /// Soft "Remove for me": hidden only for me; the message stays.
  const removeMessageForMe = useCallback(async (threadId, messageId) => {
    if (isQueueThread(threadId)) {
      await apiRequest(`/queues/${queueIdOf(threadId)}/messages/${messageId}/remove-for-me`, { method: 'POST' })
      patchLocalMessage(threadId, messageId, (m) => ({ removedFor: [...(m.removedFor || []), currentUserId] }))
      return
    }
    if (isClubThread(threadId)) {
      await apiRequest(`/clubs/posts/${messageId}/remove-for-me`, { method: 'POST' })
      patchLocalMessage(threadId, messageId, (m) => ({ removedFor: [...(m.removedFor || []), currentUserId] }))
      return
    }
    patchLocalMessage(threadId, messageId, (m) => ({ removedFor: [...(m.removedFor || []), currentUserId] }))
    if (db && user?.id) {
      await updateDoc(doc(db, 'chats', threadId, 'messages', messageId), { removedFor: arrayUnion(currentUserId) })
    }
  }, [currentUserId, patchLocalMessage, user?.id])

  /// Soft "Remove for everyone" (own messages): everyone sees a placeholder;
  /// the doc is kept. Updates the thread preview if it was the latest.
  const removeMessageForEveryone = useCallback(async (threadId, messageId) => {
    if (isQueueThread(threadId)) {
      await apiRequest(`/queues/${queueIdOf(threadId)}/messages/${messageId}/remove-for-everyone`, { method: 'POST' })
      patchLocalMessage(threadId, messageId, () => ({ removedForEveryone: true, text: '' }))
      return
    }
    if (isClubThread(threadId)) {
      await apiRequest(`/clubs/posts/${messageId}/remove-for-everyone`, { method: 'POST' })
      patchLocalMessage(threadId, messageId, () => ({ removedForEveryone: true, text: '', attachmentUrl: null }))
      return
    }
    patchLocalMessage(threadId, messageId, () => ({ removedForEveryone: true }))
    if (db && user?.id) {
      const threadRef = doc(db, 'chats', threadId)
      await updateDoc(doc(db, 'chats', threadId, 'messages', messageId), {
        removedForEveryone: true,
        removedAt: serverTimestamp(),
        removedBy: currentUserId,
      })
      const snap = await getDoc(threadRef)
      if (snap.data()?.lastMessage?.id === messageId) {
        await updateDoc(threadRef, { 'lastMessage.text': 'Message removed' })
      }
    }
  }, [currentUserId, patchLocalMessage, user?.id])

  const markAsRead = useCallback(
    async (threadId) => {
      // Local update
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      )
      // Firestore update if possible
      if (db && user?.id) {
        try {
          const ref = doc(db, 'chats', threadId)
          await updateDoc(ref, { [`unreadCounts.${user.id}`]: 0 })
        } catch {
          /* ignore */
        }
      }
    },
    [user]
  )

  const sendMessage = useCallback(
    async (threadId, text, { replyTo = null, type = 'text', attachmentUrl = null } = {}) => {
      if (!text?.trim() && !attachmentUrl) return

      // Queue chat → the backend's queue messages, so the app sees it too.
      if (isQueueThread(threadId)) {
        const m = await apiRequest(`/queues/${queueIdOf(threadId)}/messages`, {
          method: 'POST',
          body: { text: text?.trim() || '' },
        })
        const msg = queueMessageToMessage(m, { [currentUserId]: user?.name || 'You' })
        setMessagesMap((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), msg] }))
        return
      }

      // Club chat → the backend's club posts, so the app sees it too.
      if (isClubThread(threadId)) {
        const post = await apiRequest(`/clubs/${clubIdOf(threadId)}/posts`, {
          method: 'POST',
          body: { text: text?.trim() || '', ...(attachmentUrl ? { imageUrl: attachmentUrl } : {}) },
        })
        const msg = clubPostToMessage(post)
        setMessagesMap((prev) => ({ ...prev, [threadId]: [...(prev[threadId] || []), msg] }))
        return
      }

      const cleanText = text.trim()
      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: currentUserId,
        senderName: user?.name || user?.firstName || 'You',
        text: cleanText,
        type,
        attachmentUrl,
        timestamp: new Date().toISOString(),
        isRead: false,
        reactions: {},
        replyToId: replyTo?.id || null,
        replyToText: replyTo?.text || null,
        replyToSenderName: replyTo?.senderName || null,
      }

      // 1. Update local message storage
      setMessagesMap((prev) => {
        const existing = prev[threadId] || getStoredMessages(threadId)
        const updated = [...existing, newMsg]
        storeMessages(threadId, updated)
        return { ...prev, [threadId]: updated }
      })

      // 2. Update thread's last message
      setLocalThreads((prev) => {
        const next = prev.map((t) =>
          t.id === threadId ? { ...t, lastMessage: newMsg } : t
        )
        try {
          localStorage.setItem(LOCAL_THREADS_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })

      // 3. Sync to Firestore if configured
      if (db && user?.id) {
        try {
          const messagesRef = collection(db, 'chats', threadId, 'messages')
          await addDoc(messagesRef, {
            ...newMsg,
            timestamp: serverTimestamp(),
          })

          const threadRef = doc(db, 'chats', threadId)
          await setDoc(
            threadRef,
            {
              lastMessage: {
                ...newMsg,
                timestamp: serverTimestamp(),
              },
            },
            { merge: true }
          )
        } catch (e) {
          console.warn('[ChatProvider] Firestore sendMessage error:', e)
        }
      }
    },
    [currentUserId, user]
  )

  const toggleReaction = useCallback((threadId, messageId, emoji) => {
    setMessagesMap((prev) => {
      const currentList = prev[threadId] || getStoredMessages(threadId)
      const updated = currentList.map((m) => {
        if (m.id !== messageId) return m
        const currentReactions = { ...(m.reactions || {}) }
        if (currentReactions[currentUserId] === emoji) {
          delete currentReactions[currentUserId]
        } else {
          currentReactions[currentUserId] = emoji
        }
        return { ...m, reactions: currentReactions }
      })
      storeMessages(threadId, updated)
      return { ...prev, [threadId]: updated }
    })
  }, [currentUserId])

  const startDirectThread = useCallback(
    async ({ id, name, avatarUrl, subtitle }) => {
      if (!id) return null
      const ids = [currentUserId, id].sort()
      const threadId = `direct_${ids.join('_')}`
      const existing = mergedThreads.find((t) => t.id === threadId)
      if (existing) return threadId

      const newThread = {
        id: threadId,
        type: 'direct',
        title: name || 'Player',
        avatarUrl: avatarUrl || '',
        subtitle: subtitle || 'Player',
        participantIds: [currentUserId, id],
        unreadCount: 0,
        online: true,
        lastMessage: null,
      }

      setLocalThreads((prev) => {
        const next = [newThread, ...prev.filter((t) => t.id !== threadId)]
        try {
          localStorage.setItem(LOCAL_THREADS_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })

      if (db && user?.id) {
        try {
          const threadRef = doc(db, 'chats', threadId)
          await setDoc(
            threadRef,
            {
              participantIds: [currentUserId, id],
              type: 'direct',
              title: name || 'Player',
              avatarUrl: avatarUrl || '',
              createdAt: serverTimestamp(),
            },
            { merge: true }
          )
        } catch (e) {
          console.warn('[ChatProvider] startDirectThread Firestore error:', e)
        }
      }

      return threadId
    },
    [currentUserId, mergedThreads, user?.id]
  )

  /// Opens (or reuses) a chat with a coach identity ("Coach Jerico") — it
  /// lands in their coach-mode inbox. Same doc shape and id as the Flutter
  /// `ChatProvider.startCoachThread`, so both clients share the thread.
  const startCoachThread = useCallback(
    async ({ coachId, coachOwnerId, coachName, coachAvatarUrl, myName, myAvatarUrl }) => {
      if (!coachId || !coachOwnerId || !user?.id) return null
      const threadId = `coach_${coachId}_${currentUserId}`
      if (!db) throw new Error('Chat is unavailable right now.')
      await setDoc(
        doc(db, 'chats', threadId),
        {
          participantIds: [currentUserId, coachOwnerId],
          type: 'direct',
          persona: { ownerId: coachOwnerId, coachId, name: coachName || 'Coach', avatarUrl: coachAvatarUrl || '' },
          playerName: myName || 'Player',
          playerAvatarUrl: myAvatarUrl || '',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
      return threadId
    },
    [currentUserId, user?.id]
  )

  const value = useMemo(
    () => ({
      threads: personalThreads,
      coachThreads,
      coachUnreadCount,
      totalUnreadCount,
      threadsOf,
      getThread,
      getMessages,
      sendMessage,
      markAsRead,
      toggleReaction,
      removeMessageForMe,
      removeMessageForEveryone,
      startDirectThread,
      startCoachThread,
      activeThreadId,
      setActiveThreadId,
      currentUserId,
    }),
    [
      personalThreads,
      coachThreads,
      coachUnreadCount,
      totalUnreadCount,
      threadsOf,
      getThread,
      getMessages,
      sendMessage,
      markAsRead,
      toggleReaction,
      removeMessageForMe,
      removeMessageForEveryone,
      startDirectThread,
      startCoachThread,
      activeThreadId,
      currentUserId,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return ctx
}
