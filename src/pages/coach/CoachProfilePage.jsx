import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, ChevronRight, Gift, History, LogOut, Pencil, Receipt, Star, StarHalf, UserRound } from 'lucide-react'
import { CoachIncentivesDialog, CoachIncentivesStrip } from '../../components/CoachIncentives'
import EarningsWallet from '../../components/EarningsWallet'
import EditProfileDialog from '../../components/EditProfileDialog'
import { ModeSwitcherBar } from '../../components/ModeSwitcher'
import ProfileDialog from '../../components/ProfileDialog'
import QueueHistoryDialog from '../../components/QueueHistoryDialog'
import TransactionsDialog from '../../components/TransactionsDialog'
import { useAuth } from '../../context/AuthContext'
import { useCoach } from '../../context/CoachContext'
import { usePlayer } from '../../context/PlayerContext'
import { apiRequest } from '../../data/apiClient'
import { sportColor, sportGradient, sportLabel } from '../../data/sports'
import { QueueMasterDialog } from '../QueueMasterPage'
import CoachHeader from './CoachHeader'
import CoachIdentityForm from './CoachIdentityForm'
import '../../styles/profile.css'

/// Coach mode › Profile — port of `_ProfileTab` (coach_mode_screen.dart):
/// the identity card as players see it, the mode switcher, the embedded
/// Versus Wallet, and the Account menu.
export default function CoachProfilePage() {
  const { identity, overview } = useCoach()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { setNotice } = usePlayer()
  const [dialog, setDialog] = useState(null) // 'identity' | 'incentives' | 'credits' | 'history' | 'host' | 'player' | 'logout'
  const [playerProfile, setPlayerProfile] = useState(null)
  const [walletKey, setWalletKey] = useState(0)
  const isHost = Boolean(user?.roles?.includes('QUEUE_MASTER'))

  const openPlayerProfile = async () => {
    try {
      const me = await apiRequest('/users/me')
      setPlayerProfile({ ...user, ...me, name: [me.firstName, me.lastName].filter(Boolean).join(' ') })
      setDialog('player')
    } catch (err) {
      setNotice(err.message || 'Could not load your player profile.')
    }
  }

  const MENU = [
    { id: 'incentives', icon: Gift, tone: 'var(--vc-accent)', title: 'Incentives', onClick: () => setDialog('incentives') },
    { id: 'credits', icon: Receipt, tone: 'var(--vc-primary)', title: 'Host credits & fees', onClick: () => setDialog('credits') },
    { id: 'history', icon: History, tone: 'var(--vc-brand-green)', title: 'Queue history', onClick: () => setDialog('history') },
    ...(isHost ? [{ id: 'host', icon: Award, tone: 'var(--vc-accent)', title: 'Host application', onClick: () => setDialog('host') }] : []),
    { id: 'player', icon: UserRound, tone: 'var(--vc-text-secondary)', title: 'Edit player profile', onClick: openPlayerProfile },
    { id: 'logout', icon: LogOut, tone: 'var(--vc-danger)', title: 'Log out', danger: true, onClick: () => setDialog('logout') },
  ]

  /// Same as the player Profile: sign out, then land on the public site root
  /// (replace, so Back can't return to coach mode).
  const logout = async () => {
    setDialog(null)
    try {
      await signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="coach-page">
      <CoachHeader title="Profile" subtitle="How players see you" />

      <section className="cp-identity" style={{ background: sportGradient(identity.sport), '--sport': sportColor(identity.sport) }}>
        <div className="cp-identity__top">
          <span className="cp-identity__avatar">
            {identity.avatarUrl ? <img src={identity.avatarUrl} alt="" /> : <UserRound size={36} color={sportColor(identity.sport)} />}
          </span>
          <div className="cp-identity__who">
            <h2>{identity.name}</h2>
            <Stars avg={identity.ratingAvg} count={identity.ratingCount} />
            <span className="cp-identity__badge" style={{ color: sportColor(identity.sport) }}>{sportLabel(identity.sport)} coach</span>
          </div>
          <button type="button" className="cp-identity__edit" aria-label="Edit coach profile" title="Edit coach profile" onClick={() => setDialog('identity')}>
            <Pencil size={18} />
          </button>
        </div>
        {identity.bio && <p className="cp-identity__bio">{identity.bio}</p>}
        <div className="cp-identity__stats">
          <span><b>{overview.totalTrainings}</b><small>Sessions</small></span>
          <span><b>{overview.totalStudents}</b><small>Students</small></span>
          <span><b>{overview.upcomingTrainings}</b><small>Upcoming</small></span>
        </div>
      </section>

      <ModeSwitcherBar coachName={identity.name} avatarUrl={user?.avatarUrl || user?.photoURL} />

      <CoachIncentivesStrip />

      <div className="cp-section-head">
        <h2 className="cp-section-title">Versus Wallet</h2>
        <button type="button" className="coach-link-btn cp-refresh" onClick={() => setWalletKey((k) => k + 1)}>Refresh</button>
      </div>
      <EarningsWallet embedded reloadKey={walletKey} />

      <h2 className="cp-section-title">Account</h2>
      <div className="ew-card cp-menu">
        {MENU.map(({ id, icon: Icon, tone, title, danger, onClick }) => (
          <button key={id} type="button" className={`cp-menu__row${danger ? ' cp-menu__row--danger' : ''}`} onClick={onClick}>
            <span className="ew-icon" style={{ '--tone': tone }}><Icon size={19} /></span>
            <span className="ew-grow"><b>{title}</b></span>
            {!danger && <ChevronRight size={18} />}
          </button>
        ))}
      </div>

      {dialog === 'identity' && (
        <ProfileDialog title="Coach profile" onClose={() => setDialog(null)}>
          <CoachIdentityForm onDone={() => setDialog(null)} />
        </ProfileDialog>
      )}
      {dialog === 'incentives' && <CoachIncentivesDialog onClose={() => setDialog(null)} />}
      {dialog === 'credits' && <TransactionsDialog isOpen onClose={() => setDialog(null)} />}
      {dialog === 'history' && <QueueHistoryDialog isOpen onClose={() => setDialog(null)} />}
      {dialog === 'host' && <QueueMasterDialog isOpen onClose={() => setDialog(null)} />}
      {dialog === 'logout' && (
        <ProfileDialog title="Log out?" onClose={() => setDialog(null)}>
          <p>You will need to sign in again to continue.</p>
          <div className="tr-confirm__row">
            <button type="button" className="button button--outline" onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="button pf-button--danger" onClick={logout}>Log out</button>
          </div>
        </ProfileDialog>
      )}
      {dialog === 'player' && playerProfile && <EditProfileDialog profileUser={playerProfile} onClose={() => setDialog(null)} />}
    </div>
  )
}

/// ★★★★☆ 4.3 (12) — or "No ratings yet" (`_Stars`).
function Stars({ avg, count }) {
  if (!count) return <span className="cp-stars cp-stars--none">No ratings yet</span>
  return (
    <span className="cp-stars" aria-label={`${avg.toFixed(1)} out of 5 from ${count} ratings`}>
      {[1, 2, 3, 4, 5].map((i) => (avg >= i
        ? <Star key={i} size={16} fill="currentColor" />
        : avg >= i - 0.5 ? <StarHalf key={i} size={16} fill="currentColor" /> : <Star key={i} size={16} />))}
      <b>{avg.toFixed(1)} ({count})</b>
    </span>
  )
}
