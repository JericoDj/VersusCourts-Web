import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Check, ChevronRight, Loader2, MapPin, Plus, Search, X } from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { getPlacePredictions, geocodePlaceId } from '../data/googleMapsLoader'
import '../styles/modals.css'

export default function CourtPickerModal({ open, value, onSelect, onClose }) {
  const [tab, setTab] = useState('search') // 'search' | 'custom'
  const [searchQuery, setSearchQuery] = useState('')
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Custom venue / Google Places state
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [resolvingPlace, setResolvingPlace] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customArea, setCustomArea] = useState('')
  const [customLat, setCustomLat] = useState(null)
  const [customLng, setCustomLng] = useState(null)
  const [pickedFromMaps, setPickedFromMaps] = useState(false)
  const placeDebounceRef = useRef(null)

  // Load initial courts or search courts
  useEffect(() => {
    if (!open) return
    let active = true

    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const queryParams = new URLSearchParams()
        if (searchQuery.trim()) {
          queryParams.set('q', searchQuery.trim())
        }
        queryParams.set('limit', '20')
        const res = await apiRequest(`/courts?${queryParams.toString()}`)
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setCourts(
          list.map((c) => ({
            id: c.id,
            name: c.name || '',
            area: c.branch?.area || c.address || '',
            organizationName: c.branch?.organization?.name || c.organization?.name || '',
            sports: c.sports || [],
            isCustom: false,
          }))
        )
      } catch {
        if (active) setError('Could not load courts.')
      } finally {
        if (active) setLoading(false)
      }
    }, searchQuery ? 300 : 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [open, searchQuery])

  // Google Places autocomplete debounce
  const handlePlaceQueryChange = (val) => {
    setPlaceQuery(val)
    setPickedFromMaps(false)
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current)
    if (!val.trim()) {
      setPlaceSuggestions([])
      return
    }

    placeDebounceRef.current = setTimeout(async () => {
      setSearchingPlaces(true)
      try {
        const predictions = await getPlacePredictions(val)
        setPlaceSuggestions(predictions || [])
      } catch {
        setPlaceSuggestions([])
      } finally {
        setSearchingPlaces(false)
      }
    }, 350)
  }

  const handleSelectPrediction = async (prediction) => {
    setSearchingPlaces(false)
    setResolvingPlace(true)
    setPlaceSuggestions([])
    setPlaceQuery(prediction.mainText)

    try {
      const geo = await geocodePlaceId(prediction.placeId)
      if (geo) {
        setCustomName(prediction.mainText)
        setCustomArea(geo.area || prediction.secondaryText || '')
        setCustomLat(geo.lat)
        setCustomLng(geo.lng)
        setPickedFromMaps(true)
      } else {
        setCustomName(prediction.mainText)
        setCustomArea(prediction.secondaryText || '')
      }
    } catch {
      setCustomName(prediction.mainText)
      setCustomArea(prediction.secondaryText || '')
    } finally {
      setResolvingPlace(false)
    }
  }

  const handleSelectCourt = (court) => {
    onSelect(court)
    onClose()
  }

  const handleConfirmCustom = (e) => {
    e.preventDefault()
    if (!customName.trim()) return
    onSelect({
      id: '',
      name: customName.trim(),
      area: customArea.trim() || 'Metro Manila',
      organizationName: '',
      sports: [],
      isCustom: true,
      lat: customLat,
      lng: customLng,
    })
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div className="sport-picker-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="sport-picker-sheet court-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500, height: '80vh', maxHeight: 680, display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {/* Modal Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--vc-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tab === 'custom' && (
              <button
                type="button"
                className="court-picker-back-btn"
                onClick={() => setTab('search')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--vc-primary)' }}
              >
                ← Back
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              {tab === 'search' ? 'Choose Court' : 'Add Unlisted Court'}
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

        {tab === 'search' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Search input */}
            <div style={{ padding: '12px 16px 8px' }}>
              <div className="court-search-input-wrap">
                <Search size={18} className="court-search-icon" />
                <input
                  type="text"
                  className="court-search-input"
                  placeholder="Search courts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* "Can't find your court? Add it" button */}
            <div style={{ padding: '4px 16px 8px' }}>
              <button
                type="button"
                className="court-add-unlisted-btn"
                onClick={() => setTab('custom')}
              >
                <div className="court-add-unlisted-icon">
                  <Plus size={16} />
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--vc-primary, #2563eb)' }}>
                    Can't find your court? Add it
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
                    Use Google Maps or enter a custom venue
                  </div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--vc-border, #e2e8f0)' }} />

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span style={{ fontSize: 13 }}>Searching courts...</span>
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--vc-danger, #ef4444)', fontSize: 13.5 }}>
                  {error}
                </div>
              ) : courts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 14 }}>No courts found</p>
                  <p style={{ margin: 0, fontSize: 12.5 }}>
                    Tap "Can't find your court? Add it" above to find any location on Google Maps.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {courts.map((c) => {
                    const isSelected = value?.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`court-item-row ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleSelectCourt(c)}
                      >
                        <div className="court-item-icon">
                          <Building2 size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--vc-text-primary, #0f172a)' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--vc-text-secondary, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.organizationName ? `${c.organizationName}${c.area ? ` · ${c.area}` : ''}` : c.area}
                          </div>
                        </div>
                        {isSelected && <Check size={18} color="var(--vc-primary, #2563eb)" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Custom court / Google Maps search tab */
          <form onSubmit={handleConfirmCustom} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '16px 20px 20px', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--vc-text-secondary, #64748b)', marginBottom: 6 }}>
                SEARCH GOOGLE MAPS FOR VENUE
              </label>
              <div className="court-search-input-wrap">
                <MapPin size={18} className="court-search-icon" style={{ color: 'var(--vc-primary)' }} />
                <input
                  type="text"
                  className="court-search-input"
                  placeholder="e.g. Kerry Sports BGC, Club Gymnastica..."
                  value={placeQuery}
                  onChange={(e) => handlePlaceQueryChange(e.target.value)}
                  autoFocus
                />
                {searchingPlaces && <Loader2 size={16} className="animate-spin" style={{ color: '#94a3b8' }} />}
              </div>

              {/* Suggestions dropdown */}
              {placeSuggestions.length > 0 && (
                <div className="court-places-dropdown">
                  {placeSuggestions.map((p) => (
                    <button
                      key={p.placeId}
                      type="button"
                      className="court-places-item"
                      onClick={() => handleSelectPrediction(p)}
                    >
                      <MapPin size={16} color="var(--vc-primary)" style={{ flexShrink: 0 }} />
                      <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.mainText}</div>
                        {p.secondaryText && (
                          <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.secondaryText}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {resolvingPlace && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--vc-primary)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Fetching exact place details and coordinates...</span>
                </div>
              )}

              {pickedFromMaps && !resolvingPlace && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  <Check size={14} />
                  <span>Found location from Google Maps!</span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--vc-border, #e2e8f0)', margin: '4px 0' }} />

            <div>
              <label htmlFor="custom-court-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--vc-text-secondary, #64748b)', marginBottom: 6 }}>
                COURT OR VENUE NAME *
              </label>
              <input
                id="custom-court-name"
                required
                type="text"
                className="scoreboard-settings-input"
                placeholder="e.g. Kerry Sports Manila"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="custom-court-area" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--vc-text-secondary, #64748b)', marginBottom: 6 }}>
                CITY OR AREA *
              </label>
              <input
                id="custom-court-area"
                required
                type="text"
                className="scoreboard-settings-input"
                placeholder="e.g. Bonifacio Global City, Taguig"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button
                type="submit"
                disabled={!customName.trim()}
                className="scoreboard-main-point-btn"
                style={{ width: '100%', opacity: customName.trim() ? 1 : 0.5 }}
              >
                Use This Court
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
