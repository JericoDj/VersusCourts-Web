import { MapPin, ShieldCheck, Sparkles, Ticket, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useQueue } from '../context/QueueContext'

/// Scrolling announcement bar tucked under the floating app bar.
/// Powered by live counts of courts, queues, and clubs.
export default function NewsTicker() {
  const { venues = [], clubs = [] } = usePlayer() || {}
  const { queues = [] } = useQueue() || {}

  const items = useMemo(() => {
    const venueCount = venues.length
    const queueCount = queues.length
    const clubCount = clubs.length

    return [
      {
        icon: MapPin,
        text: venueCount > 0 ? `${venueCount} sports venues & courts active` : 'Verified sports venues & courts',
        color: 'var(--vc-primary)',
      },
      {
        icon: UsersRound,
        text: queueCount > 0 ? `${queueCount} open games & queues looking for players` : 'Open games & queue play across Metro Manila',
        color: 'var(--vc-brand-green)',
      },
      {
        icon: Ticket,
        text: 'Free to join — no player membership fees, ever',
        color: 'var(--vc-accent)',
      },
      {
        icon: ShieldCheck,
        text: clubCount > 0 ? `${clubCount} verified sports clubs & communities` : 'Verified sports clubs & communities',
        color: 'var(--vc-sport-pickleball)',
      },
      {
        icon: Sparkles,
        text: 'Badminton, Pickleball, Basketball, Padel, Volleyball & more',
        color: 'var(--vc-sport-padel)',
      },
    ]
  }, [venues.length, queues.length, clubs.length])

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
