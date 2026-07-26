import { MapPin, ShieldCheck, Sparkles, Ticket, Users } from 'lucide-react'

const items = [
  { icon: MapPin, text: '24 courts open near Quezon City' },
  { icon: Users, text: '11 open games looking for players tonight' },
  { icon: Ticket, text: 'Free to join — no booking fees, ever' },
  { icon: ShieldCheck, text: 'Trusted by 2,000+ players across Metro Manila' },
  { icon: Sparkles, text: 'New: padel courts now live in BGC' },
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
              {items.map(({ icon: Icon, text }) => (
                <span className="news-ticker__item" key={text}>
                  <Icon size={14} />{text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
