import { Bell, CalendarDays, Compass, Home, MapPin, Menu, MessageCircle, Search, Trophy, UserRound, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import Brand from './Brand'

const links = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/discover', label: 'Discover', icon: Compass },
  { to: '/app/queues', label: 'Open play', icon: UsersRound },
  { to: '/app/bookings', label: 'My bookings', icon: CalendarDays },
  { to: '/app/events', label: 'Events', icon: Trophy },
]

export default function AppShell() {
  const { user } = useAuth()
  const { search, setSearch, notice } = usePlayer()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar__top">
          <Brand light />
          <button className="sidebar-close" onClick={() => setMobileOpen(false)}><X /></button>
        </div>
        <nav className="app-nav">
          <p className="nav-label">PLAYER SPACE</p>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
          <p className="nav-label nav-label--second">CONNECT</p>
          <a href="#clubs"><MessageCircle size={19} /><span>Messages</span><i>3</i></a>
          <a href="#clubs"><UsersRound size={19} /><span>My clubs</span></a>
        </nav>
        <div className="sidebar-card">
          <span className="eyebrow">YOUR WEEK</span>
          <b>3 games lined up</b>
          <div className="mini-avatars"><span>JM</span><span>RL</span><span>+6</span></div>
          <small>Keep the momentum going.</small>
        </div>
        <NavLink to="/app/profile" className="sidebar-profile">
          <span className="avatar">{user?.initials || 'VC'}</span>
          <span><b>{user?.name || 'Guest player'}</b><small>View profile</small></span>
          <span>•••</span>
        </NavLink>
      </aside>
      <main className="app-main">
        <header className="app-topbar">
          <button className="mobile-app-menu" onClick={() => setMobileOpen(true)}><Menu /></button>
          <div className="global-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courts, queues, events..." />
            {search && <button onClick={() => setSearch('')}>Clear</button>}
          </div>
          <div className="topbar-actions">
            <button className="location-chip"><MapPin size={16} /> Quezon City <span>⌄</span></button>
            <button className="icon-button"><Bell size={19} /><i /></button>
          </div>
        </header>
        <div className="app-content" key={location.pathname}><Outlet /></div>
        {notice && <div className="toast">✓ <span>{notice}</span></div>}
      </main>
      <nav className="mobile-bottom-nav">
        {links.slice(0, 4).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={20} /><span>{label}</span></NavLink>)}
        <NavLink to="/app/profile"><UserRound size={20} /><span>Profile</span></NavLink>
      </nav>
    </div>
  )
}
