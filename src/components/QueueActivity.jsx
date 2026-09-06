import { useEffect, useRef, useState } from 'react'
import { CalendarDays, BarChart3, Flag, Award, Send, Eye, ArrowLeft, User } from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import socketService from '../data/socketService'
import '../styles/queue-activity.css'

const nameOf = (p) => {
  if (typeof p === 'string') return p
  return p?.name || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Player'
}

export function QueueMatches({ queue, onOpenLeaderboard, onMatchesChange }) {
  const [matches, setMatches] = useState([])
  const [liveMatches, setLiveMatches] = useState(queue.liveMatches || [])
  const [error, setError] = useState('')
  const [_loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let timer
    const refresh = async () => {
      try {
        const [rows, detail] = await Promise.all([
          apiList(`/queues/${queue.id}/matches`, { signal: controller.signal }),
          apiRequest(`/queues/${queue.id}`, { signal: controller.signal }),
        ])
        if (!controller.signal.aborted) {
          setMatches(rows)
          setLiveMatches(detail.liveMatches || [])
          setError('')
          if (onMatchesChange) {
            const allRows = [
              ...(detail.liveMatches || []).map((m) => ({ ...m, snapshot: true, status: m.completed ? 'COMPLETED' : 'ONGOING' })),
              ...rows.filter((m) => !(detail.liveMatches || []).some((s) => s.id === m.id)),
            ]
            onMatchesChange(allRows)
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          timer = setTimeout(refresh, 5000)
        }
      }
    }
    refresh()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [queue.id, onMatchesChange])

  const snapshots = liveMatches.map((m) => ({
    ...m,
    snapshot: true,
    status: m.completed ? 'COMPLETED' : 'ONGOING',
  }))
  const rows = [...snapshots, ...matches.filter((m) => !snapshots.some((s) => s.id === m.id))]
  const active = rows.filter((m) => m.status === 'ONGOING')
  const history = rows
    .filter((m) => m.status === 'COMPLETED' || m.completed)
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0))

  const card = (m, i) => {
    const sets = [...(m.sets || [])].sort((a, b) => a.setNumber - b.setNumber)
    const score = m.snapshot ? m : sets.at(-1) || {}
    const team = (side) =>
      m.snapshot
        ? (m[`team${side}`] || []).join(' / ')
        : (m[`players${side}`] || []).map(nameOf).join(' / ')

    const isComplete = m.status === 'COMPLETED' || m.completed
    const winnerSide = m.winner || (m.result === 'teamA' ? 'A' : m.result === 'teamB' ? 'B' : null)

    return (
      <article className="queue-match-card" key={m.id || i}>
        <div className={`queue-match-card__status ${isComplete ? 'is-complete' : ''}`}>
          {isComplete ? 'FINAL' : m.paused ? 'STARTING SOON' : 'LIVE'}
          {m.court ? ` · ${m.court}` : ''}
        </div>
        {['A', 'B'].map((side) => {
          const isWinner = isComplete && winnerSide === side
          return (
            <div className={`queue-match-card__score ${isWinner ? 'is-winner' : ''}`} key={side}>
              <span className="queue-match-card__team-name">{team(side) || `Team ${side}`}</span>
              <b>{score[`score${side}`] ?? 0}</b>
            </div>
          )
        })}
        {sets.length > 1 && (
          <p className="queue-match-card__sets">
            {sets.map((s) => `Set ${s.setNumber}: ${s.scoreA}–${s.scoreB}`).join(' · ')}
          </p>
        )}
        {isComplete && winnerSide && (
          <p className="queue-match-card__winner">
            <Award size={13} /> Winner: {team(winnerSide) || `Team ${winnerSide}`}
          </p>
        )}
      </article>
    )
  }

  return (
    <section className="queue-activity">
      <div className="queue-matches-header">
        <div className="queue-matches-header__title">
          <CalendarDays size={20} className="queue-matches-icon" />
          <h3>Matches</h3>
        </div>
        <button
          type="button"
          className="queue-matches-leaderboard-btn"
          onClick={onOpenLeaderboard}
          aria-label="Open leaderboard"
        >
          <BarChart3 size={17} />
          <span>Leaderboard</span>
        </button>
      </div>

      {error && <p role="alert" className="queue-matches-error">Unable to refresh matches: {error}</p>}

      {/* Ongoing Matches */}
      {active.map(card)}

      {/* Waiting for next match card */}
      {!active.length && (
        <div className="queue-no-match-card">
          <Flag size={26} className="queue-no-match-icon" />
          <p>Waiting for the host to start the next match.</p>
        </div>
      )}

      {/* Recent Results */}
      {history.length > 0 && (
        <div className="queue-recent-results">
          <h4 className="queue-recent-results__title">Recent results</h4>
          {(showAll ? history : history.slice(0, 3)).map(card)}
          {history.length > 3 && (
            <button
              type="button"
              className="queue-detail-back-btn"
              style={{ width: 'auto', margin: '6px auto 0', display: 'block' }}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show fewer' : `View all ${history.length} matches`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export function QueueChat({ queue, user, onBack }) {
  const [messages, setMessages] = useState(queue.messages || [])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    socketService.connect()
    socketService.joinQueueRoom(queue.id)

    const handleMessage = (e) => {
      const msg = e.detail
      if (msg) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      }
    }

    socketService.addEventListener('queue:message', handleMessage)

    // Fallback polling
    const controller = new AbortController()
    let timer
    const refresh = async () => {
      try {
        const detail = await apiRequest(`/queues/${queue.id}`, { signal: controller.signal })
        if (!controller.signal.aborted && detail.messages) {
          setMessages(detail.messages)
        }
      } catch (e) {
        if (!controller.signal.aborted) console.warn('Chat poll failed:', e.message)
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 5000)
      }
    }
    refresh()

    return () => {
      controller.abort()
      clearTimeout(timer)
      socketService.removeEventListener('queue:message', handleMessage)
    }
  }, [queue.id])

  const send = async (event) => {
    event.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const message = await apiRequest(`/queues/${queue.id}/messages`, {
        method: 'POST',
        body: { text: text.trim() },
      })
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message]
      )
      setText('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const people = [queue.host, ...(queue.participants || []).map((p) => p.user)].filter(Boolean)

  const findPerson = (userId) => {
    return people.find((p) => (p?.id || p?.userId) === userId)
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Queue metadata for header matching mobile (media_1788702484717)
  const title = queue.customCourtName || queue.title || 'Queue Chat'
  const joinedCount = (queue.participants || []).filter((p) => p.status === 'JOINED').length
  const capacity = queue.playersNeeded || 10
  const dateFormatted = queue.startTime
    ? new Date(queue.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : ''
  const timeFormatted = formatTime(queue.startTime)
  const subMeta = [
    `${joinedCount}/${capacity} players`,
    dateFormatted && timeFormatted ? `${dateFormatted}, ${timeFormatted}` : timeFormatted || dateFormatted,
    queue.customArea || queue.venue?.area || queue.venue?.name || '',
  ].filter(Boolean).join(' · ')

  return (
    <section className="queue-inline-chat">
      {/* Header matching mobile */}
      <div className="queue-chat-header">
        <div className="queue-chat-header__left">
          <button
            type="button"
            className="queue-chat-header__back"
            onClick={onBack}
            aria-label="Back to queue details"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="queue-chat-header__meta">
            <h3 className="queue-chat-header__title">{title}</h3>
            {subMeta && <span className="queue-chat-header__sub">{subMeta}</span>}
          </div>
        </div>
        <button
          type="button"
          className="queue-chat-view-queue-btn"
          onClick={onBack}
        >
          <Eye size={14} />
          View Queue
        </button>
      </div>

      {/* Message feed */}
      <div className="queue-inline-chat__messages" aria-live="polite">
        {!messages.length && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '36px 12px', fontSize: '13px' }}>
            No messages yet. Message the squad below!
          </div>
        )}
        {messages.map((m) => {
          const isOwn = m.userId === user?.id
          const sender = findPerson(m.userId)
          const senderName = m.isSystem ? 'Queue Update' : nameOf(sender || {})
          const isSystem = m.isSystem || m.text === 'Queue created.' || m.text.includes('ongoing')

          if (isSystem) {
            return (
              <div key={m.id} className="queue-chat-system-pill">
                {m.text}
              </div>
            )
          }

          return (
            <div key={m.id} className={`queue-chat-row ${isOwn ? 'is-own' : 'is-other'}`}>
              {!isOwn && (
                <div className="queue-chat-avatar">
                  {sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} alt="" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
              )}
              <div className="queue-chat-msg-body">
                {!isOwn && (
                  <span className="queue-chat-sender-name">{senderName}</span>
                )}
                <div className="queue-chat-bubble">
                  <p style={{ margin: 0 }}>{m.text}</p>
                  <time className="queue-chat-time">{formatTime(m.createdAt)}</time>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {error && <p role="alert" style={{ color: '#ef4444', fontSize: '12px', margin: '2px 0' }}>{error}</p>}

      {/* Bottom Capsule Input matching mobile media_1788702484717 */}
      <form className="queue-chat-input-bar" onSubmit={send}>
        <input
          aria-label="Message to squad"
          placeholder="Message the squad…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          className="queue-chat-input"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="queue-chat-send-btn"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  )
}
