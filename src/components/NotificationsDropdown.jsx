import {
  ArrowRight,
  Bell,
  Calendar,
  Flame,
  Mail,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import MatchResultModal from './MatchResultModal'
import QueueMasterStatusModal from './QueueMasterStatusModal'
import ClubInviteModal from './ClubInviteModal'
import NotificationDetailModal from './NotificationDetailModal'
import { formatRelativeTime as formatTimeAgo } from '../utils/dateUtils'
import '../styles/notifications.css'

function formatRole(role) {
  if (!role) return ''
  const r = String(role).toUpperCase()
  if (r === 'RECEPTIONIST') return 'Admin'
  return r[0] + r.slice(1).toLowerCase()
}

function getNotificationIcon(type, isInvite) {
  if (isInvite) {
    return { icon: Flame, className: 'is-queue' }
  }
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

export default function NotificationsDropdown({ onClose }) {
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

  const [activeTab, setActiveTab] = useState(unreadInvitations > 0 ? 'invitations' : 'updates')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Modal dialog states
  const [matchResultNotif, setMatchResultNotif] = useState(null)
  const [qmStatusNotif, setQmStatusNotif] = useState(null)
  const [clubInviteNotif, setClubInviteNotif] = useState(null)
  const [detailNotif, setDetailNotif] = useState(null)

  // Fetch fresh notifications when opened
  useEffect(() => {
    fetchNotifications({ silent: true })
  }, [fetchNotifications])

  // Close on ESC key or click outside (unless modal is open)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (matchResultNotif || qmStatusNotif || clubInviteNotif || detailNotif) {
          setMatchResultNotif(null)
          setQmStatusNotif(null)
          setClubInviteNotif(null)
          setDetailNotif(null)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, matchResultNotif, qmStatusNotif, clubInviteNotif, detailNotif])

  const items = activeTab === 'updates' ? updates : invitations
  const preview = items.slice(0, 5)

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

    // Open detail dialog with action/navigation buttons
    setDetailNotif(n)
  }

  const handleViewAll = () => {
    onClose()
    navigate('/app/notifications')
  }

  return (
    <>
      <div className="notifications-dropdown-backdrop" onClick={onClose} />
      <div className="notifications-dropdown" ref={dropdownRef}>
        {/* Header */}
        <div className="notifications-header">
          <div className="notifications-tabs-row">
            <button
              type="button"
              className={`notifications-tab-pill${activeTab === 'updates' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('updates')}
            >
              <span>Updates</span>
              {unreadUpdates > 0 && <span className="notifications-pill-badge">{unreadUpdates}</span>}
            </button>

            <button
              type="button"
              className={`notifications-tab-pill${activeTab === 'invitations' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('invitations')}
            >
              <span>Invitations</span>
              {unreadInvitations > 0 && (
                <span className="notifications-pill-badge">{unreadInvitations}</span>
              )}
            </button>
          </div>

          <button
            type="button"
            className="notifications-mark-read-btn"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            Mark all read
          </button>
        </div>

        {/* List */}
        <div className="notifications-list">
          {preview.length === 0 ? (
            <div className="notif-empty">
              {activeTab === 'updates' ? <Bell size={32} /> : <Mail size={32} />}
              <p>{activeTab === 'updates' ? 'No updates yet.' : 'No invitations yet.'}</p>
            </div>
          ) : (
            preview.map((n) => {
              const isInvite = activeTab === 'invitations'
              const { icon: Icon, className: iconClass } = getNotificationIcon(n.type, isInvite)
              const resolved = getNotificationStatus(n)
              const role = n.data?.role
              const clubId = n.data?.clubId || n.data?.club_id
              const queueId = n.data?.queueId

              return (
                <div
                  key={n.id}
                  className={`notif-tile${!n.read ? ' is-unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className={`notif-icon-box ${iconClass}`}>
                    <Icon size={18} />
                  </div>

                  <div className="notif-content">
                    <div className="notif-title-row">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>

                    <p className="notif-body">{n.body}</p>

                    {role && <span className="notif-role-pill">Role: {formatRole(role)}</span>}

                    {/* Action buttons for invitations */}
                    {isInvite && (
                      <div className="notif-actions-row" onClick={(e) => e.stopPropagation()}>
                        {resolved ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => {
                                  onClose()
                                  navigate(`/app/clubs/${clubId}`)
                                }}
                              >
                                View Club
                              </button>
                            )}
                            {resolved === 'ACCEPTED' && queueId && (
                              <button
                                type="button"
                                className="notif-btn-accept"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => {
                                  onClose()
                                  navigate(`/app/queues/${queueId}`)
                                }}
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

        {/* Footer */}
        <div className="notifications-footer" onClick={handleViewAll}>
          <span>View all notifications</span>
          <ArrowRight size={14} />
        </div>
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
    </>
  )
}
