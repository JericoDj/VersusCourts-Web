import { APP_STORE_URL, PLAY_STORE_URL } from '../components/StoreBadges'

// Re-exported so callers can keep importing store links from here.
export { APP_STORE_URL, PLAY_STORE_URL }

export function detectDevice() {
  if (typeof navigator === 'undefined') return { isMobile: false, isIOS: false, isAndroid: false }
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/i.test(ua)
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(ua)
  return { isMobile, isIOS, isAndroid }
}

/**
 * Attempts to launch the native app via custom scheme (versuscourts://...).
 * If the app is not installed, falls back to the App Store (iOS) or Google Play (Android).
 *
 * @param {Object} options
 * @param {'club'|'queue'|'chat'|'training'} [options.type='club']
 * @param {string} options.id - Target club ID or queue ID
 * @param {boolean} [options.fallbackToStore=true]
 */
export function openInApp({ type = 'club', id, fallbackToStore = true }) {
  if (!id) return
  const device = detectDevice()
  const schemeUrl = `versuscourts://${type}/${encodeURIComponent(id)}`
  const storeUrl = device.isIOS ? APP_STORE_URL : PLAY_STORE_URL

  if (!device.isMobile) {
    window.open(storeUrl, '_blank', 'noopener,noreferrer')
    return
  }

  const start = Date.now()
  window.location.href = schemeUrl

  if (fallbackToStore) {
    setTimeout(() => {
      // If document is still visible, the native app didn't take over
      if (!document.hidden && Date.now() - start < 2500) {
        window.location.href = storeUrl
      }
    }, 1500)
  }
}
