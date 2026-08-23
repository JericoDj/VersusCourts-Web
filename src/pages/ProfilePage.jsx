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
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ComingSoonDialog from '../components/ComingSoonDialog'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import '../styles/profile.css'

/// PLACEHOLDER stats. Copied verbatim from the Flutter app's
/// `MockData.currentUser.stats` (mock_data.dart:330) because the web API has no
/// player-stats endpoint yet. Swap this for the real source when one exists —
/// everything below (XP, level, achievements) is DERIVED from it, never hardcoded.
const PROFILE_STATS = { gamesPlayed: 86, wins: 54, losses: 32, hoursPlayed: 172 }

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

/// Account rows, in the Flutter order (profile_screen.dart:140-153). `to: null`
/// means the destination has no web route yet — those open the Coming Soon
/// dialog rather than dead-ending. The Queue Master label is static: there is no
/// QueueMasterProvider on web to make it "(Pending)".
const MENU_ITEMS = [
  { icon: ShieldCheck, label: 'Become a Queue Master', to: null },
  { icon: Receipt, label: 'Transactions', to: null },
  { icon: Calendar, label: 'My Bookings', to: '/app/bookings' },
  { icon: History, label: 'Queue History', to: null },
  { icon: Shield, label: 'Privacy Policy', to: null },
  { icon: FileText, label: 'Terms of Use', to: null },
  { icon: Lock, label: 'Security', to: null },
]

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { clubs, setNotice } = usePlayer()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [comingSoon, setComingSoon] = useState('')
  const [bioExpanded, setBioExpanded] = useState(false)

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

  const stats = PROFILE_STATS
  const winRate = winRateOf(stats)
  const unlocked = unlockedFor(stats)
  const xp = unlocked.reduce((sum, a) => sum + a.xpReward, 0)
  const level = 1 + Math.floor(xp / 500)
  const levelProgress = (xp % 500) / 500

  const avatarUrl = user?.photoURL || user?.avatarUrl
  const roles = user?.roles?.length ? user.roles : ['PLAYER']
  const bio = user?.bio?.trim()
  const area = (user?.location || '').split(',')[0]
  const myClubs = clubs.slice(0, 2)

  const shareStats = async () => {
    const text = `${user?.name || 'I'} — ${stats.gamesPlayed} games, ${stats.wins} wins, ${winRate.toFixed(0)}% win rate on Versus Courts.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Versus Courts stats', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setNotice('Stats copied to your clipboard')
    } catch {
      /* the user dismissed the share sheet, or the clipboard is blocked */
    }
  }

  return (
    <div className="profile-page">
      <header className="pf-header">
        {/* Cover bleeds back out through .app-content's gutters. Written so a
            real coverUrl can layer in later as an inline background-image. */}
        <div className="pf-cover" aria-hidden="true" />

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
              onClick={() => setComingSoon('Edit Profile')}
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
            <button type="button" className="pf-add-bio" onClick={() => setComingSoon('Edit Profile')}>
              <Plus size={16} /> Add a description
            </button>
          )}

          <div className="pf-level">
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
          </div>
        </div>
      </header>

      <div className="pf-stats">
        <div className="pf-stat pf-stat--primary"><b>{stats.gamesPlayed}</b><span>Games</span></div>
        <div className="pf-stat pf-stat--green"><b>{stats.wins}</b><span>Wins</span></div>
        <div className="pf-stat pf-stat--accent"><b>{winRate.toFixed(0)}%</b><span>Win Rate</span></div>
        <div className="pf-stat pf-stat--padel"><b>{stats.hoursPlayed}</b><span>Hours</span></div>
      </div>

      <button type="button" className="button button--outline button--full pf-share" onClick={shareStats}>
        <Share2 size={18} /> Share My Stats
      </button>

      {/* Deliberately quiet: one slim row, no badge carousel. */}
      <button type="button" className="pf-achievements" onClick={() => setComingSoon('Achievements')}>
        <Trophy size={20} />
        <div>
          <b>Achievements</b>
          <small>{unlocked.length} of {ACHIEVEMENTS.length} unlocked</small>
        </div>
        <ChevronRight size={20} />
      </button>

      <h2 className="pf-section-title">My Clubs</h2>
      <div className="pf-list">
        {myClubs.map((club) => (
          // No /app/clubs/:id route exists, so every club row lands on the list.
          <Link key={club.id} to="/app/clubs" className="pf-club-row">
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
        {MENU_ITEMS.map(({ icon: Icon, label, to }) => (to
          ? (
            <Link key={label} to={to} className="pf-menu-row">
              <span className="pf-menu-icon"><Icon size={20} /></span>
              <span>{label}</span>
              <ChevronRight size={20} />
            </Link>
          )
          : (
            <button key={label} type="button" className="pf-menu-row" onClick={() => setComingSoon(label)}>
              <span className="pf-menu-icon"><Icon size={20} /></span>
              <span>{label}</span>
              <ChevronRight size={20} />
            </button>
          )
        ))}

        <button type="button" className="pf-menu-row pf-menu-row--logout" onClick={() => setConfirmLogout(true)}>
          <span className="pf-menu-icon"><LogOut size={20} /></span>
          <span>Log out</span>
        </button>
      </div>

      <ComingSoonDialog open={Boolean(comingSoon)} label={comingSoon} onClose={() => setComingSoon('')} />

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
