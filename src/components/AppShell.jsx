import { CalendarDays, Home, UserRound, UsersRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import AppActionPill from './AppActionPill'
import AppBarTitle, { normalizePath, resolveAppBar } from './AppBarTitle'
import NewsTicker from './NewsTicker'

/// The floating bottom bar is the only navigation at every breakpoint — five
/// primary destinations, matching the Flutter HomeShell (home_shell.dart:229).
/// Play is the centre logo button, not an icon.
const bottomLinks = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/clubs', label: 'Clubs', icon: UsersRound },
  { to: '/app/queues', label: 'Play', featured: true },
  { to: '/app/events', label: 'Events', icon: CalendarDays },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
]

const NAV_ORDER = bottomLinks.map((link) => link.to)

export default function AppShell() {
  const location = useLocation()

  const { mode } = resolveAppBar(location.pathname)
  // -1 on routes outside the nav (discover, bookings, court detail) — the pill
  // hides rather than parking under an unrelated tab. It also hides on Play,
  // whose raised logo circle is its own selected state.
  const activeIndex = NAV_ORDER.indexOf(normalizePath(location.pathname))
  const pillHidden = activeIndex === -1 || activeIndex === 2

  return (
    <div className="app-shell">
      <header className="app-header">
        <NewsTicker />

        {mode !== 'none' && (
          <div className="app-header__main">
            <div className="container app-header__inner">
              <AppBarTitle />
              <div className="app-header__actions">
                <AppActionPill />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="app-content" key={location.pathname}><Outlet /></div>
      </main>

      <nav className="app-bottom-nav" aria-label="Player navigation">
        <span
          className="app-bottom-nav__pill"
          aria-hidden="true"
          data-hidden={pillHidden ? '' : undefined}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        />
        {bottomLinks.map(({ to, label, icon: Icon, end, featured }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            // NavLink with a function child does not auto-apply `active`, so the
            // className must be the function form and set it explicitly.
            className={({ isActive }) => `${featured ? 'mobile-play-link' : ''}${isActive ? ' active' : ''}`.trim()}
          >
            {({ isActive }) => (
              <>
                <span className="mobile-nav-icon">
                  {featured
                    ? <img src="/logo-clean.webp" alt="" className="mobile-play-logo" width="24" height="24" />
                    : <Icon size={isActive ? 26 : 24} />}
                </span>
                <span className="app-bottom-nav__label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
