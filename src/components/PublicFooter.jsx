import { Gamepad2, Star, Trophy, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from './Brand'
import ComingSoonDialog from './ComingSoonDialog'
import StoreBadges from './StoreBadges'

export default function PublicFooter() {
  const [comingSoon, setComingSoon] = useState('')
  return (
    <>
    <footer className="public-footer">
      <div className="footer-sport-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand light playerLogo />
          <p>Every court. Every player. One community built to keep Metro Manila moving.</p>
          <div className="footer-community">
            <span className="footer-community__avatars"><i><UsersRound size={13} /></i><i><Trophy size={13} /></i><i><Star size={13} /></i></span>
            <span><b>2,000+ players</b><small>already finding their game</small></span>
          </div>
        </div>
        <div className="footer-links">
          <b>EXPLORE</b>
          <Link to="/clubs">Explore Sports Clubs</Link>
          <Link to="/queues">Join Queues / Open Play</Link>
          <button type="button" onClick={() => setComingSoon('Book Courts')}>Book Courts <small>COMING SOON</small></button>
          <button type="button" onClick={() => setComingSoon('Sports Events')}>Sports Events <small>COMING SOON</small></button>
        </div>
        <div className="footer-links">
          <b>VERSUS</b>
          <Link to="/how-it-works">How Versus Works</Link>
          <Link to="/support">Contact Versus Courts</Link>
          <Link to="/proposal">Submit a Proposal</Link>
          <Link to="/support">Inquire</Link>
          <Link to="/support?type=account-deletion">Request Account Deletion</Link>
        </div>
        <div className="footer-player">
          <span className="footer-player__icon"><Gamepad2 size={20} /></span>
          <b>GET IN THE GAME</b>
          <p>Courts, queues, clubs and events—ready when you are.</p>
          <div className="footer-store-badges">
            <span className="footer-store-badges__label">DOWNLOAD THE APP</span>
            <StoreBadges align="left" compact />
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Versus Courts. All rights reserved.</span>
        <span><Link to="/privacy">Privacy</Link><i>·</i><Link to="/terms">Terms</Link><i>·</i><Link to="/security">Security</Link></span>
      </div>
    </footer>
    <ComingSoonDialog open={Boolean(comingSoon)} label={comingSoon} onClose={() => setComingSoon('')} />
    </>
  )
}
