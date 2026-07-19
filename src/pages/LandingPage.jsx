import { ArrowRight, BarChart3, CalendarCheck, Check, ChevronRight, MapPin, Play, ShieldCheck, Sparkles, Star, UsersRound, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import PublicHeader from '../components/PublicHeader'
import { venues } from '../data/mockData'

const steps = [
  { n: '01', title: 'Find your court', text: 'Browse verified venues by sport, location, price, and availability.' },
  { n: '02', title: 'Book or join', text: 'Reserve a time slot or jump into an open game with players near you.' },
  { n: '03', title: 'Play together', text: 'Track games, meet your community, and keep your momentum going.' },
]

export default function LandingPage() {
  return (
    <div className="landing">
      <PublicHeader lightTheme />
      <section className="hero-section">
        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="hero-kicker"><i /> THE HOME OF EVERY GAME</span>
            <h1>FIND YOUR COURT.<br /><em>OWN THE GAME.</em></h1>
            <p>Discover courts, book instantly, join open games, and connect with the sports community around you.</p>
            <div className="hero-actions"><Link to="/app" className="button button--lime button--large">Find a game <ArrowRight size={18} /></Link><a href="#how-it-works" className="play-link"><span><Play fill="currentColor" size={15} /></span> See how it works</a></div>
            <div className="hero-proof"><div className="hero-avatars"><span>JM</span><span>AK</span><span>RL</span><span>+2K</span></div><div><span><Star size={14} fill="currentColor" /> 4.9 average rating</span><small>Trusted by players across Metro Manila</small></div></div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo" style={{ backgroundImage: `linear-gradient(180deg, rgba(5,13,25,.05), rgba(5,13,25,.45)), url(${venues[0].image})` }} />
            <div className="hero-score-card"><span>LIVE GAME</span><div><b>21</b><small>Elite Ballers<br />SET 2</small><b>18</b></div><i><span style={{ width: '76%' }} /></i></div>
            <div className="hero-booking-card"><span><CalendarCheck size={20} /></span><div><b>Court booked!</b><small>Tonight · 7:30 PM</small></div><Check size={18} /></div>
            <div className="hero-corner-copy"><span>BUILT FOR</span><b>PLAYERS.<br />POWERED BY<br />COMMUNITY.</b></div>
          </div>
        </div>
        <div className="sports-ticker"><span>BASKETBALL</span><i>✦</i><span>BADMINTON</span><i>✦</i><span>PICKLEBALL</span><i>✦</i><span>TENNIS</span><i>✦</i><span>PADEL</span></div>
      </section>

      <section className="landing-section intro-section" id="community">
        <div className="container">
          <div className="section-heading split-heading"><div><span className="eyebrow">EVERYTHING IN ONE PLACE</span><h2>MORE THAN A BOOKING APP.<br /><em>IT’S YOUR SPORTS WORLD.</em></h2></div><p>Versus Courts brings every part of your game together—from finding a venue to finding your next teammate.</p></div>
          <div className="feature-grid">
            <article className="feature-card feature-card--large"><div className="feature-icon"><MapPin /></div><span className="number">01</span><h3>DISCOVER THE<br />RIGHT COURT</h3><p>Explore verified venues near you, compare rates, amenities, and live availability.</p><Link to="/venues">Explore venues <ArrowRight size={17} /></Link><div className="mini-map"><i className="map-pin map-pin--1">●</i><i className="map-pin map-pin--2">●</i><i className="map-pin map-pin--3">●</i><span>12 courts nearby</span></div></article>
            <article className="feature-card"><div className="feature-icon"><Zap /></div><span className="number">02</span><h3>JOIN OPEN<br />GAMES</h3><p>No team? No problem. Find queues that match your sport and skill level.</p><Link to="/app/queues">Find open play <ArrowRight size={17} /></Link><div className="game-chip"><span>FRI 7:30</span><b>Friday Night Runs</b><small>8 of 10 players</small><i><span /></i></div></article>
            <article className="feature-card feature-card--green"><div className="feature-icon"><UsersRound /></div><span className="number">03</span><h3>BUILD YOUR<br />COMMUNITY</h3><p>Join clubs, enter tournaments, follow live scores, and grow your player profile.</p><Link to="/app/events">Meet the community <ArrowRight size={17} /></Link><div className="community-orbit"><span>MS</span><i>RL</i><i>AK</i><i>JM</i></div></article>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="container how-grid">
          <div><span className="eyebrow eyebrow--lime">HOW IT WORKS</span><h2>FROM SEARCH<br />TO <em>GAME ON.</em></h2><p>Three simple moves. One great game.</p><Link to="/app" className="button button--lime">Start playing <ArrowRight size={17} /></Link></div>
          <div className="steps-list">{steps.map((step) => <article key={step.n}><span>{step.n}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ChevronRight /></article>)}</div>
        </div>
      </section>

      <section className="business-callout">
        <div className="container business-callout__inner">
          <div className="business-photo" style={{ backgroundImage: `url(${venues[1].image})` }}><span><BarChart3 /> +28%<small>court occupancy</small></span></div>
          <div className="business-copy"><span className="eyebrow">FOR COURT OWNERS</span><h2>FILL MORE COURTS.<br /><em>RUN A SMARTER VENUE.</em></h2><p>Manage bookings, queues, staff, and community from one powerful business workspace.</p><div className="benefit-list"><span><Check /> Real-time booking management</span><span><Check /> Revenue and occupancy insights</span><span><Check /> Community tools and live queues</span><span><Check /> Staff roles and multi-court control</span></div><Link className="button button--dark" to="/for-business">Grow your venue <ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <section className="trust-strip"><div className="container"><div><ShieldCheck /><span><b>Verified venues</b><small>Quality courts, trusted operators</small></span></div><div><Sparkles /><span><b>One connected platform</b><small>Booking, play, events, and clubs</small></span></div><div><UsersRound /><span><b>Built for every player</b><small>From first-timers to competitors</small></span></div></div></section>
      <section className="final-cta"><div className="container"><span className="eyebrow eyebrow--lime">YOUR NEXT GAME IS CLOSER THAN YOU THINK</span><h2>READY TO<br /><em>STEP ON COURT?</em></h2><Link to="/app" className="button button--lime button--large">Find your game <ArrowRight size={18} /></Link></div></section>
      <footer className="public-footer"><div className="container"><div><Brand light /><p>Every court. Every player.<br />One community.</p></div><div><b>EXPLORE</b><Link to="/venues">Find Sports Courts</Link><Link to="/app/queues">Find Queue / Open Play</Link><Link to="/app/events">Sports Events & Tournaments</Link></div><div><b>VERSUS</b><Link to="/for-business">Software for Court Owners</Link><a href="#community">Sports Community</a><a href="mailto:hello@versuscourts.com">Contact Versus Courts</a></div><div><b>GET IN THE GAME</b><Link className="footer-app-link" to="/app"><span>▶</span><small>LAUNCH THE<br /><b>WEB PLAYER</b></small></Link></div></div><div className="container footer-bottom"><span>© 2026 Versus Courts. All rights reserved.</span><span>Privacy · Terms · Security</span></div></footer>
    </div>
  )
}
