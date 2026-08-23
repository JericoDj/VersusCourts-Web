import appStoreBadge from '../assets/logos/Appstore_link.webp'
import googlePlayBadge from '../assets/logos/Soon_in_GooglePlay.webp'

export const APP_STORE_URL = 'https://apps.apple.com/ph/app/versus-courts/id6782629486'

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
      <div
        className="store-badge-btn store-badge-btn--soon"
        title="Coming Soon to Google Play"
        aria-label="Coming soon to Google Play"
      >
        <img
          src={googlePlayBadge}
          alt="Coming Soon to Google Play"
          title="Coming Soon to Google Play"
          className="store-badge-img"
          loading="lazy"
          width="140"
          height="42"
        />
      </div>
    </div>
  )
}
