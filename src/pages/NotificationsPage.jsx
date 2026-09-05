import { ArrowLeft, Bell, Calendar, CheckCheck, Flame, Mail, ShieldCheck, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import MatchResultModal from '../components/MatchResultModal'
import QueueMasterStatusModal from '../components/QueueMasterStatusModal'
import ClubInviteModal from '../components/ClubInviteModal'
import NotificationDetailModal from '../components/NotificationDetailModal'
import '../styles/notifications.css'

function formatDateTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatRole(role) {
  if (!role) return ''
  const r = String(role).toUpperCase()
  if (r === 'RECEPTIONIST') return 'Admin'
  return r[0] + r.slice(1).toLowerCase()
}

function getIcon(type, isInvite) {
  if (isInvite) return { icon: Flame, className: 'is-queue' }
  switch ((type || '').toUpperCase()) {
    case 'BOOKING':
      return { icon: Calendar, className: 'is-booking' }
    case 'QUEUE':
      return { icon: Flame, className: 'is-queue' }
    case 'CLUB':
      return { icon: ShieldCheck, className: 'is-club' }
    case 'EVENT':
      return { icon: Trophy, className: 'is-event' }
    default:
      return { icon: Bell, className: 'is-general' }
  }
}

export default function NotificationsPage() {
  const {
    updates,
    invitations,
    unreadUpdates,
    unreadInvitations,
    unreadCount,
    markAllAsRead,
    markAsRead,
    respondToInvite,
    getNotificationStatus,
    fetchNotifications,
  } = useNotifications()

  const [activeTab, setActiveTab] = useState('updates')
  const navigate = useNavigate()

  // Modal dialog states
  const [matchResultNotif, setMatchResultNotif] = useState(null)
  const [qmStatusNotif, setQmStatusNotif] = useState(null)
  const [clubInviteNotif, setClubInviteNotif] = useState(null)
  const [detailNotif, setDetailNotif] = useState(null)

  useEffect(() => {
    fetchNotifications({ silent: true })
  }, [fetchNotifications])

  const items = activeTab === 'updates' ? updates : invitations

  const handleItemClick = (n) => {
    markAsRead(n.id)

    const kind = (n.data?.kind || n.data?.type || '').toUpperCase()
    const isMatchResult = kind === 'MATCH_RESULT' || n.data?.winner
    const isQmStatus =
      kind === 'QUEUE_MASTER_STATUS' ||
      kind === 'QUEUE_MASTER_APPLICATION' ||
      n.data?.deepLink?.includes('queue-master-application')

    if (isMatchResult) {
      setMatchResultNotif(n)
      return
    }

    if (isQmStatus) {
      setQmStatusNotif(n)
      return
    }

    if (kind === 'CLUB_INVITE' && !getNotificationStatus(n)) {
      setClubInviteNotif(n)
      return
    }

    // Open detail modal with action buttons
    setDetailNotif(n)
  }

  return (
    <div className="container" style={{ maxWidth: 680, margin: '20px auto 40px', padding: '0 16px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--vc-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={markAllAsRead}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            color: unreadCount > 0 ? 'var(--vc-primary)' : 'var(--vc-text-tertiary)',
            cursor: unreadCount > 0 ? 'pointer' : 'default',
          }}
        >
          <CheckCheck size={16} />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          background: 'var(--vc-surface)',
          padding: 6,
          borderRadius: 30,
          border: '1px solid var(--vc-border)',
        }}
      >
        <button
          type="button"
          className={`notifications-tab-pill${activeTab === 'updates' ? ' is-active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
          onClick={() => setActiveTab('updates')}
        >
          <span>Updates</span>
          {unreadUpdates > 0 && <span className="notifications-pill-badge">{unreadUpdates}</span>}
        </button>

        <button
          type="button"
          className={`notifications-tab-pill${activeTab === 'invitations' ? ' is-active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
          onClick={() => setActiveTab('invitations')}
        >
          <span>Invitations</span>
          {unreadInvitations > 0 && (
            <span className="notifications-pill-badge">{unreadInvitations}</span>
          )}
        </button>
      </div>

      {/* Card List */}
      <div
        style={{
          background: 'var(--vc-surface)',
          borderRadius: 'var(--vc-radius-lg)',
          border: '1px solid var(--vc-border)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        }}
      >
        {items.length === 0 ? (
          <div className="notif-empty" style={{ padding: '48px 24px' }}>
            {activeTab === 'updates' ? <Bell size={40} /> : <Mail size={40} />}
            <p style={{ marginTop: 12, fontSize: 14 }}>
              {activeTab === 'updates' ? 'No updates yet.' : 'No invitations yet.'}
            </p>
          </div>
        ) : (
          items.map((n) => {
            const isInvite = activeTab === 'invitations'
            const { icon: Icon, className: iconClass } = getIcon(n.type, isInvite)
            const resolved = getNotificationStatus(n)
            const role = n.data?.role
            const clubId = n.data?.clubId || n.data?.club_id
            const queueId = n.data?.queueId

            return (
              <div
                key={n.id}
                className={`notif-tile${!n.read ? ' is-unread' : ''}`}
                style={{ padding: '16px 20px' }}
                onClick={() => handleItemClick(n)}
              >
                <div className={`notif-icon-box ${iconClass}`} style={{ width: 44, height: 44 }}>
                  <Icon size={20} />
                </div>

                <div className="notif-content">
                  <div className="notif-title-row">
                    <span className="notif-title" style={{ fontSize: 15 }}>
                      {n.title}
                    </span>
                    <span className="notif-time">{formatDateTime(n.createdAt)}</span>
                  </div>

                  <p className="notif-body" style={{ fontSize: 13.5, margin: '4px 0 0 0' }}>
                    {n.body}
                  </p>

                  {role && <span className="notif-role-pill">Role: {formatRole(role)}</span>}

                  {isInvite && (
                    <div className="notif-actions-row" onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                      {resolved ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span
                            className={`notif-status-badge ${
                              resolved === 'ACCEPTED' ? 'is-accepted' : 'is-declined'
                            }`}
                          >
                            {resolved === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                          </span>
                          {resolved === 'ACCEPTED' && clubId && (
                            <button
                              type="button"
                              className="notif-btn-accept"
                              style={{ fontSize: 12, padding: '4px 12px' }}
                              onClick={() => navigate(`/app/clubs/${clubId}`)}
                            >
                              View Club
                            </button>
                          )}
                          {resolved === 'ACCEPTED' && queueId && (
                            <button
                              type="button"
                              className="notif-btn-accept"
                              style={{ fontSize: 12, padding: '4px 12px' }}
                              onClick={() => navigate(`/app/queues/${queueId}`)}
                            >
                              View Queue
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="notif-btn-accept"
                            onClick={() => respondToInvite(n, true)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="notif-btn-decline"
                            onClick={() => respondToInvite(n, false)}
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!n.read && <span className="notif-unread-dot" />}
              </div>
            )
          })
        )}
      </div>

      {/* Interactive Modals */}
      {matchResultNotif && (
        <MatchResultModal
          notification={matchResultNotif}
          onClose={() => setMatchResultNotif(null)}
        />
      )}
      {qmStatusNotif && (
        <QueueMasterStatusModal
          notification={qmStatusNotif}
          onClose={() => setQmStatusNotif(null)}
        />
      )}
      {clubInviteNotif && (
        <ClubInviteModal
          notification={clubInviteNotif}
          onClose={() => setClubInviteNotif(null)}
        />
      )}
      {detailNotif && (
        <NotificationDetailModal
          notification={detailNotif}
          onClose={() => setDetailNotif(null)}
        />
      )}
    </div>
  )
}
