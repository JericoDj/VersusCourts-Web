import { useEffect, useState } from 'react'
import { CalendarDays, BarChart3, Flag, Award } from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
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

  useEffect(() => {
    const controller = new AbortController()
    let timer
    const refresh = async () => {
      try {
        const detail = await apiRequest(`/queues/${queue.id}`, { signal: controller.signal })
        if (!controller.signal.aborted) setMessages(detail.messages || [])
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message)
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 3000)
      }
    }
    refresh()
    return () => {
      controller.abort()
      clearTimeout(timer)
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

  return (
    <section className="queue-inline-chat">
      <button
        type="button"
        className="queue-detail-back-btn"
        style={{ width: 'auto' }}
        onClick={onBack}
      >
        ← Game details
      </button>
      <h3>Chat Queue Group</h3>
      <div className="queue-inline-chat__messages" aria-live="polite">
        {!messages.length && <p>No messages yet. Start the conversation.</p>}
        {messages.map((m) => (
          <article key={m.id} className={m.userId === user?.id ? 'is-own' : ''}>
            <small>{m.isSystem ? 'Queue update' : nameOf(people.find((p) => p.id === m.userId) || {})}</small>
            <p>{m.text}</p>
            <time>
              {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </time>
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={send}>
        <input
          aria-label="Message to queue"
          placeholder="Message the queue…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !text.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
