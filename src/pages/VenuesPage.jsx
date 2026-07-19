import { Link } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'
import { VenueCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

export default function VenuesPage() {
  const { filteredVenues } = usePlayer()
  return <div className="public-directory"><PublicHeader /><section className="directory-hero"><div className="container"><span className="eyebrow eyebrow--lime">VERIFIED VENUES</span><h1>YOUR NEXT COURT<br />IS <em>RIGHT HERE.</em></h1><p>Explore trusted sports venues across Metro Manila.</p></div></section><main className="container directory-body"><div className="section-title"><h2>Courts near Quezon City</h2><Link to="/app/discover">Open full player →</Link></div><div className="cards-grid cards-grid--venues">{filteredVenues.map((venue) => <VenueCard venue={venue} key={venue.id} />)}</div></main></div>
}
