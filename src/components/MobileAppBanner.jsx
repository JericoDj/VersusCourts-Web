import { useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import { openInApp, detectDevice } from '../utils/appLauncher'

export default function MobileAppBanner({ type = 'club', id, subtitle = 'Better experience in the mobile app' }) {
  const [device] = useState(detectDevice)
  const [dismissed, setDismissed] = useState(false)

  if (!device.isMobile || dismissed || !id) return null

  return (
    <aside className="mobile-app-banner" role="banner" aria-label="Open in Versus Courts App">
      <div className="mobile-app-banner__left">
        <img
          src="/versus-courts-player-logo.png"
          alt="Versus Courts"
          className="mobile-app-banner__logo"
          onError={(e) => {
            e.currentTarget.src = '/logo-clean.png'
          }}
        />
        <div className="mobile-app-banner__text">
          <div className="mobile-app-banner__title">Versus Courts App</div>
          <div className="mobile-app-banner__sub">{subtitle}</div>
        </div>
      </div>
      <div className="mobile-app-banner__actions">
        <button
          type="button"
          className="mobile-app-banner__btn"
          onClick={() => openInApp({ type, id })}
        >
          <Smartphone size={14} />
          <span>Open in App</span>
        </button>
        <button
          type="button"
          className="mobile-app-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  )
}
