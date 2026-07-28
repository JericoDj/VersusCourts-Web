import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  MapPin,
  QrCode,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicHeader from '../components/PublicHeader'

const playerSteps = [
  ['Create your player profile', 'Pick your sports and skill level so every recommendation starts with you.', 'profile'],
  ['Discover courts near you', 'Explore verified venues, real prices in ₱, and the sports you want to play.', 'map'],
  ['Book a court or join a queue', 'Reserve a slot for your group or claim a spot in open play.', 'queue'],
  ['Show up and check in', 'Scan at the venue, confirm your arrival, and let rotations run smoothly.', 'checkin'],
  ['Track games & grow your community', 'Follow scores, events, clubs, and tournaments after the final whistle.', 'community'],
]

const ownerSteps = [
  ['List your venue', 'Add branches, sports, amenities, photos, and the details players need.', 'venue'],
  ['Configure courts, rates & schedules', 'Set availability, pricing, hours, and staff access once.', 'configure'],
  ['Take bookings and run queues', 'Accept payments, check players in, and keep open play moving.', 'operate'],
  ['See revenue & occupancy insights', 'Understand what fills courts and make the next decision with confidence.', 'insights'],
]

const faqs = [
  ['Is Versus Courts free for players?', 'Creating a player account and discovering courts, clubs, queues, and events is free. Court fees and paid games are shown clearly before you join or book.'],
  ['What sports are supported?', 'The player currently covers basketball, badminton, pickleball, tennis, and padel.'],
  ['How do queues rotate?', 'The host or venue sets the format and player capacity. Check-in and participant order keep each rotation transparent.'],
  ['How can I pay?', 'Supported venues can accept GCash, Maya, GrabPay, GoTyme, and major cards. Available methods appear during checkout.'],
  ['Can I cancel a booking?', 'Cancellation rules are shown before payment and may differ by venue and booking schedule.'],
]

function JourneyVignette({ type, owner }) {
  const accent = owner ? 'var(--vc-accent)' : 'var(--vc-primary)'
  if (type === 'map') return <div className="journey-vignette vignette-map"><span /><span /><span /><small><MapPin size={13} /> 12 courts nearby</small></div>
  if (type === 'queue' || type === 'operate') return <div className="journey-vignette vignette-queue"><span className="sport-tag sport-tag--basketball">Basketball</span><b>Friday Night Runs</b><small>8 of 10 players</small><i><span /></i></div>
  if (type === 'checkin') return <div className="journey-vignette vignette-checkin"><span className="icon-chip" style={{ '--chip-color': 'var(--vc-brand-green)' }}><QrCode /></span><div><small>YOU&apos;RE IN</small><b>Court 3 · Checked in</b></div><Check /></div>
  if (type === 'community') return <div className="journey-vignette vignette-community"><div className="mini-avatars"><i>MS</i><i>RL</i><i>AK</i><i>+8</i></div><span><i /> LIVE · 21 : 18</span></div>
  if (type === 'insights') return <div className="journey-vignette vignette-insights"><article><b>84%</b><small>occupancy</small></article><article><b>₱42.7K</b><small>today</small></article><BarChart3 /></div>
  return <div className="journey-vignette vignette-profile"><span className="icon-chip" style={{ '--chip-color': accent }}>{type === 'venue' || type === 'configure' ? <Building2 /> : <CircleUserRound />}</span><div><b>{type === 'profile' ? 'Your player profile' : type === 'venue' ? 'Your venue is ready' : 'Courts configured'}</b><span className="sport-tag sport-tag--badminton">Badminton</span><span className="sport-tag sport-tag--tennis">Tennis</span></div></div>
}

export default function HowItWorksPage() {
  const [audience, setAudience] = useState('player')
  const owner = audience === 'owner'
  const steps = owner ? ownerSteps : playerSteps
  return (
    <div className="how-page">
      <PublicHeader />
      <section className="how-page__hero">
        <div className="container">
          <span className="eyebrow eyebrow--accent">HOW IT WORKS</span>
          <h1>FROM SEARCH TO <em>GAME ON.</em></h1>
          <p>One connected path from finding a place to play to building the community around it.</p>
          <div className="audience-switch" aria-label="Choose your journey">
            <button type="button" className="filter-pill" style={{ '--pill-color': 'var(--vc-primary)' }} aria-pressed={!owner} onClick={() => setAudience('player')}><CircleUserRound size={16} /> I&apos;m a player</button>
            <button type="button" className="filter-pill" style={{ '--pill-color': 'var(--vc-accent)' }} aria-pressed={owner} onClick={() => setAudience('owner')}><Building2 size={16} /> I own courts</button>
          </div>
        </div>
      </section>

      <section className={`journey-section ${owner ? 'is-owner' : ''}`} key={audience}>
        <div className="container">
          <div className="section-heading"><span className="eyebrow">{owner ? 'THE OPERATOR JOURNEY' : 'THE PLAYER JOURNEY'}</span><h2>{owner ? <>FROM LISTED TO<br /><em>FULLY BOOKED.</em></> : <>YOUR NEXT GAME,<br /><em>STEP BY STEP.</em></>}</h2></div>
          <div className="journey-timeline">
            {steps.map(([title, body, type], index) => (
              <article className="journey-step" key={title}>
                <span className="journey-step__number">{String(index + 1).padStart(2, '0')}</span>
                <div className="journey-step__copy"><small>STEP {index + 1}</small><h3>{title}</h3><p>{body}</p>{owner && index === steps.length - 1 && <a href="mailto:hello@versuscourts.com">Contact Versus Courts <ArrowRight size={15} /></a>}</div>
                <JourneyVignette type={type} owner={owner} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how-crosslinks"><div className="container">{[
        [MapPin,'Find Courts','Compare trusted venues and real prices.','/venues','var(--vc-primary)'],
        [Zap,'Join Queues','Claim a spot in open play near you.','/queues','var(--vc-accent)'],
        [ShieldCheck,'Explore Clubs','Meet the people who keep playing.','/clubs','var(--vc-brand-green)'],
      ].map(([Icon,title,text,to,color]) => <Link className="stripe-card" style={{ '--stripe-color': color }} to={to} key={title}><span className="icon-chip" style={{ '--chip-color': color }}><Icon /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight /></Link>)}</div></section>

      <section className="how-faq"><div className="container"><div className="section-heading"><span className="eyebrow">PLAYER FAQ</span><h2>GOOD TO KNOW<br />BEFORE <em>GAME TIME.</em></h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>

      <section className="final-cta"><div className="container"><span className="eyebrow eyebrow--accent">{owner ? 'YOUR VENUE CAN DO MORE' : 'YOUR NEXT GAME IS CLOSER THAN YOU THINK'}</span><h2>{owner ? <>READY TO RUN<br /><em>SMARTER?</em></> : <>READY TO<br /><em>STEP ON COURT?</em></>}</h2>{owner ? <a href="mailto:hello@versuscourts.com" className="button button--primary button--large">Contact our team <ArrowRight size={18} /></a> : <Link to="/queues" className="button button--primary button--large">Find your game <ArrowRight size={18} /></Link>}</div></section>
      <PublicFooter />
    </div>
  )
}
