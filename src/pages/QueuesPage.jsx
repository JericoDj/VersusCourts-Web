import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Dumbbell, Search, Tally5, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QueueCard } from '../components/Cards'
import ComingSoonDialog from '../components/ComingSoonDialog'
import { usePlayer } from '../context/PlayerContext'
import { useQueues } from '../context/QueueContext'
import { SportGlyph } from '../components/SportIcon'
import { activity } from '../data/mockData'
import { sportLabel } from '../data/sports'
import '../styles/play.css'

/// Mirrors the Flutter play hub (play_hub_screen.dart:67-104) — same option order,
/// copy and gradients. Reserve/Training are gated off in Flutter too, so they open
/// the shared coming-soon dialog. Scoreboard has no badge in Flutter; kept unbadged
/// even though the web has no scoreboard yet and routes it to the same dialog.
const PLAY_OPTIONS = [
  { id: 'reserve', title: 'Reserve a Court', subtitle: 'Pick a sport, date & time', Icon: CalendarDays, variant: 'reserve', comingSoon: true, action: 'coming-soon' },
  { id: 'queue', title: 'Queue and Openplay', subtitle: 'Hop into a public game or host your own', Icon: UsersRound, variant: 'queue', comingSoon: false, action: 'browse' },
  { id: 'training', title: 'Join a Training', subtitle: 'Level up your game with pro sessions', Icon: Dumbbell, variant: 'training', comingSoon: true, action: 'coming-soon' },
  { id: 'score', title: 'Open Scoreboard', subtitle: 'Keep score for any match', Icon: Tally5, variant: 'score', comingSoon: false, action: 'coming-soon' },
]

export default function QueuesPage() {
  const { joinedQueues } = usePlayer()
  const { queues } = useQueues()
  const [view, setView] = useState('hub')
  const [comingSoon, setComingSoon] = useState(null)

  // Web mock data has no `isOngoing` / `courtName`; a joined + featured queue is the
  // closest stand-in, and `venue` stands in for the court name.
  const activeQueue = queues.find((queue) => joinedQueues.includes(queue.id) && queue.featured)
  const bookingCount = activity.length

  const handleOption = (option) => {
    if (option.action === 'browse') setView('browse')
    else setComingSoon(option.title)
  }

  return (
    <>
      {view === 'hub' ? (
        <div className="play-hub">
          {activeQueue && (
            <button type="button" className="play-live" onClick={() => setView('browse')}>
              <span className="play-live__emoji">{activeQueue.sport ? <SportGlyph sport={activeQueue.sport} size={22} /> : '✦'}</span>
              <span className="play-live__body">
                <span className="play-live__eyebrow"><i aria-hidden="true" /> LIVE</span>
                <strong>{activeQueue.title}</strong>
                <small>{activeQueue.sport ? sportLabel(activeQueue.sport) : 'Open play'} · {activeQueue.venue}</small>
              </span>
              <ArrowRight size={18} className="play-live__arrow" />
            </button>
          )}

          <Link className="play-bookings" to="/app/bookings">
            <span className="play-bookings__icon">
              <CalendarDays size={20} />
              <i className="play-bookings__badge">{bookingCount}</i>
            </span>
            <span className="play-bookings__body">
              <strong>My Bookings</strong>
              <small>View your reservations and history</small>
            </span>
            <ChevronRight size={18} className="play-bookings__arrow" />
          </Link>

          <div className="play-options">
            {PLAY_OPTIONS.map((option) => {
              const { Icon } = option
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`play-card play-card--${option.variant}`}
                  onClick={() => handleOption(option)}
                >
                  <span className="play-card__icon"><Icon size={26} /></span>
                  <span className="play-card__body">
                    <span className="play-card__heading">
                      <strong>{option.title}</strong>
                      {option.comingSoon && <em className="play-card__badge">Coming Soon</em>}
                    </span>
                    <small>{option.subtitle}</small>
                  </span>
                  <ArrowRight size={18} className="play-card__arrow" />
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="play-back" onClick={() => setView('hub')}>
            <ArrowLeft size={16} /> Play hub
          </button>
          <div className="queue-toolbar"><div><Search size={17} /><input placeholder="Search open games" /></div><button className="is-active">All games</button><button>Today</button><button>Tomorrow</button><button>Weekend</button><button>Join by code</button></div>
          <div className="queue-highlight"><div><small>FEATURED GAME</small><h2>Friday Night Runs</h2><p>Fast-paced intermediate basketball with fair match rotations and live scoring.</p><span>Elite Sports Center · Tonight at 7:30 PM</span></div><div><span><b>8</b>/10 players</span><button className="button button--primary">View game →</button></div></div>
          <div className="cards-grid cards-grid--queues cards-grid--queues-page">{queues.map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div>
        </>
      )}

      <ComingSoonDialog open={!!comingSoon} label={comingSoon} onClose={() => setComingSoon(null)} />
    </>
  )
}
