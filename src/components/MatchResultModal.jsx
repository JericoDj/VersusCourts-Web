import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, CheckCircle2, Copy, X, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function MatchResultModal({ notification, onClose }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  if (!notification) return null

  const data = notification.data || {}
  const winner = data.winner // 'A', 'B', 'TIE'
  const setsA = data.setsA || '0'
  const setsB = data.setsB || '0'
  const queueId = data.queueId

  let sets = []
  try {
    if (typeof data.sets === 'string') {
      sets = JSON.parse(data.sets)
    } else if (Array.isArray(data.sets)) {
      sets = data.sets
    }
  } catch {
    sets = []
  }

  let playersA = []
  try {
    if (typeof data.playersA === 'string') {
      playersA = JSON.parse(data.playersA)
    } else if (Array.isArray(data.playersA)) {
      playersA = data.playersA
    }
  } catch {
    playersA = []
  }

  let playersB = []
  try {
    if (typeof data.playersB === 'string') {
      playersB = JSON.parse(data.playersB)
    } else if (Array.isArray(data.playersB)) {
      playersB = data.playersB
    }
  } catch {
    playersB = []
  }

  const handleCopyLink = () => {
    const url = queueId ? `${window.location.origin}/app/queues/${queueId}` : window.location.href
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewQueue = () => {
    onClose()
    if (queueId) {
      navigate(`/app/queues/${queueId}`)
    } else {
      navigate('/app/queues')
    }
  }

  const isTie = winner === 'TIE'
  const teamAWon = winner === 'A'

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal notif-modal--match" onClick={(e) => e.stopPropagation()}>
        <button className="notif-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="notif-modal__hero">
          <div className={`notif-modal__trophy ${isTie ? 'notif-modal__trophy--tie' : ''}`}>
            <Trophy size={36} />
          </div>
          <h2 className="notif-modal__title">
            {isTie ? 'Match Result 🤝' : 'Match Final Score 🏆'}
          </h2>
          <p className="notif-modal__subtitle">{notification.body}</p>
        </div>

        {/* Scorecard Hero */}
        <div className="match-scorecard">
          <div className={`match-team ${teamAWon ? 'match-team--winner' : ''}`}>
            <div className="match-team__badge">{teamAWon ? 'WINNER' : 'TEAM A'}</div>
            <div className="match-team__name">
              {playersA.length > 0 ? playersA.join(' & ') : 'Team A'}
            </div>
            <div className="match-team__score">{setsA}</div>
          </div>

          <div className="match-scorecard__vs">vs</div>

          <div className={`match-team ${winner === 'B' ? 'match-team--winner' : ''}`}>
            <div className="match-team__badge">{winner === 'B' ? 'WINNER' : 'TEAM B'}</div>
            <div className="match-team__name">
              {playersB.length > 0 ? playersB.join(' & ') : 'Team B'}
            </div>
            <div className="match-team__score">{setsB}</div>
          </div>
        </div>

        {/* Set by set breakdown */}
        {sets.length > 0 && (
          <div className="match-sets-breakdown">
            <h4 className="match-sets-breakdown__title">Set Scores</h4>
            <div className="match-sets-grid">
              {sets.map((set, idx) => (
                <div key={idx} className="match-set-chip">
                  <span className="match-set-chip__label">Set {set.setNumber || idx + 1}</span>
                  <span className="match-set-chip__score">
                    {set.scoreA ?? 0} - {set.scoreB ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="notif-modal__actions">
          <button className="notif-modal__btn notif-modal__btn--secondary" onClick={handleCopyLink}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Link Copied!' : 'Share Match'}</span>
          </button>
          <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleViewQueue}>
            <span>View Queue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
