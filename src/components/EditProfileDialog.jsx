import { useRef, useState } from 'react'
import { Camera, Loader2, MapPin, User } from 'lucide-react'
import ProfileDialog from './ProfileDialog'
import { apiRequest } from '../data/apiClient'
import { uploadImage } from '../data/imageUploadService'
import { useAuth } from '../context/AuthContext'
import LocationPickerModal from './LocationPickerModal'

export default function EditProfileDialog({ onClose, profileUser }) {
  const { user: authUser, refreshUser } = useAuth()
  const user = profileUser || authUser || {}

  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
    area: user.area || user.location || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || user.photoURL || '',
    coverUrl: user.coverUrl || '',
  })

  const [focusedField, setFocusedField] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [locationOpen, setLocationOpen] = useState(false)

  const coverInputRef = useRef(null)
  const avatarInputRef = useRef(null)

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleImageUpload = async (key, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WEBP).')
      return
    }

    if (key === 'coverUrl') setUploadingCover(true)
    if (key === 'avatarUrl') setUploadingAvatar(true)
    setError('')

    try {
      const url = await uploadImage(file, { folder: 'users' })
      update(key, url)
    } catch (err) {
      setError(err.message || 'Image upload failed. Please try again.')
    } finally {
      if (key === 'coverUrl') setUploadingCover(false)
      if (key === 'avatarUrl') setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (busy || uploadingAvatar || uploadingCover) return

    setBusy(true)
    setError('')

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim().replace(/^@/, ''),
        area: form.area.trim(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl,
        coverUrl: form.coverUrl,
      }

      await apiRequest('/users/me', {
        method: 'PATCH',
        body: payload,
      })

      await refreshUser?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ProfileDialog
        title="Edit Profile"
        onClose={onClose}
        busy={busy || uploadingAvatar || uploadingCover}
        actions={
          <button
            type="button"
            className="pf-header-save-btn"
            disabled={busy || uploadingAvatar || uploadingCover}
            onClick={handleSubmit}
          >
            {busy ? <Loader2 size={16} className="pf-spin" /> : 'Save'}
          </button>
        }
      >
        <form className="pf-edit-form" onSubmit={handleSubmit}>
          {/* Cover and Avatar Stack matching Flutter edit_profile_screen.dart */}
          <div className="pf-edit-media-stack">
            {/* Cover Banner */}
            <div
              className="pf-edit-cover"
              style={
                form.coverUrl
                  ? { backgroundImage: `url(${JSON.stringify(form.coverUrl)})` }
                  : undefined
              }
            >
              <button
                type="button"
                className="pf-camera-badge pf-camera-badge--cover"
                aria-label="Change cover photo"
                disabled={busy || uploadingCover}
                onClick={() => coverInputRef.current?.click()}
              >
                {uploadingCover ? (
                  <Loader2 size={18} className="pf-spin" />
                ) : (
                  <Camera size={18} />
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload('coverUrl', file)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Overlapping Avatar */}
            <div className="pf-edit-avatar-wrap">
              <div className="pf-edit-avatar">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar preview" />
                ) : (
                  <span className="pf-avatar-placeholder">
                    {form.firstName ? (
                      `${form.firstName[0]}${form.lastName?.[0] || ''}`.toUpperCase()
                    ) : (
                      <User size={40} />
                    )}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="pf-camera-badge pf-camera-badge--avatar"
                aria-label="Change profile photo"
                disabled={busy || uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 size={17} className="pf-spin" />
                ) : (
                  <Camera size={17} />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload('avatarUrl', file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {/* Material Form Fields matching Flutter AppTheme & InputDecoration */}
          <fieldset
            disabled={busy || uploadingAvatar || uploadingCover}
            className="pf-edit-fields"
          >
            {/* First Name */}
            <div
              className={`pf-material-field ${
                focusedField === 'firstName' ? 'is-focused' : ''
              }`}
              onClick={() => document.getElementById('pf-input-first-name')?.focus()}
            >
              <label htmlFor="pf-input-first-name" className="pf-material-label">
                First Name
              </label>
              <input
                id="pf-input-first-name"
                className="pf-material-input"
                type="text"
                required
                maxLength={50}
                placeholder="First Name"
                value={form.firstName}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => update('firstName', e.target.value)}
              />
            </div>

            {/* Last Name */}
            <div
              className={`pf-material-field ${
                focusedField === 'lastName' ? 'is-focused' : ''
              }`}
              onClick={() => document.getElementById('pf-input-last-name')?.focus()}
            >
              <label htmlFor="pf-input-last-name" className="pf-material-label">
                Last Name
              </label>
              <input
                id="pf-input-last-name"
                className="pf-material-input"
                type="text"
                required
                maxLength={50}
                placeholder="Last Name"
                value={form.lastName}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => update('lastName', e.target.value)}
              />
            </div>

            {/* Username with @ prefix */}
            <div
              className={`pf-material-field ${
                focusedField === 'username' ? 'is-focused' : ''
              }`}
              onClick={() => document.getElementById('pf-input-username')?.focus()}
            >
              <label htmlFor="pf-input-username" className="pf-material-label">
                Username
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#94A3B8',
                    marginRight: 2,
                    userSelect: 'none',
                  }}
                >
                  @
                </span>
                <input
                  id="pf-input-username"
                  className="pf-material-input"
                  type="text"
                  required
                  maxLength={50}
                  pattern="[A-Za-z0-9_.]+"
                  title="Letters, numbers, underscores and periods only"
                  placeholder="username"
                  value={form.username.replace(/^@/, '')}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) =>
                    update('username', e.target.value.replace(/^@/, ''))
                  }
                />
              </div>
            </div>

            {/* Location / Area */}
            <div
              className={`pf-material-field ${
                focusedField === 'area' ? 'is-focused' : ''
              }`}
            >
              <div className="pf-material-label">
                <label htmlFor="pf-input-area" style={{ cursor: 'pointer' }}>
                  Location/Area
                </label>
                <button
                  type="button"
                  className="pf-map-chip"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLocationOpen(true)
                  }}
                >
                  <MapPin size={12} /> Choose on map
                </button>
              </div>
              <input
                id="pf-input-area"
                className="pf-material-input"
                type="text"
                placeholder="e.g. Quezon City, Philippines"
                maxLength={100}
                value={form.area}
                onFocus={() => setFocusedField('area')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => update('area', e.target.value)}
              />
            </div>

            {/* About / Description (Bio) */}
            <div>
              <div
                className={`pf-material-field pf-material-field--textarea ${
                  focusedField === 'bio' ? 'is-focused' : ''
                }`}
                onClick={() => document.getElementById('pf-input-bio')?.focus()}
              >
                <label htmlFor="pf-input-bio" className="pf-material-label">
                  About / Description
                </label>
                <textarea
                  id="pf-input-bio"
                  rows={4}
                  maxLength={300}
                  placeholder="Tell other players a bit about yourself…"
                  value={form.bio}
                  onFocus={() => setFocusedField('bio')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => update('bio', e.target.value)}
                />
              </div>
              <div
                style={{
                  textAlign: 'right',
                  marginTop: 5,
                  fontSize: 12,
                  color: 'var(--vc-text-tertiary, #94a3b8)',
                  fontWeight: 500,
                }}
              >
                {form.bio.length}/300
              </div>
            </div>

            {error && (
              <div role="alert" className="pf-error-banner">
                {error}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pf-edit-actions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="button button--outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={busy || uploadingAvatar || uploadingCover}
                style={{ minWidth: 140 }}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="pf-spin" /> Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </fieldset>
        </form>
      </ProfileDialog>

      {locationOpen && (
        <LocationPickerModal
          open
          onClose={() => setLocationOpen(false)}
          onConfirm={(location) => {
            update('area', location.area || location.formattedAddress || '')
            setLocationOpen(false)
          }}
        />
      )}
    </>
  )
}
