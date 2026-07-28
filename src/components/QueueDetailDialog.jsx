import { CalendarDays, Check, MapPin, Share2, ShieldCheck, Users, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import LoginDialog from './LoginDialog'
import { SportPill } from './Cards'

const sportColors = {
  basketball: '#ff6b16',
  badminton: '#18b968',
  pickleball: '#e8ad08',
  tennis: '#2377d7',
  padel: '#17b8ce',
}

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
    const onKeyDown = (event) => { if (event.key === 'Escape' && !loginOpen) onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [loginOpen, onClose])

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
  const alreadyJoined = joinState === 'joined'

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
        className="dialog queue-detail-dialog"
        style={{ '--queue-color': sportColors[sport] || sportColors.basketball }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog__close" type="button" onClick={onClose} aria-label="Close game details"><X size={20} /></button>
        <header className="queue-detail-dialog__hero">
          <div className="queue-detail-dialog__hero-top">
            <SportPill sport={sport} />
            <span className="queue-detail-dialog__status"><Zap size={13} /> {String(detail.status || 'OPEN').toLowerCase()}</span>
          </div>
          <h2 id="queue-detail-title">{title}</h2>
          <p><MapPin size={15} /> {venue}{area ? ` · ${area}` : ''}</p>
        </header>

        <div className="queue-detail-dialog__body">
          <div className="queue-detail-dialog__host">
            <span>{detail.host?.avatarUrl ? <img src={detail.host.avatarUrl} alt="" /> : host[0]}</span>
            <div><small>HOSTED BY</small><b>{host}</b></div>
            <button type="button" aria-label="Share game" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={18} /></button>
          </div>

          <div className="queue-detail-dialog__facts">
            <article><span><CalendarDays size={18} /></span><div><small>SCHEDULE</small><b>{start}</b></div></article>
            <article><span><ShieldCheck size={18} /></span><div><small>LEVEL</small><b>{detail.level || detail.skill || queue.level || 'All levels'}</b></div></article>
            <article><span><Zap size={18} /></span><div><small>ENTRY</small><b>{fee ? `₱${fee}` : 'Free'}</b></div></article>
          </div>

          <section className="queue-detail-dialog__fill">
            <div><div><small>PLAYERS</small><h3>{count} of {capacity} joined</h3></div><b>{Math.max(0, capacity - count)} {capacity - count === 1 ? 'spot' : 'spots'} left</b></div>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
          </section>

          {(detail.description || detail.rules) && <section className="queue-detail-dialog__section"><h3>Game details</h3>{detail.description && <p>{detail.description}</p>}{detail.rules && <div className="queue-detail-dialog__rules">{Object.entries(detail.rules).map(([label, value]) => <span key={label}>{String(label).replaceAll('_', ' ')} · <b>{String(value)}</b></span>)}</div>}</section>}

          <section className="queue-detail-dialog__section queue-detail-dialog__players">
            <div className="queue-detail-dialog__section-title"><h3>Players</h3><span>{count}/{capacity}</span></div>
            <div>
              {participants.slice(0, 6).map((participant) => {
                const participantUser = participant.user || participant
                const name = playerName(participant)
                return <article key={participant.id || participantUser.id || name}><span>{participantUser.avatarUrl ? <img src={participantUser.avatarUrl} alt="" /> : name[0]}</span><b>{name.split(' ')[0]}</b></article>
              })}
              {!participants.length && <p><Users size={20} /> Player names will appear here as people join.</p>}
            </div>
          </section>

          {loading && <p className="queue-detail-dialog__loading">Refreshing game details…</p>}
          {joinState === 'error' && <p className="queue-detail-dialog__error">This game could not be joined here. Please try in the Player app.</p>}
          <button type="button" className={alreadyJoined ? 'button button--joined queue-detail-dialog__join' : 'button button--primary queue-detail-dialog__join'} onClick={joinQueue} disabled={alreadyJoined || joinState === 'joining'}>
            {alreadyJoined ? <><Check size={18} /> Joined</> : joinState === 'joining' ? 'Joining…' : 'Join queue'}
          </button>
        </div>
      </section>
    </div>
    <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
  </>
}
