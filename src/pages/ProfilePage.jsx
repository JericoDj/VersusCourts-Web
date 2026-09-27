import {
  Calendar,
  ChevronRight,
  Edit3,
  FileText,
  History,
  Lock,
  LogOut,
  MapPin,
  Plus,
  Receipt,
  Share2,
  Shield,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import ProfileDialog from '../components/ProfileDialog'
import EditProfileDialog from '../components/EditProfileDialog'
import ShareStatsDialog from '../components/ShareStatsDialog'
import { QueueMasterDialog } from './QueueMasterPage'
import TransactionsDialog from '../components/TransactionsDialog'
import BookingsDialog from '../components/BookingsDialog'
import QueueHistoryDialog from '../components/QueueHistoryDialog'
import PrivacyPolicyDialog from '../components/PrivacyPolicyDialog'
import TermsOfUseDialog from '../components/TermsOfUseDialog'
import AccountSecurityDialog from '../components/AccountSecurityDialog'
import { ModeSwitcherBar } from '../components/ModeSwitcher'
import { apiRequest } from '../data/apiClient'
import { useAccountData, AccountLoading } from './ProfileAccountPage'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import '../styles/profile.css'

const DEFAULT_STATS = { gamesPlayed: 0, wins: 0, losses: 0, hoursPlayed: 0 }

const winRateOf = (stats) => (stats.gamesPlayed === 0 ? 0 : (stats.wins / stats.gamesPlayed) * 100)

/// Ported from the Flutter `AchievementCatalog` (achievement.dart). Pure
/// derivation from stats — invents no data. Level = 1 + xp/500, XP = the sum of
/// every unlocked reward.
const ACHIEVEMENTS = [
  { id: 'first_match', emoji: '🏆', title: 'First Match', criteria: 'Play your first game', xpReward: 50, target: 1, progress: (s) => s.gamesPlayed },
  { id: 'getting_started', emoji: '🥎', title: 'Getting Started', criteria: 'Play 5 games', xpReward: 100, target: 5, progress: (s) => s.gamesPlayed },
  { id: 'regular', emoji: '📅', title: 'Regular', criteria: 'Play 25 games', xpReward: 200, target: 25, progress: (s) => s.gamesPlayed },
  { id: 'veteran', emoji: '🎖️', title: 'Veteran', criteria: 'Play 100 games', xpReward: 500, target: 100, progress: (s) => s.gamesPlayed },
  { id: 'first_win', emoji: '🥇', title: 'First Win', criteria: 'Win your first game', xpReward: 50, target: 1, progress: (s) => s.wins },
  { id: 'on_fire', emoji: '🔥', title: 'On Fire', criteria: 'Win 10 games', xpReward: 200, target: 10, progress: (s) => s.wins },
  { id: 'champion', emoji: '👑', title: 'Champion', criteria: 'Win 50 games', xpReward: 500, target: 50, progress: (s) => s.wins },
  { id: 'sharp_shooter', emoji: '🎯', title: 'Sharp Shooter', criteria: 'Reach a 60% win rate over at least 10 games', xpReward: 300, target: 60, progress: (s) => (s.gamesPlayed >= 10 ? Math.floor(winRateOf(s)) : 0) },
  { id: 'marathoner', emoji: '⏱️', title: 'Marathoner', criteria: 'Play 10 hours', xpReward: 150, target: 10, progress: (s) => s.hoursPlayed },
  { id: 'iron_player', emoji: '💪', title: 'Iron Player', criteria: 'Play 50 hours', xpReward: 400, target: 50, progress: (s) => s.hoursPlayed },
]

const unlockedFor = (stats) => ACHIEVEMENTS.filter((a) => a.progress(stats) >= a.target)

// Account destinations follow the mobile profile menu.
const MENU_ITEMS = [
  { id: 'queue-master', icon: ShieldCheck, label: 'Become a Queue Master' },
  { id: 'transactions', icon: Receipt, label: 'Transactions' },
  { id: 'bookings', icon: Calendar, label: 'My Bookings' },
  { id: 'history', icon: History, label: 'Queue History' },
  { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
  { id: 'terms', icon: FileText, label: 'Terms of Use' },
  { id: 'security', icon: Lock, label: 'Security & Account Deletion' },
]

const loadProfile = async () => {
  const [user, application] = await Promise.all([apiRequest('/users/me'), apiRequest('/queue-master-applications/my-application').catch(() => null)])
  return { ...user, queueMasterApplication: application }
}

export default function ProfilePage() {
  const { user: authUser, signOut } = useAuth()
  const { myClubs = [] } = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const getInitialDialog = () => {
    const q = searchParams.get('dialog')
    if (q) return q
    if (location.pathname.includes('/profile/queue-master')) return 'queue-master'
    if (location.pathname.includes('/profile/transactions')) return 'transactions'
    if (location.pathname.includes('/profile/history')) return 'history'
    if (location.pathname.includes('/profile/security')) return 'security'
    if (location.pathname.includes('/bookings')) return 'bookings'
    if (location.pathname.includes('/privacy')) return 'privacy'
    if (location.pathname.includes('/terms')) return 'terms'
    return null
  }

  const [activeDialog, setActiveDialog] = useState(getInitialDialog)

  useEffect(() => {
    const dialogFromUrl = getInitialDialog()
    if (dialogFromUrl) {
      setActiveDialog(dialogFromUrl)
    }
  }, [location.pathname, searchParams])

  const handleCloseDialog = () => {
    setActiveDialog(null)
    if (searchParams.has('dialog')) {
      searchParams.delete('dialog')
      setSearchParams(searchParams, { replace: true })
    }
    if (
      location.pathname !== '/app/profile' &&
      (location.pathname.includes('/profile/') ||
       location.pathname.includes('/bookings') ||
       location.pathname.includes('/privacy') ||
       location.pathname.includes('/terms'))
    ) {
      navigate('/app/profile', { replace: true })
    }
  }

  const [confirmLogout, setConfirmLogout] = useState(false)
  const [comingSoon, setComingSoon] = useState('')
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const profile = useAccountData(loadProfile)
  const profileReady = !profile.loading && !profile.error && !!profile.data
  const user = { ...authUser, ...profile.data, name: profile.data ? [profile.data.firstName, profile.data.lastName].filter(Boolean).join(' ') : authUser?.name, handle: profile.data?.username ? `@${profile.data.username}` : authUser?.handle }
  const [achievement, setAchievement] = useState(null)

  /// Land on the public site root — that is versuscourts.com/ in production, and
  /// still works on localhost and staging, which an absolute URL would not.
  /// `replace` keeps Back from returning to the signed-in profile.
  const handleLogout = async () => {
    setConfirmLogout(false)
    try {
      await signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  const rawStats = profile.data?.stats || profile.data || user?.stats || DEFAULT_STATS
  const stats = Object.fromEntries(Object.keys(DEFAULT_STATS).map((key) => [key, Number(rawStats[key] || 0)]))
  const winRate = winRateOf(stats)
  const unlocked = unlockedFor(stats)
  const xp = unlocked.reduce((sum, a) => sum + a.xpReward, 0)
  const level = 1 + Math.floor(xp / 500)
  const levelProgress = (xp % 500) / 500

  const avatarUrl = user?.avatarUrl || user?.photoURL
  const roles = user?.roles?.length ? user.roles : ['PLAYER']
  const bio = user?.bio?.trim()
  const area = user?.area || user?.location || ''

  const shareStats = () => setComingSoon('Share Stats')

  return (
    <div className="profile-page">
      <header className="pf-header">
        <div className="pf-cover" aria-hidden="true" style={user?.coverUrl ? { backgroundImage: `url(${JSON.stringify(user.coverUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />

        <div className="pf-card">
          <div className="pf-identity">
            <span className="pf-avatar-ring">
              {avatarUrl
                ? <img className="pf-avatar" src={avatarUrl} alt="" />
                : <span className="pf-avatar">{user?.initials || 'VC'}</span>}
            </span>

            <div className="pf-identity__text">
              <h1>{user?.name || 'Player'}</h1>
              <p className="pf-handle">{user?.handle || '@player'}</p>
              <div className="pf-roles">
                {roles.map((role) => (
                  <span key={role} className={`pf-role${role === 'PLAYER' ? '' : ' pf-role--accent'}`}>
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {area && (
                <span className="pf-info-pill"><MapPin size={13} /> {area}</span>
              )}
            </div>

            <button
              type="button"
              className="pf-icon-button"
              aria-label="Edit profile"
              disabled={!profileReady}
              onClick={() => setEditProfileOpen(true)}
            >
              <Edit3 size={20} />
            </button>
          </div>

          {bio ? (
            <>
              <p className={`pf-bio${bioExpanded ? '' : ' pf-bio--clamped'}`}>{bio}</p>
              {(bio.length > 80 || bio.includes('\n')) && (
                <button type="button" className="pf-bio-toggle" onClick={() => setBioExpanded((open) => !open)}>
                  {bioExpanded ? 'Less' : 'More'}
                </button>
              )}
            </>
          ) : (
            <button type="button" className="pf-add-bio" disabled={!profileReady} onClick={() => setEditProfileOpen(true)}>
              <Plus size={16} /> Add a description
            </button>
          )}

          {profileReady && <div className="pf-level">
            <div className="pf-level__row">
              <span className="pf-level__badge">LVL {level}</span>
              <span className="pf-mini-badges">
                {unlocked.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="pf-mini-badge"
                    title={`${a.title} — ${a.criteria}`}
                    onClick={() => setComingSoon('Achievements')}
                  >
                    <span aria-hidden="true">{a.emoji}</span>
                    <span className="sr-only">{a.title}</span>
                  </button>
                ))}
              </span>
              <span className="pf-level__xp">{xp} XP</span>
            </div>
            <div
              className="pf-level__track"
              role="progressbar"
              aria-label="Progress to next level"
              aria-valuenow={Math.round(levelProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="pf-level__fill" style={{ width: `${levelProgress * 100}%` }} />
            </div>
          </div>}
        </div>
      </header>

      {profileReady && <ModeSwitcherBar roles={roles} avatarUrl={avatarUrl} />}

      {profile.loading || profile.error ? <AccountLoading state={profile} /> : <div className="pf-stats">
        <div className="pf-stat pf-stat--primary"><b>{stats.gamesPlayed}</b><span>Games</span></div>
        <div className="pf-stat pf-stat--green"><b>{stats.wins}</b><span>Wins</span></div>
        <div className="pf-stat pf-stat--accent"><b>{winRate.toFixed(0)}%</b><span>Win Rate</span></div>
        <div className="pf-stat pf-stat--padel"><b>{stats.hoursPlayed}</b><span>Hours</span></div>
      </div>}

      <button type="button" className="button button--outline button--full pf-share" disabled={!profileReady} onClick={shareStats}>
        <Share2 size={18} /> Share My Stats
      </button>

      {/* Deliberately quiet: one slim row, no badge carousel. */}
      <button type="button" className="pf-achievements" disabled={!profileReady} onClick={() => setComingSoon('Achievements')}>
        <Trophy size={20} />
        <div>
          <b>Achievements</b>
          <small>{profileReady ? `${unlocked.length} of ${ACHIEVEMENTS.length} unlocked` : 'Player progress'}</small>
        </div>
        <ChevronRight size={20} />
      </button>

      <h2 className="pf-section-title">My Clubs</h2>
      <div className="pf-list">
        {myClubs.map((club) => (
          <Link key={club.id} to={`/app/clubs/${club.id}`} className="pf-club-row">
            <img className="pf-club-logo" src={club.image} alt="" />
            <div>
              <b>{club.name}</b>
              <small>{club.members} members</small>
            </div>
            <span className="pf-tag">Member</span>
          </Link>
        ))}
      </div>

      <h2 className="pf-section-title">Account</h2>
      <div className="pf-list">
        {MENU_ITEMS.map(({ id, icon: Icon, label }) => {
          let customLabel = label
          let badgeTag = null

          if (id === 'queue-master') {
            const app = profile.data?.queueMasterApplication
            const isQM = roles.includes('QUEUE_MASTER') || app?.status === 'APPROVED'
            const isPending = app?.status === 'PENDING'
            const isRejected = app?.status === 'REJECTED'

            if (isQM) {
              customLabel = 'Queue Master'
              badgeTag = <span className="pf-tag" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--vc-brand-green, #16a34a)' }}>Active</span>
            } else if (isPending) {
              customLabel = 'Queue Master (Pending)'
              badgeTag = <span className="pf-tag" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#d97706' }}>Pending</span>
            } else if (isRejected) {
              customLabel = 'Become a Queue Master'
              badgeTag = <span className="pf-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--vc-danger, #dc2626)' }}>Review</span>
            } else {
              customLabel = 'Become a Queue Master'
            }
          }

          return (
            <button
              key={id}
              type="button"
              className="pf-menu-row"
              onClick={() => setActiveDialog(id)}
            >
              <span className="pf-menu-icon"><Icon size={20} /></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span>{customLabel}</span>
                {badgeTag}
              </span>
              <ChevronRight size={20} />
            </button>
          )
        })}

        <button type="button" className="pf-menu-row pf-menu-row--logout" onClick={() => setConfirmLogout(true)}>
          <span className="pf-menu-icon"><LogOut size={20} /></span>
          <span>Log out</span>
        </button>
      </div>

      {editProfileOpen && <EditProfileDialog profileUser={user} onClose={() => { setEditProfileOpen(false); profile.reload() }} />}
      {comingSoon === 'Share Stats' && <ShareStatsDialog user={{ ...user, level }} stats={stats} onClose={() => setComingSoon('')} />}
      {comingSoon === 'Achievements' && <ProfileDialog title="Achievements" onClose={() => { setComingSoon(''); setAchievement(null) }}><p>{unlocked.length} of {ACHIEVEMENTS.length} unlocked · {xp} XP · Level {level}</p><div className="pf-achievement-grid">{ACHIEVEMENTS.map((item) => <button key={item.id} className={`pf-achievement-card${item.progress(stats) >= item.target ? ' is-unlocked' : ''}`} onClick={() => setAchievement(item)}><span>{item.emoji}</span><b>{item.title}</b><small>{Math.min(item.target, item.progress(stats))}/{item.target} · +{item.xpReward} XP</small><progress max={item.target} value={Math.min(item.target, item.progress(stats))} /></button>)}</div>{achievement && <article className="pf-account-card"><h3>{achievement.emoji} {achievement.title}</h3><p>{achievement.criteria}</p><p>{achievement.progress(stats) >= achievement.target ? 'Unlocked' : 'Keep playing to unlock'} · {achievement.xpReward} XP</p></article>}</ProfileDialog>}

      {activeDialog === 'queue-master' && (
        <QueueMasterDialog isOpen onClose={() => { handleCloseDialog(); profile.reload() }} />
      )}
      {activeDialog === 'transactions' && (
        <TransactionsDialog isOpen onClose={handleCloseDialog} />
      )}
      {activeDialog === 'bookings' && (
        <BookingsDialog isOpen onClose={handleCloseDialog} />
      )}
      {activeDialog === 'history' && (
        <QueueHistoryDialog isOpen onClose={handleCloseDialog} />
      )}
      {activeDialog === 'privacy' && (
        <PrivacyPolicyDialog isOpen onClose={handleCloseDialog} />
      )}
      {activeDialog === 'terms' && (
        <TermsOfUseDialog isOpen onClose={handleCloseDialog} />
      )}
      {activeDialog === 'security' && (
        <AccountSecurityDialog isOpen onClose={handleCloseDialog} />
      )}

      {confirmLogout && (
        <div className="dialog-overlay" role="presentation" onClick={() => setConfirmLogout(false)}>
          <div
            className="dialog pf-logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pf-logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="pf-logout-title">Log out?</h2>
            <p>You will need to sign in again to continue.</p>
            <div className="pf-logout-dialog__actions">
              <button type="button" className="button button--outline" onClick={() => setConfirmLogout(false)}>Cancel</button>
              <button
                type="button"
                className="button pf-button--danger"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
