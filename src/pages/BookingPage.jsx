import { CalendarDays, CheckCircle2, Clock3, MapPin, QrCode } from 'lucide-react'
import { activity } from '../data/mockData'

export default function BookingPage() {
  return (
    <>
      <div className="app-page-heading"><div><span className="eyebrow">YOUR SCHEDULE</span><h1>Everything you’ve <em>lined up.</em></h1><p>Reservations, games, and tournament registrations in one view.</p></div><button className="button button--dark"><CalendarDays size={17} /> Add to calendar</button></div>
      <div className="booking-tabs"><button className="is-active">Upcoming <span>3</span></button><button>Past</button><button>Cancelled</button></div>
      <div className="schedule-layout">
        <div className="schedule-list">{activity.map((item, index) => <article key={item.label}><div className="schedule-date"><span>{index === 0 ? 'TODAY' : index === 1 ? 'JUL' : 'JUL'}</span><b>{index === 0 ? '19' : index === 1 ? '23' : '24'}</b></div><div className="schedule-info"><small>{index === 0 ? 'OPEN PLAY' : index === 1 ? 'COURT BOOKING' : 'TOURNAMENT'}</small><h3>{item.label}</h3><p><Clock3 size={15} /> {item.meta}</p><p><MapPin size={15} /> Quezon City, Metro Manila</p></div><div className="schedule-actions"><span><CheckCircle2 size={15} /> {item.status}</span><button>{index === 1 ? <><QrCode size={16} /> Show QR</> : 'View details →'}</button></div></article>)}</div>
        <aside className="calendar-card"><div><button>‹</button><b>July 2026</b><button>›</button></div><div className="calendar-grid">{'SMTWTFS'.split('').map((d, i) => <span key={`${d}${i}`}>{d}</span>)}{Array.from({ length: 31 }, (_, i) => <button key={i} className={[19, 23, 24].includes(i + 1) ? 'has-game' : ''}>{i + 1}</button>)}</div><div className="calendar-legend"><span><i /> Game or booking</span><span><i /> Tournament</span></div></aside>
      </div>
    </>
  )
}
