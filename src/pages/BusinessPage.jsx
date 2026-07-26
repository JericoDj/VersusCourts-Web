import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  CreditCard,
  Layers3,
  MessageSquareText,
  QrCode,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react'
import PublicFooter from '../components/PublicFooter'
import PublicHeader from '../components/PublicHeader'

const features = [
  [CalendarCheck, 'Bookings that run themselves', 'Live availability, payment status, QR check-in, and conflict-free scheduling.', 'var(--vc-primary)'],
  [BarChart3, 'Know what drives revenue', 'See occupancy, peak hours, court performance, and daily revenue at a glance.', 'var(--vc-brand-green)'],
  [UsersRound, 'Turn visitors into regulars', 'Host open games and build active clubs around your venue.', 'var(--vc-accent)'],
  [Layers3, 'Manage every court', 'Control sports, rates, amenities, hours, maintenance, and availability.', 'var(--vc-primary)'],
  [MessageSquareText, 'Stay close to players', 'Centralize player messages, reviews, notifications, and service updates.', 'var(--vc-brand-green)'],
  [Trophy, 'Events & tournaments', 'Host brackets, sell slots, publish results, and fill the calendar.', 'var(--vc-accent)'],
]

const faqs = [
  ['How is Versus Courts priced?', 'Plans scale with the number of courts and branches. Book a demo and we’ll recommend the right setup for your operation.'],
  ['Do we need special hardware?', 'No. Your team can start with the phones, tablets, and computers you already use. QR check-in signage can be printed.'],
  ['Which payment methods are supported?', 'Players can pay using GCash, Maya, GrabPay, GoTyme, and major debit or credit cards where enabled.'],
  ['How long does onboarding take?', 'A typical venue can be configured and trained within a few working days once court schedules, rates, and staff access are ready.'],
  ['Can we manage multiple branches?', 'Yes. Multi-branch operators can manage locations, staff access, pricing, and performance from one workspace.'],
]

function ProductMock() {
  return (
    <div className="operator-mock">
      <div className="operator-mock__browser"><i /><i /><i /><b>Elite Sports Center</b><span>Today</span></div>
      <div className="operator-kpis">
        <article><small>TODAY&apos;S REVENUE</small><b>₱42,680</b><em>↑ 18.4%</em></article>
        <article><small>OCCUPANCY</small><b>84%</b><em>↑ 12.1%</em></article>
        <article><small><i /> LIVE QUEUES</small><b>06</b><em>42 players</em></article>
      </div>
      <div className="operator-chart"><span>Revenue this week</span><div>{[35, 62, 44, 78, 58, 90, 74].map((height, index) => <i key={height + index} style={{ height: `${height}%` }} />)}</div></div>
      <div className="operator-bookings">
        <div><span>Court 2</span><time>6:00–7:00 PM</time><b className="status-badge" style={{ '--badge-color': 'var(--vc-success)' }}>Paid</b></div>
        <div><span>Hall 1</span><time>7:30–9:00 PM</time><b className="status-badge" style={{ '--badge-color': 'var(--vc-warning)' }}>Pending</b></div>
      </div>
      <div className="operator-checkin"><span className="icon-chip"><QrCode size={17} /></span><div><small>QR CHECK-IN</small><b>Juan D. is in ✓</b></div></div>
    </div>
  )
}

export default function BusinessPage() {
  return (
    <div className="business-page">
      <PublicHeader />
      <section className="business-hero">
        <div className="container">
          <div className="business-hero__copy">
            <span className="hero-kicker"><i /> VERSUS FOR BUSINESS</span>
            <h1>YOUR VENUE.<br /><em>FULLER COURTS.</em></h1>
            <p>One operating system for bookings, queues, staff, revenue, and the player community around your venue.</p>
            <div className="business-hero__actions">
              <a href="mailto:business@versuscourts.com" className="button business-button--accent button--large">Book a demo <ArrowRight size={18} /></a>
              <a href="#business-features" className="button business-button--ghost button--large">See how it works</a>
            </div>
            <div className="business-proof">
              <span><b>98%</b><small>booking accuracy</small></span>
              <span><b>+28%</b><small>average occupancy</small></span>
              <span><b>24/7</b><small>live operations</small></span>
            </div>
          </div>
          <ProductMock />
        </div>
      </section>

      <section className="business-logo-strip"><div className="container"><span>Trusted by venues across Metro Manila</span><div><b>NORTHSIDE</b><b>THE COURT HOUSE</b><b>METRO PLAY</b><b>RALLY POINT</b><b>OPEN COURT</b></div></div></section>

      <section className="business-features container" id="business-features">
        <div className="section-heading"><span className="eyebrow">BUILT FOR OPERATORS</span><h2>RUN THE WHOLE VENUE<br /><em>WITHOUT THE CHAOS.</em></h2></div>
        <div className="business-feature-grid">
          {features.map(([Icon, title, text, color]) => (
            <article key={title}><span className="icon-chip icon-chip--lg" style={{ '--chip-color': color }}><Icon size={21} /></span><h3>{title}</h3><p>{text}</p><span className="status-badge" style={{ '--badge-color': 'var(--vc-success)' }}><Check size={13} /> Included in every plan</span></article>
          ))}
        </div>
      </section>

      <section className="owner-steps"><div className="container"><div className="section-heading"><span className="eyebrow">FROM SETUP TO SOLD OUT</span><h2>UP AND RUNNING.<br /><em>THEN GROWING.</em></h2></div><div className="owner-steps__grid">{[['01','List your venue','Add your branches, facilities, and sports.'],['02','Set courts, rates & hours','Configure the operating rules once.'],['03','Watch bookings and queues fill','Run the day from one clear workspace.']].map(([n,title,text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

      <section className="business-spotlights container">
        <article><div className="spotlight-visual spotlight-visual--queue"><span className="icon-chip icon-chip--invert"><Zap /></span><b>After-work Doubles</b><small>6 of 8 players · 6:00 PM</small><i><span /></i></div><div><span className="eyebrow">SMARTER OPEN PLAY</span><h2>QUEUES THAT FILL<br /><em>DEAD HOURS.</em></h2><p>Publish open play, collect player spots, and let your community turn quiet court time into repeat revenue.</p><ul><li><Check /> Live player counts</li><li><Check /> Automated reminders</li><li><Check /> Fair rotations and check-in</li></ul></div></article>
        <article><div><span className="eyebrow">CLEARER DECISIONS</span><h2>KNOW YOUR<br /><em>NUMBERS.</em></h2><p>See which courts, schedules, and programs drive your venue—without stitching spreadsheets together.</p><ul><li><Check /> Revenue by court</li><li><Check /> Occupancy by hour</li><li><Check /> Queue conversion</li></ul></div><div className="spotlight-stats"><article><BarChart3 /><b>84%</b><small>occupancy</small></article><article><CreditCard /><b>₱42.7K</b><small>today</small></article></div></article>
      </section>

      <section className="business-faq"><div className="container"><div className="section-heading"><span className="eyebrow">COMMON QUESTIONS</span><h2>EVERYTHING YOU NEED<br />TO <em>GET STARTED.</em></h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>

      <section className="business-bottom-cta"><div className="container"><span className="eyebrow">READY WHEN YOU ARE</span><h2>LET’S PUT MORE<br /><em>PLAYERS ON COURT.</em></h2><p>Join the growing network of sports venues powered by Versus Courts.</p><a href="mailto:business@versuscourts.com" className="button business-button--accent button--large">Talk to our team <ArrowRight size={18} /></a></div></section>
      <PublicFooter />
    </div>
  )
}
