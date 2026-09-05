import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, Clock, AlertCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function QueueMasterStatusModal({ notification, onClose }) {
  const navigate = useNavigate()

  if (!notification) return null

  const data = notification.data || {}
  const status = (data.status || 'PENDING').toUpperCase()
  const rejectionReason = data.rejectionReason || ''

  const isApproved = status === 'APPROVED'
  const isRejected = status === 'REJECTED'

  const handleAction = () => {
    onClose()
    if (isApproved) {
      navigate('/app/play')
    } else {
      navigate('/app/profile')
    }
  }

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
        <button className="notif-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="notif-modal__hero">
          <div
            className={`qm-status-icon-ring ${
              isApproved
                ? 'qm-status-icon-ring--approved'
                : isRejected
                ? 'qm-status-icon-ring--rejected'
                : 'qm-status-icon-ring--pending'
            }`}
          >
            {isApproved ? (
              <CheckCircle2 size={34} />
            ) : isRejected ? (
              <XCircle size={34} />
            ) : (
              <Clock size={34} />
            )}
          </div>

          <div
            className={`qm-badge ${
              isApproved
                ? 'qm-badge--approved'
                : isRejected
                ? 'qm-badge--rejected'
                : 'qm-badge--pending'
            }`}
          >
            <span className="qm-badge__dot" />
            <span>{isApproved ? 'APPROVED' : isRejected ? 'DECLINED' : 'UNDER REVIEW'}</span>
          </div>

          <h2 className="notif-modal__title">
            {isApproved
              ? 'Queue Master Approved! 🎉'
              : isRejected
              ? 'Application Declined'
              : 'Application Under Review'}
          </h2>

          <p className="notif-modal__subtitle">
            {isApproved
              ? 'Congratulations! You can now host official and paid queue games for your community.'
              : isRejected
              ? 'Your application to become a Queue Master could not be approved at this time.'
              : 'Our team is actively reviewing your Queue Master application. You will be notified once complete.'}
          </p>
        </div>

        {/* Rejection callout box */}
        {isRejected && (
          <div className="qm-rejection-box">
            <div className="qm-rejection-box__header">
              <AlertCircle size={15} />
              <span>Reason for Decline:</span>
            </div>
            <p className="qm-rejection-box__text">
              {rejectionReason || 'No specific reason provided by administrator.'}
            </p>
          </div>
        )}

        <div className="notif-modal__actions notif-modal__actions--stacked">
          <button className="notif-modal__btn notif-modal__btn--primary" onClick={handleAction}>
            {isApproved ? 'Start Hosting Queues' : isRejected ? 'Review Profile / Re-apply' : 'Done'}
          </button>
          <button className="notif-modal__btn notif-modal__btn--subtle" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
