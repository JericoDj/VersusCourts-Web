import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Crosshair, MapPin, Settings, X } from 'lucide-react'

export default function LocationPermissionModal({
  open,
  errorType = 'permission_denied',
  onRetry,
  onPickManually,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const isDenied = errorType === 'permission_denied'

  return createPortal(
    <div
      className="sport-picker-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-perm-title"
      style={{ zIndex: 10000 }}
    >
      <div
        className="sport-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '100%',
          padding: '24px 24px 20px',
          borderRadius: 24,
          background: '#ffffff',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: isDenied ? 'rgba(12, 77, 209, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              display: 'grid',
              placeItems: 'center',
              color: isDenied ? 'var(--vc-primary, #0c4dd1)' : 'var(--vc-warning, #f59e0b)',
            }}
          >
            {isDenied ? <Crosshair size={24} /> : <AlertCircle size={24} />}
          </div>
          <button
            type="button"
            className="sport-picker-close"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ marginTop: -4, marginRight: -4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Title and Description */}
        <h3
          id="location-perm-title"
          style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: 'var(--vc-text-primary, #0f172a)' }}
        >
          {isDenied ? 'Location Access Needed' : 'Location Unavailable'}
        </h3>
        <p
          style={{
            margin: '0 0 18px',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--vc-text-secondary, #64748b)',
          }}
        >
          {isDenied
            ? 'Versus Courts uses your location to discover courts, clubs, and games near you. Location access is currently blocked in your browser for this site.'
            : 'We could not detect your device location. Please ensure Location Services is enabled on your device, or pick your location manually on the map.'}
        </p>

        {/* Step-by-step guidance when blocked */}
        {isDenied && (
          <div
            style={{
              background: 'var(--vc-surface-alt, #f1f5f9)',
              border: '1px solid var(--vc-border, #e2e8f0)',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 20,
              fontSize: 12.5,
              color: 'var(--vc-text-primary, #0f172a)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 8, color: 'var(--vc-primary, #0c4dd1)' }}>
              <Settings size={15} />
              <span>How to allow location access:</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                Click the <strong>site settings icon</strong> (tune / lock 🔒) in your browser address bar next to the URL.
              </li>
              <li>
                Set <strong>Location</strong> to <strong>Allow</strong>.
              </li>
              <li>
                Click <strong>Try Again</strong> below.
              </li>
            </ol>
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--vc-text-secondary, #64748b)' }}>
              <em>(On macOS, also check System Settings → Privacy & Security → Location Services.)</em>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="queue-modal-btn"
            onClick={() => {
              onClose()
              if (onRetry) onRetry()
            }}
            style={{
              margin: 0,
              background: 'var(--vc-primary, #0c4dd1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Crosshair size={16} />
            <span>Try Again</span>
          </button>

          {onPickManually && (
            <button
              type="button"
              className="queue-modal-btn"
              onClick={() => {
                onClose()
                onPickManually()
              }}
              style={{
                margin: 0,
                background: 'var(--vc-surface, #ffffff)',
                color: 'var(--vc-text-primary, #0f172a)',
                border: '1px solid var(--vc-border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <MapPin size={16} color="var(--vc-primary, #0c4dd1)" />
              <span>Choose Location on Map</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              padding: '8px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--vc-text-secondary, #64748b)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
