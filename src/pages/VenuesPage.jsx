import { Building2, Clock3, MapPin, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { VenueCard } from '../components/Cards'
import DirectoryLayout from '../components/DirectoryLayout'
import { usePlayer } from '../context/PlayerContext'
import { sports } from '../data/mockData'

export default function VenuesPage() {
  const { venues } = usePlayer()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') ?? ''
  const [sport, setSport] = useState('all')
  const [openOnly, setOpenOnly] = useState(false)
  const [priceDirection, setPriceDirection] = useState('none')
  const [area, setArea] = useState('')
  const setQuery = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('search', value)
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = venues.filter((venue) =>
      (sport === 'all' || venue.sports.includes(sport))
      && (!openOnly || venue.open)
      && (!area || venue.area === area)
      && `${venue.name} ${venue.area} ${venue.sports.join(' ')}`.toLowerCase().includes(normalized))
    return priceDirection === 'none'
      ? filtered
      : [...filtered].sort((a, b) => priceDirection === 'asc' ? a.price - b.price : b.price - a.price)
  }, [area, openOnly, priceDirection, query, sport, venues])
  const clear = () => { setQuery(''); setSport('all'); setOpenOnly(false); setPriceDirection('none'); setArea('') }
  const accent = 'var(--vc-primary)'
  return (
    <DirectoryLayout
      accent={accent}
      eyebrow="VERIFIED VENUES"
      title={<>YOUR NEXT COURT<br />IS <em>RIGHT HERE.</em></>}
      lede="Explore trusted sports venues across Metro Manila."
      stats={[
        { value: venues.length, label: 'venues', icon: Building2 },
        { value: venues.filter((venue) => venue.open).length, label: 'open now', icon: Clock3 },
        { value: '4.8', label: 'average rating', icon: Star },
      ]}
      search={query}
      onSearch={setQuery}
      searchLabel="Search courts or areas"
      resultLabel={`${results.length} court${results.length === 1 ? '' : 's'} near Quezon City`}
      cta={{ to: '/app/discover', label: 'Open in the player' }}
      filters={<div className="directory-filters">{sports.map((item) => <button type="button" className="filter-pill" style={{ '--pill-color': accent }} aria-pressed={sport === item.id} onClick={() => setSport(item.id)} key={item.id}>{item.label}</button>)}<i /><button type="button" className="filter-pill" style={{ '--pill-color': 'var(--vc-success)' }} aria-pressed={openOnly} onClick={() => setOpenOnly((value) => !value)}>Open now</button><button type="button" className="filter-pill" aria-pressed={priceDirection !== 'none'} onClick={() => setPriceDirection((value) => value === 'none' ? 'asc' : value === 'asc' ? 'desc' : 'none')}>Price {priceDirection === 'asc' ? '↑' : priceDirection === 'desc' ? '↓' : ''}</button></div>}
      extra={<section className="directory-extra"><span className="eyebrow">POPULAR AREAS</span><div className="area-chips">{['Quezon City','Makati','Taguig','Pasig'].map((name) => <button type="button" className="filter-pill" aria-pressed={area === name} onClick={() => setArea(area === name ? '' : name)} key={name}><MapPin size={14} /> {name === 'Taguig' ? 'BGC' : name}</button>)}</div></section>}
    >
      {results.length ? <div className="cards-grid cards-grid--venues">{results.map((venue) => <VenueCard venue={venue} key={venue.id} />)}</div> : <div className="empty-state" style={{ '--empty-color': accent }}><span><Building2 size={30} /></span><h3>No courts match those filters</h3><p>Try another sport, area, or price range.</p><button type="button" onClick={clear}>Clear filters</button></div>}
    </DirectoryLayout>
  )
}
