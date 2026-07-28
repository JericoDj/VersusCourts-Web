import { AuthProvider } from '../context/AuthContext'
import { PlayerProvider } from '../context/PlayerContext'
import { QueueProvider } from '../context/QueueContext'
import ScrollToTop from '../components/ScrollToTop'
import GlobalSnackbar from '../components/GlobalSnackbar'

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <QueueProvider>
        <PlayerProvider><ScrollToTop />{children}<GlobalSnackbar /></PlayerProvider>
      </QueueProvider>
    </AuthProvider>
  )
}
