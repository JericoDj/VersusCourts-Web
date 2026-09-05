import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import {
  geocodePlaceId,
  getPlacePredictions,
  loadGoogleMaps,
  reverseGeocodeLatLng,
} from '../data/googleMapsLoader'

// Default fallback to Manila / Quezon City matching Flutter
const DEFAULT_CENTER = { lat: 14.676, lng: 121.0437 }

export default function LocationPickerModal({
  open,
  initialLocation,
  title = 'Choose Location',
  onClose,
  onConfirm,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerInstanceRef = useRef(null)
  const sessionTokenRef = useRef(null)

  const initialPosRef = useRef({
    lat: initialLocation?.lat || DEFAULT_CENTER.lat,
    lng: initialLocation?.lng || DEFAULT_CENTER.lng,
  })

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [resolving, setResolving] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState('')

  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      lat: DEFAULT_CENTER.lat,
      lng: DEFAULT_CENTER.lng,
      area: 'Quezon City, Metro Manila',
      formattedAddress: 'Quezon City, Metro Manila, Philippines',
    }
  )

  // Initialize Maps and Places session token
  useEffect(() => {
    if (!open) return

    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled) return
        setMapLoaded(true)
        if (maps.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new maps.places.AutocompleteSessionToken()
        }
      })
      .catch((err) => {
        if (!cancelled) setMapError(err?.message || 'Failed to load Google Maps.')
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Mount Google Map canvas once loaded
  useEffect(() => {
    if (!open || !mapLoaded || !mapContainerRef.current) return

    const maps = window.google.maps
    const initialPos = initialPosRef.current

    const map = new maps.Map(mapContainerRef.current, {
      center: initialPos,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstanceRef.current = map

    const marker = new maps.Marker({
      position: initialPos,
      map,
      draggable: true,
      animation: maps.Animation.DROP,
    })
    markerInstanceRef.current = marker

    // Marker drag event
    marker.addListener('dragend', async () => {
      const pos = marker.getPosition()
      if (!pos) return
      const lat = pos.lat()
      const lng = pos.lng()
      setResolving(true)
      try {
        const resolved = await reverseGeocodeLatLng(lat, lng)
        if (resolved) {
          setSelectedLocation(resolved)
        } else {
          setSelectedLocation((prev) => ({ ...prev, lat, lng }))
        }
      } finally {
        setResolving(false)
      }
    })

    // Map click event
    map.addListener('click', async (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      marker.setPosition({ lat, lng })
      setResolving(true)
      try {
        const resolved = await reverseGeocodeLatLng(lat, lng)
        if (resolved) {
          setSelectedLocation(resolved)
        } else {
          setSelectedLocation((prev) => ({ ...prev, lat, lng }))
        }
      } finally {
        setResolving(false)
      }
    })

    return () => {
      mapInstanceRef.current = null
      markerInstanceRef.current = null
    }
  }, [open, mapLoaded])

  // Autocomplete debounce
  useEffect(() => {
    if (!query.trim() || !mapLoaded) return

    const timeout = setTimeout(async () => {
      try {
        const results = await getPlacePredictions(query, sessionTokenRef.current)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, mapLoaded])

  // Suggestion pick
  const handlePickSuggestion = async (sugg) => {
    setQuery(sugg.mainText)
    setSuggestions([])
    setResolving(true)

    try {
      const place = await geocodePlaceId(sugg.placeId)
      if (place) {
        setSelectedLocation(place)
        if (mapInstanceRef.current && markerInstanceRef.current) {
          const target = { lat: place.lat, lng: place.lng }
          mapInstanceRef.current.panTo(target)
          mapInstanceRef.current.setZoom(16)
          markerInstanceRef.current.setPosition(target)
        }
      }
      // Renew session token after choice
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
      }
    } finally {
      setResolving(false)
    }
  }

  // Current GPS location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return
    setResolving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (mapInstanceRef.current && markerInstanceRef.current) {
          const target = { lat, lng }
          mapInstanceRef.current.panTo(target)
          mapInstanceRef.current.setZoom(16)
          markerInstanceRef.current.setPosition(target)
        }
        try {
          const resolved = await reverseGeocodeLatLng(lat, lng)
          if (resolved) {
            setSelectedLocation(resolved)
          } else {
            setSelectedLocation((prev) => ({ ...prev, lat, lng }))
          }
        } finally {
          setResolving(false)
        }
      },
      () => setResolving(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedLocation)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="sport-picker-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sport-picker-sheet location-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--vc-border, #e2e8f0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={20} color="var(--vc-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="sport-picker-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Suggestions Bar */}
        <div style={{ position: 'relative', padding: '12px 16px', background: '#ffffff', zIndex: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, color: 'var(--vc-text-tertiary, #94a3b8)' }}
            />
            <input
              type="text"
              className="queue-modal-input"
              style={{ paddingLeft: 36, paddingRight: query ? 36 : 14 }}
              placeholder="Search place, city, or venue..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSuggestions([])
                }}
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--vc-text-tertiary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Use Current Location Button */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={resolving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 13px',
                background: 'var(--vc-surface, #ffffff)',
                color: 'var(--vc-text-primary, #0f172a)',
                border: '1px solid var(--vc-border, #e2e8f0)',
                borderRadius: 'var(--vc-radius-pill)',
                fontSize: 12,
                fontWeight: 700,
                cursor: resolving ? 'wait' : 'pointer',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              <Crosshair size={14} color="var(--vc-primary, #0c4dd1)" className={resolving ? 'animate-spin' : ''} />
              <span>{resolving ? 'Locating device…' : 'Use Current Location'}</span>
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="location-picker-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  className="location-picker-suggestion-item"
                  onClick={() => handlePickSuggestion(s)}
                >
                  <MapPin size={15} color="var(--vc-primary)" style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--vc-text-primary)' }}>
                      {s.mainText}
                    </div>
                    {s.secondaryText && (
                      <div style={{ fontSize: 11.5, color: 'var(--vc-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.secondaryText}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Canvas */}
        <div style={{ position: 'relative', flex: 1, minHeight: 320, background: '#f1f5f9' }}>
          {mapError ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--vc-danger)' }}>
              <p style={{ fontWeight: 600 }}>{mapError}</p>
            </div>
          ) : !mapLoaded ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vc-text-secondary)' }}>
                <Loader2 size={20} className="animate-spin" />
                <span>Loading Google Maps…</span>
              </div>
            </div>
          ) : null}

          <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', minHeight: 320 }}
          />

          {/* Floating GPS Button */}
          {mapLoaded && (
            <button
              type="button"
              className="location-picker-gps-btn"
              onClick={handleCurrentLocation}
              title="Locate me"
              aria-label="Use current location"
            >
              <Crosshair size={18} />
            </button>
          )}

          {resolving && (
            <div className="location-picker-resolving-overlay">
              <Loader2 size={16} className="animate-spin" />
              <span>Getting address…</span>
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderTop: '1px solid var(--vc-border, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <MapPin size={18} color="var(--vc-primary, #2563eb)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--vc-text-primary)' }}>
                {selectedLocation.area || 'Selected Location'}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--vc-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedLocation.formattedAddress || `${selectedLocation.lat?.toFixed(4)}, ${selectedLocation.lng?.toFixed(4)}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="queue-modal-btn"
            onClick={handleConfirm}
            style={{ margin: 0 }}
          >
            <Check size={16} />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
