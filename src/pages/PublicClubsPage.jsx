import { ShieldCheck, Star, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ClubCard } from '../components/Cards'
import ClubDetailDialog from '../components/ClubDetailDialog'
import DirectoryLayout from '../components/DirectoryLayout'
import { usePlayer } from '../context/PlayerContext'
import { SportFilterPills } from '../components/SportIcon'

export default function PublicClubsPage() {
  // Clubs come from DiscoveryContext, which already fetches and normalizes
  // `/clubs` once for the whole app.
  const { allClubs: clubs } = usePlayer()
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('all')
  const [publicOnly, setPublicOnly] = useState(false)
  const [memberSort, setMemberSort] = useState(false)
  const [selectedClub, setSelectedClub] = useState(null)

  const results = useMemo(() => {
    const filtered = clubs.filter((club) =>
      (sport === 'all' || (club.sports || [club.sport]).includes(sport))
      && (!publicOnly || !club.private)
      && `${club.name} ${club.area}`.toLowerCase().includes(query.toLowerCase()))
    return memberSort ? [...filtered].sort((a, b) => b.members - a.members) : filtered
  }, [clubs, memberSort, publicOnly, query, sport])
  const clear = () => { setQuery(''); setSport('all'); setPublicOnly(false); setMemberSort(false) }
  const accent = 'var(--vc-brand-green)'
  return (
    <>
    <DirectoryLayout
      accent={accent}
      eyebrow="SPORTS CLUBS"
      title={<>FIND YOUR<br /><em>PEOPLE.</em></>}
      lede="Join a club, train with regulars, and never look for a game alone again."
      stats={[
        { value: clubs.length, label: 'active clubs', icon: ShieldCheck, color: 'var(--vc-brand-green)' },
        { value: clubs.reduce((sum, club) => sum + club.members, 0).toLocaleString(), label: 'members', icon: UsersRound, color: 'var(--vc-brand-green)' },
        { value: '4.8', label: 'average rating', icon: Star, color: 'var(--vc-warning)' },
      ]}
      search={query}
      onSearch={setQuery}
      searchLabel="Search clubs or areas"
      resultLabel={`${results.length} club${results.length === 1 ? '' : 's'} near Quezon City`}
      cta={{ to: '/app/clubs', label: 'Open in the player' }}
      filters={<div className="directory-filters"><SportFilterPills value={sport} onChange={setSport} /><i /><button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={publicOnly} onClick={() => setPublicOnly((value) => !value)}>Public only</button><button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={memberSort} onClick={() => setMemberSort((value) => !value)}>Most members</button></div>}
      extra={<section className="directory-extra club-benefits"><span className="eyebrow">WHY JOIN A CLUB?</span><div>{[['Train consistently','Regular sessions with familiar players.'],['Find your level','Meet teammates who match your pace.'],['Play for something','Join leagues, events, and club challenges.']].map(([title,text]) => <article key={title}><span className="icon-chip" style={{ '--chip-color': accent }}><UsersRound size={18} /></span><div><b>{title}</b><p>{text}</p></div></article>)}</div></section>}
    >
      {results.length ? <div className="cards-grid cards-grid--clubs public-clubs-grid">{results.map((club) => <ClubCard club={club} onOpen={() => setSelectedClub(club)} key={club.id} />)}</div> : <div className="empty-state" style={{ '--empty-color': accent }}><span><ShieldCheck size={30} /></span><h3>No clubs match those filters</h3><p>Try another sport or search area.</p><button type="button" onClick={clear}>Clear filters</button></div>}
    </DirectoryLayout>
    {selectedClub && <ClubDetailDialog club={selectedClub} onClose={() => setSelectedClub(null)} />}
    </>
  )
}
