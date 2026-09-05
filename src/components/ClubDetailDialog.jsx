import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MoreVertical,
  Send,
  Share2,
  Shield,
  ShieldOff,
  Star,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../data/apiClient'
import { sportFromApi } from '../data/sports'
import LoginDialog from './LoginDialog'
import UserProfileDialog from './UserProfileDialog'
import { SportPill } from './Cards'
import '../styles/modals.css'

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'TBA'

export default function ClubDetailDialog({ club, initialTab = 'about', onClose, onClubUpdated }) {
  const { user } = useAuth()
  const [detail, setDetail] = useState(club)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [upcoming, setUpcoming] = useState({ queues: [], events: [] })
  const [reviews, setReviews] = useState([])
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])

  // Interaction states
  const [joinState, setJoinState] = useState('idle')
  const [loginOpen, setLoginOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Chat message input
  const [chatText, setChatText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatEndRef = useRef(null)

  // Review input
  const [myRating, setMyRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)

  // Leave club confirmation
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Player public profile modal & captain action menu
  const [viewingUser, setViewingUser] = useState(null)
  const [memberActionMenuId, setMemberActionMenuId] = useState(null)

  const clubId = club?.id

  // Fetch full club details from API
  const fetchClubFull = useCallback(async () => {
    if (!clubId) return
    try {
      const [clubRes, upcomingRes, reviewsRes] = await Promise.allSettled([
        apiRequest(`/clubs/${clubId}`),
        apiRequest(`/clubs/${clubId}/upcoming`),
        apiRequest('/reviews', { query: { targetType: 'CLUB', targetId: clubId } }),
      ])

      if (clubRes.status === 'fulfilled') {
        const c = clubRes.value?.data || clubRes.value
        setDetail((curr) => ({ ...curr, ...c }))
        const rawPosts = c?.posts || []
        setMessages([...rawPosts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
        setMembers(c?.members || [])
        setRequests(c?.joinRequests || [])
      }

      if (upcomingRes.status === 'fulfilled') {
        const u = upcomingRes.value?.data || upcomingRes.value
        setUpcoming({ queues: u?.queues || [], events: u?.events || [] })
      }

      if (reviewsRes.status === 'fulfilled') {
        const r = reviewsRes.value?.data || reviewsRes.value
        setReviews(Array.isArray(r) ? r : [])
      }
    } catch {
      // Keep existing data
    }
  }, [clubId])

  useEffect(() => {
    let ignore = false
    Promise.resolve().then(() => {
      if (!ignore) fetchClubFull()
    })
    return () => {
      ignore = true
    }
  }, [fetchClubFull])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loginOpen && !confirmLeaveOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loginOpen, confirmLeaveOpen, onClose])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeTab, messages])

  // Compute permissions
  const myId = user?.id || ''
  const isMember = useMemo(() => {
    if (detail?.joined) return true
    return members.some((m) => (m.user?.id || m.userId || m.id) === myId)
  }, [detail?.joined, members, myId])

  const myMemberObj = useMemo(() => {
    return members.find((m) => (m.user?.id || m.userId || m.id) === myId)
  }, [members, myId])

  const role = myMemberObj?.role || detail?.myRole || ''
  const isCaptain = role === 'CAPTAIN'
  const isAdmin = role === 'ADMIN' || isCaptain
  const hasRequested = requests.some((r) => (r.user?.id || r.userId) === myId)

  // Join Club handler
  const handleJoin = async () => {
    if (!user) {
      setLoginOpen(true)
      return
    }
    setJoinState('joining')
    const isPrivate = String(detail.visibility || '').toUpperCase() === 'PRIVATE'

    try {
      await apiRequest(`/clubs/${clubId}${isPrivate ? '/request' : '/join'}`, {
        method: 'POST',
      })
      setJoinState(isPrivate ? 'requested' : 'joined')
      setDetail((curr) => ({ ...curr, joined: !isPrivate }))
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch {
      setJoinState('error')
    }
  }

  // Leave Club handler
  const handleLeave = async () => {
    setLeaving(true)
    try {
      await apiRequest(`/clubs/${clubId}/leave`, { method: 'POST' })
      setConfirmLeaveOpen(false)
      setDetail((curr) => ({ ...curr, joined: false }))
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch {
      // Ignored
    } finally {
      setLeaving(false)
    }
  }

  // Handle Request Approve / Decline
  const handleRequestAction = async (requestId, action) => {
    try {
      await apiRequest(`/clubs/requests/${requestId}/${action}`, { method: 'POST' })
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch {
      // Ignored
    }
  }

  // Member management actions (Captain only)
  const handleSetMemberRole = async (targetUserId, newRole) => {
    try {
      await apiRequest(`/clubs/${clubId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        body: { role: newRole },
      })
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch (err) {
      console.warn('[ClubDetailDialog] Failed to update member role:', err)
    }
  }

  const handleKickMember = async (targetUserId, targetUserName) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${targetUserName || 'this member'} from the club?`
      )
    ) {
      return
    }
    try {
      await apiRequest(`/clubs/${clubId}/members/${targetUserId}/kick`, {
        method: 'POST',
      })
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch (err) {
      console.warn('[ClubDetailDialog] Failed to remove member:', err)
    }
  }

  // Close member action menu when clicking anywhere outside
  useEffect(() => {
    if (!memberActionMenuId) return
    const onDocClick = () => setMemberActionMenuId(null)
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [memberActionMenuId])

  // Send message in club chat
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatText.trim() || sendingMsg) return
    setSendingMsg(true)
    const textToSend = chatText.trim()
    setChatText('')

    try {
      const res = await apiRequest(`/clubs/${clubId}/posts`, {
        method: 'POST',
        body: { text: textToSend },
      })
      const newPost = res?.data || res
      setMessages((prev) => [...prev, newPost])
    } catch {
      setChatText(textToSend)
    } finally {
      setSendingMsg(false)
    }
  }

  // Submit Rating & Review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (myRating === 0 || submittingReview) return
    setSubmittingReview(true)
    setReviewSuccess(false)

    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: {
          targetType: 'CLUB',
          targetId: clubId,
          rating: myRating,
          text: myComment.trim() || undefined,
        },
      })
      setReviewSuccess(true)
      setMyComment('')
      fetchClubFull()
      if (onClubUpdated) onClubUpdated()
    } catch {
      // Ignored
    } finally {
      setSubmittingReview(false)
    }
  }

  // Copy invite code
  const copyInviteCode = () => {
    const code = detail.inviteCode || detail.code
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Data derivations
  const sports = (detail.sports?.length
    ? detail.sports
    : [detail.sport || 'basketball']
  ).map((s) => sportFromApi(String(s).toLowerCase()))

  const totalMembers =
    detail._count?.members ??
    detail.membersCount ??
    (members.length || detail.members || 1)

  const isPrivate = String(detail.visibility || '').toUpperCase() === 'PRIVATE'
  const clubRating = Number(detail.rating ?? club.rating ?? 0)

  // Sorted members: CAPTAIN -> ADMIN -> COACH -> MEMBER
  const sortedMembers = useMemo(() => {
    const order = { CAPTAIN: 0, ADMIN: 1, COACH: 2, MEMBER: 3 }
    return [...members].sort((a, b) => (order[a.role] ?? 4) - (order[b.role] ?? 4))
  }, [members])

  const leaders = useMemo(() => {
    return sortedMembers.filter((m) => ['CAPTAIN', 'ADMIN'].includes(String(m.role).toUpperCase()))
  }, [sortedMembers])

  const gallery = useMemo(() => {
    const images = [
      detail.bannerUrl,
      detail.logoUrl,
      detail.image,
      ...messages.map((p) => p.imageUrl),
    ].filter(Boolean)
    return [...new Set(images)]
  }, [detail.bannerUrl, detail.logoUrl, detail.image, messages])

  return (
    <>
      <div className="sport-picker-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="club-modal-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero Banner Header */}
          <div
            className="club-modal-hero"
            style={{
              backgroundImage: detail.bannerUrl
                ? `linear-gradient(180deg, rgba(15,23,42,0.1), rgba(15,23,42,0.85)), url(${detail.bannerUrl})`
                : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            }}
          >
            <button
              type="button"
              className="club-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="club-modal-hero__bottom">
              <div className="club-modal-logo">
                {detail.logoUrl ? (
                  <img src={detail.logoUrl} alt="" />
                ) : (
                  <span>{detail.initials || detail.name?.[0] || 'C'}</span>
                )}
              </div>

              <div className="club-modal-hero__text">
                <div className="club-modal-hero__meta">
                  <span className="club-modal-hero__pill">
                    {isPrivate ? <Lock size={12} /> : <Globe2 size={12} />}
                    {isPrivate ? 'Private' : 'Public'}
                  </span>
                  {detail.area && (
                    <span className="club-modal-hero__area">
                      <MapPin size={12} /> {detail.area}
                    </span>
                  )}
                </div>
                <h1 className="club-modal-hero__title">{detail.name}</h1>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="club-modal-action-row">
            <div className="club-modal-stats-strip">
              <div className="club-modal-stat">
                <Users size={16} />
                <strong>{totalMembers}</strong>
                <span>{totalMembers === 1 ? 'member' : 'members'}</span>
              </div>
              <div className="club-modal-stat">
                <Star
                  size={16}
                  fill={clubRating > 0 ? '#eab308' : 'none'}
                  color="#eab308"
                />
                <strong>{clubRating > 0 ? clubRating.toFixed(1) : 'New'}</strong>
                <span>rating</span>
              </div>
            </div>

            <div className="club-modal-buttons">
              {isMember ? (
                <>
                  <button
                    type="button"
                    className={`club-modal-chat-btn ${activeTab === 'chat' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                  >
                    <MessageCircle size={16} />
                    <span>Chat</span>
                    {messages.length > 0 && (
                      <span className="club-modal-chat-count">{messages.length}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="scoreboard-icon-btn"
                    onClick={copyInviteCode}
                    title="Copy Invite Code"
                  >
                    <Share2 size={15} />
                    <span>{copiedCode ? 'Copied!' : 'Share'}</span>
                  </button>

                  {!isCaptain && (
                    <button
                      type="button"
                      className="scoreboard-icon-btn"
                      onClick={() => setConfirmLeaveOpen(true)}
                      title="Leave Club"
                    >
                      <LogOut size={15} color="var(--vc-danger, #ef4444)" />
                      <span>Leave</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="queue-modal-btn"
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={handleJoin}
                  disabled={joinState === 'joining' || hasRequested}
                >
                  {joinState === 'joining' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : hasRequested || joinState === 'requested' ? (
                    'Request Sent'
                  ) : isPrivate ? (
                    'Request to Join'
                  ) : (
                    'Join Club'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="club-modal-tabs" role="tablist">
            {[
              { key: 'about', label: 'About' },
              {
                key: 'members',
                label: `Members (${totalMembers})`,
                badge: isAdmin && requests.length > 0 ? requests.length : 0,
              },
              { key: 'queues', label: 'Queues' },
              { key: 'events', label: 'Events' },
              { key: 'gallery', label: 'Gallery' },
              ...(isMember ? [{ key: 'chat', label: 'Chat' }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`club-modal-tab ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="queue-browse-tab-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* TAB CONTENT */}
          <div className="club-modal-body">
            {/* TAB 1: ABOUT */}
            {activeTab === 'about' && (
              <div className="club-modal-section">
                {/* Sports pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {sports.map((s) => (
                    <SportPill sport={s} key={s} />
                  ))}
                </div>

                {/* About description */}
                <div className="club-modal-card">
                  <h3 className="club-modal-card__title">About Club</h3>
                  <p className="club-modal-card__desc">
                    {detail.about || 'No description added yet for this club.'}
                  </p>
                </div>

                {/* Invite Code card */}
                <div className="club-modal-code-card">
                  <div>
                    <span className="club-modal-code-label">CLUB INVITE CODE</span>
                    <strong className="club-modal-code-val">
                      {detail.inviteCode || detail.code || 'CODE'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="scoreboard-icon-btn"
                    onClick={copyInviteCode}
                  >
                    {copiedCode ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Leaders Section */}
                <div className="club-modal-card" style={{ marginTop: 14 }}>
                  <h3 className="club-modal-card__title">Club Leaders</h3>
                  {leaders.length > 0 ? (
                    <div className="club-modal-leaders-list">
                      {leaders.map((m) => {
                        const u = m.user || m
                        const uName =
                          u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Leader'
                        return (
                          <div
                            key={m.id || u.id}
                            className="club-modal-leader-row is-clickable"
                            onClick={() => setViewingUser(u)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="club-modal-avatar">
                              {u.photoURL || u.avatarUrl ? (
                                <img src={u.photoURL || u.avatarUrl} alt="" />
                              ) : (
                                uName[0]
                              )}
                            </div>
                            <div className="club-modal-leader-info">
                              <div className="club-modal-leader-names">
                                <span className="club-modal-leader-name">{uName}</span>
                                {u.username && (
                                  <span className="club-modal-leader-role-text">
                                    @{u.username.replace(/^@/, '')}
                                  </span>
                                )}
                              </div>
                              <div className="club-modal-leader-right">
                                <span className="club-modal-role-tag club-modal-role-tag--admin">
                                  {m.role || 'LEADER'}
                                </span>
                                <ChevronRight size={18} className="club-member-chevron" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="club-modal-empty-text">No leaders assigned yet.</p>
                  )}
                </div>

                {/* Ratings & Reviews */}
                <div className="club-modal-card" style={{ marginTop: 14 }}>
                  <h3 className="club-modal-card__title">Ratings & Reviews</h3>

                  {isMember && (
                    <form onSubmit={handleSubmitReview} className="club-modal-review-form">
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Rate this club:</span>
                      <div
                        className="club-modal-stars-row"
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = star <= (hoverRating || myRating)
                          return (
                            <button
                              key={star}
                              type="button"
                              className="club-modal-star-btn"
                              onClick={() => setMyRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <Star
                                size={22}
                                fill={isFilled ? '#eab308' : 'none'}
                                color="#eab308"
                              />
                            </button>
                          )
                        })}
                      </div>

                      <input
                        className="queue-modal-input"
                        placeholder="Write an optional review..."
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                      />

                      <button
                        type="submit"
                        disabled={myRating === 0 || submittingReview}
                        className="queue-modal-btn"
                        style={{ alignSelf: 'flex-start', width: 'auto', padding: '8px 16px' }}
                      >
                        {submittingReview ? <Loader2 size={16} className="animate-spin" /> : 'Post Review'}
                      </button>

                      {reviewSuccess && (
                        <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>
                          ✓ Thanks for rating this club!
                        </span>
                      )}
                    </form>
                  )}

                  {reviews.length > 0 ? (
                    <div className="club-modal-reviews-list">
                      {reviews.map((r) => {
                        const author = r.author || r.user || {}
                        const aName = author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Member'
                        return (
                          <div key={r.id} className="club-modal-review-item">
                            <div className="club-modal-review-header">
                              <strong>{aName}</strong>
                              <div style={{ display: 'flex', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    size={13}
                                    fill={s <= r.rating ? '#eab308' : 'none'}
                                    color={s <= r.rating ? '#eab308' : '#cbd5e1'}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.text && <p className="club-modal-review-text">{r.text}</p>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="club-modal-empty-text">No reviews yet for this club.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === 'members' && (
              <div className="club-modal-section">
                {/* Pending Requests (Admin/Captain only) */}
                {isAdmin && requests.length > 0 && (
                  <div className="club-modal-card" style={{ marginBottom: 14, borderColor: 'var(--vc-primary)' }}>
                    <h3 className="club-modal-card__title" style={{ color: 'var(--vc-primary)' }}>
                      Pending Join Requests ({requests.length})
                    </h3>
                    <div className="club-modal-leaders-list">
                      {requests.map((req) => {
                        const u = req.user || req
                        const uName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Player'
                        return (
                          <div key={req.id} className="club-modal-leader-row" style={{ justifyContent: 'space-between' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                              onClick={() => setViewingUser(u)}
                              role="button"
                              tabIndex={0}
                              title="View player profile"
                            >
                              <div className="club-modal-avatar">{uName[0]}</div>
                              <div>
                                <strong>{uName}</strong>
                                <small style={{ display: 'block', color: 'var(--vc-text-secondary)', fontSize: 11 }}>
                                  Requested {formatDate(req.createdAt)}
                                </small>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                className="scoreboard-stat-mini-btn"
                                style={{ background: '#16a34a', color: '#fff', width: 28, height: 28 }}
                                onClick={() => handleRequestAction(req.id, 'approve')}
                                title="Approve"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="scoreboard-stat-mini-btn"
                                style={{ background: 'var(--vc-danger, #ef4444)', color: '#fff', width: 28, height: 28 }}
                                onClick={() => handleRequestAction(req.id, 'decline')}
                                title="Decline"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Member Roster */}
                <div className="club-modal-card">
                  <h3 className="club-modal-card__title">
                    Member Roster ({sortedMembers.length})
                  </h3>
                  <div className="club-modal-leaders-list">
                    {sortedMembers.map((m) => {
                      const u = m.user || m
                      const uName =
                        u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member'
                      const isMe = (u.id || m.userId) === myId

                      const roleUpper = String(m.role || 'MEMBER').toUpperCase()
                      let roleTagClass = 'club-modal-role-tag--member'
                      if (roleUpper === 'CAPTAIN') roleTagClass = 'club-modal-role-tag--captain'
                      else if (roleUpper === 'ADMIN') roleTagClass = 'club-modal-role-tag--admin'
                      else if (roleUpper === 'COACH') roleTagClass = 'club-modal-role-tag--coach'

                      const rowKey = m.id || u.id || m.userId

                      return (
                        <div
                          key={rowKey}
                          className="club-modal-leader-row is-clickable"
                          onClick={() => setViewingUser(u)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="club-modal-avatar">
                            {u.photoURL || u.avatarUrl ? (
                              <img src={u.photoURL || u.avatarUrl} alt="" />
                            ) : (
                              uName[0]
                            )}
                          </div>
                          <div className="club-modal-leader-info">
                            <div className="club-modal-leader-names">
                              <span className="club-modal-leader-name">
                                {uName}{' '}
                                {isMe && (
                                  <span style={{ color: 'var(--vc-primary)', fontSize: 12, fontWeight: 600 }}>
                                    (You)
                                  </span>
                                )}
                              </span>
                              {u.username && (
                                <span className="club-modal-leader-role-text">
                                  @{u.username.replace(/^@/, '')}
                                </span>
                              )}
                            </div>

                            <div className="club-modal-leader-right">
                              <span className={`club-modal-role-tag ${roleTagClass}`}>
                                {m.role || 'MEMBER'}
                              </span>

                              <ChevronRight size={18} className="club-member-chevron" />

                              {isCaptain && !isMe && (
                                <div style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className="club-member-more-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setMemberActionMenuId((curr) =>
                                        curr === rowKey ? null : rowKey
                                      )
                                    }}
                                    title="Captain actions"
                                    aria-label="Captain actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {memberActionMenuId === rowKey && (
                                    <div
                                      className="club-member-dropdown"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {roleUpper !== 'ADMIN' ? (
                                        <button
                                          type="button"
                                          className="club-member-dropdown-item"
                                          onClick={() => {
                                            setMemberActionMenuId(null)
                                            handleSetMemberRole(u.id || m.userId, 'ADMIN')
                                          }}
                                        >
                                          <Shield size={15} color="var(--vc-primary)" />
                                          <span>Make Admin</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="club-member-dropdown-item"
                                          onClick={() => {
                                            setMemberActionMenuId(null)
                                            handleSetMemberRole(u.id || m.userId, 'MEMBER')
                                          }}
                                        >
                                          <ShieldOff size={15} color="var(--vc-text-secondary)" />
                                          <span>Remove Admin</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        className="club-member-dropdown-item club-member-dropdown-item--danger"
                                        onClick={() => {
                                          setMemberActionMenuId(null)
                                          handleKickMember(u.id || m.userId, uName)
                                        }}
                                      >
                                        <UserMinus size={15} />
                                        <span>Remove Member</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QUEUES */}
            {activeTab === 'queues' && (
              <div className="club-modal-section">
                {upcoming.queues.length > 0 ? (
                  <div className="club-modal-list-col">
                    {upcoming.queues.map((q) => (
                      <div key={q.id} className="club-modal-item-row">
                        <SportPill sport={sportFromApi(q.sport)} />
                        <div style={{ flex: 1 }}>
                          <strong>{q.title || 'Club Queue'}</strong>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                            <Clock3 size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                            {formatDate(q.startTime)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="queue-empty-box">
                    <Clock3 size={24} style={{ marginBottom: 6, opacity: 0.6 }} />
                    <p style={{ margin: 0 }}>No queues scheduled for this club right now.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EVENTS */}
            {activeTab === 'events' && (
              <div className="club-modal-section">
                {upcoming.events.length > 0 ? (
                  <div className="club-modal-list-col">
                    {upcoming.events.map((e) => (
                      <div key={e.id} className="club-modal-item-row">
                        <SportPill sport={sportFromApi(e.sport)} />
                        <div style={{ flex: 1 }}>
                          <strong>{e.title || e.name}</strong>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                            <CalendarDays size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                            {formatDate(e.date || e.startsAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="queue-empty-box">
                    <CalendarDays size={24} style={{ marginBottom: 6, opacity: 0.6 }} />
                    <p style={{ margin: 0 }}>No tournaments or events hosted by this club yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: GALLERY */}
            {activeTab === 'gallery' && (
              <div className="club-modal-section">
                {gallery.length > 0 ? (
                  <div className="club-modal-gallery-grid">
                    {gallery.map((img, idx) => (
                      <div key={idx} className="club-modal-gallery-item">
                        <img src={img} alt="" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="queue-empty-box">
                    <ImageIcon size={24} style={{ marginBottom: 6, opacity: 0.6 }} />
                    <p style={{ margin: 0 }}>Photos shared in this club will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CHAT */}
            {activeTab === 'chat' && (
              <div className="club-modal-chat-section">
                <div className="club-modal-chat-messages">
                  {messages.length === 0 ? (
                    <div className="queue-empty-box" style={{ margin: 'auto' }}>
                      <MessageCircle size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
                      <strong>Welcome to the club board!</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                        Say hi to fellow members and coordinate your next game.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const author = msg.author || msg.user || {}
                      const isMe = (author.id || msg.authorId) === myId
                      const aName = author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Player'

                      return (
                        <div
                          key={msg.id}
                          className={`club-chat-bubble ${isMe ? 'is-me' : 'is-other'}`}
                        >
                          {!isMe && (
                            <span
                              className="club-chat-author"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setViewingUser(author)}
                              title="View player profile"
                            >
                              {aName}
                            </span>
                          )}
                          <div className="club-chat-text">{msg.text}</div>
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="" className="club-chat-img" />
                          )}
                          <span className="club-chat-time">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="club-modal-chat-input-row">
                  <input
                    className="queue-modal-input"
                    placeholder="Type a message..."
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!chatText.trim() || sendingMsg}
                    className="scoreboard-point-btn"
                    style={{ minWidth: 44, height: 44, borderRadius: 12 }}
                  >
                    {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Club Confirmation Dialog */}
      {confirmLeaveOpen && (
        <div className="sport-picker-backdrop" onClick={() => setConfirmLeaveOpen(false)}>
          <div className="sport-picker-sheet" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2 className="sport-picker-title" style={{ marginBottom: 8 }}>Leave Club?</h2>
            <p style={{ fontSize: 13.5, color: 'var(--vc-text-secondary)', marginBottom: 20 }}>
              You will no longer receive club chat messages or exclusive open queue invites.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="scoreboard-back-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setConfirmLeaveOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="queue-modal-btn"
                style={{ flex: 1, background: 'var(--vc-danger, #ef4444)' }}
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Public Profile Dialog */}
      <UserProfileDialog
        user={viewingUser}
        open={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
      />

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
