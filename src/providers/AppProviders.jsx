import { AuthProvider } from '../context/AuthContext'
import { DiscoveryProvider } from '../context/DiscoveryContext'
import { PlayerProvider } from '../context/PlayerContext'
import { QueueProvider } from '../context/QueueContext'
import ScrollToTop from '../components/ScrollToTop'
import GlobalSnackbar from '../components/GlobalSnackbar'

/// Discovery sits under Auth (it re-fetches with the player's token once a
/// session starts) and above Player, which filters the feed it exposes.
export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <DiscoveryProvider>
        <QueueProvider>
          <PlayerProvider><ScrollToTop />{children}<GlobalSnackbar /></PlayerProvider>
        </QueueProvider>
      </DiscoveryProvider>
    </AuthProvider>
  )
}
