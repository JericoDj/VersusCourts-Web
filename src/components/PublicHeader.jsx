import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Brand from './Brand'

export default function PublicHeader({ lightTheme = false }) {
  const [open, setOpen] = useState(false)
  return (
    <header className={`public-header ${lightTheme ? 'public-header--light' : ''}`}>
      <div className="container header-inner">
        <Brand light={!lightTheme} />
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
        <nav className={open ? 'public-nav is-open' : 'public-nav'} aria-label="Versus Courts primary navigation">
          <NavLink to="/venues" onClick={() => setOpen(false)}>Find Courts</NavLink>
          <NavLink to="/app/queues" onClick={() => setOpen(false)}>Find Queue / Open Play</NavLink>
          <NavLink to="/app/events" onClick={() => setOpen(false)}>Sports Events</NavLink>
          <NavLink to="/for-business" onClick={() => setOpen(false)}>For Court Owners</NavLink>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>How It Works</a>
          <Link className="button button--ghost-light" to="/login">Log in</Link>
          <Link className="button button--lime" to="/app">Start playing <span>↗</span></Link>
        </nav>
      </div>
    </header>
  )
}
