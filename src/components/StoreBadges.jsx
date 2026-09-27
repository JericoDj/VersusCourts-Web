import appStoreBadge from '../assets/logos/Appstore_link.webp'
import googlePlayBadge from '../assets/logos/google-play-badge.webp'

export const APP_STORE_URL = 'https://apps.apple.com/ph/app/versus-courts/id6782629486'

/// The Versus Courts Player app on Google Play. Every "get the app" link and
/// every deep-link fallback on Android (see utils/appLauncher.js) uses this.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.leos.versuscourtsplayer'

export default function StoreBadges({ className = '', align = 'left', compact = false }) {
  return (
    <div className={`store-badges ${align ? `store-badges--${align}` : ''} ${compact ? 'store-badges--compact' : ''} ${className}`.trim()}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge-btn"
        title="Download on the App Store"
        aria-label="Download Versus Courts on the App Store"
      >
        <img
          src={appStoreBadge}
          alt="Download on the App Store"
          title="Download on the App Store"
          className="store-badge-img"
          loading="lazy"
          width="140"
          height="42"
        />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge-btn"
        title="Get it on Google Play"
        aria-label="Get Versus Courts on Google Play"
      >
        <img
          src={googlePlayBadge}
          alt="Get it on Google Play"
          title="Get it on Google Play"
          className="store-badge-img"
          loading="lazy"
          width="141"
          height="42"
        />
      </a>
    </div>
  )
}
