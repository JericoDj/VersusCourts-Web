import { Building2, CalendarDays, Gamepad2, HelpCircle, MapPin, Search, UsersRound, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Brand from './Brand'
import LoginDialog from './LoginDialog'
import NewsTicker from './NewsTicker'

/// Primary destinations, surfaced directly in the bar rather than hidden
/// behind a menu.
const highlights = [
  { to: '/venues', label: 'Find Courts', icon: MapPin },
  { to: '/queues', label: 'Join Queues / Open Play', icon: Gamepad2 },
  { to: '/clubs', label: 'Explore Sports Clubs', icon: UsersRound },
  { to: '/events', label: 'Sports Events', icon: CalendarDays },
  { to: '/for-business', label: 'For Court Owners', icon: Building2 },
]

export default function PublicHeader() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`public-header ${scrolled ? 'is-scrolled' : ''}`}>
        <NewsTicker />

        <div className="header-main">
          <div className="container header-inner">
            <Link to="/app" className="button button--primary header-cta">
              <Zap size={16} /> Start playing
            </Link>

            <Brand />

            <div className="header-actions">
              <button className="button header-enquiry" onClick={() => setLoginOpen(true)}>
                <span className="header-enquiry__long">Log in / Register</span>
                <span className="header-enquiry__short">Log in</span>
              </button>
              <Link to="/venues" className="icon-btn" aria-label="Search courts"><Search size={18} /></Link>
            </div>
          </div>
        </div>

        <nav className="header-highlights" aria-label="Versus Courts primary navigation">
          <div className="container header-highlights__inner">
            {highlights.map(({ to, label, icon: Icon }) => (
              <NavLink to={to} key={to}><Icon size={15} />{label}</NavLink>
            ))}
            <NavLink to="/how-it-works"><HelpCircle size={15} />How It Works</NavLink>
          </div>
        </nav>
      </header>
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
