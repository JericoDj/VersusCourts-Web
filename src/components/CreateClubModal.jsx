import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Globe2, Loader2, Lock, MapPin, X } from 'lucide-react'
import { apiRequest } from '../data/apiClient'
import { uploadImage } from '../data/imageUploadService'
import { SPORTS, sportGradient } from '../data/sports'
import { SportGlyph } from './SportIcon'
import ImagePickerField from './ImagePickerField'
import LocationPickerModal from './LocationPickerModal'
import '../styles/modals.css'

export default function CreateClubModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [area, setArea] = useState('')
  const [pickedLocation, setPickedLocation] = useState(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedSports, setSelectedSports] = useState(['basketball'])
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerFile, setBannerFile] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdClub, setCreatedClub] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleClose = useCallback(() => {
    if (createdClub && onCreated) {
      onCreated(createdClub)
    }
    setName('')
    setAbout('')
    setArea('')
    setPickedLocation(null)
    setLocationModalOpen(false)
    setIsPrivate(false)
    setSelectedSports(['basketball'])
    setLogoUrl('')
    setLogoFile(null)
    setBannerUrl('')
    setBannerFile(null)
    setError('')
    setCreatedClub(null)
    setCopied(false)
    onClose()
  }, [createdClub, onClose, onCreated])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  if (!open) return null

  const toggleSport = (sportId) => {
    setSelectedSports((prev) => {
      if (prev.includes(sportId)) {
        if (prev.length === 1) return prev // keep at least one
        return prev.filter((s) => s !== sportId)
      }
      return [...prev, sportId]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a club name.')
      return
    }
    setError('')
    setLoading(true)

    try {
      let finalBannerUrl = bannerUrl?.startsWith('http') && !bannerUrl.startsWith('blob:') ? bannerUrl.trim() : undefined
      let finalLogoUrl = logoUrl?.startsWith('http') && !logoUrl.startsWith('blob:') ? logoUrl.trim() : undefined

      // Upload images only when clicking Create Club
      if (bannerFile) {
        try {
          finalBannerUrl = await uploadImage(bannerFile, { folder: 'clubs' })
        } catch (uploadErr) {
          console.warn('[CreateClubModal] Cover photo upload skipped (CORS/network):', uploadErr)
        }
      }

      if (logoFile) {
        try {
          finalLogoUrl = await uploadImage(logoFile, { folder: 'clubs' })
        } catch (uploadErr) {
          console.warn('[CreateClubModal] Club logo upload skipped (CORS/network):', uploadErr)
        }
      }

      const payload = {
        name: name.trim(),
        about: about.trim() || undefined,
        area: area.trim() || undefined,
        lat: pickedLocation?.lat != null ? Number(pickedLocation.lat) : undefined,
        lng: pickedLocation?.lng != null ? Number(pickedLocation.lng) : undefined,
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
        sports: selectedSports.map((s) => s.toUpperCase()),
        logoUrl: finalLogoUrl,
        bannerUrl: finalBannerUrl,
      }

      const res = await apiRequest('/clubs', {
        method: 'POST',
        body: payload,
      })

      const created = res?.data || res
      setCreatedClub(created)
      if (onCreated) onCreated(created)
    } catch (err) {
      setError(err?.message || 'Failed to create club. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    const code = createdClub?.inviteCode || createdClub?.code
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <>
      <div
        className="sport-picker-backdrop"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
      >
      <div
        className="sport-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="sport-picker-header">
          <h2 className="sport-picker-title">
            {createdClub ? 'Club Created!' : 'Create a Club'}
          </h2>
          <button
            type="button"
            className="sport-picker-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {createdClub ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(22, 163, 74, 0.12)',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Check size={32} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
                {createdClub.name}
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--vc-text-secondary)' }}>
                You are now the Captain! Share this invite code with players to join:
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                background: 'var(--vc-surface-alt, #f8fafc)',
                border: '2px dashed var(--vc-primary)',
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: 'var(--vc-primary)',
                  fontFamily: 'monospace',
                }}
              >
                {createdClub.inviteCode || createdClub.code || 'CODE'}
              </span>

              <button
                type="button"
                className="scoreboard-icon-btn"
                onClick={copyCode}
                title="Copy code"
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              className="queue-modal-btn"
              onClick={handleClose}
              style={{ width: '100%', marginTop: 8 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-text-secondary)', lineHeight: 1.4 }}>
              Clubs are community hubs — members can message, link queues, compete in events, and play together.
            </p>

            {/* Cover Photo Upload */}
            <ImagePickerField
              label="Cover photo (optional)"
              folder="clubs"
              value={bannerUrl}
              aspectRatio={16 / 9}
              deferUpload={true}
              onChange={(url, file) => {
                setBannerUrl(url)
                setBannerFile(file || null)
              }}
              helperText="16:9 banner shown on your club's header"
            />

            {/* Club Logo Upload */}
            <ImagePickerField
              label="Club logo (optional)"
              folder="clubs"
              value={logoUrl}
              isCircular={true}
              deferUpload={true}
              onChange={(url, file) => {
                setLogoUrl(url)
                setLogoFile(file || null)
              }}
              helperText="Circular icon displayed as your club avatar"
            />

            {/* Club Name */}
            <div>
              <label htmlFor="club-name" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                Club Name *
              </label>
              <input
                id="club-name"
                required
                className="queue-modal-input"
                placeholder="e.g. Manila Smashers"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* About */}
            <div>
              <label htmlFor="club-about" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                About (optional)
              </label>
              <textarea
                id="club-about"
                className="queue-modal-input"
                rows={3}
                placeholder="Casual badminton crew, all skill levels welcome for weekly open runs."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Location (Google Maps & Places) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700 }}>
                  Location (optional)
                </label>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--vc-primary, #2563eb)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MapPin size={13} />
                  <span>{pickedLocation ? 'Change pin on map' : 'Choose on map'}</span>
                </button>
              </div>

              <div
                className="queue-modal-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '10px 14px',
                  background: 'var(--vc-surface-alt, #f8fafc)',
                }}
                onClick={() => setLocationModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setLocationModalOpen(true)
                }}
              >
                <MapPin
                  size={18}
                  color={pickedLocation ? 'var(--vc-primary)' : 'var(--vc-text-tertiary)'}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {area ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--vc-text-primary)' }}>
                        {area}
                      </span>
                      {pickedLocation?.formattedAddress && pickedLocation.formattedAddress !== area && (
                        <span style={{ fontSize: 11, color: 'var(--vc-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pickedLocation.formattedAddress}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--vc-text-tertiary)' }}>
                      Tap to set location — helps players find your club on the map
                    </span>
                  )}
                </div>

                {area && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setArea('')
                      setPickedLocation(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--vc-text-tertiary)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Clear location"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Privacy selection (Public vs Private) */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                Privacy
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '12px 14px',
                    border: !isPrivate ? '2px solid var(--vc-primary)' : '1px solid var(--vc-border)',
                    borderRadius: 14,
                    background: !isPrivate ? 'rgba(37, 99, 235, 0.05)' : 'var(--vc-surface-alt)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe2 size={16} color={!isPrivate ? 'var(--vc-primary)' : 'var(--vc-text-secondary)'} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vc-text-primary)' }}>Public</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--vc-text-secondary)' }}>Anyone can find and join</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '12px 14px',
                    border: isPrivate ? '2px solid var(--vc-primary)' : '1px solid var(--vc-border)',
                    borderRadius: 14,
                    background: isPrivate ? 'rgba(37, 99, 235, 0.05)' : 'var(--vc-surface-alt)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={16} color={isPrivate ? 'var(--vc-primary)' : 'var(--vc-text-secondary)'} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--vc-text-primary)' }}>Private</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--vc-text-secondary)' }}>Members join by invite / request</span>
                </button>
              </div>
            </div>

            {/* Sports Multi-select */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                Sports (select all that apply)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SPORTS.map((s) => {
                  const isSelected = selectedSports.includes(s.id)
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSport(s.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: isSelected ? '1.5px solid var(--vc-primary)' : '1px solid var(--vc-border)',
                        background: isSelected ? 'var(--vc-primary)' : 'var(--vc-surface-alt)',
                        color: isSelected ? '#fff' : 'var(--vc-text-primary)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: isSelected ? 'rgba(255,255,255,0.25)' : sportGradient(s.id),
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                        }}
                      >
                        <SportGlyph sport={s.id} size={12} />
                      </div>
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--vc-danger, #ef4444)', fontWeight: 600 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="queue-modal-btn"
              style={{ marginTop: 4 }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Club'}
            </button>
          </form>
        )}
      </div>
    </div>

    <LocationPickerModal
      open={locationModalOpen}
      initialLocation={pickedLocation}
      onClose={() => setLocationModalOpen(false)}
      onConfirm={(loc) => {
        setPickedLocation(loc)
        setArea(loc.area || loc.formattedAddress || '')
      }}
    />
  </>,
  document.body
)
}
