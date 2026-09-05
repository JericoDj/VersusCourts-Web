import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Users, CheckCircle2, XCircle, X, Shield, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../data/apiClient'
import { useNotifications } from '../context/NotificationContext'

export default function ClubInviteModal({ notification, onClose }) {
  const navigate = useNavigate()
  const { respondToInvite, getNotificationStatus } = useNotifications()

  const [club, setClub] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const data = notification?.data || {}
  const clubId = data.clubId || data.club_id
  const clubName = data.clubName || club?.name || 'Club'
  const currentStatus = getNotificationStatus(notification)

  useEffect(() => {
    if (!clubId) return
    let ignore = false

    apiRequest(`/clubs/${clubId}`, { auth: true })
      .then((res) => {
        if (!ignore && res) setClub(res)
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [clubId])

  if (!notification) return null

  const handleRespond = async (accept) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await respondToInvite(notification, accept)
      if (accept && clubId) {
        onClose()
        navigate(`/app/clubs/${clubId}`)
      } else {
        onClose()
      }
    } catch (err) {
      console.error('Failed to respond to club invite:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewClub = () => {
    onClose()
    if (clubId) navigate(`/app/clubs/${clubId}`)
    else navigate('/app/clubs')
  }

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
        <button className="notif-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="notif-modal__hero">
          <div className="club-invite-avatar">
            {club?.logoUrl ? (
              <img src={club.logoUrl} alt={clubName} className="club-invite-avatar__img" />
            ) : (
              <Users size={32} />
            )}
          </div>

          <span className="club-invite-eyebrow">Club Invitation</span>
          <h2 className="notif-modal__title">{clubName}</h2>
          <p className="notif-modal__subtitle">{notification.body}</p>
        </div>

        {club && (
          <div className="club-invite-details">
            <div className="club-invite-stat">
              <Users size={16} />
              <span>{club.membersCount ?? club.members?.length ?? 1} members</span>
            </div>
            <div className="club-invite-stat">
              <Shield size={16} />
              <span>{club.visibility === 'PRIVATE' ? 'Private Club' : 'Public Club'}</span>
            </div>
          </div>
        )}

        {currentStatus ? (
          <div className="notif-modal__actions notif-modal__actions--stacked">
            <div className={`status-pill status-pill--${currentStatus.toLowerCase()}`}>
              {currentStatus === 'ACCEPTED' ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <span>{currentStatus === 'ACCEPTED' ? 'Invitation Accepted' : 'Invitation Declined'}</span>
            </div>
            {currentStatus === 'ACCEPTED' && (
              <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleViewClub}>
                <span>View Club</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="notif-modal__actions">
            <button
              className="notif-modal__btn notif-modal__btn--secondary"
              disabled={submitting}
              onClick={() => handleRespond(false)}
            >
              <span>Decline</span>
            </button>
            <button
              className="notif-modal__btn notif-modal__btn--primary"
              disabled={submitting}
              onClick={() => handleRespond(true)}
            >
              <span>{submitting ? 'Joining...' : 'Accept Invite'}</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
