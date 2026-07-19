import { Award, ChevronRight, Edit3, Flame, Heart, MapPin, Settings, Shield, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { favorites, joinedQueues } = usePlayer()
  return (
    <>
      <div className="profile-hero"><div className="profile-cover" /><div className="profile-main"><span className="avatar avatar--large">{user?.initials || 'MS'}</span><div><span className="profile-level">LEVEL 12 · COURT REGULAR</span><h1>{user?.name || 'Mika Santos'}</h1><p>{user?.handle} · <MapPin size={15} /> {user?.location}</p></div><button className="button button--outline"><Edit3 size={16} /> Edit profile</button></div><div className="xp-bar"><div><span>2,480 XP</span><span>3,000 XP</span></div><i><span style={{ width: '78%' }} /></i></div></div>
      <div className="profile-stats"><div><b>48</b><span>Games played</span></div><div><b>31</b><span>Wins</span></div><div><b>65%</b><span>Win rate</span></div><div><b>{joinedQueues.length}</b><span>Active queues</span></div></div>
      <div className="profile-grid">
        <section className="profile-panel"><div className="section-title"><h2>Your sports</h2><button>Edit</button></div><div className="skill-row"><span className="skill-icon">●</span><div><b>Basketball</b><small>Intermediate</small></div><i><span style={{ width: '68%' }} /></i><strong>3.4</strong></div><div className="skill-row"><span className="skill-icon skill-icon--green">◒</span><div><b>Badminton</b><small>Recreational</small></div><i><span style={{ width: '42%' }} /></i><strong>2.1</strong></div></section>
        <section className="profile-panel"><div className="section-title"><h2>Achievements</h2><button>View all</button></div><div className="achievement-row"><span><Trophy /><small>First Win</small></span><span><Flame /><small>Hot Streak</small></span><span><Award /><small>Club MVP</small></span><span className="is-locked"><Shield /><small>Locked</small></span></div></section>
        <section className="profile-panel profile-panel--menu"><h2>Player settings</h2><button><span><Heart /> Saved courts <i>{favorites.length}</i></span><ChevronRight /></button><button><span><Trophy /> Match history</span><ChevronRight /></button><button><span><Settings /> Account settings</span><ChevronRight /></button><button className="signout" onClick={signOut}>Sign out</button></section>
      </div>
    </>
  )
}
