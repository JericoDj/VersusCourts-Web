import { SlidersHorizontal } from 'lucide-react'
import { VenueCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function DiscoverPage() {
  const { sport, setSport, filteredVenues } = usePlayer()
  return (
    <>
      <div className="app-page-heading"><div><span className="eyebrow">COURT DISCOVERY</span><h1>Find your <em>next court.</em></h1><p>Verified venues, live details, and easy booking around Metro Manila.</p></div><button className="button button--outline"><SlidersHorizontal size={17} /> Filters</button></div>
      <div className="filter-row">{sports.map((item) => <button key={item.id} className={sport === item.id ? 'is-active' : ''} onClick={() => setSport(item.id)}>{item.label}</button>)}</div>
      <div className="result-summary"><span><b>{filteredVenues.length}</b> venues near Quezon City</span><select defaultValue="nearest"><option value="nearest">Nearest first</option><option>Top rated</option><option>Lowest price</option></select></div>
      <div className="discover-layout"><div className="cards-grid cards-grid--discover">{filteredVenues.map((venue) => <VenueCard venue={venue} key={venue.id} />)}</div><aside className="fake-map"><div className="map-grid" />{filteredVenues.map((venue, index) => <span key={venue.id} style={{ left: `${20 + (index * 17) % 62}%`, top: `${18 + (index * 21) % 58}%` }}>₱{venue.price}</span>)}<div className="map-location">You are here</div></aside></div>
    </>
  )
}
