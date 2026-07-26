import { CalendarDays, Clock3, UsersRound, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QueueCard } from '../components/Cards'
import DirectoryLayout from '../components/DirectoryLayout'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function PublicQueuesPage() {
  const { queues } = usePlayer()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('all')
  const [window, setWindow] = useState('all')
  const [spotsOnly, setSpotsOnly] = useState(false)
  const results = useMemo(() => queues.filter((queue) =>
    (sport === 'all' || queue.sport === sport)
    && (!spotsOnly || queue.players < queue.max)
    && (window !== 'today' || !queue.time.toLowerCase().includes('sat'))
    && `${queue.title} ${queue.venue} ${queue.level}`.toLowerCase().includes(query.toLowerCase())), [query, queues, spotsOnly, sport, window])
  const clear = () => { setQuery(''); setSport('all'); setWindow('all'); setSpotsOnly(false) }
  const accent = 'var(--vc-accent)'
  return (
    <DirectoryLayout
      accent={accent}
      eyebrow="LIVE OPEN PLAY"
      title={<>THERE&apos;S ALWAYS<br />A <em>GAME ON.</em></>}
      lede="Join a public game, bring your energy, and meet your next teammates."
      stats={[
        { value: queues.length, label: 'open games', icon: Zap },
        { value: queues.reduce((sum, queue) => sum + Math.max(0, queue.max - queue.players), 0), label: 'spots available', icon: UsersRound },
        { value: 'Tonight', label: 'next games', icon: Clock3 },
      ]}
      search={query}
      onSearch={setQuery}
      searchLabel="Search games or venues"
      resultLabel={`${results.length} open game${results.length === 1 ? '' : 's'} near Quezon City`}
      cta={{ to: '/app/queues', label: 'Open in the player' }}
      filters={<div className="directory-filters">{sports.map((item) => <button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={sport === item.id} onClick={() => setSport(item.id)} key={item.id}>{item.label}</button>)}<i /><button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={window === 'today'} onClick={() => setWindow(window === 'today' ? 'all' : 'today')}>Today</button><button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={window === 'week'} onClick={() => setWindow(window === 'week' ? 'all' : 'week')}>This week</button><button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={spotsOnly} onClick={() => setSpotsOnly((value) => !value)}>Has spots</button></div>}
      extra={<section className="directory-extra queue-how-mini"><span className="eyebrow">HOW QUEUES WORK</span><div>{[[UsersRound,'Join','Claim an available spot.'],[CalendarDays,'Check in','Arrive and confirm at the venue.'],[Zap,'Rotate','Play fair rotations with the group.']].map(([Icon,title,text], index) => <article key={title}><span>{index + 1}</span><span className="icon-chip" style={{ '--chip-color': accent }}><Icon size={18} /></span><div><b>{title}</b><p>{text}</p></div></article>)}</div></section>}
    >
      {results.length ? <div className="cards-grid cards-grid--queues">{results.map((queue) => <QueueCard queue={queue} key={queue.id} />)}</div> : <div className="empty-state" style={{ '--empty-color': accent }}><span><UsersRound size={30} /></span><h3>No open games match</h3><p>Try another sport or a wider time window.</p><button type="button" onClick={clear}>Clear filters</button></div>}
    </DirectoryLayout>
  )
}
