import { Plus, Search } from 'lucide-react'
import { QueueCard } from '../components/Cards'
import { usePlayer } from '../context/PlayerContext'

export default function QueuesPage() {
  const { queues } = usePlayer()
  return (
    <>
      <div className="app-page-heading"><div><span className="eyebrow eyebrow--live"><i /> LIVE OPEN PLAY</span><h1>There’s always a <em>game on.</em></h1><p>Join a public game, bring your energy, and meet your next teammates.</p></div><button className="button button--dark"><Plus size={17} /> Host a game</button></div>
      <div className="queue-toolbar"><div><Search size={17} /><input placeholder="Search open games" /></div><button className="is-active">All games</button><button>Today</button><button>Tomorrow</button><button>Weekend</button><button>Join by code</button></div>
      <div className="queue-highlight"><div><small>FEATURED GAME</small><h2>Friday Night Runs</h2><p>Fast-paced intermediate basketball with fair match rotations and live scoring.</p><span>Elite Sports Center · Tonight at 7:30 PM</span></div><div><span><b>8</b>/10 players</span><button className="button button--lime">View game →</button></div></div>
      <div className="cards-grid cards-grid--queues cards-grid--queues-page">{queues.map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div>
    </>
  )
}
