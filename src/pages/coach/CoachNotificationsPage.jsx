import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react'
import { useCoach } from '../../context/CoachContext'
import { formatRelativeTime } from '../../utils/dateUtils'

/// Coach notifications — the coach-audience feed only (`?audience=COACH`):
/// trainings, hosted queues, earnings and coach chats.
export default function CoachNotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadNotifications, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useCoach()

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const open = (n) => {
    if (!n.read) markNotificationRead(n.id)
    const trainingId = n.data?.trainingId
    const queueId = n.data?.queueId
    if (n.data?.kind === 'incentive') navigate('/coach/profile')
    // A booking request/cancellation opens that booking on the training.
    else if (trainingId) {
      // A package notice opens the Packages tab; a booking opens that booking.
      const query = n.data?.type === 'TRAINING_PACKAGE' ? '?tab=packages'
        : n.data?.bookingId ? `?booking=${encodeURIComponent(n.data.bookingId)}` : ''
      navigate(`/coach/trainings/${trainingId}${query}`)
    }
    else if (queueId) navigate(`/app/queues/${queueId}`)
    // "Withdrawal sent / declined" and earnings → the Versus Wallet on Profile.
    else if (n.data?.withdrawalId || n.data?.kind === 'withdrawal' || n.type === 'PAYMENT') navigate('/coach/profile')
  }

  return (
    <div className="coach-page">
      <div className="coach-page__head">
        <button type="button" className="tr-icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={18} /></button>
        <h1>Notifications</h1>
        {unreadNotifications > 0 && (
          <button type="button" className="button button--outline coach-btn" onClick={markAllNotificationsRead}><CheckCheck size={16} /> Mark all read</button>
        )}
      </div>
      {notifications.length ? notifications.map((n) => (
        <button key={n.id} type="button" className={`coach-row coach-notif${n.read ? '' : ' is-unread'}`} onClick={() => open(n)}>
          <Bell size={18} />
          <span className="coach-row__body coach-notif__body">
            <b>{n.title || 'Notification'}</b>
            {n.body && <small>{n.body}</small>}
          </span>
          {n.createdAt && <span className="coach-row__count">{formatRelativeTime(n.createdAt)}</span>}
        </button>
      )) : (
        <div className="coach-empty">
          <Bell size={22} />
          <p>Coach updates — new joins, booking requests, cash requests, completed trainings — show up here.</p>
        </div>
      )}
    </div>
  )
}
