import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { VenueCard } from '../components/Cards'
import ComingSoonDialog from '../components/ComingSoonDialog'
import DirectoryLayout from '../components/DirectoryLayout'
import { usePlayer } from '../context/PlayerContext'
import { SportFilterPills } from '../components/SportIcon'

export default function VenuesPage() {
  const { venues } = usePlayer()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('search') ?? ''
  const [sport, setSport] = useState('all')
  const [openOnly, setOpenOnly] = useState(false)
  const [priceDirection, setPriceDirection] = useState('none')
  const [area, setArea] = useState('')
  const [selectedVenue, setSelectedVenue] = useState(null)

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

  const clear = () => {
    setQuery('')
    setSport('all')
    setOpenOnly(false)
    setPriceDirection('none')
    setArea('')
  }

  const accent = '#1d4ed8'

  return (
    <>
      <DirectoryLayout
        accent={accent}
        eyebrow="VERIFIED VENUES"
        title={<>FIND YOUR COURT.<br /><em>BOOK IN SECONDS.</em></>}
        lede="Explore verified basketball, badminton, pickleball, tennis, and padel venues across Metro Manila."
        stats={[
          { value: '120+', label: 'partner courts', icon: Building2, color: '#1d4ed8' },
          { value: '5 Sports', label: 'supported', icon: UsersRound, color: '#15803d' },
          { value: 'Coming Soon', label: 'instant booking', icon: Sparkles, color: '#c2410c' },
        ]}
        search={query}
        onSearch={setQuery}
        searchLabel="Search courts, venues, or areas"
        resultLabel={`${results.length} verified venue${results.length === 1 ? '' : 's'} in Metro Manila`}
        cta={{ to: '/queues', label: 'Explore Open Play Queues' }}
        filters={
          <div className="directory-filters">
            <SportFilterPills value={sport} onChange={setSport} />
            <i />
            <button
              type="button"
              className="filter-pill"
              style={{ '--pill-color': '#15803d' }}
              aria-pressed={openOnly}
              onClick={() => setOpenOnly((value) => !value)}
            >
              Open now
            </button>
            <button
              type="button"
              className="filter-pill"
              aria-pressed={priceDirection !== 'none'}
              onClick={() => setPriceDirection((value) => value === 'none' ? 'asc' : value === 'asc' ? 'desc' : 'none')}
            >
              Price {priceDirection === 'asc' ? '↑' : priceDirection === 'desc' ? '↓' : ''}
            </button>
          </div>
        }
        extra={
          <section className="directory-extra">
            <span className="eyebrow">POPULAR AREAS</span>
            <div className="area-chips">
              {['Quezon City', 'Makati', 'Taguig', 'Pasig'].map((name) => (
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={area === name}
                  onClick={() => setArea(area === name ? '' : name)}
                  key={name}
                >
                  <MapPin size={14} /> {name === 'Taguig' ? 'BGC' : name}
                </button>
              ))}
            </div>
          </section>
        }
      >
        {/* Launching Soon Feature Announcement Banner */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(34, 197, 94, 0.08))',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(37, 99, 235, 0.14)',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Sparkles size={14} /> BOOKING ROLLING OUT
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              Metro Manila
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--vc-text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Court booking is coming soon to the web player
              </h2>
              <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: 1.6 }}>
                We are synchronizing live court availability and reservation systems with partner facilities. In the meantime, browse verified venues below, join active open-play game queues, or list your facility.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Link to="/queues" className="button button--primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
                  Join Open Play Queues <ArrowRight size={16} />
                </Link>
                <Link to="/proposal" className="button button--outline" style={{ padding: '10px 20px', fontSize: '14px' }}>
                  List your court / Partner with us
                </Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <CheckCircle2 size={16} color="#15803d" />
                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                  Free to join — no player booking fees
                </span>
              </div>
            </div>
          </div>
        </section>

        {results.length ? (
          <div className="cards-grid cards-grid--venues">
            {results.map((venue) => (
              <VenueCard
                venue={venue}
                key={venue.id}
                onSelect={() => setSelectedVenue(venue)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ '--empty-color': accent }}>
            <span><Building2 size={30} /></span>
            <h3>No courts match those filters</h3>
            <p>Try another sport, area, or price range.</p>
            <button type="button" onClick={clear}>Clear filters</button>
          </div>
        )}
      </DirectoryLayout>

      <ComingSoonDialog
        open={Boolean(selectedVenue)}
        onClose={() => setSelectedVenue(null)}
        label={selectedVenue?.name ? `${selectedVenue.name} Booking` : 'Court Booking'}
      />
    </>
  )
}
