import { Plus, Search } from 'lucide-react'
import { ClubCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

export default function ClubsPage() {
  const { clubs } = usePlayer()
  return (
    <>
      <div className="app-page-heading app-page-heading--compact">
        <div><h1>Clubs</h1><p>Find your people, join regular games, and grow together.</p></div>
        <button className="button button--primary"><Plus size={17} /> Create club</button>
      </div>
      <div className="app-search-card"><Search size={18} /><input placeholder="Search clubs by name, sport, or location" /></div>
      <div className="filter-row"><button className="is-active">Discover</button><button>My clubs</button><button>Nearby</button><button>Most active</button></div>
      <section className="dashboard-section"><div className="section-title"><div><h2>Popular clubs near you</h2><p>Communities playing around Quezon City</p></div><span>{clubs.length} clubs</span></div><div className="cards-grid cards-grid--clubs">{clubs.map((club) => <ClubCard club={club} key={club.id} />)}</div></section>
    </>
  )
}
