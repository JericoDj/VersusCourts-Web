import { useEffect, useState } from 'react'
import CreateQueueModal from '../components/CreateQueueModal'
import CreateClubModal from '../components/CreateClubModal'
import { useNavigate } from 'react-router-dom'
import { ClubCard, QueueCard } from '../components/Cards'
import DiscoveryMap from '../components/DiscoveryMap'
import SectionFeed from '../components/SectionFeed'
import { SportSelector } from '../components/SportIcon'
import { usePlayer } from '../context/PlayerContext'
import { isQueueActive, useQueues } from '../context/QueueContext'
import { useAuth } from '../context/AuthContext'
import { fetchTrainings } from '../data/trainings'
import { TrainingCard } from './TrainingsPage'
import '../styles/trainings.css'
import '../styles/play.css'
import '../styles/home.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { sport, setSport, clubs, refresh, setNotice, isLoading, hasLoadedOnce } = usePlayer()
  const { queues, myQueues, refreshQueues, refreshMyQueues, isLoading: queuesLoading } = useQueues()
  const [createQueueOpen, setCreateQueueOpen] = useState(false)
  const [createClubOpen, setCreateClubOpen] = useState(false)
  const { user } = useAuth()
  // Upcoming public trainings (GET /trainings) for the Trainings row.
  const [trainings, setTrainings] = useState({ list: [], loaded: false })
  useEffect(() => {
    let active = true
    fetchTrainings()
      .then((list) => { if (active) setTrainings({ list, loaded: true }) })
      .catch(() => { if (active) setTrainings({ list: [], loaded: true }) })
    return () => { active = false }
  }, [])
  const now = new Date()
  const sportTrainings = trainings.list
    .filter((t) => t.status === 'SCHEDULED' && t.startTime > now && (sport === 'all' || t.sport === sport))
    .sort((a, b) => a.startTime - b.startTime)
  const sportQueues = queues.filter((queue) => isQueueActive(queue) && !queue.isPrivate && (sport === 'all' || queue.sport === sport))
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
        className="home-feed"
        title="Queue / Open Play" to="/app/queues?view=browse" variant="queues"
        loading={queuesLoading} items={sportQueues.slice(0, 3)}
        empty={"No games are active.\nHost the first game."}
        emptyAction={<button type="button" className="home-pill-button" onClick={() => setCreateQueueOpen(true)}>Host Game</button>}
        render={(queue) => (
          <QueueCard
            queue={queue}
            key={queue.id}
            joined={myQueues.some((mine) => String(mine.id) === String(queue.id))}
            onOpen={() => navigate(`/app/queues/${queue.id}`)}
          />
        )}
      />
      <SectionFeed
        className="home-feed"
        title="Trainings" to="/app/trainings" variant="trainings"
        loading={!trainings.loaded} items={sportTrainings.slice(0, 3)}
        empty={"No trainings scheduled.\nCheck back soon."}
        render={(training) => (
          <TrainingCard
            key={training.id}
            training={training}
            me={user?.id}
            onOpen={() => navigate(`/app/trainings/${training.id}`)}
          />
        )}
      />
      <SectionFeed
        className="home-feed"
        title="Popular Clubs Near You" to="/app/clubs" variant="clubs"
        loading={loading} items={clubs.slice(0, 3)}
        empty={"No clubs yet.\nCreate the first club."}
        emptyAction={<button type="button" className="home-pill-button" onClick={() => setCreateClubOpen(true)}>Create Club</button>}
        render={(club) => (
          <ClubCard
            club={club}
            showActions
            key={club.id}
            onOpen={() => navigate(`/app/clubs/${club.id}`)}
          />
        )}
      />
      <CreateQueueModal
        open={createQueueOpen}
        onClose={() => setCreateQueueOpen(false)}
        onCreated={() => { refreshQueues(); refreshMyQueues() }}
      />
      <CreateClubModal
        open={createClubOpen}
        onClose={() => setCreateClubOpen(false)}
        onCreated={(club) => {
          refresh()
          setNotice('Club created — you are its captain!')
          if (club) navigate(`/app/clubs/${club.id}`)
        }}
      />
    </>
  )
}
