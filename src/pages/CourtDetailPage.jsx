import { ArrowLeft, Calendar, Check, Clock3, Heart, MapPin, Navigation, Share2, ShieldCheck, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SportPill } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

const times = ['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']

export default function CourtDetailPage() {
  const { courtId } = useParams()
  const navigate = useNavigate()
  const { venues, favorites, toggleFavorite, setNotice } = usePlayer()
  const venue = venues.find((item) => item.id === courtId) || venues[0]
  const [selectedTime, setSelectedTime] = useState('7:00 PM')
  const [booked, setBooked] = useState(false)
  const saved = favorites.includes(venue.id)
  const book = () => { setBooked(true); setNotice(`Booking confirmed at ${venue.name} for ${selectedTime}`) }

  return (
    <>
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Back to courts</button>
      <div className="court-gallery"><div style={{ backgroundImage: `url(${venue.image})` }} /><div style={{ backgroundImage: `url(${venue.image})` }} /><div className="court-gallery__overlay"><button onClick={() => toggleFavorite(venue.id)}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button><button><Share2 size={18} /> Share</button></div></div>
      <div className="court-detail-layout">
        <div className="court-copy">
          <div className="court-title-row"><div><div className="card-pills">{venue.sports.map((sport) => <SportPill sport={sport} key={sport} />)}</div><h1>{venue.name}</h1><p><MapPin size={17} /> {venue.area} · {venue.distance} from you</p></div><div className="rating-large"><Star fill="currentColor" /><b>{venue.rating}</b><small>{venue.reviews} reviews</small></div></div>
          <div className="verified-strip"><ShieldCheck /><div><b>Verified Versus venue</b><small>Location, amenities, and rates checked by our team.</small></div></div>
          <section className="detail-section"><h2>About this venue</h2><p>{venue.description}</p></section>
          <section className="detail-section"><h2>Amenities</h2><div className="amenities-grid">{venue.amenities.map((item) => <span key={item}><Check /> {item}</span>)}</div></section>
          <section className="detail-section"><div className="section-title"><h2>Location</h2><button><Navigation size={16} /> Get directions</button></div><div className="detail-map"><span><MapPin /></span><b>{venue.name}</b><small>{venue.area}, Metro Manila</small></div></section>
        </div>
        <aside className="booking-panel">
          <div className="booking-price"><span>From</span><b>₱{venue.price}</b><small>/ hour</small></div>
          <label><Calendar size={16} /> Select date</label><button className="date-input">Today, July 19 <span>⌄</span></button>
          <label><Clock3 size={16} /> Available times</label><div className="time-grid">{times.map((time) => <button className={selectedTime === time ? 'is-active' : ''} onClick={() => setSelectedTime(time)} key={time}>{time}</button>)}</div>
          <div className="booking-total"><span>Court reservation</span><b>₱{venue.price}</b><span>Service fee</span><b>₱25</b><strong>Total</strong><strong>₱{venue.price + 25}</strong></div>
          <button onClick={book} className="button button--lime button--full">{booked ? 'Booking confirmed ✓' : 'Reserve this court'}</button>
          <small className="booking-note">You won’t be charged until the venue confirms.</small>
        </aside>
      </div>
    </>
  )
}
