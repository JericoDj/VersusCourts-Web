import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Loader2, MapPin, X } from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { sportFromApi, sportGradient, sportLabel } from '../data/sports'
import { SportGlyph } from './SportIcon'
import '../styles/modals.css'

export default function JoinByCodeModal({ open, onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvedQueue, setResolvedQueue] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinedSuccess, setJoinedSuccess] = useState(false)

  const handleClose = useCallback(() => {
    setCode('')
    setResolvedQueue(null)
    setError('')
    setJoinedSuccess(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleClose])

  if (!open) return null

  const handleLookup = async (e) => {
    e?.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return

    setLoading(true)
    setError('')
    setResolvedQueue(null)

    try {
      const queue = await apiRequest(`/queues/code/${clean}`)
      setResolvedQueue(queue)
    } catch {
      setError('No active queue found with that code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!resolvedQueue) return
    setJoining(true)
    setError('')

    try {
      await apiRequest(`/queues/${resolvedQueue.id}/join`, {
        method: 'POST',
      })
      setJoinedSuccess(true)
      setTimeout(() => {
        onJoined?.(resolvedQueue)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Unable to join queue.')
    } finally {
      setJoining(false)
    }
  }

  return createPortal(
    <div
      className="sport-picker-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sport-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        <div className="sport-picker-header">
          <h2 className="sport-picker-title">Join by Invite Code</h2>
          <button
            type="button"
            className="sport-picker-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!resolvedQueue ? (
          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--vc-text-secondary)', lineHeight: 1.4 }}>
              Enter the 6-character invite code provided by the queue host (e.g. <code>7K2Q9X</code>).
            </p>

            <input
              type="text"
              autoFocus
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 4,
                textAlign: 'center',
                textTransform: 'uppercase',
                border: '2px solid var(--vc-border)',
                borderRadius: 'var(--vc-radius-md, 12px)',
                background: 'var(--vc-surface-alt, #f8fafc)',
                outline: 'none',
              }}
            />

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-danger, #ef4444)', fontWeight: 600 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="scoreboard-main-point-btn"
              style={{ marginTop: 6 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Find Queue'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Queue Preview Card */}
            {(() => {
              const sportKey = sportFromApi(resolvedQueue.sport)
              const venue =
                resolvedQueue.court?.name ||
                resolvedQueue.court?.branch?.name ||
                resolvedQueue.customCourtName ||
                'Venue'
              const area = resolvedQueue.court?.branch?.area || resolvedQueue.customArea || ''
              const title = resolvedQueue.title?.trim() || `${sportLabel(sportKey)} Queue`
              const fee = Number(resolvedQueue.entryFee) || 0
              const needed = Number(resolvedQueue.playersNeeded) || 1
              const joined =
                resolvedQueue._count?.participants ??
                (Array.isArray(resolvedQueue.participants)
                  ? resolvedQueue.participants.length
                  : 0)

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    background: 'var(--vc-surface-alt, #f8fafc)',
                    border: '1px solid var(--vc-border)',
                    borderRadius: 'var(--vc-radius-lg, 16px)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: sportGradient(sportKey),
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <SportGlyph sport={sportKey} size={22} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--vc-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {title}
                    </h3>
                    <p style={{ margin: '2px 0 4px', fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                      {sportLabel(sportKey)} · {joined}/{needed} players · {fee > 0 ? `₱${fee}` : 'Free'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--vc-text-secondary)' }}>
                      <MapPin size={11} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {venue} {area ? `· ${area}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-danger, #ef4444)', fontWeight: 600 }}>
                {error}
              </p>
            )}

            {joinedSuccess ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 12,
                  background: 'rgba(22, 163, 74, 0.12)',
                  color: '#16a34a',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                <CheckCircle2 size={18} />
                <span>Joined Successfully!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="scoreboard-back-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setResolvedQueue(null)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="scoreboard-main-point-btn"
                  style={{ flex: 1.5 }}
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? <Loader2 size={18} className="animate-spin" /> : 'Join Game'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
