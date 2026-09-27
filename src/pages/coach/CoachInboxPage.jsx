import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import ChatView from '../../components/ChatView'
import { useChat } from '../../context/ChatContext'
import { useCoach } from '../../context/CoachContext'
import { formatRelativeTime } from '../../utils/dateUtils'
import '../../styles/chat.css'

/// Coach inbox (coach_inbox_screen.dart): chats players opened with the
/// coach identity — never mixed into the player's own Messages.
export default function CoachInboxPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { coachThreads } = useChat()
  const { identity } = useCoach()

  if (threadId) {
    return (
      <div className="coach-page coach-chat">
        <ChatView threadId={threadId} onBack={() => navigate('/coach/messages')} />
      </div>
    )
  }

  const sorted = [...coachThreads].sort((a, b) =>
    new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0))

  return (
    <div className="coach-page">
      <div className="coach-page__head">
        <button type="button" className="tr-icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={18} /></button>
        <h1>Messages</h1>
      </div>
      <p className="coach-hint">Players messaging {identity.name}.</p>
      {sorted.length ? sorted.map((t) => (
        <button key={t.id} type="button" className="coach-row" onClick={() => navigate(`/coach/messages/${encodeURIComponent(t.id)}`)}>
          <span className="coach-face">{t.avatarUrl ? <img src={t.avatarUrl} alt="" /> : (t.title || 'P')[0]}</span>
          <span className="coach-row__body">
            <b>{t.title || 'Player'}</b>
            <small>{t.lastMessage?.text || 'No messages yet'}</small>
          </span>
          {t.lastMessage?.timestamp && <span className="coach-row__count">{formatRelativeTime(t.lastMessage.timestamp)}</span>}
          {t.unreadCount > 0 && <span className="coach-badge">{t.unreadCount}</span>}
        </button>
      )) : (
        <div className="coach-empty">
          <MessageCircle size={22} />
          <p>When players message you from a training, the chat shows up here.</p>
        </div>
      )}
    </div>
  )
}
