import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock3,
  Lock,
  MapPin,
  Maximize2,
  Navigation,
  ShieldCheck,
  Star,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_DISCOVERY_CENTER, formatDate } from '../data/discoveryApi'
import { formatMoney, toMapPlaces } from '../controllers/discoveryController'
import { useDiscovery } from '../context/DiscoveryContext'
import { useQueues } from '../context/QueueContext'

const markerStyle = {
  court: { color: 'var(--vc-warning)', glyph: '▦' },
  queue: { color: 'var(--vc-accent)', glyph: '●' },
  club: { color: 'var(--vc-primary)', glyph: 'V' },
}

let googleMapsPromise

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (googleMapsPromise) return googleMapsPromise
  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__versusGoogleMapsReady'
    const script = document.createElement('script')
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      delete window[callbackName]
      googleMapsPromise = undefined
      reject(new Error('Google Maps could not load'))
    }
    document.head.append(script)
  })
  return googleMapsPromise
}

function distanceInMeters(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const value =
    Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function groupPlaces(places) {
  const groups = []
  places.forEach((place) => {
    const group = groups.find((items) => distanceInMeters(items[0], place) <= 45)
    if (group) group.push(place)
    else groups.push([place])
  })
  return groups
}

/// Map pins are a projection of the feeds DiscoveryContext and QueueContext
/// already hold — no separate round trip, so the map can't drift from the
/// lists below it.
function useDiscoveryPlaces() {
  const { businesses, clubs, isLoading, hasLoadedOnce, error } = useDiscovery()
  const { queues, isLoading: queuesLoading } = useQueues()
  return useMemo(() => ({
    ...toMapPlaces({ businesses, clubs, queues }),
    status: error ? 'error' : (isLoading || queuesLoading) && !hasLoadedOnce ? 'loading' : 'ready',
  }), [businesses, clubs, error, hasLoadedOnce, isLoading, queues, queuesLoading])
}

function GoogleMapCanvas({ places, onSelect, expanded = false }) {
  const elementRef = useRef(null)
  const [mapStatus, setMapStatus] = useState(() =>
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key')
  const [clusterPlaces, setClusterPlaces] = useState(null)

  useEffect(() => {
    if (!elementRef.current) return undefined
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) return undefined
    let cancelled = false
    const listeners = []
    const markers = []

    loadGoogleMaps(apiKey)
      .then(async (maps) => {
        if (cancelled || !elementRef.current) return
        const { AdvancedMarkerElement } = await maps.importLibrary('marker')
        if (cancelled || !elementRef.current) return
        const map = new maps.Map(elementRef.current, {
          center: DEFAULT_DISCOVERY_CENTER,
          zoom: 12,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          clickableIcons: false,
          fullscreenControl: expanded,
          gestureHandling: expanded ? 'greedy' : 'cooperative',
          mapTypeControl: false,
          streetViewControl: false,
        })
        const bounds = new maps.LatLngBounds()
        places.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }))
        groupPlaces(places).forEach((group) => {
          const place = group[0]
          const style = markerStyle[place.kind]
          const content = document.createElement('span')
          content.className = `discovery-marker discovery-marker--${place.kind}${group.length > 1 ? ' discovery-marker--cluster' : ''}`
          content.style.setProperty('--marker-color', style.color)
          content.textContent = group.length > 1 ? String(group.length) : style.glyph
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: place.lat, lng: place.lng },
            title: group.length > 1 ? `${group.length} places here` : `${place.label} — ${place.meta}`,
            content,
            gmpClickable: true,
          })
          const handleClick = () => group.length > 1 ? setClusterPlaces(group) : onSelect(place)
          marker.addEventListener('gmp-click', handleClick)
          listeners.push(() => marker.removeEventListener('gmp-click', handleClick))
          markers.push(marker)
        })
        if (places.length > 1) {
          map.fitBounds(bounds, expanded ? 84 : 42)
          const idleListener = maps.event.addListenerOnce(map, 'idle', () => {
            if (map.getZoom() > 13) map.setZoom(13)
          })
          listeners.push(() => idleListener.remove())
        } else if (places.length === 1) {
          map.setCenter({ lat: places[0].lat, lng: places[0].lng })
          map.setZoom(13)
        }
        setMapStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setMapStatus('error')
      })

    return () => {
      cancelled = true
      listeners.forEach((remove) => remove())
      markers.forEach((marker) => marker.remove())
    }
  }, [expanded, onSelect, places])

  return (
    <>
      <div ref={elementRef} className="discovery-map__canvas" aria-label="Interactive map of nearby courts, clubs, and queues" />
      {mapStatus !== 'ready' && (
        <div className="discovery-map__state" role="status">
          {mapStatus === 'missing-key'
            ? 'Add VITE_GOOGLE_MAPS_API_KEY to enable the map.'
            : mapStatus === 'error' ? 'Google Maps is unavailable right now.' : 'Loading Google Maps…'}
        </div>
      )}
      {clusterPlaces && (
        <div className="map-cluster-sheet" role="dialog" aria-label={`${clusterPlaces.length} places here`}>
          <div><strong>{clusterPlaces.length} places here</strong><button type="button" onClick={() => setClusterPlaces(null)} aria-label="Close places list"><X size={16} /></button></div>
          {clusterPlaces.map((place) => (
            <button type="button" key={`${place.kind}:${place.id}`} onClick={() => { onSelect(place); setClusterPlaces(null) }}>
              <span className={`is-${place.kind}`}>{place.kind === 'court' ? <Building2 size={15} /> : place.kind === 'queue' ? <UsersRound size={15} /> : <ShieldCheck size={15} />}</span>
              <span><b>{place.label}</b><small>{place.kind === 'court' ? 'Business' : place.kind === 'club' ? 'Club' : 'Queue'}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function PlaceImage({ place }) {
  const source = place.logoUrl || place.coverUrl
  if (source) return <img src={source} alt="" />
  return <span className={`map-place-card__fallback map-place-card__fallback--${place.kind}`}>{place.kind === 'court' ? <Building2 /> : place.kind === 'queue' ? <UsersRound /> : <ShieldCheck />}</span>
}

function MapPlaceCard({ place, compact = false }) {
  if (!place) return null
  const typeLabel = place.kind === 'court' ? 'Business' : place.kind === 'queue' ? 'Upcoming Queue' : 'Club'
  const actionLabel = place.kind === 'court' ? 'View Business' : place.kind === 'queue' ? 'View Queue' : 'View Club'
  return (
    <article className={`map-place-card map-place-card--${place.kind}${compact ? ' is-compact' : ''}`}>
      <div className="map-place-card__band">
        <span>{typeLabel}</span>
        {place.kind === 'court' && <b className={place.isOpen ? 'is-open' : ''}>{place.isOpen ? 'Open' : 'Closed'}</b>}
        {place.kind === 'queue' && <UsersRound size={22} />}
        {place.kind === 'club' && place.isPrivate && <Lock size={17} />}
      </div>
      <div className="map-place-card__body">
        <div className="map-place-card__identity">
          <div className="map-place-card__image"><PlaceImage place={place} /></div>
          <div>
            <h3>{place.label}</h3>
            {place.kind === 'court' && <p><span><Building2 size={14} /> {place.courts.length} courts</span>{place.distanceKm !== null && <span><MapPin size={14} /> {place.distanceKm.toFixed(1)} km</span>}{place.minPrice !== null && <strong>from ₱{formatMoney(place.minPrice)}/hr</strong>}</p>}
            {place.kind === 'club' && <p><span><UsersRound size={14} /> {place.members.toLocaleString()} members</span><span><Star size={14} /> {place.rating.toFixed(1)}</span>{place.area && <span><MapPin size={14} /> {place.area}</span>}</p>}
            {place.kind === 'queue' && <p><span><MapPin size={14} /> {place.venue}</span><span><Clock3 size={14} /> {formatDate(place.startTime)}</span><strong>{place.spotsLeft === 0 ? 'Full' : `${place.spotsLeft} spots left`}</strong></p>}
          </div>
        </div>
        {place.sports?.length > 0 && <div className="map-place-card__sports">{place.sports.map((sport) => <span key={sport}>{sport}</span>)}</div>}
        <Link className="map-place-card__action" to={place.to}>{actionLabel} <ArrowRight size={17} /></Link>
      </div>
    </article>
  )
}

function MapFilters({ filters, counts, onToggle }) {
  return (
    <div className="discovery-map__filters" aria-label="Map categories">
      <button type="button" className="is-court" aria-pressed={filters.court} onClick={() => onToggle('court')}><Building2 size={14} /> Courts <small>{counts.courts}</small></button>
      <button type="button" className="is-club" aria-pressed={filters.club} onClick={() => onToggle('club')}><ShieldCheck size={14} /> Clubs <small>{counts.clubs}</small></button>
      <button type="button" className="is-queue" aria-pressed={filters.queue} onClick={() => onToggle('queue')}><UsersRound size={14} /> Queues <small>{counts.queues}</small></button>
    </div>
  )
}

function FullMapDialog({ places, activePlace, counts, filters, onToggle, onSelect, onClose }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
  return (
    <div className="full-map-dialog__overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="full-map-dialog" role="dialog" aria-modal="true" aria-labelledby="full-map-title">
        <header><div><span>EXPLORE NEARBY</span><h2 id="full-map-title">Courts, clubs & queues</h2></div><button type="button" onClick={onClose} aria-label="Close full map" autoFocus><X /></button></header>
        <div className="full-map-dialog__canvas-wrap">
          <GoogleMapCanvas places={places} onSelect={onSelect} expanded />
          <MapFilters filters={filters} counts={counts} onToggle={onToggle} />
          {activePlace && <div className="full-map-dialog__selection"><MapPlaceCard place={activePlace} /></div>}
        </div>
      </section>
    </div>
  )
}

export default function DiscoveryMap({ variant = 'dashboard' }) {
  const discovery = useDiscoveryPlaces()
  const [activePlace, setActivePlace] = useState(null)
  const [fullMapOpen, setFullMapOpen] = useState(false)
  const [filters, setFilters] = useState({ court: true, club: true, queue: true })
  const visiblePlaces = useMemo(
    () => discovery.places.filter((place) => filters[place.kind]),
    [discovery.places, filters],
  )
  const resolvedActivePlace = visiblePlaces.find((place) =>
    place.id === activePlace?.id && place.kind === activePlace?.kind) || visiblePlaces[0] || null
  const toggle = (kind) => setFilters((current) => ({ ...current, [kind]: !current[kind] }))
  const totalGames = discovery.counts.queues

  return (
    <section className={`discovery-section discovery-section--${variant}`}>
      <header className="discovery-section__header">
        <div><span className="icon-chip"><Navigation size={19} /></span><div><small>NEARBY</small><h2>Quezon City, Metro Manila</h2></div></div>
        <div>
          {discovery.status === 'loading'
            ? <span className="skeleton discovery-section__count-skeleton" />
            : <span className="info-pill"><MapPin size={14} /> {discovery.counts.courts} courts · {totalGames} open games</span>}
          <button type="button" className="button discovery-section__expand" onClick={() => setFullMapOpen(true)}><Maximize2 size={15} /> Open full map</button>
        </div>
      </header>
      <div className="discovery-map">
        <GoogleMapCanvas places={visiblePlaces} onSelect={setActivePlace} />
        <MapFilters filters={filters} counts={discovery.counts} onToggle={toggle} />
        {discovery.status !== 'ready' && (
          <div className="discovery-map__state" role="status">{discovery.status === 'error' ? 'Nearby places are unavailable right now.' : 'Finding nearby places…'}</div>
        )}
        {discovery.status === 'ready' && visiblePlaces.length === 0 && (
          <div className="empty-state discovery-map__empty"><span><MapPin size={30} /></span><h3>Nothing nearby yet</h3><p>Try widening your search area.</p></div>
        )}
        {resolvedActivePlace && <MapPlaceCard place={resolvedActivePlace} compact />}
        {discovery.partial && <small className="discovery-map__partial">Some nearby results could not be loaded.</small>}
      </div>
      {fullMapOpen && <FullMapDialog places={visiblePlaces} activePlace={resolvedActivePlace} counts={discovery.counts} filters={filters} onToggle={toggle} onSelect={setActivePlace} onClose={() => setFullMapOpen(false)} />}
    </section>
  )
}
