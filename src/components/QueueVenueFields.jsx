import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Loader2, Check, Building2 } from 'lucide-react'
import { getPlacePredictions, geocodePlaceId, loadGoogleMaps } from '../data/googleMapsLoader'
import CourtPickerModal from './CourtPickerModal'

export default function QueueVenueFields({ game }) {
  const [venue, setVenue] = useState(game.customCourtName || game.venue || '')
  const [area, setArea] = useState(game.customArea || game.area || '')
  const [courtId, setCourtId] = useState(game.courtId || '')
  const [coordinates, setCoordinates] = useState({
    lat: game.customLat ?? null,
    lng: game.customLng ?? null,
  })
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [pickedFromMaps, setPickedFromMaps] = useState(Boolean(game.customLat || game.courtId))
  const [courtPickerOpen, setCourtPickerOpen] = useState(false)

  const sessionTokenRef = useRef(null)
  const request = useRef(0)

  // Initialize session token on mount
  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        if (maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new maps.places.AutocompleteSessionToken()
        }
      })
      .catch(() => {})
  }, [])

  // Debounced Google Places Autocomplete
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await getPlacePredictions(q, sessionTokenRef.current)
        if (!cancelled) {
          setResults(rows || [])
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Place predictions error:', err)
          setResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search])

  const choose = async (place) => {
    const version = ++request.current
    setVenue(place.mainText)
    setResults([])
    setSearch('')
    setCourtId('')
    setResolving(true)
    setError('')

    try {
      const location = await geocodePlaceId(place.placeId)
      if (version !== request.current) return
      if (!location) {
        setArea(place.secondaryText || '')
        setPickedFromMaps(true)
        return
      }

      setArea(location.area || location.formattedAddress || place.secondaryText || '')
      setCoordinates({ lat: location.lat, lng: location.lng })
      setPickedFromMaps(true)

      // Renew session token after selection
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
      }
    } catch {
      if (version === request.current) {
        setArea(place.secondaryText || '')
        setPickedFromMaps(true)
      }
    } finally {
      if (version === request.current) setResolving(false)
    }
  }

  const handleSelectFromPicker = (selectedCourt) => {
    if (!selectedCourt) return
    if (selectedCourt.isCustom || !selectedCourt.id) {
      setCourtId('')
      setVenue(selectedCourt.name || '')
      setArea(selectedCourt.area || 'Metro Manila')
      setCoordinates({
        lat: selectedCourt.lat ?? null,
        lng: selectedCourt.lng ?? null,
      })
    } else {
      setCourtId(selectedCourt.id)
      setVenue(selectedCourt.name || '')
      setArea(selectedCourt.area || selectedCourt.organizationName || '')
    }
    setPickedFromMaps(true)
    setResults([])
    setSearch('')
  }

  return (
    <>
      <div className="manage-form-card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label className="manage-form-card__label" htmlFor="queue-edit-venue" style={{ margin: 0 }}>
            <MapPin size={13} /> Venue / Location
          </label>
          <button
            type="button"
            onClick={() => setCourtPickerOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vc-primary, #2563eb)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <Building2 size={12} /> Choose court
          </button>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="queue-edit-venue"
            className="manage-form-card__input"
            name="venue"
            value={venue}
            autoComplete="off"
            placeholder="Type place name or address..."
            required
            onChange={(event) => {
              request.current++
              const val = event.target.value
              setVenue(val)
              setSearch(val)
              setCourtId('')
              setPickedFromMaps(false)
              setError('')
            }}
          />
          {loading && (
            <Loader2
              size={15}
              className="animate-spin"
              style={{ position: 'absolute', right: 8, color: '#94a3b8', pointerEvents: 'none' }}
            />
          )}
        </div>

        {/* Real-time Google Places predictions dropdown */}
        {results.length > 0 && (
          <div
            className="court-places-dropdown"
            role="listbox"
            aria-label="Suggested locations"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              marginTop: 4,
            }}
          >
            {results.map((place) => (
              <button
                type="button"
                key={place.placeId}
                className="court-places-item"
                onClick={() => choose(place)}
              >
                <MapPin size={16} color="var(--vc-primary, #2563eb)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{place.mainText}</div>
                  {place.secondaryText && (
                    <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.secondaryText}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {resolving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '11.5px', color: 'var(--vc-primary, #2563eb)' }}>
            <Loader2 size={12} className="animate-spin" />
            <span>Resolving place details from Google Maps...</span>
          </div>
        )}

        {pickedFromMaps && !resolving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>
            <Check size={13} />
            <span>Location verified with Google Maps</span>
          </div>
        )}

        {error && (
          <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>

      <div className="manage-form-card">
        <label className="manage-form-card__label" htmlFor="queue-edit-area">
          Area / Court
        </label>
        <input
          id="queue-edit-area"
          className="manage-form-card__input"
          name="area"
          value={area}
          placeholder="e.g. Angeles, Pampanga or Court 3"
          onChange={(event) => setArea(event.target.value)}
        />
      </div>

      {/* Hidden inputs to pass data to saveDetails FormData */}
      <input type="hidden" name="customCourtName" value={venue} />
      <input type="hidden" name="customArea" value={area} />
      <input type="hidden" name="customLat" value={coordinates?.lat ?? ''} />
      <input type="hidden" name="customLng" value={coordinates?.lng ?? ''} />
      <input type="hidden" name="courtId" value={courtId || ''} />

      {/* CourtPickerModal integration */}
      <CourtPickerModal
        open={courtPickerOpen}
        value={courtId ? { id: courtId, name: venue, area } : null}
        onSelect={handleSelectFromPicker}
        onClose={() => setCourtPickerOpen(false)}
      />
    </>
  )
}
