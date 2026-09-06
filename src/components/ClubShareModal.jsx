import { useState } from 'react'
import { Check, Copy, Globe, Share2, Smartphone, X } from 'lucide-react'
import StoreBadges from './StoreBadges'
import '../styles/modals.css'

export default function ClubShareModal({ club, onClose }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [shareError, setShareError] = useState('')

  if (!club) return null

  // Universal share link that goes to the smart bridge page
  const clubId = club.id || club._id
  const inviteCode = club.inviteCode || club.code || ''
  const shareUrl = `${window.location.origin}/c/${encodeURIComponent(clubId)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      setShareError('Failed to copy. Please select the URL manually.')
    }
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
    } catch {
      setShareError('Failed to copy invite code.')
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: `${club.name} | Versus Courts`,
        text: `Check out ${club.name} on Versus Courts! Join the club and play with regulars.`,
        url: shareUrl,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setShareError('Sharing failed or was cancelled.')
      }
    }
  }

  return (
    <div className="user-profile-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="club-share-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="club-share-header">
          <div className="club-share-header__titles">
            <div className="club-share-header__badge">
              <Share2 size={14} />
              <span>Share Club</span>
            </div>
            <h2 className="club-share-header__title">{club.name}</h2>
            <p className="club-share-header__sub">
              Share this link to open this club directly in the mobile app or browser.
            </p>
          </div>
          <button
            type="button"
            className="club-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {shareError && (
          <div className="club-share-error" role="alert">
            {shareError}
          </div>
        )}

        {/* Share Link Input */}
        <div className="club-share-section">
          <label className="club-share-label">
            <Globe size={14} /> Shareable Link
          </label>
          <div className="club-share-url-box">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="club-share-url-input"
              aria-label="Club shareable URL"
            />
            <button
              type="button"
              className={`club-share-copy-btn ${copiedLink ? 'is-copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check size={14} /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="club-share-actions">
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              className="club-share-btn club-share-btn--primary"
              onClick={handleNativeShare}
            >
              <Share2 size={16} />
              <span>Share via…</span>
            </button>
          )}

          {inviteCode && (
            <div className="club-share-code-card">
              <div className="club-share-code-info">
                <span className="club-share-code-label">Club Invite Code</span>
                <span className="club-share-code-value">{inviteCode}</span>
              </div>
              <button
                type="button"
                className={`club-share-code-btn ${copiedCode ? 'is-copied' : ''}`}
                onClick={handleCopyCode}
                title="Copy Invite Code"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Store & Deep-linking Info */}
        <div className="club-share-footer">
          <div className="club-share-footer__text">
            <Smartphone size={15} />
            <span>Opens automatically in <strong>Versus Courts App</strong> on iOS & Android</span>
          </div>
          <StoreBadges align="center" compact className="club-share-store-badges" />
        </div>
      </div>
    </div>
  )
}
