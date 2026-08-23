import { MapPin, ShieldCheck, Sparkles, Ticket, UsersRound } from 'lucide-react'

const items = [
  { icon: MapPin, text: '24 courts open near Quezon City', color: 'var(--vc-primary)' },
  { icon: UsersRound, text: '11 open games looking for players tonight', color: 'var(--vc-brand-green)' },
  { icon: Ticket, text: 'Free to join — no booking fees, ever', color: 'var(--vc-accent)' },
  { icon: ShieldCheck, text: 'Trusted by 2,000+ players across Metro Manila', color: 'var(--vc-sport-pickleball)' },
  { icon: Sparkles, text: 'New: padel courts now live in BGC', color: 'var(--vc-sport-padel)' },
]

/// Scrolling announcement bar tucked under the floating app bar. The item
/// list is rendered twice so the -50% translation loops seamlessly.
export default function NewsTicker() {
  return (
    <div className="news-ticker">
      <div className="news-ticker__viewport">
        <div className="news-ticker__track">
          {[0, 1].map((pass) => (
            <div className="news-ticker__group" key={pass} aria-hidden={pass === 1}>
              {items.map(({ icon: Icon, text, color }) => (
                <span className="news-ticker__item" key={text}>
                  <span className="news-ticker__icon" style={{ color }} aria-hidden="true">
                    <Icon size={15} />
                  </span>
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
