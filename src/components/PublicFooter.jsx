import { ArrowRight, Gamepad2, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from './Brand'

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-sport-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand light />
          <p>Every court. Every player. One community built to keep Metro Manila moving.</p>
          <div className="footer-community">
            <span className="footer-community__avatars"><i>MS</i><i>RL</i><i>AK</i></span>
            <span><b>2,000+ players</b><small>already finding their game</small></span>
          </div>
        </div>
        <div className="footer-links">
          <b>EXPLORE</b>
          <Link to="/venues">Find Sports Courts</Link>
          <Link to="/queues">Find Queue / Open Play</Link>
          <Link to="/events">Sports Events & Tournaments</Link>
          <Link to="/clubs">Explore Sports Clubs</Link>
        </div>
        <div className="footer-links">
          <b>VERSUS</b>
          <Link to="/for-business">Software for Court Owners</Link>
          <Link to="/how-it-works">How Versus Works</Link>
          <a href="mailto:hello@versuscourts.com">Contact Versus Courts</a>
        </div>
        <div className="footer-player">
          <span className="footer-player__icon"><Gamepad2 size={20} /></span>
          <b>GET IN THE GAME</b>
          <p>Courts, queues, clubs and events—ready when you are.</p>
          <Link className="footer-app-link" to="/app">
            <span><UsersRound size={18} /></span>
            <small>LAUNCH THE<br /><b>WEB PLAYER</b></small>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Versus Courts. All rights reserved.</span>
        <span><a href="#privacy">Privacy</a><i>·</i><a href="#terms">Terms</a><i>·</i><a href="#security">Security</a></span>
      </div>
    </footer>
  )
}
