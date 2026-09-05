import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Crosshair,
  Lock,
  MapPin,
  Maximize2,
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
import { GOOGLE_MAPS_API_KEY, loadGoogleMaps } from '../data/googleMapsLoader'
import { SportGlyph } from './SportIcon'
import LocationPickerModal from './LocationPickerModal'
import LocationPermissionModal from './LocationPermissionModal'

const SPORT_SVGS = {
  badminton: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="19" r="2.5" fill="currentColor" /><path d="M7 6l4 10M17 6l-4 10M12 5v11M7 6h10M8.5 9.5h7M9.5 13h5" /></svg>`,
  basketball: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M19.07 4.93l-4.24 4.24m-5.66 5.66l-4.24 4.24" /><path d="M12 2v20M2 12h20" /></svg>`,
  tennis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M17.93 6.07a10 10 0 0 0-11.86 0M6.07 17.93a10 10 0 0 0 11.86 0" /></svg>`,
  pickleball: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0c0 3.3-2.7 6-6 6a6 6 0 0 1-6-6z" /><path d="M10 16v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" /><circle cx="10" cy="9" r="1" fill="currentColor" /><circle cx="14" cy="9" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>`,
  padel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6" /><path d="M10 15v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6" /><circle cx="10" cy="8" r="0.75" fill="currentColor" /><circle cx="14" cy="8" r="0.75" fill="currentColor" /><circle cx="12" cy="10" r="0.75" fill="currentColor" /><circle cx="10" cy="11" r="0.75" fill="currentColor" /><circle cx="14" cy="11" r="0.75" fill="currentColor" /></svg>`,
}

const STOREFRONT_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></svg>`

const GROUPS_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>`

const GENERIC_SPORT_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>`

function getSportSvg(sport) {
  const key = String(sport || '').toLowerCase()
  return SPORT_SVGS[key] || GENERIC_SPORT_SVG
}

function renderMarkerContent(group) {
  const container = document.createElement('div')
  container.className = 'discovery-marker-wrap'

  if (group.length > 1) {
    const cluster = document.createElement('div')
    cluster.className = 'discovery-marker discovery-marker--cluster'
    cluster.textContent = group.length > 9 ? '9+' : String(group.length)
    container.appendChild(cluster)
    return container
  }

  const place = group[0]
  const pin = document.createElement('div')
  pin.className = `discovery-marker discovery-marker--${place.kind}`

  if (place.kind === 'club') {
    const sport = (place.sport || (place.sports?.[0] ? place.sports[0].toLowerCase() : 'badminton')).toLowerCase()
    pin.classList.add(`discovery-marker--sport-${sport}`)

    if (place.logoUrl) {
      pin.classList.add('discovery-marker--has-logo')
      const img = document.createElement('img')
      img.className = 'discovery-marker__logo'
      img.src = place.logoUrl
      img.alt = place.label || 'Club'
      img.loading = 'eager'
      img.onerror = () => {
        img.remove()
        pin.classList.remove('discovery-marker--has-logo')
        pin.innerHTML = getSportSvg(sport)
        const fallbackTail = document.createElement('span')
        fallbackTail.className = 'discovery-marker__tail'
        pin.appendChild(fallbackTail)
      }
      pin.appendChild(img)
    } else {
      pin.innerHTML = getSportSvg(sport)
    }
  } else if (place.kind === 'court') {
    if (place.logoUrl) {
      pin.classList.add('discovery-marker--has-logo')
      const img = document.createElement('img')
      img.className = 'discovery-marker__logo'
      img.src = place.logoUrl
      img.alt = place.label || 'Court'
      img.loading = 'eager'
      img.onerror = () => {
        img.remove()
        pin.classList.remove('discovery-marker--has-logo')
        pin.innerHTML = STOREFRONT_SVG
        const fallbackTail = document.createElement('span')
        fallbackTail.className = 'discovery-marker__tail'
        pin.appendChild(fallbackTail)
      }
      pin.appendChild(img)
    } else {
      pin.innerHTML = STOREFRONT_SVG
    }
  } else if (place.kind === 'queue') {
    const sport = (place.sport || (place.sports?.[0] ? place.sports[0].toLowerCase() : '')).toLowerCase()
    if (sport && SPORT_SVGS[sport]) {
      pin.classList.add(`discovery-marker--sport-${sport}`)
      pin.innerHTML = getSportSvg(sport)
    } else {
      pin.innerHTML = GROUPS_SVG
    }
  }

  const tail = document.createElement('span')
  tail.className = 'discovery-marker__tail'
  pin.appendChild(tail)

  container.appendChild(pin)
  return container
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
  const {
    businesses,
    clubs,
    isLoading,
    hasLoadedOnce,
    error,
    location,
    setLocation,
    locationStatus,
    requestLocation,
    permissionModalOpen,
    permissionModalError,
    setPermissionModalOpen,
  } = useDiscovery()
  const { queues, isLoading: queuesLoading } = useQueues()
  return useMemo(() => ({
    ...toMapPlaces({ businesses, clubs, queues }),
    status: error ? 'error' : (isLoading || queuesLoading) && !hasLoadedOnce ? 'loading' : 'ready',
    location,
    setLocation,
    locationStatus,
    requestLocation,
    permissionModalOpen,
    permissionModalError,
    setPermissionModalOpen,
  }), [businesses, clubs, error, hasLoadedOnce, isLoading, location, locationStatus, permissionModalError, permissionModalOpen, queues, queuesLoading, requestLocation, setLocation, setPermissionModalOpen])
}

function GoogleMapCanvas({ places, onSelect, onMapClick, userLocation, expanded = false }) {
  const elementRef = useRef(null)
  const [mapStatus, setMapStatus] = useState(() =>
    GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key')
  const [clusterPlaces, setClusterPlaces] = useState(null)

  useEffect(() => {
    if (!elementRef.current) return undefined
    if (!GOOGLE_MAPS_API_KEY) return undefined
    let cancelled = false
    const listeners = []
    const markers = []

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(async (maps) => {
        if (cancelled || !elementRef.current) return
        const { AdvancedMarkerElement } = await maps.importLibrary('marker')
        if (cancelled || !elementRef.current) return

        const mapCenter = userLocation?.lat && userLocation?.lng
          ? { lat: userLocation.lat, lng: userLocation.lng }
          : DEFAULT_DISCOVERY_CENTER

        const map = new maps.Map(elementRef.current, {
          center: mapCenter,
          zoom: 12,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          clickableIcons: false,
          fullscreenControl: expanded,
          gestureHandling: expanded ? 'greedy' : 'none',
          disableDefaultUI: !expanded,
          mapTypeControl: false,
          streetViewControl: false,
        })

        if (expanded && onMapClick) {
          const mapClickListener = map.addListener('click', () => onMapClick())
          listeners.push(() => mapClickListener.remove())
        }

        // Add user location marker if available
        if (userLocation?.lat && userLocation?.lng) {
          const userDot = document.createElement('div')
          userDot.className = 'map-user-marker'
          userDot.title = userLocation.label || 'Your Location'
          const userMarker = new AdvancedMarkerElement({
            map,
            position: { lat: userLocation.lat, lng: userLocation.lng },
            title: userLocation.label || 'Your Location',
            content: userDot,
            zIndex: 10,
          })
          markers.push(userMarker)
        }

        const bounds = new maps.LatLngBounds()
        if (userLocation?.lat && userLocation?.lng) {
          bounds.extend({ lat: userLocation.lat, lng: userLocation.lng })
        }
        places.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }))
        groupPlaces(places).forEach((group) => {
          const place = group[0]
          const content = renderMarkerContent(group)
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: place.lat, lng: place.lng },
            title: group.length > 1 ? `${group.length} places here` : `${place.label} — ${place.meta}`,
            content,
            gmpClickable: expanded,
          })
          if (expanded) {
            const handleClick = (e) => {
              e?.stopPropagation?.()
              if (group.length > 1) {
                setClusterPlaces(group)
              } else if (onSelect) {
                onSelect(place)
              }
            }
            marker.addEventListener('gmp-click', handleClick)
            listeners.push(() => marker.removeEventListener('gmp-click', handleClick))
          }
          markers.push(marker)
        })

        if (places.length > 0) {
          map.fitBounds(bounds, expanded ? 84 : 32)
          const idleListener = maps.event.addListenerOnce(map, 'idle', () => {
            if (map.getZoom() > 13) map.setZoom(13)
          })
          listeners.push(() => idleListener.remove())
        } else if (userLocation?.lat && userLocation?.lng) {
          map.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
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
  }, [expanded, onMapClick, onSelect, places, userLocation?.lat, userLocation?.lng, userLocation?.label])

  return (
    <>
      <div className="discovery-map__canvas" ref={elementRef} aria-label="Nearby courts, clubs, and queues" />
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
          {clusterPlaces.map((place) => {
            const sport = place.sport || (place.sports?.[0] ? place.sports[0].toLowerCase() : '')
            return (
              <button type="button" key={`${place.kind}:${place.id}`} onClick={() => { onSelect?.(place); setClusterPlaces(null) }}>
                <span className={`is-${place.kind}${sport ? ` is-sport-${sport}` : ''}`}>
                  {place.logoUrl ? (
                    <img src={place.logoUrl} alt="" className="cluster-sheet__item-img" />
                  ) : place.kind === 'court' ? (
                    <Building2 size={15} />
                  ) : place.kind === 'queue' ? (
                    sport && SPORT_SVGS[sport] ? <SportGlyph sport={sport} size={15} /> : <UsersRound size={15} />
                  ) : (
                    <SportGlyph sport={sport || 'badminton'} size={15} />
                  )}
                </span>
                <span><b>{place.label}</b><small>{place.kind === 'court' ? 'Business' : place.kind === 'club' ? 'Club' : 'Queue'}</small></span>
                <ChevronRight size={16} />
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function PlaceImage({ place }) {
  const source = place.logoUrl || place.coverUrl
  if (source) return <img src={source} alt="" />
  if (place.kind === 'club') {
    const sport = place.sport || (place.sports?.[0] ? place.sports[0].toLowerCase() : 'badminton')
    return (
      <span className={`map-place-card__fallback map-place-card__fallback--club map-place-card__fallback--sport-${sport}`}>
        <SportGlyph sport={sport} size={22} />
      </span>
    )
  }
  return <span className={`map-place-card__fallback map-place-card__fallback--${place.kind}`}>{place.kind === 'court' ? <Building2 /> : <UsersRound />}</span>
}

function MapPlaceCard({ place, compact = false, onClose }) {
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
        {onClose && (
          <button type="button" className="map-place-card__close" onClick={onClose} aria-label="Close place card">
            <X size={16} />
          </button>
        )}
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

function FullMapDialog({ places, activePlace, counts, filters, userLocation, locationStatus, onChangeLocation, onUseCurrentLocation, onToggle, onSelect, onClose }) {
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

  const isLocating = locationStatus === 'requesting'

  return (
    <div className="full-map-dialog__overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="full-map-dialog" role="dialog" aria-modal="true" aria-labelledby="full-map-title">
        <header>
          <div className="full-map-dialog__header-info">
            <span className="full-map-dialog__eyebrow">EXPLORE NEARBY</span>
            <div className="full-map-dialog__title-row">
              <h2 id="full-map-title">{userLocation?.label || 'Courts, clubs & queues'}</h2>
              {onChangeLocation && (
                <button
                  type="button"
                  className="full-map-dialog__change-pill"
                  onClick={onChangeLocation}
                  aria-label="Change location"
                >
                  <MapPin size={13} />
                  <span>Change</span>
                </button>
              )}
              {onUseCurrentLocation && (
                <button
                  type="button"
                  className={`full-map-dialog__locate-pill ${isLocating ? 'is-loading' : ''}`}
                  onClick={onUseCurrentLocation}
                  disabled={isLocating}
                  aria-label="Use current location"
                >
                  <Crosshair size={13} className={isLocating ? 'animate-spin' : ''} />
                  <span>{isLocating ? 'Locating…' : 'Use current location'}</span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            className="full-map-dialog__close"
            onClick={onClose}
            aria-label="Close full map"
            autoFocus
          >
            <X size={18} />
          </button>
        </header>
        <div className="full-map-dialog__canvas-wrap">
          <GoogleMapCanvas places={places} onSelect={onSelect} onMapClick={() => onSelect(null)} userLocation={userLocation} expanded />
          <MapFilters filters={filters} counts={counts} onToggle={onToggle} />
          {onUseCurrentLocation && (
            <button
              type="button"
              className={`map-floating-gps-btn ${isLocating ? 'is-loading' : ''}`}
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              title="Use current location"
              aria-label="Use current location"
            >
              <Crosshair size={18} className={isLocating ? 'animate-spin' : ''} />
            </button>
          )}
          {activePlace && (
            <div className="full-map-dialog__selection">
              <MapPlaceCard place={activePlace} onClose={() => onSelect(null)} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function DiscoveryMap({ variant = 'dashboard' }) {
  const discovery = useDiscoveryPlaces()
  const [activePlace, setActivePlace] = useState(null)
  const [fullMapOpen, setFullMapOpen] = useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [filters, setFilters] = useState({ court: true, club: true, queue: true })

  const locationLabel = discovery.location?.label || 'Quezon City, Metro Manila'

  const visiblePlaces = useMemo(
    () => discovery.places.filter((place) => filters[place.kind]),
    [discovery.places, filters],
  )

  const selectedPlace = useMemo(() => {
    if (!activePlace) return null
    return visiblePlaces.find((p) => p.id === activePlace.id && p.kind === activePlace.kind) || null
  }, [activePlace, visiblePlaces])

  const toggle = (kind) => setFilters((current) => ({ ...current, [kind]: !current[kind] }))

  if (variant === 'sidebar') {
    return (
      <div className="discovery-map discovery-map--sidebar">
        <GoogleMapCanvas places={visiblePlaces} onSelect={setActivePlace} onMapClick={() => setActivePlace(null)} userLocation={discovery.location} expanded />
        <MapFilters filters={filters} counts={discovery.counts} onToggle={toggle} />
        {discovery.status !== 'ready' && (
          <div className="discovery-map__state" role="status">
            {discovery.status === 'error' ? 'Nearby places are unavailable right now.' : 'Finding nearby places…'}
          </div>
        )}
        {discovery.status === 'ready' && visiblePlaces.length === 0 && (
          <div className="empty-state discovery-map__empty">
            <span><MapPin size={30} /></span>
            <h3>Nothing nearby yet</h3>
            <p>Try widening your search area.</p>
          </div>
        )}
        {selectedPlace && <MapPlaceCard place={selectedPlace} compact onClose={() => setActivePlace(null)} />}
      </div>
    )
  }

  return (
    <>
      <div
        className="location-preview-card"
        onClick={() => setFullMapOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFullMapOpen(true) }}
        aria-label="Open nearby map"
      >
        <div className="location-preview-card__map">
          <GoogleMapCanvas places={visiblePlaces} userLocation={discovery.location} expanded={false} />
        </div>

        <div className="location-preview-card__top-controls">
          <div
            className="location-preview-card__top-pill"
            onClick={(e) => {
              e.stopPropagation()
              setLocationPickerOpen(true)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                setLocationPickerOpen(true)
              }
            }}
            title="Click to change location or search areas"
          >
            <MapPin size={14} />
            <span>{locationLabel}</span>
            <ChevronDown size={14} style={{ opacity: 0.75 }} />
          </div>

          <button
            type="button"
            className="location-preview-card__action-pill location-preview-card__change-pill"
            onClick={(e) => {
              e.stopPropagation()
              setLocationPickerOpen(true)
            }}
            title="Change location"
          >
            <span>Change</span>
          </button>

          <button
            type="button"
            className={`location-preview-card__action-pill location-preview-card__locate-pill ${discovery.locationStatus === 'requesting' ? 'is-loading' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              discovery.requestLocation()
            }}
            disabled={discovery.locationStatus === 'requesting'}
            title="Use current device location"
          >
            <Crosshair size={13} className={discovery.locationStatus === 'requesting' ? 'animate-spin' : ''} />
            <span>{discovery.locationStatus === 'requesting' ? 'Locating…' : 'Use current location'}</span>
          </button>
        </div>

        <button
          type="button"
          className="location-preview-card__bottom-pill"
          onClick={(e) => {
            e.stopPropagation()
            setFullMapOpen(true)
          }}
        >
          <span>Open map</span>
          <Maximize2 size={13} />
        </button>

        {discovery.status !== 'ready' && (
          <div className="discovery-map__state" role="status">
            {discovery.status === 'error'
              ? 'Nearby places are unavailable right now.'
              : 'Finding nearby places…'}
          </div>
        )}
      </div>

      {fullMapOpen && (
        <FullMapDialog
          places={visiblePlaces}
          activePlace={selectedPlace}
          counts={discovery.counts}
          filters={filters}
          userLocation={discovery.location}
          locationStatus={discovery.locationStatus}
          onChangeLocation={() => setLocationPickerOpen(true)}
          onUseCurrentLocation={discovery.requestLocation}
          onToggle={toggle}
          onSelect={setActivePlace}
          onClose={() => {
            setFullMapOpen(false)
            setActivePlace(null)
          }}
        />
      )}

      {locationPickerOpen && (
        <LocationPickerModal
          open={locationPickerOpen}
          initialLocation={discovery.location}
          onClose={() => setLocationPickerOpen(false)}
          onConfirm={(loc) => {
            discovery.setLocation({
              lat: loc.lat,
              lng: loc.lng,
              label: loc.area || loc.formattedAddress || 'Selected Location',
            })
            setLocationPickerOpen(false)
          }}
        />
      )}

      {discovery.permissionModalOpen && (
        <LocationPermissionModal
          open={discovery.permissionModalOpen}
          errorType={discovery.permissionModalError}
          onRetry={() => discovery.requestLocation()}
          onPickManually={() => {
            discovery.setPermissionModalOpen(false)
            setLocationPickerOpen(true)
          }}
          onClose={() => discovery.setPermissionModalOpen(false)}
        />
      )}
    </>
  )
}
