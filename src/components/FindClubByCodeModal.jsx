import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Globe2, Loader2, Lock, MapPin, Users, X } from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { sportFromApi } from '../data/sports'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { SportPill } from './Cards'
import '../styles/modals.css'

export default function FindClubByCodeModal({ open, onClose, onViewClub, onJoined }) {
  const { user } = useAuth() || {}
  const { myClubs = [] } = usePlayer() || {}
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvedClub, setResolvedClub] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinedSuccess, setJoinedSuccess] = useState(false)

  const handleClose = useCallback(() => {
    setCode('')
    setResolvedClub(null)
    setError('')
    setJoinedSuccess(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  if (!open) return null

  const handleLookup = async (e) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setError('')
    setResolvedClub(null)
    setLoading(true)

    try {
      const res = await apiRequest(`/clubs/by-code/${trimmed}`)
      const club = res?.data || res
      if (!club || !club.id) {
        setError('No club found for that code.')
      } else {
        setResolvedClub(club)
      }
    } catch (err) {
      if (err?.status === 404 || err?.statusCode === 404) {
        setError('No club found for that code.')
      } else {
        setError(err?.message || 'Could not reach server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!resolvedClub) return
    setJoining(true)
    setError('')

    try {
      const isPrivate = String(resolvedClub.visibility || '').toUpperCase() === 'PRIVATE'
      const endpoint = `/clubs/${resolvedClub.id}${isPrivate ? '/request' : '/join'}`
      await apiRequest(endpoint, { method: 'POST' })
      setJoinedSuccess(true)
      if (onJoined) onJoined(resolvedClub)
    } catch (err) {
      setError(err?.message || 'Could not join club. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const matchingMyClub = resolvedClub?.id
    ? myClubs.find((c) => String(c.id) === String(resolvedClub.id)) || null
    : null

  const isAlreadyMember = Boolean(
    joinedSuccess ||
    matchingMyClub ||
    resolvedClub?.joined ||
    resolvedClub?.myRole ||
    (user?.id && Array.isArray(resolvedClub?.members) &&
      resolvedClub.members.some(
        (m) => String(m.userId || m.id || m.user?.id) === String(user.id)
      ))
  )

  const effectiveClub = matchingMyClub ? { ...resolvedClub, ...matchingMyClub } : resolvedClub

  const sports = (resolvedClub?.sports?.length
    ? resolvedClub.sports
    : [resolvedClub?.sport || 'basketball']
  ).map((s) => sportFromApi(String(s).toLowerCase()))

  const memberCount =
    resolvedClub?._count?.members ??
    resolvedClub?.membersCount ??
    (Array.isArray(resolvedClub?.members) ? resolvedClub.members.length : resolvedClub?.members ?? 0)

  const isPrivate = String(resolvedClub?.visibility || '').toUpperCase() === 'PRIVATE'

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
        style={{ maxWidth: 460 }}
      >
        <div className="sport-picker-header">
          <h2 className="sport-picker-title">Find Club by Code</h2>
          <button
            type="button"
            className="sport-picker-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!resolvedClub ? (
          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--vc-text-secondary)', lineHeight: 1.4 }}>
              Enter the 6-character invite code shared with you by a club member or captain (e.g. <code>AB12XY</code>).
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
              className="queue-modal-btn"
              style={{ marginTop: 6 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Find Club'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Club Preview Card */}
            <div
              style={{
                borderRadius: 16,
                border: '1px solid var(--vc-border)',
                overflow: 'hidden',
                background: 'var(--vc-surface)',
              }}
            >
              {/* Banner / Header */}
              <div
                style={{
                  height: 100,
                  background: resolvedClub.bannerUrl
                    ? `url(${resolvedClub.bannerUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                  position: 'relative',
                  padding: 12,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isAlreadyMember && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        borderRadius: 12,
                        background: 'rgba(22, 163, 74, 0.95)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>{effectiveClub?.myRole === 'CAPTAIN' ? 'Captain' : 'Joined'}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 12,
                      background: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {isPrivate ? <Lock size={12} /> : <Globe2 size={12} />}
                    <span>{isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                </div>

                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: resolvedClub.logoUrl
                      ? `url(${resolvedClub.logoUrl}) center/cover no-repeat`
                      : '#ffffff',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                    color: 'var(--vc-primary)',
                  }}
                >
                  {!resolvedClub.logoUrl && (resolvedClub.name?.[0] || 'C')}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 14 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>
                  {resolvedClub.name}
                </h3>

                {resolvedClub.about && (
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--vc-text-secondary)', lineHeight: 1.4 }}>
                    {resolvedClub.about}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--vc-text-secondary)', marginBottom: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={14} /> {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </span>
                  {resolvedClub.area && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={14} /> {resolvedClub.area}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {sports.map((s) => (
                    <SportPill sport={s} key={s} />
                  ))}
                </div>
              </div>
            </div>

            {joinedSuccess ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(22, 163, 74, 0.1)',
                  color: '#16a34a',
                  fontWeight: 700,
                  fontSize: 13.5,
                }}
              >
                <CheckCircle2 size={20} />
                <span>
                  {isPrivate
                    ? 'Join request submitted! The captain will review it.'
                    : 'You joined the club! Welcome aboard.'}
                </span>
              </div>
            ) : isAlreadyMember ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(22, 163, 74, 0.1)',
                  color: '#16a34a',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {effectiveClub?.myRole === 'CAPTAIN'
                    ? 'You are the captain of this club!'
                    : 'You are already a member of this club!'}
                </span>
              </div>
            ) : null}

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-danger, #ef4444)', fontWeight: 600 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="scoreboard-back-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setResolvedClub(null)
                  setError('')
                }}
              >
                Search Another
              </button>

              <button
                type="button"
                className="queue-modal-btn"
                style={{ flex: 1.2 }}
                onClick={() => {
                  if (isAlreadyMember) {
                    handleClose()
                    if (onViewClub) onViewClub(effectiveClub || resolvedClub)
                  } else {
                    handleJoin()
                  }
                }}
                disabled={joining}
              >
                {joining ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isAlreadyMember ? (
                  'View Club'
                ) : isPrivate ? (
                  'Request to Join'
                ) : (
                  'Join Club'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
