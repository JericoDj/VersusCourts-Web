import { Link } from 'react-router-dom'
import { Bell, MessageCircle } from 'lucide-react'
import { useChat } from '../../context/ChatContext'
import { useCoach } from '../../context/CoachContext'

/// Top-of-tab header for coach mode (coach_header.dart `CoachHeader`): big
/// title + muted subtitle on the left, the tab's own actions, then the coach
/// inbox and coach notifications on the right. Each tab draws its own —
/// there is no shared app bar.
export default function CoachHeader({ title, subtitle, actions }) {
  return (
    <header className="coach-tab-header">
      <div className="coach-tab-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions}
      <CoachTopActions />
    </header>
  )
}

export function CoachTopActions() {
  const { coachUnreadCount } = useChat()
  const { unreadNotifications } = useCoach()
  return (
    <div className="coach-top-actions">
      <Link to="/coach/messages" className="coach-bubble" aria-label="Coach messages" title="Messages">
        <MessageCircle size={20} />
        {coachUnreadCount > 0 && <i>{coachUnreadCount > 99 ? '99+' : coachUnreadCount}</i>}
      </Link>
      <Link to="/coach/notifications" className="coach-bubble" aria-label="Coach notifications" title="Coach notifications">
        <Bell size={20} />
        {unreadNotifications > 0 && <i>{unreadNotifications > 99 ? '99+' : unreadNotifications}</i>}
      </Link>
    </div>
  )
}

/// Small circular action for a tab header (e.g. "+" on Trainings).
export function CoachHeaderAction({ icon: Icon, label, onClick, to }) {
  if (to) return <Link to={to} className="coach-bubble coach-bubble--accent" aria-label={label} title={label}><Icon size={20} /></Link>
  return <button type="button" className="coach-bubble coach-bubble--accent" aria-label={label} title={label} onClick={onClick}><Icon size={20} /></button>
}
