import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  MapPin,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicHeader from '../components/PublicHeader'
import StoreBadges from '../components/StoreBadges'

const heroMessages = [
  { text: 'Join Queue / Open Play', body: 'Find upcoming games near you, match your level, and claim your spot.', color: 'var(--vc-accent)' },
  { text: 'Book Courts', body: 'Compare nearby venues and schedules, then reserve the right court.', color: 'var(--vc-primary)' },
  { text: 'Explore Clubs', body: 'Meet local players and grow with a community built around your sport.', color: 'var(--vc-brand-green)' },
  { text: 'Discover Tournaments', body: 'Find upcoming competitions, register, and put your game on the local stage.', color: 'var(--vc-sport-pickleball)' },
]

const steps = [
  { n: '01', title: 'Find your court', text: 'Browse verified venues by sport, location, price, and availability.' },
  { n: '02', title: 'Book or join', text: 'Reserve a time slot or jump into an open game with players near you.' },
  { n: '03', title: 'Play together', text: 'Track games, meet your community, and keep your momentum going.' },
]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useTypewriter(items, { typeMs = 82, deleteMs = 42, holdMs = 2600 } = {}) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const full = items[index].text
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let timer
    if (!deleting && length === full.length) timer = setTimeout(() => setDeleting(true), holdMs)
    else if (deleting && length === 0) {
      timer = setTimeout(() => {
        setDeleting(false)
        setIndex((current) => (current + 1) % items.length)
      }, 0)
    } else {
      timer = setTimeout(() => setLength((current) => current + (deleting ? -1 : 1)), deleting ? deleteMs : typeMs)
    }
    return () => clearTimeout(timer)
  }, [deleteMs, deleting, full, holdMs, items.length, length, typeMs])
  return {
    index,
    item: items[index],
    text: prefersReducedMotion() ? full : full.slice(0, length),
    bodyVisible: prefersReducedMotion() || (!deleting && length > 0),
  }
}

function HeroCollage() {
  return (
    <div className="hero-collage" aria-label="Preview of the Versus Courts player experience">
      <div className="hero-collage__sports" aria-hidden="true">
        <span className="sport-tag sport-tag--basketball">Basketball</span>
        <span className="sport-tag sport-tag--badminton">Badminton</span>
        <span className="sport-tag sport-tag--pickleball">Pickleball</span>
        <span className="sport-tag sport-tag--tennis">Tennis</span>
        <span className="sport-tag sport-tag--padel">Padel</span>
      </div>
      <article className="hero-collage__backdrop">
        <header><span className="icon-chip"><MapPin size={18} /></span><div><small>NEAR YOU</small><h2>Nearby Courts</h2></div><Link to="/venues">See all <ArrowRight size={14} /></Link></header>
        <div className="hero-collage__court-list">
          {[
            { name: 'Elite Sports Center', sport: 'Basketball', distance: '1.2 km', price: 250, color: 'basketball' },
            { name: 'Smash Arena', sport: 'Badminton', distance: '3.6 km', price: 180, color: 'badminton' },
          ].map((court) => (
            <div className="hero-court-row" key={court.name}>
              <span className={`hero-court-row__thumb is-${court.color}`}>{court.sport.slice(0, 1)}</span>
              <div><b>{court.name}</b><ul className="meta-dots"><li>{court.distance}</li><li>from ₱{court.price}/hr</li><li className="is-open">Open now</li></ul></div>
              <ChevronRight size={17} />
            </div>
          ))}
        </div>
      </article>
      <article className="hero-queue-float">
        <header><span className="icon-chip icon-chip--invert"><UsersRound size={19} /></span><div><small>FRIDAY NIGHT RUNS</small><b>Basketball · 7:30 PM</b></div><span className="status-badge status-badge--white">8/10 IN</span></header>
        <div><div className="mini-avatars"><i>JP</i><i>RL</i><i>AK</i><i>+5</i></div><button type="button">Join queue</button></div>
      </article>
      <div className="hero-live-chip"><i /><b>LIVE</b><span>Court 3</span><strong>21 : 18</strong></div>
    </div>
  )
}

export default function LandingPage() {
  const { index, item, text, bodyVisible } = useTypewriter(heroMessages)
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-grid container">
            <div className="hero-copy" style={{ '--hero-accent': item.color }}>
              <span className="hero-kicker"><i /> PLAY • COMPETE • CONNECT <i /></span>
              <h1 className="hero-type-heading" aria-label="Book Courts, Join Queues &amp; Open Play">
                <span className="sr-only">Book Courts, Join Queues &amp; Open Play — </span>
                <span aria-hidden="true">{text}</span>
                <i className="hero-type-heading__caret" aria-hidden="true" />
              </h1>
              <div className="hero-message-slot" aria-live="polite"><p key={index} className={`hero-message ${bodyVisible ? 'is-visible' : ''}`}>{item.body}</p></div>
              <div className="hero-actions">
                <Link to="/queues" className="button button--primary hero-find-game">Find a game <ArrowRight size={18} /></Link>
                <Link to="/how-it-works" className="play-link"><span><Play fill="currentColor" size={15} /></span> See how it works</Link>
              </div>
              <div className="hero-store-badges">
                <span className="hero-store-badges__label">Download the Versus Courts mobile app</span>
                <StoreBadges align="left" compact />
              </div>
              <div className="hero-trust-row">
                <span className="info-pill"><Star size={14} fill="currentColor" /> 4.8 player rating</span>
                <span className="info-pill"><ShieldCheck size={14} /> 120+ verified courts</span>
                <span className="info-pill"><CircleCheck size={14} /> 5 sports</span>
              </div>
            </div>
            <HeroCollage />
          </div>
          <div className="sports-ticker"><span>BASKETBALL</span><i>✦</i><span>BADMINTON</span><i>✦</i><span>PICKLEBALL</span><i>✦</i><span>TENNIS</span><i>✦</i><span>PADEL</span></div>
        </section>

        <section className="landing-section intro-section" id="community">
          <div className="container">
            <div className="section-heading split-heading"><div><span className="eyebrow">EVERYTHING IN ONE PLACE</span><h2>MORE THAN A BOOKING APP. <br /><em>IT’S YOUR SPORTS WORLD.</em></h2></div><p>Versus Courts brings every part of your game together—from finding a venue to finding your next teammate.</p></div>
            <div className="feature-grid">
              <article className="feature-card feature-card--large"><span className="icon-chip icon-chip--lg"><MapPin /></span><span className="number">01</span><h3>DISCOVER THE <br />RIGHT COURT</h3><p>Explore verified venues near you, compare rates, amenities, and live availability.</p><Link to="/venues">Explore venues <ArrowRight size={17} /></Link><div className="mini-map"><i className="map-pin map-pin--1">●</i><i className="map-pin map-pin--2">●</i><i className="map-pin map-pin--3">●</i><span>12 courts nearby</span></div></article>
              <article className="feature-card feature-card--orange"><span className="icon-chip icon-chip--lg"><Zap /></span><span className="number">02</span><h3>JOIN OPEN <br />GAMES</h3><p>No team? No problem. Find queues that match your sport and skill level.</p><Link to="/queues">Find open play <ArrowRight size={17} /></Link><div className="game-chip"><span>FRI 7:30</span><b>Friday Night Runs</b><small>8 of 10 players</small><i><span /></i></div></article>
              <article className="feature-card feature-card--green"><span className="icon-chip icon-chip--lg"><UsersRound /></span><span className="number">03</span><h3>BUILD YOUR <br />COMMUNITY</h3><p>Join clubs, enter tournaments, follow live scores, and grow your player profile.</p><Link to="/clubs">Meet the community <ArrowRight size={17} /></Link><div className="community-orbit"><span title="Community Hub"><UsersRound size={22} /></span><i title="Tournaments"><Trophy size={18} /></i><i title="Active Ratings"><Star size={18} /></i><i title="Matchmaking"><Zap size={18} /></i></div></article>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="container how-grid">
            <div><span className="eyebrow eyebrow--accent">HOW IT WORKS</span><h2>FROM SEARCH <br />TO <em>GAME ON.</em></h2><p>Three simple moves. One great game.</p><Link to="/how-it-works" className="button button--primary">See every step <ArrowRight size={17} /></Link></div>
            <div className="steps-list">{steps.map((step) => <article key={step.n}><span>{step.n}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><ChevronRight /></article>)}</div>
          </div>
        </section>

        <section className="trust-strip"><div className="container"><div><ShieldCheck /><span><b>Verified venues</b><small>Quality courts, trusted operators</small></span></div><div><Sparkles /><span><b>One connected platform</b><small>Booking, play, events, and clubs</small></span></div><div><UsersRound /><span><b>Built for every player</b><small>From first-timers to competitors</small></span></div></div></section>
        <section className="final-cta">
          <div className="container">
            <span className="eyebrow eyebrow--cta">YOUR NEXT GAME IS CLOSER THAN YOU THINK</span>
            <h2>READY TO <br /><em>STEP ON COURT?</em></h2>
            <p>Join thousands of players across Metro Manila discovering verified venues and open games every day.</p>
            <div className="final-cta__actions">
              <Link to="/queues" className="button button--primary button--large">Find your game <ArrowRight size={18} /></Link>
            </div>
            <div className="final-cta__stores">
              <StoreBadges align="center" />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
