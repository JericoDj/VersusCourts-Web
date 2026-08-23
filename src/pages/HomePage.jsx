import { ClubCard, EventCard, QueueCard, VenueCard } from '../components/Cards'
import DiscoveryMap from '../components/DiscoveryMap'
import SectionFeed from '../components/SectionFeed'
import { SportSelector } from '../components/SportIcon'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import '../styles/play.css'

export default function HomePage() {
  const { sport, setSport, filteredVenues, events, clubs, isLoading, hasLoadedOnce } = usePlayer()
  const { queues, isLoading: queuesLoading } = useQueues()
  const sportQueues = sport === 'all' ? queues : queues.filter((queue) => queue.sport === sport)
  /// Only the very first load shows skeletons; later refreshes keep the
  /// current feed on screen rather than flashing it away.
  const loading = isLoading && !hasLoadedOnce
  return (
    <>
      <DiscoveryMap />
      <section className="dashboard-section sport-section">
        <div className="section-title"><div><h2>What are you playing?</h2><p>Filter everything near you by sport</p></div></div>
        <SportSelector value={sport} onChange={setSport} />
      </section>
      <SectionFeed
        title="Nearby Courts" to="/app/discover" variant="venues"
        loading={loading} items={filteredVenues.slice(0, 3)}
        empty="No courts near you yet. Try widening your search radius."
        render={(venue) => <VenueCard key={venue.id} venue={venue} />}
      />
      <SectionFeed
        title="Queue / Open Play" to="/app/queues" variant="queues"
        loading={queuesLoading} items={sportQueues.slice(0, 3)}
        empty="No open games right now. Check back soon."
        render={(queue) => <QueueCard queue={queue} key={queue.id} />}
      />
      <SectionFeed
        title="Popular Clubs Near You" to="/app/clubs" variant="clubs"
        loading={loading} items={clubs.slice(0, 3)}
        empty="No clubs in your area yet."
        render={(club) => <ClubCard club={club} key={club.id} />}
      />
      <SectionFeed
        title="Upcoming Events" to="/app/events" variant="events"
        loading={loading} items={events.slice(0, 3)}
        empty="No upcoming events scheduled."
        render={(event) => <EventCard event={event} key={event.id} />}
      />
    </>
  )
}
