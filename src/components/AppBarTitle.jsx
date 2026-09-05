import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/// Port of the Flutter screens' in-body headers (clubs_screen.dart:355,
/// play_hub_screen.dart:105, events_screen.dart:70, home_screen.dart:303).
/// On the web the app bar owns the title, so each route resolves to one of:
///   `title`   — render title + subtitle on the left, action pill on the right
///   `actions` — pill only (the page keeps its own heading)
///   `none`    — no bar row at all (Flutter's ProfileScreen has no app bar)
const ROUTES = {
  '/app': { mode: 'title', variant: 'home', title: (user) => `Hi, ${user?.firstName || 'Player'} 👋`, subtitle: 'Ready to play today?' },
  '/app/clubs': { mode: 'title', title: () => 'Clubs', subtitle: 'Find your community' },
  '/app/queues': { mode: 'title', title: () => 'Play', subtitle: 'Book, play, & train' },
  '/app/bookings': { mode: 'title', title: () => 'My Bookings', subtitle: 'View your reservations and history' },
  '/app/events': { mode: 'title', title: () => 'Events', subtitle: 'Compete & win' },
  '/app/messages': { mode: 'title', title: () => 'Messages', subtitle: 'Connect with players & squads' },
  '/app/notifications': { mode: 'title', title: () => 'Notifications', subtitle: 'Updates & invitations' },
  '/app/scoreboard': { mode: 'title', title: () => 'Scoreboard', subtitle: 'Live score keeper' },
  '/app/profile': { mode: 'none' },
}

/// Strips one trailing slash so `/app/clubs/` matches `/app/clubs`, but keeps
/// `/app` intact.
export function normalizePath(pathname) {
  if (pathname !== '/app' && pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

/// Total function: every path resolves to a mode. Nested paths (`/app/clubs/42`)
/// are pushed screens with their own headers, so they get the pill only — never
/// the parent's title.
export function resolveAppBar(pathname, user) {
  const path = normalizePath(pathname)
  const match = ROUTES[path]
  if (match) {
    if (match.mode !== 'title') return { mode: match.mode }
    return { mode: 'title', title: match.title(user), subtitle: match.subtitle, variant: match.variant }
  }
  return { mode: 'actions' }
}

export default function AppBarTitle() {
  const location = useLocation()
  const { user } = useAuth()
  const { mode, title, subtitle, variant } = resolveAppBar(location.pathname, user)
  if (mode !== 'title') return null

  return (
    <div className={`app-bar-title${variant === 'home' ? ' app-bar-title--home' : ''}`}>
      <h1 className="app-bar-title__title">{title}</h1>
      <p className="app-bar-title__subtitle">{subtitle}</p>
    </div>
  )
}
