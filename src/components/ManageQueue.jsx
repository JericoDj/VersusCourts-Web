import { useCallback, useEffect, useState } from 'react'
import {
  Shuffle,
  Hand,
  Search,
  Award,
  Trash2,
  Pencil,
  Users,
  Grid2X2,
  Ticket,
  X,
  CalendarDays,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Lock,
  LockOpen,
  Check,
  Shield,
  Flag,
  Hourglass,
  AlertCircle,
  Banknote,
  Plus,
  Minus,
  Clock,
} from 'lucide-react'
import { apiList, apiRequest } from '../data/apiClient'
import socketService from '../data/socketService'
import { cyclePlayerTeam, queueFormatLabel, queueTeamSize } from '../data/queueFormat'
import QueueSportIcon from './QueueSportIcon'
import MatchEditor from './QueueMatchEditor'
import QueueVenueFields from './QueueVenueFields'
import { sportColor, sportLabel } from '../data/sports'
import '../styles/manage-queue.css'

const nameOf = (p) => p?.name || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Player'
const shortName = (p) => p?.firstName ? `${p.firstName}${p.lastName ? ` ${p.lastName[0]}.` : ''}` : nameOf(p)

function ConfirmDialog({ modal, onClose, busy }) {
  const [inputValue, setInputValue] = useState(modal.initialInputValue || '')
  if (!modal) return null

  const IconComponent = modal.icon || AlertCircle
  const variant = modal.variant || 'danger'

  const handleConfirm = async (e) => {
    e?.preventDefault()
    const saved = await modal.onConfirm(inputValue)
    if (saved !== false) onClose()
  }

  return (
    <div className="manage-confirm-backdrop" onClick={() => { if (!busy) onClose() }}>
      <div
        className="manage-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) {
            e.stopPropagation()
            onClose()
          }
        }}
      >
        <div className="manage-confirm-content">
          <div className={`manage-confirm-icon manage-confirm-icon--${variant}`}>
            <IconComponent size={22} />
          </div>
          <div className="manage-confirm-text">
            <h3 id="confirm-title">{modal.title}</h3>
            {modal.description && <p>{modal.description}</p>}
          </div>
        </div>

        {modal.inputPlaceholder !== undefined && (
          <form id="confirm-modal-form" onSubmit={handleConfirm} className="manage-confirm-form">
            <input
              type="text"
              placeholder={modal.inputPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              className="manage-confirm-input"
            />
          </form>
        )}

        <div className="manage-confirm-actions">
          <button
            type="button"
            className="manage-confirm-btn-cancel"
            disabled={busy}
            onClick={onClose}
          >
            {modal.cancelText || 'Cancel'}
          </button>
          <button
            type={modal.inputPlaceholder !== undefined ? 'submit' : 'button'}
            form={modal.inputPlaceholder !== undefined ? 'confirm-modal-form' : undefined}
            className={`manage-confirm-btn-confirm manage-confirm-btn-confirm--${variant}`}
            disabled={busy}
            onClick={modal.inputPlaceholder === undefined ? handleConfirm : undefined}
          >
            {modal.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MatchHistoryCard({ match, basketball, disabled, finished, run, onConfirmModal }) {
  const sets = [...(match.sets || [])].sort((a, b) => a.setNumber - b.setNumber)
  const scores = basketball
    ? [sets.at(-1)?.scoreA || 0, sets.at(-1)?.scoreB || 0]
    : [sets.filter((s) => s.scoreA > s.scoreB).length, sets.filter((s) => s.scoreB > s.scoreA).length]
  return (
    <article className="manage-history-card">
      <div className="manage-history-card__teams">
        <span>{match.playersA?.map(shortName).join(' & ') || 'Team A'}</span>
        <b>{scores[0]}–{scores[1]}</b>
        <span>{match.playersB?.map(shortName).join(' & ') || 'Team B'}</span>
      </div>
      {!!sets.length && (
        <p className="manage-history-card__scores">
          <Award size={14} />
          {sets.map((s) => `${s.scoreA}–${s.scoreB}`).join(' · ')}
        </p>
      )}
      <div className="manage-history-card__footer">
        <span>● Completed</span>
        {!finished && (
          <button
            type="button"
            aria-label="Delete match"
            disabled={disabled}
            onClick={() => onConfirmModal({
              title: 'Delete match?',
              description: 'Delete this match and its scores? This cannot be undone.',
              confirmText: 'Delete',
              variant: 'danger',
              icon: Trash2,
              onConfirm: () => run(`/queues/matches/${match.id}`, undefined, 'DELETE')
            })}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  )
}

const localDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const statusLabel = (status) => {
  const s = String(status || 'OPEN').toUpperCase()
  if (s === 'COMPLETED' || s === 'FINISHED') return 'Finished'
  if (s === 'CANCELLED') return 'Cancelled'
  if (s === 'STARTED') return 'Ongoing'
  if (s === 'FULL') return 'Full'
  return 'Open'
}

const formatDateTimeRange = (start, end) => {
  if (!start) return ''
  const d = new Date(start)
  if (Number.isNaN(d.getTime())) return ''
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
  const startTimeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
  if (!end) return `${dateStr} · ${startTimeStr}`
  const e = new Date(end)
  const endTimeStr = !Number.isNaN(e.getTime()) ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(e) : ''
  return endTimeStr ? `${dateStr} · ${startTimeStr} – ${endTimeStr}` : `${dateStr} · ${startTimeStr}`
}

function QueueHeaderCard({ game, playingCount, finished, onEditDetails, onEditFormat }) {
  return (
    <section className="manage-queue__summary">
      <div className="manage-queue__summary-top">
        <div
          className="manage-queue__sport-icon"
          style={{ color: sportColor(String(game.sport).toLowerCase()) }}
        >
          <QueueSportIcon sport={String(game.sport).toLowerCase()} size={24} />
        </div>
        <div className="manage-queue__summary-info">
          <h4>{game.title || `${sportLabel(game.sport)} Queue`}</h4>
          <small>{sportLabel(game.sport)}</small>
        </div>
        <div className="manage-queue__summary-actions">
          {!finished && (
            <button
              className="manage-queue__pencil"
              type="button"
              aria-label="Edit game details"
              onClick={onEditDetails}
            >
              <Pencil size={16} />
            </button>
          )}
          <span className={`manage-queue__status is-${statusLabel(game.status).toLowerCase()}`}>
            <span className="manage-queue__status-dot" />
            {statusLabel(game.status)}
          </span>
        </div>
      </div>

      <p className="manage-queue__datetime">
        <CalendarDays size={13} />
        <span>{formatDateTimeRange(game.startTime, game.endTime || game.rules?.endTime)}</span>
      </p>

      {game.description && (
        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', lineHeight: 1.4 }}>
          {game.description}
        </p>
      )}

      {game.isHiddenFromPublic && (
        <p className="manage-queue__hidden">
          Scheduled time has ended. This queue is hidden from public discovery.
        </p>
      )}

      <div className="manage-queue__summary-pills">
        <span className="manage-queue__pill">
          <Users size={14} />
          {playingCount}/{game.playersNeeded} players
        </span>
        <button
          type="button"
          className="manage-queue__pill manage-queue__pill-btn-inline"
          disabled={finished}
          onClick={onEditFormat}
        >
          <Grid2X2 size={14} />
          {queueFormatLabel(game)}
          {!finished && <Pencil size={12} />}
        </button>
        <span className="manage-queue__pill manage-queue__fee">
          <Ticket size={14} />
          {Number(game.entryFee) ? `₱${game.entryFee}/player` : 'Free'}
        </span>
      </div>
    </section>
  )
}


function CourtMatchEditor({ match, save, disabled, onConfirmModal }) {
  const [a, setA] = useState(match.scoreA || 0)
  const [b, setB] = useState(match.scoreB || 0)
  const [result, setResult] = useState('')
  return (
    <section className="queue-detail-white-card manage-match-editor">
      <h4>{match.court || 'Court match'}</h4>
      <p>{match.teamA.join(' / ')} vs {match.teamB.join(' / ')}</p>
      {match.completed ? (
        <p>Final: {match.scoreA}–{match.scoreB} · {match.result === 'tie' ? 'Draw' : match.result === 'teamA' ? 'Team A won' : 'Team B won'}</p>
      ) : (
        <fieldset disabled={disabled}>
          <form onSubmit={(e) => { e.preventDefault(); save({ ...match, scoreA: Number(a), scoreB: Number(b) }) }}>
            <div className="manage-queue__row">
              <label>Team A<input type="number" min="0" required value={a} onChange={(e) => setA(e.target.value)} /></label>
              <label>Team B<input type="number" min="0" required value={b} onChange={(e) => setB(e.target.value)} /></label>
            </div>
            <button>Save score</button>
          </form>
          <label>Result
            <select value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">Select result</option>
              <option value="teamA">Team A wins</option>
              <option value="teamB">Team B wins</option>
              <option value="tie">Draw</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!result}
            onClick={() => onConfirmModal({
              title: 'Finish court match?',
              description: 'Finish this court match and record its final score?',
              confirmText: 'Finish match',
              variant: 'primary',
              icon: Award,
              onConfirm: () => save({ ...match, scoreA: Number(a), scoreB: Number(b), completed: true, result })
            })}
          >
            Finish court match
          </button>
        </fieldset>
      )}
    </section>
  )
}

export default function ManageQueue({ queue, user, onBack, onUpdated }) {
  const [game, setGame] = useState(queue)
  const [tab, setTab] = useState('scoreboard')
  const [editor, setEditor] = useState(null)
  const [matches, setMatches] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')
  const [manual, setManual] = useState(false)
  const [teams, setTeams] = useState({})
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestInput, setGuestInput] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [fmtCourtCount, setFmtCourtCount] = useState(1)
  const [fmtMode, setFmtMode] = useState('DOUBLES')
  const [fmtBestOf, setFmtBestOf] = useState(3)
  const [fmtPoints, setFmtPoints] = useState(21)
  const [fmtBasketballFormat, setFmtBasketballFormat] = useState('5x5')
  const [fmtMinPerQuarter, setFmtMinPerQuarter] = useState(10)
  const [capacityVal, setCapacityVal] = useState(10)
  const [coHostQuery, setCoHostQuery] = useState('')
  const [coHostSearchResults, setCoHostSearchResults] = useState([])
  const [coHostSearching, setCoHostSearching] = useState(false)
  const [coHostInvitedIds, setCoHostInvitedIds] = useState(new Set())
  const [descLength, setDescLength] = useState(0)

  const base = `/queues/${queue.id}`
  const primaryHost = user?.id && (game.hostId === user.id || game.host?.id === user.id)
  const coHost = user?.id && game.participants?.some((p) => (p.userId || p.user?.id) === user.id && p.isHost && p.status === 'JOINED')
  const finished = ['COMPLETED', 'CANCELLED'].includes(game.status)
  const basketball = String(game.sport).toUpperCase() === 'BASKETBALL'
  const teamSize = queueTeamSize(game)
  const ongoing = matches.filter((m) => m.status === 'ONGOING')
  const occupied = new Set(ongoing.flatMap((m) => [...m.teamA, ...m.teamB]))
  const roster = [
    ...(game.participants || []).filter((p) => p.status === 'JOINED' && (game.hostIsPlaying !== false || p.userId !== game.hostId)).map((p) => ({ id: p.userId || p.user?.id, name: nameOf(p.user) })),
    ...(game.localPlayers || []).map((name) => ({ id: `guest:${name}`, name })),
  ].filter((p) => !occupied.has(p.id))

  const openEditor = (nextEditor) => {
    if (nextEditor) {
      setError('')
      setNotice('')
      if (nextEditor === 'format') {
        setFmtCourtCount(Number(game.rules?.courtCount) || 1)
        setFmtMode(game.rules?.mode?.toUpperCase() === 'SINGLES' ? 'SINGLES' : 'DOUBLES')
        setFmtBestOf(Number(game.rules?.bestOf) || 3)
        setFmtPoints(Number(game.rules?.points) || (String(game.sport).toLowerCase() === 'pickleball' ? 11 : 21))
        setFmtBasketballFormat(game.rules?.format || '5x5')
        setFmtMinPerQuarter(Number(game.rules?.minutesPerQuarter) || 10)
      } else if (nextEditor === 'capacity') {
        setCapacityVal(Math.max(2, Number(game.playersNeeded) || 2))
      } else if (nextEditor === 'cohost') {
        setCoHostQuery('')
        setCoHostSearchResults([])
        setCoHostSearching(false)
      } else if (nextEditor === 'details') {
        setDescLength((game.description || '').length)
      }
    }
    setEditor(nextEditor)
  }

  // Co-host user search (queries /users/search like mobile PlayerPickerSheet)
  useEffect(() => {
    const q = coHostQuery.trim()
    if (editor !== 'cohost' || q.length < 2) {
      const clear = setTimeout(() => { setCoHostSearchResults([]); setCoHostSearching(false) }, 0)
      return () => clearTimeout(clear)
    }

    const timeout = setTimeout(() => {
      setCoHostSearching(true)
      apiList('/users/search', { query: { q } })
        .then((users) => {
          const hostIds = new Set([
            game.hostId,
            game.host?.id,
            ...(game.participants || []).filter((p) => p.isHost).map((p) => p.userId || p.user?.id)
          ])
          setCoHostSearchResults((users || []).filter((u) => !hostIds.has(u.id)))
        })
        .catch((e) => {
          console.error('Co-host search failed:', e)
          setCoHostSearchResults([])
        })
        .finally(() => setCoHostSearching(false))
    }, 300)

    return () => clearTimeout(timeout)
  }, [coHostQuery, editor, game.hostId, game.host?.id, game.participants])

  // Refreshes queue and matches from backend
  const refreshData = useCallback(async (signal) => {
    try {
      const [detail, rows] = await Promise.all([
        apiRequest(base, { signal }),
        apiList(`${base}/matches`, { signal })
      ])
      setGame(detail)
      setMatches(rows)
      onUpdated?.(detail)
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Failed to sync queue data:', e)
    }
  }, [base, onUpdated])

  // Real-time synchronization via Socket.IO + room join + polling fallback
  useEffect(() => {
    const controller = new AbortController()
    const initialRefresh = setTimeout(() => refreshData(controller.signal), 0)

    // Connect WebSocket and join this specific queue room
    socketService.connect()
    socketService.joinQueueRoom(queue.id)

    const handleQueueUpdate = () => {
      if (!editor) {
        refreshData()
      }
    }
    const handleMatchUpdate = () => {
      apiList(`${base}/matches`).then(setMatches).catch(() => {})
    }

    socketService.addEventListener('queue:update', handleQueueUpdate)
    socketService.addEventListener('queue:match_update', handleMatchUpdate)

    // Polling fallback: if socket is disconnected, poll every 4s; if connected, safe 12s heartbeat
    // Pauses background polling while an editor sheet is open to prevent race conditions
    const pollTimer = setInterval(() => {
      if (!editor) {
        refreshData()
      }
    }, socketService.isConnected ? 12000 : 4000)

    return () => {
      controller.abort()
      clearTimeout(initialRefresh)
      clearInterval(pollTimer)
      socketService.leaveQueueRoom(queue.id)
      socketService.removeEventListener('queue:update', handleQueueUpdate)
      socketService.removeEventListener('queue:match_update', handleMatchUpdate)
    }
  }, [queue.id, base, refreshData, editor])

  const run = async (path, body, method = 'PATCH') => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      if (path === `${base}/status` && body?.status === 'COMPLETED' && game.liveMatches?.length) {
        path = `${base}/publish-results`
        body = { matches: game.liveMatches }
        method = 'POST'
      }
      await apiRequest(path, { method, body })
      const [detail, rows] = await Promise.all([apiRequest(base), apiList(`${base}/matches`)])
      setGame(detail); setMatches(rows); onUpdated?.(detail); setNotice('Saved.'); setPreview(null); setEditor(null)
      return true
    } catch (e) {
      console.error('Queue operation error:', e)
      setError(e.message || 'Action failed. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleInviteCoHost = async (targetUser) => {
    const targetId = targetUser.id || targetUser.userId
    const targetName = targetUser.firstName ? `${targetUser.firstName} ${targetUser.lastName || ''}`.trim() : (targetUser.name || 'Player')
    setBusy(true)
    setError('')
    try {
      await apiRequest(`${base}/invites`, {
        method: 'POST',
        body: { inviteeId: targetId, asHost: true }
      })
      setCoHostInvitedIds((prev) => new Set([...prev, targetId]))
      setNotice(`Invited ${targetName} to co-host.`)
    } catch (e) {
      setError(e.message || 'Could not send co-host invite.')
    } finally {
      setBusy(false)
    }
  }

  const saveDetails = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget))
      const payload = {}
      if (data.title?.trim()) payload.title = data.title.trim()
      if (data.description !== undefined) payload.description = data.description.trim()
      if (data.startTime) {
        const d = new Date(data.startTime)
        if (isNaN(d.getTime())) throw new Error('Please select a valid start date & time.')
        payload.startTime = d.toISOString()
      }
      if (data.endTime && data.endTime.trim()) {
        const d = new Date(data.endTime)
        if (isNaN(d.getTime())) throw new Error('Please select a valid end date & time.')
        payload.endTime = d.toISOString()
      }
      const effectiveStart = payload.startTime || game.startTime
      const effectiveEnd = payload.endTime || game.endTime || game.rules?.endTime
      if (effectiveStart && effectiveEnd && new Date(effectiveEnd) <= new Date(effectiveStart)) {
        throw new Error('End date & time must be after the start date & time.')
      }
      if (data.courtId?.trim()) {
        payload.courtId = data.courtId.trim()
      } else {
        const venueName = data.customCourtName?.trim() || data.venue?.trim()
        if (venueName) payload.customCourtName = venueName
        const areaName = data.customArea !== undefined ? data.customArea.trim() : (data.area?.trim() || '')
        if (areaName) payload.customArea = areaName
        if (data.customLat && !isNaN(Number(data.customLat))) {
          payload.customLat = Number(data.customLat)
        }
        if (data.customLng && !isNaN(Number(data.customLng))) {
          payload.customLng = Number(data.customLng)
        }
      }
      await run(base, payload)
    } catch (e) {
      setError(e.message || 'Could not update queue details.')
    }
  }

  const saveRules = async (event) => {
    event.preventDefault()
    setError('')
    const currentRules = typeof game.rules === 'object' && game.rules !== null ? { ...game.rules } : {}
    currentRules.courtCount = Number(fmtCourtCount) || 1
    if (basketball) {
      delete currentRules.mode
      delete currentRules.bestOf
      delete currentRules.points
      delete currentRules.scoring
      currentRules.format = fmtBasketballFormat
      currentRules.minutesPerQuarter = Number(fmtMinPerQuarter) || 10
    } else {
      delete currentRules.format
      delete currentRules.quarters
      delete currentRules.minutesPerQuarter
      currentRules.mode = fmtMode
      currentRules.bestOf = Number(fmtBestOf) || 3
      currentRules.points = Number(fmtPoints) || (String(game.sport).toLowerCase() === 'pickleball' ? 11 : 21)
      currentRules.scoring = `${fmtMode === 'SINGLES' ? 'Singles' : 'Doubles'} · ${currentRules.bestOf === 1 ? '1 Set' : `Best of ${currentRules.bestOf}`} · ${currentRules.points} pts`
    }
    await run(`${base}/rules`, { rules: currentRules })
  }

  const saveCapacity = async (event) => {
    event.preventDefault()
    setError('')
    const val = Math.max(2, Math.min(200, Number(capacityVal) || 2))
    await run(`${base}/capacity`, { playersNeeded: val })
  }

  const finishPreview = async () => {
    setBusy(true); setError('')
    try { setPreview(await apiRequest(`${base}/completion-preview`)) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  if (!primaryHost && !coHost) {
    return (
      <div className="queue-detail-white-card">
        <p>Only the queue host or co-host can manage this queue.</p>
        <button onClick={onBack}>Back to queue</button>
      </div>
    )
  }

  const hostIsPlaying = game.hostIsPlaying !== false
  const playingParticipants = (game.participants || []).filter((p) => {
    if (p.status && p.status !== 'JOINED') return false
    const isHost = p.userId === game.hostId || p.user?.id === game.hostId || p.isHost
    if (!hostIsPlaying && isHost) return false
    return true
  })
  const playingCount = playingParticipants.length + (game.localPlayers || []).length

  const visibleRoster = (game.participants || [])
    .filter((p) => !['CANCELLED', 'DECLINED'].includes(p.status))
    .filter((p) => {
      const isHost = p.userId === game.hostId || p.user?.id === game.hostId || p.isHost
      if (!hostIsPlaying && isHost) return false
      return true
    })

  const joinRequests = (game.participants || []).filter((p) => p.status === 'REQUESTED')
  const acceptedRequests = (game.participants || []).filter(
    (p) => p.status === 'ACCEPTED' || (p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING')
  )
  const activeJoined = visibleRoster.filter(
    (p) => p.status === 'JOINED' && !(p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING')
  )

  const eligibleCoHosts = (game.participants || []).filter(
    (p) => p.status === 'JOINED' && !p.isHost && (p.userId || p.user?.id) !== game.hostId
  )

  return (
    <div className="manage-queue">
      {/* Top Header */}
      <div className="manage-queue__header">
        {onBack && (
          <button
            type="button"
            className="manage-queue__back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h2 className="manage-queue__title">Manage Queue</h2>
      </div>

      {/* Navigation Tabs */}
      <div className="manage-queue__tabs" role="tablist" aria-label="Queue management">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'scoreboard'}
          onClick={() => setTab('scoreboard')}
        >
          Scoreboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'management'}
          onClick={() => setTab('management')}
        >
          Management
        </button>
      </div>

      {/* Summary Card */}
      <QueueHeaderCard
        game={game}
        playingCount={playingCount}
        finished={finished}
        onEditDetails={() => openEditor('details')}
        onEditFormat={() => openEditor('format')}
      />

      {error && <p role="alert" className="manage-queue__error" style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
      {notice && <p role="status" style={{ color: '#16a34a', fontSize: '13px' }}>{notice}</p>}
      {busy && <p role="status" style={{ color: '#64748b', fontSize: '12px' }}>Saving / refreshing…</p>}

      {/* Modals & Sheets */}
      {editor && (
        <div
          className="manage-editor-backdrop"
          onClick={() => { if (!busy) setEditor(null) }}
        >
          <section
            className="manage-editor-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={
              editor === 'details'
                ? 'Edit game details'
                : editor === 'format'
                ? 'Edit game format'
                : editor === 'cohost'
                ? 'Invite a co-host'
                : 'Edit player capacity'
            }
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                if (!busy) setEditor(null)
              }
            }}
          >
            <button
              type="button"
              className="manage-editor-close"
              aria-label="Close editor"
              disabled={busy}
              onClick={() => setEditor(null)}
              autoFocus
            >
              <X size={20} />
            </button>
            {error && <p role="alert" className="manage-queue__error" style={{ color: '#dc2626', marginBottom: '8px' }}>{error}</p>}

            {editor === 'details' ? (
              <div>
                <div className="manage-editor-sheet__header">
                  <h3 className="manage-editor-sheet__title">Edit Queue Details</h3>
                  <p className="manage-editor-sheet__subtitle">Update queue title, description, schedule, or venue.</p>
                </div>
                <form onSubmit={saveDetails}>
                  <fieldset disabled={busy || finished} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div className="manage-form-card">
                      <label className="manage-form-card__label">Title</label>
                      <input
                        className="manage-form-card__input"
                        name="title"
                        defaultValue={game.title || ''}
                        placeholder="e.g. Friday Badminton Nights"
                        required
                      />
                    </div>

                    <div className="manage-form-card">
                      <label className="manage-form-card__label">Description</label>
                      <textarea
                        className="manage-form-card__textarea"
                        name="description"
                        defaultValue={game.description || ''}
                        placeholder="Add queue rules, notes, or details..."
                        maxLength={5000}
                        onChange={(e) => setDescLength(e.target.value.length)}
                      />
                      <div className="manage-form-card__counter">{descLength}/5000</div>
                    </div>

                    <div className="manage-form-card-grid">
                      <div className="manage-form-card">
                        <label className="manage-form-card__label"><CalendarDays size={13} /> Start Time</label>
                        <input
                          className="manage-form-card__input"
                          name="startTime"
                          type="datetime-local"
                          required
                          defaultValue={localDate(game.startTime)}
                        />
                      </div>
                      <div className="manage-form-card">
                        <label className="manage-form-card__label"><Clock size={13} /> End Time</label>
                        <input
                          className="manage-form-card__input"
                          name="endTime"
                          type="datetime-local"
                          defaultValue={localDate(game.endTime || game.rules?.endTime)}
                        />
                      </div>
                    </div>

                    {!game.courtId && (
                      <QueueVenueFields game={game} />
                    )}

                    {error && (
                      <div className="manage-editor-inline-error" role="alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="manage-editor-actions">
                      <button type="submit" className="manage-editor-save-btn" disabled={busy}>
                        {busy ? 'Saving…' : 'Save Details'}
                      </button>
                      <button
                        type="button"
                        className="manage-editor-cancel-btn"
                        disabled={busy}
                        onClick={() => setEditor(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </fieldset>
                </form>
              </div>
            ) : editor === 'format' ? (
              <div>
                <div className="manage-editor-sheet__header">
                  <h3 className="manage-editor-sheet__title">Game Format & Rules</h3>
                  <p className="manage-editor-sheet__subtitle">
                    Update the courts count, match format, sets, or points for this queue.
                  </p>
                </div>
                <form onSubmit={saveRules}>
                  <fieldset disabled={busy || finished} style={{ border: 'none', padding: 0, margin: 0 }}>
                    {/* Number of Courts */}
                    <div className="manage-editor-section">
                      <label className="manage-editor-section__label">Number of Courts</label>
                      <div className="manage-stepper-row">
                        <div className="manage-stepper-display">
                          <Grid2X2 size={18} className="manage-stepper-icon" />
                          <span className="manage-stepper-value">{fmtCourtCount}</span>
                          <span className="manage-stepper-unit">{fmtCourtCount === 1 ? 'Court' : 'Courts'}</span>
                        </div>
                        <div className="manage-stepper-controls">
                          <button
                            type="button"
                            className="manage-stepper-btn"
                            disabled={busy || fmtCourtCount <= 1}
                            onClick={() => setFmtCourtCount((c) => Math.max(1, c - 1))}
                            title="Decrease courts"
                          >
                            <Minus size={18} />
                          </button>
                          <button
                            type="button"
                            className="manage-stepper-btn"
                            disabled={busy || fmtCourtCount >= 50}
                            onClick={() => setFmtCourtCount((c) => Math.min(50, c + 1))}
                            title="Increase courts"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Match Format */}
                    <div className="manage-editor-section">
                      <label className="manage-editor-section__label">Match Format</label>
                      {basketball ? (
                        <div className="manage-segmented-group">
                          {['1x1', '3x3', '5x5'].map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              className={`manage-segmented-btn ${fmtBasketballFormat === fmt ? 'active' : ''}`}
                              onClick={() => setFmtBasketballFormat(fmt)}
                            >
                              {fmt.replace('x', 'v')}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="manage-segmented-group">
                          <button
                            type="button"
                            className={`manage-segmented-btn ${fmtMode === 'SINGLES' ? 'active' : ''}`}
                            onClick={() => setFmtMode('SINGLES')}
                          >
                            Singles
                          </button>
                          <button
                            type="button"
                            className={`manage-segmented-btn ${fmtMode === 'DOUBLES' ? 'active' : ''}`}
                            onClick={() => setFmtMode('DOUBLES')}
                          >
                            Doubles
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sets or Minutes */}
                    {basketball ? (
                      <div className="manage-editor-section">
                        <label className="manage-editor-section__label">Minutes per Quarter</label>
                        <div className="manage-segmented-group">
                          {[7, 10, 12].map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={`manage-segmented-btn ${fmtMinPerQuarter === m ? 'active' : ''}`}
                              onClick={() => setFmtMinPerQuarter(m)}
                            >
                              {m} min
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="manage-editor-section">
                          <label className="manage-editor-section__label">Sets (Best of)</label>
                          <div className="manage-segmented-group">
                            <button
                              type="button"
                              className={`manage-segmented-btn ${fmtBestOf === 1 ? 'active' : ''}`}
                              onClick={() => setFmtBestOf(1)}
                            >
                              1 Set
                            </button>
                            <button
                              type="button"
                              className={`manage-segmented-btn ${fmtBestOf === 3 ? 'active' : ''}`}
                              onClick={() => setFmtBestOf(3)}
                            >
                              Best of 3
                            </button>
                            <button
                              type="button"
                              className={`manage-segmented-btn ${fmtBestOf === 5 ? 'active' : ''}`}
                              onClick={() => setFmtBestOf(5)}
                            >
                              Best of 5
                            </button>
                          </div>
                        </div>

                        <div className="manage-editor-section">
                          <label className="manage-editor-section__label">Points per Game</label>
                          <div className="manage-segmented-group">
                            {[11, 15, 21, 30].map((pts) => (
                              <button
                                key={pts}
                                type="button"
                                className={`manage-segmented-btn ${fmtPoints === pts ? 'active' : ''}`}
                                onClick={() => setFmtPoints(pts)}
                              >
                                {pts} pts
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {error && (
                      <div className="manage-editor-inline-error" role="alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="manage-editor-actions">
                      <button type="submit" className="manage-editor-save-btn" disabled={busy}>
                        {busy ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        className="manage-editor-cancel-btn"
                        disabled={busy}
                        onClick={() => setEditor(null)}
                      >
                        Cancel Changes
                      </button>
                    </div>
                  </fieldset>
                </form>
              </div>
            ) : editor === 'cohost' ? (
              <div>
                <div className="manage-editor-sheet__header">
                  <h3 className="manage-editor-sheet__title">
                    <Shield size={20} color="#8b5cf6" />
                    Invite a co-host
                  </h3>
                  <p className="manage-editor-sheet__subtitle">
                    Choose a joined player or search any player by name to grant host privileges.
                  </p>
                </div>

                <div className="manage-search-input-wrap">
                  <Search size={16} className="manage-search-icon" />
                  <input
                    type="text"
                    value={coHostQuery}
                    onChange={(e) => setCoHostQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="manage-search-input"
                    autoFocus
                  />
                  {coHostQuery && (
                    <button
                      type="button"
                      className="manage-search-clear"
                      onClick={() => setCoHostQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {coHostQuery.trim().length >= 2 ? (
                  <div>
                    {coHostSearching ? (
                      <p className="manage-editor-empty">Searching players...</p>
                    ) : coHostSearchResults.length === 0 ? (
                      <p className="manage-editor-empty">No players found matching "{coHostQuery}".</p>
                    ) : (
                      <div className="manage-queue__players-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {coHostSearchResults.map((u) => {
                          const uid = u.id || u.userId
                          const pName = u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : (u.name || 'Player')
                          const initial = pName.charAt(0).toUpperCase()
                          const isInvited = coHostInvitedIds.has(uid)
                          return (
                            <div className="manage-queue__player-item" key={uid}>
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="manage-queue__avatar" />
                              ) : (
                                <div className="manage-queue__avatar manage-queue__avatar--player">
                                  {initial}
                                </div>
                              )}
                              <div className="manage-queue__player-info">
                                <span className="manage-queue__player-name">{pName}</span>
                                {u.username && (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>@{u.username}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className={isInvited ? "manage-queue__btn-secondary-sm" : "manage-queue__btn-primary-sm"}
                                disabled={busy || isInvited}
                                onClick={() => handleInviteCoHost(u)}
                              >
                                {isInvited ? 'Invited ✓' : 'Invite Co-Host'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', padding: '16px 12px 18px', color: '#64748b', fontSize: '13px' }}>
                      Type at least 2 characters to search for a player.
                    </div>

                    {eligibleCoHosts.length > 0 && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '6px' }}>
                        <h4 style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, margin: '0 0 10px', letterSpacing: '0.04em' }}>
                          Joined Players (In Queue)
                        </h4>
                        <div className="manage-queue__players-list" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          {eligibleCoHosts.map((p) => {
                            const uid = p.userId || p.user?.id
                            const pName = nameOf(p.user)
                            return (
                              <div className="manage-queue__player-item" key={uid}>
                                <div className="manage-queue__avatar manage-queue__avatar--player">
                                  {pName ? pName.trim().charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div className="manage-queue__player-info">
                                  <span className="manage-queue__player-name">{pName}</span>
                                </div>
                                <button
                                  type="button"
                                  className="manage-queue__btn-primary-sm"
                                  disabled={busy}
                                  onClick={() => run(`${base}/participants/${uid}/host`, { isHost: true })}
                                >
                                  Make Co-Host
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="manage-editor-sheet__header">
                  <h3 className="manage-editor-sheet__title">Players Needed</h3>
                  <p className="manage-editor-sheet__subtitle">
                    How many players this queue needs — app joiners and guests both count.
                  </p>
                </div>
                <form onSubmit={saveCapacity}>
                  <fieldset disabled={busy} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div className="manage-capacity-stepper">
                      <button
                        type="button"
                        className="manage-capacity-btn"
                        disabled={busy || capacityVal <= 2}
                        onClick={() => setCapacityVal((c) => Math.max(2, c - 1))}
                        title="Decrease players"
                      >
                        <Minus size={22} />
                      </button>
                      <span className="manage-capacity-number">{capacityVal}</span>
                      <button
                        type="button"
                        className="manage-capacity-btn"
                        disabled={busy || capacityVal >= 200}
                        onClick={() => setCapacityVal((c) => Math.min(200, c + 1))}
                        title="Increase players"
                      >
                        <Plus size={22} />
                      </button>
                    </div>
                    {error && (
                      <div className="manage-editor-inline-error" role="alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="manage-editor-actions">
                      <button type="submit" className="manage-editor-save-btn" disabled={busy}>
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Finish Preview Confirmation Sheet */}
      {preview && (
        <div className="manage-editor-backdrop" onClick={() => setPreview(null)}>
          <section className="manage-editor-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="manage-editor-close"
              aria-label="Close"
              onClick={() => setPreview(null)}
            >
              <X size={20} />
            </button>
            <div className="manage-queue__finish-card">
              <div className="manage-queue__finish-header">
                <div className="manage-queue__finish-icon">
                  <Flag size={22} color="var(--vc-primary, #2563eb)" />
                </div>
                <div>
                  <h3>Finish Queue?</h3>
                  <p>This will close the queue, publish results, and finalize the session.</p>
                </div>
              </div>
              <div className="manage-queue__finish-stats">
                <div><span>Players served</span><b>{preview.playersServed}</b></div>
                <div><span>Online collected</span><b>₱{preview.totalOnlinePaid}</b></div>
                <div><span>Cash collected</span><b>₱{preview.totalCashPaid}</b></div>
                <div><span>Platform fee</span><b>₱{preview.totalPlatformFee}</b></div>
                <div><span>Amount owed by host</span><b>₱{preview.amountOwedByHost}</b></div>
              </div>
              <div className="manage-queue__finish-actions">
                <button
                  type="button"
                  className="manage-queue__btn-secondary"
                  onClick={() => setPreview(null)}
                >
                  Keep queue open
                </button>
                <button
                  type="button"
                  className="manage-queue__btn-danger"
                  onClick={() => run(`${base}/status`, { status: 'COMPLETED' })}
                >
                  Confirm and finish
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab Content */}
      {tab === 'scoreboard' ? (
        <>
          {(game.liveMatches || []).map((m) => (
            <CourtMatchEditor
              key={m.id}
              match={m}
              disabled={busy || finished}
              onConfirmModal={setConfirmModal}
              save={(updated) => run(`${base}/live-matches`, { liveMatches: game.liveMatches.map((item) => item.id === updated.id ? updated : item) })}
            />
          ))}
          {!primaryHost && (
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Match creation and registered-match scoring require the primary host. You can manage players and court matches as co-host.
            </p>
          )}
          {ongoing.map((m) => (
            <MatchEditor
              key={m.id}
              match={m}
              run={run}
              game={game}
              onScoresSaved={(sets) => { if (sets) setMatches((rows) => rows.map((row) => row.id === m.id ? { ...row, sets } : row)) }}
              disabled={busy || !primaryHost}
              finished={finished}
              onConfirmModal={setConfirmModal}
            />
          ))}
          {!ongoing.length && !(game.liveMatches || []).some((m) => !m.completed) && (
            <p className="manage-queue__empty">No ongoing matches.</p>
          )}
          {!finished && (() => {
            const matchSize = teamSize * 2
            const canStartMatch = roster.length >= matchSize
            const neededCount = matchSize - roster.length

            return (
              <section className="queue-detail-white-card manage-match-queue">
                <h3>Match Queue</h3>
                {!canStartMatch ? (
                  <div className="manage-match-queue__needed-card">
                    <div className="manage-match-queue__needed-icon">
                      <Users size={16} />
                    </div>
                    <div className="manage-match-queue__needed-content">
                      <span className="manage-match-queue__needed-title">
                        Need {neededCount} more player{neededCount !== 1 ? 's' : ''} to start a match
                      </span>
                      <span className="manage-match-queue__needed-detail">
                        {roster.length}/{matchSize} players ready · {queueFormatLabel(game)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="manage-match-queue__subtitle">
                    Auto-pair players fairly, or pick teams yourself.
                  </p>
                )}

                <fieldset disabled={busy || !primaryHost || !canStartMatch}>
                  <div className="manage-match-queue__actions">
                    <button
                      className="manage-match-queue__auto"
                      type="button"
                      disabled={!canStartMatch || busy || !primaryHost}
                      onClick={() => { setManual(false); run(`${base}/matches`, { teamSize }, 'POST') }}
                    >
                      <Shuffle size={18} />Auto
                    </button>
                    <button
                      className="manage-match-queue__manual"
                      type="button"
                      disabled={!canStartMatch || busy || !primaryHost}
                      aria-expanded={manual}
                      onClick={() => { setTeams({}); setError(''); setManual(true) }}
                    >
                      <Hand size={18} />Manual
                    </button>
                  </div>
                </fieldset>
              </section>
            )
          })()}

          <div className="manage-history-search">
            <Search size={20} />
            <input
              aria-label="Search match history"
              placeholder="Search match history by player name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <h3 className="manage-history-title">Match history</h3>
          {(() => {
            const completed = matches.filter((m) => m.status !== 'ONGOING')
            const filtered = completed.filter((m) =>
              [...(m.playersA || []), ...(m.playersB || [])].map(nameOf).join(' ').toLowerCase().includes(search.toLowerCase())
            )

            if (completed.length === 0) {
              return <p className="manage-queue__empty">No completed matches yet.</p>
            }
            if (filtered.length === 0) {
              return <p className="manage-queue__empty">No matches found for "{search}".</p>
            }
            return filtered.map((m) => (
              <MatchHistoryCard
                key={m.id}
                match={m}
                basketball={basketball}
                run={run}
                disabled={busy || !primaryHost}
                finished={finished}
                onConfirmModal={setConfirmModal}
              />
            ))
          })()}
        </>
      ) : (
        <>
          {/* Players Section Card */}
          <section className="manage-queue__roster">
            <div className="manage-queue__roster-heading">
              <h3>Players</h3>
              <button
                type="button"
                className="manage-queue__capacity-btn"
                disabled={finished}
                onClick={() => openEditor('capacity')}
              >
                <span>{queueFormatLabel(game)} · {game.playersNeeded} needed</span>
                {!finished && <Pencil size={13} />}
              </button>
            </div>

            <fieldset disabled={busy || finished} style={{ border: 'none', padding: 0, margin: 0 }}>
              {/* Host is playing toggle */}
              <label className="manage-queue__switch-row">
                <div className="manage-queue__switch-info">
                  <span className="manage-queue__switch-title">I'll be playing too</span>
                  <span className="manage-queue__switch-subtitle">Off if you're just running the queue, not playing.</span>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={game.hostIsPlaying !== false}
                  onChange={(e) => run(`${base}/host-playing`, { hostIsPlaying: e.target.checked })}
                />
              </label>

              {/* Player list */}
              <div className="manage-queue__players-list">
                {/* Guests */}
                {(game.localPlayers || []).map((name, i) => (
                  <div className="manage-queue__player-item" key={`guest-${name}-${i}`}>
                    <div className="manage-queue__avatar manage-queue__avatar--guest">
                      {name ? name.trim().charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div className="manage-queue__player-info">
                      <span className="manage-queue__player-name">{name}</span>
                    </div>
                    <span className="manage-queue__badge manage-queue__badge--guest">
                      <span className="manage-queue__badge-dot" />
                      Guest
                    </span>
                    {!finished && (
                      <button
                        type="button"
                        className="manage-queue__remove-btn"
                        aria-label={`Remove guest ${name}`}
                        onClick={() => setConfirmModal({
                          title: 'Remove guest?',
                          description: `Remove guest ${name} from this queue?`,
                          confirmText: 'Remove',
                          variant: 'danger',
                          icon: Trash2,
                          onConfirm: () => run(`${base}/local-players`, {
                            localPlayers: game.localPlayers.filter((_, index) => index !== i)
                          })
                        })}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Joined Participants */}
                {activeJoined.map((p) => {
                  const uid = p.userId || p.user?.id
                  const isHost = uid === game.hostId || p.isHost
                  const pName = nameOf(p.user)
                  return (
                    <div className="manage-queue__player-item" key={p.id || uid}>
                      <div className={`manage-queue__avatar ${isHost ? 'manage-queue__avatar--host' : 'manage-queue__avatar--player'}`}>
                        {pName ? pName.trim().charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div className="manage-queue__player-info">
                        <span className="manage-queue__player-name">{pName}</span>
                        {Number(game.entryFee) > 0 && !isHost && (
                          <span className="manage-queue__player-sub">
                            {p.paymentMethod === 'CASH' ? 'Cash' : 'Online'} · {p.amountPaid > 0 ? `₱${p.amountPaid}` : 'Promo'}
                          </span>
                        )}
                      </div>
                      {isHost && (
                        <span className="manage-queue__badge manage-queue__badge--host">
                          <span className="manage-queue__badge-dot" />
                          {uid === game.hostId ? 'Host' : 'Co-Host'}
                        </span>
                      )}
                      {!isHost && uid !== game.hostId && !finished && (
                        <button
                          type="button"
                          className="manage-queue__remove-btn"
                          aria-label={`Remove player ${pName}`}
                          onClick={() => setConfirmModal({
                            title: 'Remove player?',
                            description: `Are you sure you want to remove ${pName} from the queue?`,
                            inputPlaceholder: 'Reason for removal (optional)',
                            confirmText: 'Remove player',
                            variant: 'danger',
                            icon: UserMinus,
                            onConfirm: (reason) => run(`${base}/participants/${uid}/remove`, {
                              reason: reason?.trim() || 'Removed by host'
                            }, 'DELETE')
                          })}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Join Requests */}
                {joinRequests.length > 0 && (
                  <>
                    <h4 className="manage-queue__section-subheading">Join requests</h4>
                    {joinRequests.map((p) => {
                      const uid = p.userId || p.user?.id
                      const pName = nameOf(p.user)
                      return (
                        <div className="manage-queue__player-item" key={p.id || uid}>
                          <div className="manage-queue__avatar manage-queue__avatar--guest">
                            {pName ? pName.trim().charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="manage-queue__player-info">
                            <span className="manage-queue__player-name">{pName}</span>
                          </div>
                          <div className="manage-queue__request-actions">
                            <button
                              type="button"
                              className="manage-queue__btn-decline"
                              aria-label="Decline request"
                              title="Decline"
                              onClick={() => run(`${base}/participants/${uid}/decline-request`, {})}
                            >
                              <X size={18} />
                            </button>
                            <button
                              type="button"
                              className="manage-queue__btn-approve"
                              aria-label="Approve request"
                              title="Approve"
                              onClick={() => run(`${base}/participants/${uid}/approve-request`, {})}
                            >
                              <Check size={18} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Awaiting Payment */}
                {acceptedRequests.length > 0 && (
                  <>
                    <h4 className="manage-queue__section-subheading">Awaiting payment</h4>
                    {acceptedRequests.map((p) => {
                      const uid = p.userId || p.user?.id
                      const pName = nameOf(p.user)
                      return (
                        <div className="manage-queue__player-item" key={p.id || uid}>
                          <div className="manage-queue__avatar manage-queue__avatar--warning">
                            {pName ? pName.trim().charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="manage-queue__player-info">
                            <span className="manage-queue__player-name">{pName}</span>
                          </div>
                          {p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING' ? (
                            <button
                              type="button"
                              className="manage-queue__btn-primary-sm"
                              onClick={() => setConfirmModal({
                                title: 'Confirm Cash Received',
                                description: `Confirm that you have received cash payment from ${pName}?`,
                                confirmText: 'Confirm cash',
                                variant: 'success',
                                icon: Banknote,
                                onConfirm: () => run(`${base}/participants/${uid}/confirm-cash`, {})
                              })}
                            >
                              Confirm cash
                            </button>
                          ) : (
                            <span className="manage-queue__badge manage-queue__badge--warning">
                              <Hourglass size={12} />
                              Approved
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Add Guest Button / Inline Form */}
              {!finished && (
                showAddGuest ? (
                  <form
                    className="manage-queue__add-guest-form"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const name = guestInput.trim()
                      if (name) {
                        const ok = await run(`${base}/local-players`, {
                          localPlayers: [...(game.localPlayers || []), name]
                        })
                        if (ok) {
                          setGuestInput('')
                          setShowAddGuest(false)
                        }
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter guest name"
                      value={guestInput}
                      onChange={(e) => setGuestInput(e.target.value)}
                      autoFocus
                      required
                    />
                    <div className="manage-queue__add-guest-buttons">
                      <button
                        type="button"
                        className="manage-queue__btn-secondary"
                        onClick={() => { setShowAddGuest(false); setGuestInput('') }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="manage-queue__btn-primary"
                        disabled={busy || !guestInput.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="manage-queue__add-guest-btn"
                    onClick={() => setShowAddGuest(true)}
                  >
                    <UserPlus size={16} />
                    <span>Add Guest</span>
                  </button>
                )
              )}
            </fieldset>
          </section>

          {/* Action Buttons Section */}
          {!finished && (
            <section className="manage-queue__actions">
              {['OPEN', 'FULL'].includes(game.status) && (
                <>
                  <button
                    type="button"
                    className="manage-queue__pill-btn manage-queue__pill-btn--primary"
                    disabled={busy}
                    onClick={() => run(`${base}/status`, { status: 'STARTED' })}
                  >
                    Start Queue
                  </button>
                  <button
                    type="button"
                    className="manage-queue__pill-btn manage-queue__pill-btn--finish"
                    disabled={busy}
                    onClick={finishPreview}
                  >
                    Finish / Close Queue
                  </button>
                </>
              )}

              {game.status === 'STARTED' && (
                <>
                  {/* Lock / Unlock Join Requests */}
                  <button
                    type="button"
                    className={`manage-queue__pill-btn manage-queue__pill-btn--lock ${game.requestsLocked ? 'is-locked' : 'is-unlocked'}`}
                    disabled={busy}
                    onClick={() => run(`${base}/requests-lock`, { requestsLocked: !game.requestsLocked })}
                  >
                    {game.requestsLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                    <span>{game.requestsLocked ? 'Unlock Join Requests' : 'Lock Join Requests'}</span>
                  </button>

                  {/* Allow players to score matches toggle */}
                  <label className="manage-queue__switch-row manage-queue__switch-row--card">
                    <div className="manage-queue__switch-info">
                      <span className="manage-queue__switch-title">Allow players to score matches</span>
                      <span className="manage-queue__switch-subtitle">
                        Any joined player can record scores, not just you.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={!!game.playersCanScore}
                      disabled={busy}
                      onChange={(e) => run(`${base}/players-can-score`, { playersCanScore: e.target.checked })}
                    />
                  </label>

                  {/* Finish Queue */}
                  <button
                    type="button"
                    className="manage-queue__pill-btn manage-queue__pill-btn--finish"
                    disabled={busy || ongoing.length > 0 || (game.liveMatches || []).some((m) => !m.completed)}
                    onClick={finishPreview}
                  >
                    Finish Queue
                  </button>

                  {(ongoing.length > 0 || (game.liveMatches || []).some((m) => !m.completed)) && (
                    <p className="manage-queue__actions-hint">
                      Finish ongoing matches before closing the queue.
                    </p>
                  )}
                </>
              )}

              {/* Active Co-hosts */}
              {(game.participants || [])
                .filter((p) => p.isHost && (p.userId || p.user?.id) !== game.hostId && p.status === 'JOINED')
                .map((coHostUser) => {
                  const uid = coHostUser.userId || coHostUser.user?.id
                  return (
                    <div className="manage-queue__cohost-item" key={uid}>
                      <Shield size={16} color="#8b5cf6" />
                      <span>{nameOf(coHostUser.user)} · Co-Host</span>
                      <button
                        type="button"
                        className="manage-queue__btn-text-danger"
                        onClick={() => setConfirmModal({
                          title: 'Remove co-host?',
                          description: `${nameOf(coHostUser.user)} will go back to being a regular player in the queue.`,
                          confirmText: 'Remove',
                          variant: 'danger',
                          icon: Shield,
                          onConfirm: () => run(`${base}/participants/${uid}/host`, { isHost: false })
                        })}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}

              {/* Invite Co-Host */}
              <button
                type="button"
                className="manage-queue__pill-btn manage-queue__pill-btn--cohost"
                disabled={busy}
                onClick={() => openEditor('cohost')}
              >
                <UserPlus size={18} />
                <span>Invite Co-Host</span>
              </button>
            </section>
          )}
        </>
      )}

      {manual && (() => {
        const teamA = roster.filter((player) => teams[player.id] === 'A').map((player) => player.id)
        const teamB = roster.filter((player) => teams[player.id] === 'B').map((player) => player.id)
        const ready = !busy && !finished && primaryHost && teamA.length === teamSize && teamB.length === teamSize
        return (
          <div className="manage-confirm-backdrop manage-pairing-backdrop" onClick={() => { if (!busy) setManual(false) }}>
            <section className="manage-pairing-sheet" role="dialog" aria-modal="true" aria-labelledby="pairing-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') { event.stopPropagation(); if (!busy) setManual(false) }
                if (event.key === 'Tab') {
                  const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]
                  const first = buttons[0], last = buttons.at(-1)
                  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
                  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
                }
              }}>
              <div className="manage-pairing-grip" aria-hidden="true" />
              <header><h3 id="pairing-title">Pick Teams</h3><button type="button" autoFocus disabled={busy} onClick={() => setManual(false)} aria-label="Close team picker"><X size={20} /></button></header>
              <p className="manage-pairing-hint">{teamSize === 1 ? 'Singles: 1 player per team.' : `${teamSize} players per team.`} Tap to assign or change teams. Full teams are skipped.</p>
              <div className="manage-pairing-counts" aria-live="polite"><span>Team A · {teamA.length}/{teamSize}</span><span>Team B · {teamB.length}/{teamSize}</span></div>
              <div className="manage-pairing-roster">
                {roster.map((player) => {
                  const team = teams[player.id] || ''
                  return <button type="button" key={player.id} className={`manage-pairing-player${team ? ` is-team-${team.toLowerCase()}` : ''}`} disabled={busy || finished || !primaryHost}
                    aria-label={`${player.name}, ${team ? `Team ${team}` : 'unassigned'}. Change team`}
                    onClick={() => setTeams((current) => cyclePlayerTeam(current, player.id, roster, teamSize))}>
                    <span className="manage-pairing-avatar">{player.name.trim().charAt(0).toUpperCase() || '?'}</span><b>{player.name}</b><span className="manage-pairing-team">{team ? `Team ${team}` : 'Tap to assign'}</span>
                  </button>
                })}
                {!roster.length && <p>No available players right now.</p>}
              </div>
              {error && <p className="manage-pairing-error" role="alert">{error}</p>}
              <button type="button" className="manage-pairing-submit" disabled={!ready} onClick={async () => {
                if (!ready) return
                const saved = await run(`${base}/matches`, { teamSize, teamA, teamB }, 'POST')
                if (saved) { setManual(false); setTeams({}) }
              }}>{busy ? 'Queuing Match…' : 'Queue Match'}</button>
            </section>
          </div>
        )
      })()}

      {/* In-App Confirmation Dialog */}
      {confirmModal && (
        <ConfirmDialog
          modal={confirmModal}
          busy={busy}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
