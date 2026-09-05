import { ArrowLeft, CalendarDays, EyeOff, Info, MapPin, MessageSquare, MoreHorizontal, Share2, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import LoginDialog from './LoginDialog'
import QueueSportIcon from './QueueSportIcon'
import ManageQueue from './ManageQueue'
import QueueHeaderAction from './QueueHeaderAction'
import { queueFormatLabel } from '../data/queueFormat'
import { QueueChat, QueueMatches } from './QueueActivity'
import { sportColor, sportGradient, sportLabel } from '../data/sports'
import '../styles/modals.css'

const playerName = (player) => {
  const user = player.user || player
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Player'
}

export default function QueueDetailDialog({ queue, onClose }) {
  const { user } = useAuth()
  const { joinedQueues, toggleQueue, setNotice } = usePlayer()
  const { getQueueDetail, joinQueue: joinRemoteQueue } = useQueues()
  const [detail, setDetail] = useState(queue)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [headerAction, setHeaderAction] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [joinState, setJoinState] = useState(joinedQueues.includes(queue.id) ? 'joined' : 'idle')

  useEffect(() => {
    const controller = new AbortController()
    getQueueDetail(queue.id, { signal: controller.signal })
      .then((remoteQueue) => { if (remoteQueue) setDetail((current) => ({ ...current, ...remoteQueue })) })
      .catch((error) => { if (error.name !== 'AbortError') setDetail(queue) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [getQueueDetail, queue])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || loginOpen) return
      if (headerAction) setHeaderAction(null)
      else if (manageOpen) setManageOpen(false)
      else if (chatOpen) setChatOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [loginOpen, onClose, manageOpen, chatOpen, headerAction])

  const sport = String(detail.sport || queue.sport || 'basketball').toLowerCase()
  const participants = useMemo(() => (detail.participants || []).filter((participant) => !participant.status || participant.status === 'JOINED'), [detail.participants])
  const count = detail._count?.participants ?? (participants.length || detail.players || queue.players || 0)
  const capacity = detail.playersNeeded || detail.max || queue.max || 1
  const progress = Math.min(100, Math.round((count / capacity) * 100))
  const venue = detail.court?.name || detail.court?.branch?.name || detail.customCourtName || detail.venue || queue.venue
  const area = detail.court?.branch?.address || detail.customArea
  const host = detail.host ? playerName(detail.host) : detail.hostName || queue.host || 'Versus Courts host'
  const start = detail.startTime
    ? new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(detail.startTime))
    : detail.time || queue.time
  const fee = detail.entryFee ?? detail.fee ?? queue.fee ?? 0
  const title = detail.title || queue.title
  const canManage = Boolean(user?.id && (detail.hostId === user.id || detail.host?.id === user.id || participants.some((p) => (p.userId || p.user?.id) === user.id && p.isHost)))
  const alreadyJoined = joinState === 'joined' || Boolean(user?.id && (
    detail.hostId === user.id || detail.host?.id === user.id ||
    participants.some((p) => (p.userId || p.user?.id) === user.id)
  ))
  const openChat = () => {
    if (!user) { setLoginOpen(true); return }
    if (!alreadyJoined) { setActionMessage('Join this queue to chat with the group.'); return }
    setHeaderAction(null)
    setActionMessage('')
    setManageOpen(false)
    setChatOpen(true)
  }
  const isHiddenFromPublic = Boolean(detail.isHiddenFromPublic ?? queue.isHiddenFromPublic)
  const isTimePassed = Boolean(detail.isTimePassed ?? queue.isTimePassed)
  const spotsLeft = Math.max(0, capacity - count)
  const mapQuery = [venue, area].filter(Boolean).join(', ')
  const gameFormat = queueFormatLabel({ ...detail, sport })
  const skills = detail.skills || []
  const skillLabel = skills.length === 4 ? 'All Levels' : detail.level || detail.skill || queue.level || 'All Levels'

  const joinQueue = async () => {
    if (!user) {
      setLoginOpen(true)
      return
    }
    if (joinedQueues.includes(queue.id)) {
      setJoinState('joined')
      return
    }
    setJoinState('joining')
    try {
      const refreshed = await joinRemoteQueue(queue.id)
      setDetail(refreshed)
      if (!joinedQueues.includes(queue.id)) toggleQueue(queue.id)
      setJoinState('joined')
      setNotice('You joined the queue. We’ll remind you before game time.')
    } catch (error) {
      setJoinState('error')
      setNotice(error.message || 'Unable to join this queue right now.')
    }
  }

  return <>
    <div className="dialog-overlay queue-detail-overlay" role="presentation" onClick={onClose}>
      <section
        className="dialog queue-detail-dialog-v2"
        style={{ '--queue-color': sportColor(sport) }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="queue-detail-top-bar">
          <div className="queue-detail-top-bar__left">
            <button className="queue-detail-back-btn" type="button" onClick={() => {
              if (headerAction) setHeaderAction(null)
              else if (manageOpen) setManageOpen(false)
              else if (chatOpen) setChatOpen(false)
              else onClose()
            }} aria-label={headerAction || manageOpen || chatOpen ? 'Back to previous view' : 'Close game details'}><ArrowLeft size={21} /></button>
            <h2 className="queue-detail-top-title" id="queue-detail-title">Queue / Openplay</h2>
          </div>
          <div className="queue-detail-top-actions">
            <button className="queue-detail-icon-btn" type="button" aria-label="Invite players" onClick={() => { setHeaderAction('invite'); setActionMessage('') }}><UserPlus size={20} /></button>
            <button className="queue-detail-icon-btn" type="button" aria-label="Open queue chat" onClick={openChat}><MessageSquare size={20} /></button>
            <button className="queue-detail-icon-btn" type="button" aria-label="Share game" onClick={() => { setHeaderAction('share'); setActionMessage('') }}><Share2 size={20} /></button>
            <button className="queue-detail-icon-btn" type="button" aria-label="Report queue" title="Report queue" onClick={() => { setHeaderAction('report'); setActionMessage('') }}><MoreHorizontal size={20} /></button>
          </div>
        </header>

        <div className="queue-detail-scroll-body">
          {actionMessage && <p role="status">{actionMessage}</p>}
          {headerAction ? <QueueHeaderAction key={headerAction} action={headerAction} queue={detail} user={user} canInvite={canManage} onLogin={() => setLoginOpen(true)} /> : manageOpen ? <ManageQueue queue={detail} user={user} onBack={() => setManageOpen(false)} onUpdated={(updated) => setDetail((current) => ({ ...current, ...updated }))} /> : chatOpen ? <QueueChat queue={detail} user={user} onBack={() => setChatOpen(false)} /> : <>
          <section className="queue-detail-hero-card" style={{ background: sportGradient(sport) }}>
            <div className="queue-detail-hero-top">
              <span className="queue-detail-hero-icon"><QueueSportIcon sport={sport} /></span>
              <div className="queue-detail-hero-titles"><h3 className="queue-detail-hero-title">{title}</h3><span className="queue-detail-hero-sport">{sportLabel(sport)}</span></div>
              <span className="queue-detail-hero-status-pill">{String(detail.status || 'Open').toLowerCase()}</span>
            </div>
            <div className="queue-detail-hero-tags"><span className="queue-detail-hero-tag">{skillLabel}</span><span className="queue-detail-hero-tag">{gameFormat}</span></div>
            <div className="queue-detail-hero-host"><span className="queue-detail-hero-host-avatar">{detail.host?.avatarUrl ? <img src={detail.host.avatarUrl} alt="" /> : host[0]}</span>Hosted by {host} ›</div>
            {venue && <div className="queue-detail-hero-location"><MapPin size={16} />{venue}{area ? ` · ${area}` : ''}</div>}
            <div className="queue-detail-hero-stats">
              <div className="queue-detail-hero-stat-col"><span className="queue-detail-hero-stat-top"><CalendarDays size={14} />{start}</span><span className="queue-detail-hero-stat-sub">Scheduled time</span></div>
              <div className="queue-detail-hero-stat-col"><span className="queue-detail-hero-stat-val">₱{fee || 0}</span><span className="queue-detail-hero-stat-sub">Entry fee</span></div>
              <div className="queue-detail-hero-stat-col"><span className="queue-detail-hero-stat-val">{area || venue || 'TBA'}</span><span className="queue-detail-hero-stat-sub">Location</span></div>
            </div>
          </section>

          {isHiddenFromPublic && <div className="queue-time-passed-banner"><EyeOff size={14} /><span>Scheduled time has ended — hidden from public discovery.</span></div>}

          <section className="queue-detail-white-card">
            <div className="queue-detail-white-card__top"><h3 className="queue-detail-white-card__title">Looking for players</h3><span className="queue-detail-white-card__count" style={{ color: 'var(--queue-color)' }}>{count}/{capacity}</span></div>
            <div className="queue-detail-progress-bar"><div className="queue-detail-progress-bar__fill" style={{ width: `${progress}%`, background: 'var(--queue-color)' }} /></div>
            <p className="queue-detail-white-card__sub">{spotsLeft ? `${spotsLeft} more ${spotsLeft === 1 ? 'player' : 'players'} needed` : 'This game is full'}</p>
          </section>

          <section className="queue-detail-white-card">
            <div className="queue-detail-notes-header"><Info size={18} style={{ color: 'var(--vc-primary)' }} />Details</div>
            <p className="queue-detail-notes-body">{detail.description || detail.notes || 'No additional notes from the host.'}</p>
          </section>

          {mapQuery && <a className="queue-detail-map-card" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noreferrer">
            <div className="queue-detail-map-preview-wrap"><iframe title={`Map of ${venue}`} src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} loading="lazy" /><span className="queue-detail-map-pin-overlay" style={{ color: 'var(--queue-color)' }}><MapPin size={24} /></span></div>
            <div className="queue-detail-map-footer"><MapPin size={18} />View location</div>
          </a>}

          {canManage && <section className="queue-detail-white-card"><h3>You are hosting this queue</h3><p>Add guests, set matches, and declare results.</p><button type="button" className="queue-detail-action-btn queue-detail-action-btn--primary" onClick={() => setManageOpen(true)}>Manage Queue</button></section>}
          <QueueMatches queue={detail} />
          {loading && <p className="queue-detail-dialog__loading">Refreshing game details…</p>}
          {joinState === 'error' && <p className="queue-detail-dialog__error">This game could not be joined here. Please try in the Player app.</p>}
          </>}
        </div>

        {!headerAction && !chatOpen && !manageOpen && <footer className="queue-detail-bottom-bar">
          {isTimePassed && !alreadyJoined ? <button type="button" className="queue-detail-action-btn queue-detail-action-btn--disabled" disabled>Game time has passed</button> : <button type="button" className="queue-detail-action-btn queue-detail-action-btn--primary" onClick={alreadyJoined ? openChat : joinQueue} disabled={joinState === 'joining'}>{alreadyJoined ? <><MessageSquare size={18} />Chat Queue Group</> : joinState === 'joining' ? 'Joining…' : <><Users size={18} />Join Queue</>}</button>}
        </footer>}
      </section>
    </div>
    <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
  </>
}
