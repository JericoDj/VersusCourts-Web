import { createPortal } from 'react-dom'
import {
  Bell,
  Calendar,
  Flame,
  MessageCircle,
  ShieldCheck,
  Trophy,
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'

function formatRole(role) {
  if (!role) return ''
  const r = String(role).toUpperCase()
  if (r === 'RECEPTIONIST') return 'Admin'
  return r[0] + r.slice(1).toLowerCase()
}

function getIconInfo(type, kind) {
  const k = (kind || '').toUpperCase()
  const t = (type || '').toUpperCase()

  if (k.includes('QUEUE') || t === 'QUEUE') {
    return { Icon: Flame, colorClass: 'is-queue' }
  }
  if (k.includes('CLUB') || t === 'CLUB') {
    return { Icon: ShieldCheck, colorClass: 'is-club' }
  }
  if (t === 'BOOKING') {
    return { Icon: Calendar, colorClass: 'is-booking' }
  }
  if (t === 'EVENT') {
    return { Icon: Trophy, colorClass: 'is-event' }
  }
  if (t === 'MESSAGE' || k.includes('CHAT')) {
    return { Icon: MessageCircle, colorClass: 'is-booking' }
  }
  return { Icon: Bell, colorClass: 'is-general' }
}

export default function NotificationDetailModal({ notification, onClose }) {
  const navigate = useNavigate()
  const { respondToInvite, getNotificationStatus } = useNotifications()

  if (!notification) return null

  const data = notification.data || {}
  const kind = (data.kind || data.type || '').toUpperCase()
  const { Icon, colorClass } = getIconInfo(notification.type, kind)

  const queueId = data.queueId || (kind.includes('QUEUE') ? data.targetId : null)
  const clubId = data.clubId || data.club_id || (kind.includes('CLUB') ? data.targetId : null)
  const threadId = data.threadId || data.thread_id
  const bookingId = data.bookingId || data.reservationId

  const isInvitation =
    kind.includes('INVITE') || kind === 'CLUB_JOIN_REQUEST' || data.inviteId || data.requestId
  const resolved = getNotificationStatus(notification)
  const role = data.role

  const handleNavigateQueue = () => {
    onClose()
    navigate(queueId ? `/app/queues/${queueId}` : '/app/queues')
  }

  const handleNavigateClub = () => {
    onClose()
    navigate(clubId ? `/app/clubs/${clubId}` : '/app/clubs')
  }

  const handleNavigateMessages = () => {
    onClose()
    navigate(threadId ? `/app/messages/${threadId}` : '/app/messages')
  }

  const handleNavigateBookings = () => {
    onClose()
    navigate(bookingId ? `/app/bookings/${bookingId}` : '/app/bookings')
  }

  const handleRespond = async (accept) => {
    try {
      await respondToInvite(notification, accept)
    } catch (err) {
      console.error('Failed to respond to invite:', err)
    }
  }

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
        <button className="notif-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="notif-modal__hero">
          <div className={`notif-icon-box ${colorClass}`} style={{ width: 64, height: 64, marginBottom: 14 }}>
            <Icon size={30} />
          </div>

          <h2 className="notif-modal__title">{notification.title}</h2>
          <p className="notif-modal__subtitle">
            {notification.body}
          </p>

          {role && (
            <span className="notif-role-pill" style={{ marginTop: 12, padding: '4px 12px', fontSize: 12 }}>
              Role: {formatRole(role)}
            </span>
          )}
        </div>

        {/* Action Buttons depending on context */}
        <div className="notif-modal__actions notif-modal__actions--stacked">
          {/* Navigation Action Buttons */}
          {queueId && (
            <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleNavigateQueue}>
              <Flame size={16} />
              <span>View Queue</span>
              <ArrowRight size={16} />
            </button>
          )}

          {clubId && !queueId && (
            <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleNavigateClub}>
              <ShieldCheck size={16} />
              <span>View Club</span>
              <ArrowRight size={16} />
            </button>
          )}

          {threadId && !queueId && !clubId && (
            <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleNavigateMessages}>
              <MessageCircle size={16} />
              <span>Open Chat</span>
              <ArrowRight size={16} />
            </button>
          )}

          {(bookingId || notification.type === 'BOOKING') && !queueId && !clubId && !threadId && (
            <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleNavigateBookings}>
              <Calendar size={16} />
              <span>View Bookings</span>
              <ArrowRight size={16} />
            </button>
          )}

          {/* Invitation accept / decline actions */}
          {isInvitation && (
            <div style={{ width: '100%', marginTop: 8 }}>
              {resolved ? (
                <div
                  className={`status-pill status-pill--${resolved.toLowerCase()}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {resolved === 'ACCEPTED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{resolved === 'ACCEPTED' ? 'Invitation Accepted' : 'Invitation Declined'}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button
                    type="button"
                    className="notif-modal__btn notif-modal__btn--secondary"
                    onClick={() => handleRespond(false)}
                  >
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    className="notif-modal__btn notif-modal__btn--primary"
                    onClick={() => handleRespond(true)}
                  >
                    <span>Accept</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="notif-modal__btn notif-modal__btn--subtle"
            style={{ marginTop: 4 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
