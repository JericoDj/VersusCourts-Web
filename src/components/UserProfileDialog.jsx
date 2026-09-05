import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Flag,
  MapPin,
  MessageSquare,
  MoreVertical,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { usePlayer } from '../context/PlayerContext'
import { apiRequest } from '../data/apiClient'
import { getUserProfile } from '../data/userService'
import { sportColor, sportFromApi, sportLabel } from '../data/sports'
import { SportGlyph } from './SportIcon'
import LoginDialog from './LoginDialog'
import '../styles/modals.css'

const REPORT_CATEGORIES = [
  'Inappropriate behavior or harassment',
  'Spam or fake account',
  'Unsportsmanlike conduct / No-show',
  'Impersonation or misrepresentation',
  'Other',
]

export default function UserProfileDialog({ user, userId, open, onClose }) {
  const { user: currentUser } = useAuth()
  const { startDirectThread } = useChat()
  const { setNotice } = usePlayer()
  const navigate = useNavigate()

  const [remoteProfile, setRemoteProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  // Report state
  const [reportOpen, setReportOpen] = useState(false)
  const [reportCategory, setReportCategory] = useState(REPORT_CATEGORIES[0])
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [reportError, setReportError] = useState('')

  // Block state
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)
  const [submittingBlock, setSubmittingBlock] = useState(false)

  const targetId = userId || user?.id || user?.userId || user?._id || ''

  const profileData = useMemo(() => {
    return { ...(user || {}), ...(remoteProfile || {}) }
  }, [user, remoteProfile])

  // Fetch full live profile on open
  useEffect(() => {
    if (!open || !targetId) {
      return
    }

    let isMounted = true
    const controller = new AbortController()

    getUserProfile(targetId, { signal: controller.signal })
      .then((res) => {
        if (!isMounted) return
        if (res) {
          setRemoteProfile(res)
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[UserProfileDialog] Failed to fetch profile:', err)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [open, targetId])

  // Check if target player is blocked by current user
  useEffect(() => {
    if (!open || !targetId || !currentUser) {
      return
    }

    let isMounted = true
    apiRequest('/blocks/mine')
      .then((res) => {
        if (!isMounted) return
        const list = Array.isArray(res) ? res : []
        const found = list.some(
          (b) => (b.blockedId || b.userId || b.blocked?.id) === targetId
        )
        setIsBlocked(found)
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [open, targetId, currentUser])

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = () => setMenuOpen(false)
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [menuOpen])

  // Escape key handler
  const handleClose = useCallback(() => {
    setMenuOpen(false)
    setReportOpen(false)
    setBlockConfirmOpen(false)
    setIsBlocked(false)
    setReportCategory(REPORT_CATEGORIES[0])
    setReportDetails('')
    setReportSuccess(false)
    setReportError('')
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

  const myId = currentUser?.id || currentUser?.uid
  const isMe = Boolean(myId && targetId && myId === targetId)

  const displayName = useMemo(() => {
    if (profileData?.fullName) return profileData.fullName
    if (profileData?.firstName || profileData?.lastName) {
      return `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
    }
    return profileData?.name || profileData?.username || 'Player'
  }, [profileData])

  const username = useMemo(() => {
    const raw = profileData?.username || ''
    return raw ? `@${raw.replace(/^@/, '')}` : ''
  }, [profileData?.username])

  const area = profileData?.area || profileData?.location || 'Quezon City, Philippines'
  const bio =
    profileData?.bio ||
    `Avid player based in ${area.split(',')[0]}. Always looking for competitive matches.`

  const stats = useMemo(() => {
    const s = profileData?.stats || {}
    const gamesPlayed = profileData?.gamesPlayed ?? s.gamesPlayed ?? 0
    const wins = profileData?.wins ?? s.wins ?? 0
    const hoursPlayed = profileData?.hoursPlayed ?? s.hoursPlayed ?? 0
    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0

    return {
      gamesPlayed,
      wins,
      winRate,
      hoursPlayed,
    }
  }, [profileData])

  // Parse skills/sports
  const skillsList = useMemo(() => {
    const raw = profileData?.skills
    if (Array.isArray(raw)) {
      return raw.map((s) => ({
        sport: typeof s === 'string' ? s : (s?.sport || s?.name || 'basketball'),
        level: s?.level || '',
      }))
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([k, v]) => ({
        sport: k,
        level: typeof v === 'string' ? v : (v?.level || ''),
      }))
    }
    return []
  }, [profileData?.skills])

  const handleMessage = async () => {
    if (isMe) {
      handleClose()
      navigate('/app/profile')
      return
    }

    try {
      const threadId = await startDirectThread({
        id: targetId,
        name: displayName,
        avatarUrl: profileData?.avatarUrl || profileData?.photoURL || '',
        subtitle: area.split(',')[0] || 'Player',
      })
      if (threadId) {
        handleClose()
        navigate(`/app/messages/${threadId}`)
      }
    } catch (err) {
      console.warn('[UserProfileDialog] Failed to open direct chat:', err)
    }
  }

  // Handle reporting player
  const handleSendReport = async (e) => {
    e.preventDefault()
    if (!currentUser) {
      setLoginOpen(true)
      return
    }
    if (submittingReport) return

    setSubmittingReport(true)
    setReportError('')
    const reason = reportDetails.trim()
      ? `${reportCategory} — ${reportDetails.trim()}`
      : reportCategory

    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: {
          targetType: 'USER',
          targetId,
          reason,
        },
      })
      setReportSuccess(true)
      if (setNotice) setNotice("Thanks — we'll look into it.")
      setTimeout(() => {
        setReportOpen(false)
        setReportSuccess(false)
        setReportCategory(REPORT_CATEGORIES[0])
        setReportDetails('')
      }, 1200)
    } catch {
      setReportError('Could not submit report. Please try again.')
    } finally {
      setSubmittingReport(false)
    }
  }

  // Handle blocking player
  const handleBlock = async () => {
    if (!currentUser) {
      setLoginOpen(true)
      return
    }
    setSubmittingBlock(true)
    try {
      await apiRequest('/blocks', {
        method: 'POST',
        body: { userId: targetId },
      })
      setIsBlocked(true)
      setBlockConfirmOpen(false)
      setMenuOpen(false)
      if (setNotice) setNotice(`${displayName} is blocked.`)
    } catch (err) {
      console.warn('[UserProfileDialog] Failed to block user:', err)
      if (setNotice) setNotice('Could not block this user. Try again.')
    } finally {
      setSubmittingBlock(false)
    }
  }

  // Handle unblocking player
  const handleUnblock = async () => {
    if (!currentUser) {
      setLoginOpen(true)
      return
    }
    setSubmittingBlock(true)
    try {
      await apiRequest(`/blocks/${targetId}`, {
        method: 'DELETE',
      })
      setIsBlocked(false)
      setMenuOpen(false)
      if (setNotice) setNotice(`${displayName} is unblocked.`)
    } catch (err) {
      console.warn('[UserProfileDialog] Failed to unblock user:', err)
      if (setNotice) setNotice('Could not unblock this user. Try again.')
    } finally {
      setSubmittingBlock(false)
    }
  }

  if (!open) return null

  const avatarUrl = profileData?.avatarUrl || profileData?.photoURL || ''
  const coverUrl = profileData?.coverUrl || ''

  return createPortal(
    <div
      className="user-profile-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} profile`}
    >
      <div className="user-profile-sheet">
        {/* Cover Photo Banner */}
        <div className="user-profile-cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="user-profile-cover__img" />
          ) : (
            <div className="user-profile-cover__gradient" />
          )}
          <div className="user-profile-cover__scrim" />

          {/* Top Bar Actions */}
          <div className="user-profile-topbar">
            <button
              type="button"
              className="user-profile-icon-btn"
              onClick={handleClose}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>

            {username && (
              <div className="user-profile-handle-badge">
                {username}
              </div>
            )}

            <div className="user-profile-topbar__actions">
              {!isMe && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="user-profile-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen((prev) => !prev)
                    }}
                    aria-label="More options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuOpen && (
                    <div
                      className="user-profile-dropdown-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="user-profile-dropdown-item"
                        onClick={() => {
                          setMenuOpen(false)
                          if (!currentUser) {
                            setLoginOpen(true)
                            return
                          }
                          setReportOpen(true)
                        }}
                      >
                        <Flag size={15} />
                        <span>Report user</span>
                      </button>

                      <button
                        type="button"
                        className={`user-profile-dropdown-item ${!isBlocked ? 'user-profile-dropdown-item--danger' : ''}`}
                        onClick={() => {
                          setMenuOpen(false)
                          if (!currentUser) {
                            setLoginOpen(true)
                            return
                          }
                          if (isBlocked) {
                            handleUnblock()
                          } else {
                            setBlockConfirmOpen(true)
                          }
                        }}
                      >
                        <Ban size={15} />
                        <span>{isBlocked ? 'Unblock user' : 'Block user'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isMe && (
                <button
                  type="button"
                  className="user-profile-icon-btn"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Floating Profile Info Card */}
        <div className="user-profile-card">
          <div className="user-profile-card__header">
            <div className="user-profile-avatar-ring">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="user-profile-avatar__img" />
              ) : (
                <div className="user-profile-avatar__fallback">
                  {displayName[0] || 'P'}
                </div>
              )}
            </div>

            <div className="user-profile-card__info">
              <h2 className="user-profile-name">
                {displayName}
                {isMe && <span className="user-profile-me-tag">(You)</span>}
              </h2>
              {username && <p className="user-profile-username">{username}</p>}
              <div className="user-profile-location-pill">
                <MapPin size={12} />
                <span>{area.split(',')[0]}</span>
              </div>
            </div>
          </div>

          {isMe ? (
            <button
              type="button"
              className="user-profile-action-btn"
              onClick={handleMessage}
            >
              <UserCheck size={18} />
              <span>View My Profile</span>
            </button>
          ) : isBlocked ? (
            <button
              type="button"
              className="user-profile-action-btn user-profile-action-btn--blocked"
              onClick={handleUnblock}
              disabled={submittingBlock}
              title="Click to unblock this user"
            >
              <Ban size={18} />
              <span>{submittingBlock ? 'Unblocking...' : 'Blocked · Click to Unblock'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="user-profile-action-btn"
              onClick={handleMessage}
            >
              <MessageSquare size={18} />
              <span>Message</span>
            </button>
          )}
        </div>

        {/* Scrollable Content: Stats, About, Sports */}
        <div className="user-profile-body">
          {/* 4 Stats Grid */}
          <div className="user-profile-stats-grid">
            <div className="user-profile-stat-card user-profile-stat-card--blue">
              <span className="user-profile-stat-val">{stats.gamesPlayed}</span>
              <span className="user-profile-stat-lbl">Games</span>
            </div>
            <div className="user-profile-stat-card user-profile-stat-card--green">
              <span className="user-profile-stat-val">{stats.wins}</span>
              <span className="user-profile-stat-lbl">Wins</span>
            </div>
            <div className="user-profile-stat-card user-profile-stat-card--orange">
              <span className="user-profile-stat-val">
                {Math.round(stats.winRate)}%
              </span>
              <span className="user-profile-stat-lbl">Win Rate</span>
            </div>
            <div className="user-profile-stat-card user-profile-stat-card--cyan">
              <span className="user-profile-stat-val">{stats.hoursPlayed}</span>
              <span className="user-profile-stat-lbl">Hours</span>
            </div>
          </div>

          {/* About Section */}
          <div className="user-profile-section">
            <h3 className="user-profile-section__title">About</h3>
            <p className="user-profile-section__text">{bio}</p>
          </div>

          {/* Sports Section */}
          {skillsList.length > 0 && (
            <div className="user-profile-section">
              <h3 className="user-profile-section__title">Sports</h3>
              <div className="user-profile-skills-list">
                {skillsList.map((skill, index) => {
                  const sportKey = sportFromApi(skill.sport)
                  const color = sportColor(sportKey)

                  // Percent distribution matching mobile
                  const total = skillsList.length
                  let percent = 100
                  if (total === 2) percent = index === 0 ? 65 : 35
                  if (total === 3) percent = index === 0 ? 50 : index === 1 ? 30 : 20
                  if (total > 3) percent = index === 0 ? 40 : Math.floor((100 - 40) / (total - 1))

                  return (
                    <div key={skill.sport} className="user-profile-skill-row">
                      <div
                        className="user-profile-skill-icon"
                        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                      >
                        <SportGlyph sport={sportKey} size={20} />
                      </div>
                      <span className="user-profile-skill-name">
                        {sportLabel(sportKey)}
                      </span>
                      <span
                        className="user-profile-skill-tag"
                        style={{
                          background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          color,
                        }}
                      >
                        {skill.level ? `${skill.level} · ${percent}%` : `${percent}%`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Block Confirmation Dialog */}
        {blockConfirmOpen && (
          <div
            className="user-profile-report-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setBlockConfirmOpen(false)
            }}
          >
            <div className="user-profile-block-dialog" role="dialog" aria-modal="true">
              <h3 className="user-profile-block-title">Block {displayName}?</h3>
              <p className="user-profile-block-body">
                They will no longer be able to message you or see your queue activity.
              </p>
              <div className="user-profile-block-actions">
                <button
                  type="button"
                  className="user-profile-block-cancel-btn"
                  onClick={() => setBlockConfirmOpen(false)}
                  disabled={submittingBlock}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="user-profile-block-confirm-btn"
                  onClick={handleBlock}
                  disabled={submittingBlock}
                >
                  {submittingBlock ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {reportOpen && (
          <div
            className="user-profile-report-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReportOpen(false)
            }}
          >
            <div className="user-profile-report-dialog" role="dialog" aria-modal="true">
              <div className="user-profile-report-header">
                <ShieldAlert size={20} color="var(--vc-danger, #ef4444)" />
                <h4>Report {displayName}</h4>
                <button
                  type="button"
                  className="sport-picker-close"
                  onClick={() => setReportOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {reportSuccess ? (
                <div className="user-profile-report-success">
                  Thanks — we'll look into it.
                </div>
              ) : (
                <form onSubmit={handleSendReport}>
                  <label className="user-profile-field-label">
                    Reason for report
                  </label>
                  <select
                    className="user-profile-report-select"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                  >
                    {REPORT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <label className="user-profile-field-label">
                    Additional details (optional)
                  </label>
                  <textarea
                    className="user-profile-report-input"
                    rows={3}
                    placeholder="Explain what happened…"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                  />

                  {reportError && (
                    <p className="user-profile-report-error">{reportError}</p>
                  )}

                  <div className="user-profile-report-actions">
                    <button
                      type="button"
                      className="user-profile-report-cancel-btn"
                      onClick={() => setReportOpen(false)}
                      disabled={submittingReport}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="user-profile-report-submit-btn"
                      disabled={submittingReport}
                    >
                      {submittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    </div>,
    document.body
  )
}
