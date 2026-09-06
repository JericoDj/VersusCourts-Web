import { useEffect, useState } from 'react'
import { Search, X, ChevronDown, User, Check, Copy, Share2, AlertCircle } from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import '../styles/queue-header-action.css'

const QUEUE_REPORT_CATEGORIES = [
  'Price tampering or fee discrepancy',
  'No-show or host abandoned queue',
  'Inappropriate description or rules',
  'Spam or misleading event',
  'Other',
]

export default function QueueHeaderAction({ action, queue, user, canInvite, onClose, onLogin }) {
  // Search state for invites
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [searching, setSearching] = useState(false)
  const [sent, setSent] = useState([])

  // Report state
  const [reportCategory, setReportCategory] = useState(QUEUE_REPORT_CATEGORIES[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reported, setReported] = useState(false)

  // Status & feedback
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const link = `${window.location.origin}/q/${encodeURIComponent(queue.id)}`

  // Debounced live search for players
  useEffect(() => {
    const q = query.trim()
    if (action !== 'invite' || q.length < 2) {
      setPlayers([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timeout = setTimeout(() => {
      apiList('/users/search', { query: { q } })
        .then((res) => setPlayers(res || []))
        .catch((e) => {
          console.error('Search failed:', e)
          setPlayers([])
        })
        .finally(() => setSearching(false))
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, action])

  const formatPlayerName = (p) => {
    const first = p.firstName || ''
    const last = p.lastName || ''
    if (first && last) return `${first} ${last[0]}.`
    if (first) return first
    if (p.name) return p.name
    return p.username || 'Player'
  }

  const handleInvite = async (p) => {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/queues/${queue.id}/invites`, {
        method: 'POST',
        body: { inviteeId: p.id },
      })
      setSent((prev) => [...prev, p.id])
      setMessage(`Invitation sent to ${formatPlayerName(p)}.`)
    } catch (e) {
      setError(e.message || 'Could not send invitation.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const reason = reportDetails.trim()
        ? `${reportCategory} — ${reportDetails.trim()}`
        : reportCategory
      await apiRequest('/reports', {
        method: 'POST',
        body: {
          targetType: 'QUEUE',
          targetId: queue.id,
          reason,
        },
      })
      setReported(true)
    } catch (e) {
      setError(e.message || 'Could not submit report. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Queue link copied to clipboard.')
    } catch {
      setError('Select and copy the link above to share.')
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: queue.title || 'Versus Courts Queue',
          url: link,
        })
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      }
    }
  }

  const titleText =
    action === 'invite'
      ? 'Invite players'
      : action === 'report'
      ? `Report ${queue.title || 'Queue'}`
      : 'Share queue'

  return (
    <section className="queue-action-card">
      <div className="queue-action-card__header">
        <h3 className="queue-action-card__title">{titleText}</h3>
        {onClose && (
          <button
            type="button"
            className="queue-action-card__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {error && <div className="queue-action-alert-error">{error}</div>}
      {message && (
        <div className="queue-action-alert-success">
          <Check size={16} />
          {message}
        </div>
      )}

      {/* REPORT ACTION (media_1788702498699) */}
      {action === 'report' ? (
        reported ? (
          <div>
            <div className="queue-action-alert-success" style={{ margin: '12px 0' }}>
              <Check size={18} />
              Thanks — we’ll look into it.
            </div>
            <div className="queue-action-buttons">
              <button
                type="button"
                className="queue-action-btn-submit"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : !user ? (
          <div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 14px' }}>
              Sign in to report this queue.
            </p>
            <button
              type="button"
              className="queue-action-btn-submit"
              onClick={onLogin}
            >
              Sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport}>
            <div className="queue-action-field">
              <label className="queue-action-label">Reason for report</label>
              <div className="queue-action-select-wrap">
                <select
                  className="queue-action-select"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  disabled={busy}
                >
                  {QUEUE_REPORT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="queue-action-select-arrow" />
              </div>
            </div>

            <div className="queue-action-field" style={{ marginTop: '14px' }}>
              <label className="queue-action-label">Additional details (optional)</label>
              <textarea
                className="queue-action-textarea"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Explain what happened…"
                disabled={busy}
                rows={3}
              />
            </div>

            <div className="queue-action-buttons">
              {onClose && (
                <button
                  type="button"
                  className="queue-action-btn-cancel"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="queue-action-btn-submit"
                disabled={busy}
              >
                {busy ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )
      ) : null}

      {/* INVITE ACTION (media_1788702438864 & media_1788702470370) */}
      {action === 'invite' ? (
        !user ? (
          <div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 14px' }}>
              Sign in to invite players to this queue.
            </p>
            <button
              type="button"
              className="queue-action-btn-submit"
              onClick={onLogin}
            >
              Sign in
            </button>
          </div>
        ) : !canInvite ? (
          <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>
            Only the queue host or co-host can invite players.
          </p>
        ) : (
          <div>
            <div className="queue-invite-search-wrap">
              <Search size={17} className="queue-invite-search-icon" />
              <input
                type="text"
                className="queue-invite-search-input"
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="queue-invite-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {query.trim().length < 2 ? (
              <div className="queue-invite-hint">
                Type at least 2 characters to search for a player.
              </div>
            ) : searching ? (
              <div className="queue-invite-hint">Searching players...</div>
            ) : players.filter((p) => p.id !== user.id).length === 0 ? (
              <div className="queue-invite-hint">No players found matching "{query}".</div>
            ) : (
              <div className="queue-invite-list">
                {players
                  .filter((p) => p.id !== user.id)
                  .map((p) => {
                    const joined = queue.participants?.some(
                      (m) =>
                        (m.userId || m.user?.id) === p.id && m.status === 'JOINED'
                    )
                    const isSent = sent.includes(p.id)
                    const pName = formatPlayerName(p)
                    return (
                      <div className="queue-invite-item" key={p.id}>
                        <div className="queue-invite-item__left">
                          <div className="queue-invite-avatar">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="" />
                            ) : (
                              <User size={18} />
                            )}
                          </div>
                          <div className="queue-invite-info">
                            <span className="queue-invite-name">{pName}</span>
                            {p.username && (
                              <span className="queue-invite-username">@{p.username}</span>
                            )}
                          </div>
                        </div>

                        {joined ? (
                          <span className="queue-invite-badge-joined">Joined</span>
                        ) : isSent ? (
                          <span className="queue-invite-badge-invited">Invited ✓</span>
                        ) : (
                          <button
                            type="button"
                            className="queue-invite-btn"
                            disabled={busy}
                            onClick={() => handleInvite(p)}
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )
      ) : null}

      {/* SHARE ACTION */}
      {action === 'share' ? (
        <div>
          <p style={{ color: '#64748b', fontSize: '13.5px', margin: '0 0 12px' }}>
            Share this link to let others view and join this queue directly.
          </p>
          <div className="queue-invite-search-wrap" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <input
              type="text"
              className="queue-invite-search-input"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="queue-action-buttons" style={{ marginTop: '14px' }}>
            <button
              type="button"
              className="queue-action-btn-submit"
              onClick={handleCopyLink}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={16} />
              Copy link
            </button>
            {typeof navigator.share === 'function' && (
              <button
                type="button"
                className="queue-action-btn-cancel"
                onClick={handleNativeShare}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Share2 size={16} />
                Share via…
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
